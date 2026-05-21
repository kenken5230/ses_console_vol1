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

const SECRET_ENV_NAMES = [
  "SMTP_PASSWORD",
  "AUTH_SECRET",
  "DATABASE_URL",
  "DIRECT_URL",
  "GMAIL_REFRESH_TOKEN",
  "CRON_SECRET"
] as const;

type SafeLogDetails = Record<string, string | number | boolean | null>;

class SmtpCommandError extends Error {
  smtpCode: string;
  smtpStage: string;
  responsePreview: string;

  constructor(code: string, response: string, stage: string) {
    const responsePreview = buildSafeResponsePreview(response);
    super(`SMTP command failed with ${code}${responsePreview ? `: ${responsePreview}` : ""}`);
    this.name = "SmtpCommandError";
    this.smtpCode = code;
    this.smtpStage = stage;
    this.responsePreview = responsePreview;
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function redactKnownSecrets(value: string) {
  let redacted = value;
  for (const name of SECRET_ENV_NAMES) {
    const secret = process.env[name];
    if (!secret) continue;
    redacted = redacted.replace(new RegExp(escapeRegExp(secret), "g"), `[REDACTED_${name}]`);
  }
  return redacted;
}

function sanitizeLogValue(value: string) {
  return redactKnownSecrets(value)
    .replace(/AUTH\s+PLAIN\s+[A-Za-z0-9+/=]+/gi, "AUTH PLAIN [REDACTED]")
    .replace(/([?&]resetToken=)[^&\s]+/gi, "$1[REDACTED]")
    .replace(/(\bresetToken\b\s*[:=]\s*)[^\s,;]+/gi, "$1[REDACTED]")
    .replace(/("resetToken"\s*:\s*")[^"]*(")/gi, "$1[REDACTED]$2")
    .replace(/(\bpassword\b\s*[:=]\s*)[^\s,;]+/gi, "$1[REDACTED]")
    .replace(/("password"\s*:\s*")[^"]*(")/gi, "$1[REDACTED]$2");
}

function buildSafeResponsePreview(response: string) {
  return sanitizeLogValue(response).replace(/\s+/g, " ").trim().slice(0, 180);
}

export function getSafeMailErrorDetails(error: unknown): SafeLogDetails {
  if (!(error instanceof Error)) {
    return { message: sanitizeLogValue(String(error)) };
  }

  const details: SafeLogDetails = {
    name: error.name,
    message: sanitizeLogValue(error.message)
  };

  const maybeError = error as Error & Record<string, unknown>;
  for (const key of ["code", "errno", "syscall", "smtpCode", "smtpStage", "responsePreview"]) {
    const value = maybeError[key];
    if (typeof value === "string") {
      details[key] = sanitizeLogValue(value);
    } else if (typeof value === "number" || typeof value === "boolean") {
      details[key] = value;
    } else if (value === null) {
      details[key] = null;
    }
  }

  return details;
}

function getMissingSmtpConfig() {
  const missing: string[] = [];
  if (!process.env.SMTP_HOST) missing.push("SMTP_HOST");
  if (!process.env.MAIL_FROM) missing.push("MAIL_FROM");
  return missing;
}

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

async function sendCommand(socket: SmtpSocket, command: string, expectedCodes: string[], stage = "SMTP command") {
  socket.write(`${command}\r\n`);
  const response = await readResponse(socket);
  const code = response.slice(0, 3);
  if (!expectedCodes.includes(code)) {
    throw new SmtpCommandError(code, response, stage);
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
    return { sent: false, reason: "SMTP_NOT_CONFIGURED" as const, missing: getMissingSmtpConfig() };
  }

  let socket = await connect(config);
  try {
    await readResponse(socket);
    await sendCommand(socket, `EHLO ${process.env.SMTP_HELO_HOST || "localhost"}`, ["250"], "EHLO");

    if (!config.secure && process.env.SMTP_STARTTLS !== "false") {
      await sendCommand(socket, "STARTTLS", ["220"], "STARTTLS");
      socket = await upgradeToTls(socket, config);
      await sendCommand(socket, `EHLO ${process.env.SMTP_HELO_HOST || "localhost"}`, ["250"], "EHLO");
    }

    if (config.user && config.password) {
      const authPayload = Buffer.from(`\u0000${config.user}\u0000${config.password}`, "utf8").toString("base64");
      await sendCommand(socket, `AUTH PLAIN ${authPayload}`, ["235"], "AUTH PLAIN");
    }

    await sendCommand(socket, `MAIL FROM:<${config.from}>`, ["250"], "MAIL FROM");
    await sendCommand(socket, `RCPT TO:<${input.to}>`, ["250", "251"], "RCPT TO");
    await sendCommand(socket, "DATA", ["354"], "DATA");
    await sendCommand(socket, encodeMessage(input, config.from), ["250"], "DATA body");
    await sendCommand(socket, "QUIT", ["221"], "QUIT");

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
