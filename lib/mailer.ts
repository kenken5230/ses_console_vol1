import net from "node:net";
import tls from "node:tls";

type MailInput = {
  to: string;
  subject: string;
  text: string;
};

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
  from: string;
};

type SmtpSocket = net.Socket | tls.TLSSocket;

function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST;
  const from = process.env.MAIL_FROM;
  if (!host || !from) return null;

  const port = Number(process.env.SMTP_PORT || "587");
  return {
    host,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from
  };
}

function readResponse(socket: SmtpSocket) {
  return new Promise<string>((resolve, reject) => {
    let buffer = "";

    const cleanup = () => {
      socket.off("data", onData);
      socket.off("error", onError);
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    const onData = (chunk: Buffer) => {
      buffer += chunk.toString("utf8");
      const lines = buffer.split(/\r?\n/).filter(Boolean);
      if (!lines.length) return;
      const last = lines[lines.length - 1];
      if (/^\d{3}\s/.test(last)) {
        cleanup();
        resolve(buffer);
      }
    };

    socket.on("data", onData);
    socket.on("error", onError);
  });
}

async function sendCommand(socket: SmtpSocket, command: string, expectedCodes: string[]) {
  socket.write(`${command}\r\n`);
  const response = await readResponse(socket);
  const code = response.slice(0, 3);
  if (!expectedCodes.includes(code)) {
    throw new Error(`SMTP command failed with ${code}`);
  }
  return response;
}

function connect(config: SmtpConfig) {
  return new Promise<SmtpSocket>((resolve, reject) => {
    const socket = config.secure
      ? tls.connect(config.port, config.host, { servername: config.host })
      : net.createConnection(config.port, config.host);

    socket.once("connect", () => resolve(socket));
    socket.once("error", reject);
  });
}

async function upgradeToTls(socket: SmtpSocket, config: SmtpConfig) {
  return new Promise<tls.TLSSocket>((resolve, reject) => {
    const secureSocket = tls.connect({
      socket,
      servername: config.host
    });

    secureSocket.once("secureConnect", () => resolve(secureSocket));
    secureSocket.once("error", reject);
  });
}

function encodeMessage(input: MailInput, from: string) {
  const subject = Buffer.from(input.subject, "utf8").toString("base64");
  const headers = [
    `From: ${from}`,
    `To: ${input.to}`,
    `Subject: =?UTF-8?B?${subject}?=`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit"
  ];

  return `${headers.join("\r\n")}\r\n\r\n${input.text.replace(/\r?\n/g, "\r\n")}\r\n.`;
}

export async function sendMail(input: MailInput) {
  const config = getSmtpConfig();
  if (!config) {
    return { sent: false, reason: "SMTP_NOT_CONFIGURED" as const };
  }

  let socket = await connect(config);
  try {
    await readResponse(socket);
    await sendCommand(socket, `EHLO ${process.env.SMTP_HELO_HOST || "localhost"}`, ["250"]);

    if (!config.secure && process.env.SMTP_STARTTLS !== "false") {
      await sendCommand(socket, "STARTTLS", ["220"]);
      socket = await upgradeToTls(socket, config);
      await sendCommand(socket, `EHLO ${process.env.SMTP_HELO_HOST || "localhost"}`, ["250"]);
    }

    if (config.user && config.password) {
      const authPayload = Buffer.from(`\u0000${config.user}\u0000${config.password}`, "utf8").toString("base64");
      await sendCommand(socket, `AUTH PLAIN ${authPayload}`, ["235"]);
    }

    await sendCommand(socket, `MAIL FROM:<${config.from}>`, ["250"]);
    await sendCommand(socket, `RCPT TO:<${input.to}>`, ["250", "251"]);
    await sendCommand(socket, "DATA", ["354"]);
    await sendCommand(socket, encodeMessage(input, config.from), ["250"]);
    await sendCommand(socket, "QUIT", ["221"]);

    return { sent: true as const };
  } finally {
    socket.end();
  }
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  return sendMail({
    to,
    subject: "SES Console パスワード再設定",
    text: [
      "SES Console のパスワード再設定を受け付けました。",
      "",
      "以下のURLから30分以内に新しいパスワードを設定してください。",
      resetUrl,
      "",
      "このメールに心当たりがない場合は、破棄してください。"
    ].join("\n")
  });
}

