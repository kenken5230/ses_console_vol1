import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

type MailInput = {
  to: string;
  subject: string;
  text: string;
};

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  startTls: boolean;
  user?: string;
  password?: string;
  from: string;
  heloHost?: string;
};

const SECRET_ENV_NAMES = [
  "SMTP_PASSWORD",
  "AUTH_SECRET",
  "DATABASE_URL",
  "DIRECT_URL",
  "GMAIL_REFRESH_TOKEN",
  "CRON_SECRET"
] as const;

type SafeLogDetails = Record<string, string | number | boolean | null>;

const EXPECTED_GMAIL_ADDRESS = "sho.sato@skv.co.jp";

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

function getAuthPayloadsToRedact() {
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  const payloads = [
    user ? Buffer.from(user, "utf8").toString("base64") : null,
    password ? Buffer.from(password, "utf8").toString("base64") : null,
    user && password ? Buffer.from(`\u0000${user}\u0000${password}`, "utf8").toString("base64") : null
  ];

  return payloads.filter((payload): payload is string => Boolean(payload && payload.length >= 8));
}

function redactAuthPayloads(value: string) {
  let redacted = value;
  for (const payload of getAuthPayloadsToRedact()) {
    redacted = redacted.replace(new RegExp(escapeRegExp(payload), "g"), "[REDACTED_AUTH_PAYLOAD]");
  }
  return redacted;
}

function sanitizeLogValue(value: string) {
  return redactAuthPayloads(redactKnownSecrets(value))
    .replace(/AUTH\s+PLAIN\s+[A-Za-z0-9+/=]+/gi, "AUTH PLAIN [REDACTED]")
    .replace(/AUTH\s+LOGIN\s+[A-Za-z0-9+/=]+/gi, "AUTH LOGIN [REDACTED]")
    .replace(/([?&]resetToken=)[^&\s]+/gi, "$1[REDACTED]")
    .replace(/(\bresetToken\b\s*[:=]\s*)[^\s,;]+/gi, "$1[REDACTED]")
    .replace(/("resetToken"\s*:\s*")[^"]*(")/gi, "$1[REDACTED]$2")
    .replace(/(\bpassword\b\s*[:=]\s*)[^\s,;]+/gi, "$1[REDACTED]")
    .replace(/("password"\s*:\s*")[^"]*(")/gi, "$1[REDACTED]$2");
}

function buildSafeTextPreview(value: string, maxLength = 180) {
  return sanitizeLogValue(value).replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function getSafeMailErrorDetails(error: unknown): SafeLogDetails {
  if (!(error instanceof Error)) {
    return { message: buildSafeTextPreview(String(error), 300) };
  }

  const details: SafeLogDetails = {
    name: buildSafeTextPreview(error.name, 120),
    message: buildSafeTextPreview(error.message, 300)
  };

  const maybeError = error as Error & Record<string, unknown>;
  for (const key of ["code", "errno", "syscall", "command"]) {
    const value = maybeError[key];
    if (typeof value === "string") {
      details[key] = buildSafeTextPreview(value, 180);
    } else if (typeof value === "number" || typeof value === "boolean") {
      details[key] = value;
    } else if (value === null) {
      details[key] = null;
    }
  }

  const responseCode = maybeError.responseCode;
  if (typeof responseCode === "number") {
    details.responseCode = responseCode;
  } else if (typeof responseCode === "string") {
    details.responseCode = buildSafeTextPreview(responseCode, 60);
  }

  const response = maybeError.response;
  if (typeof response === "string") {
    details.response = buildSafeTextPreview(response);
  }

  return details;
}

function getMissingSmtpConfig() {
  const missing: string[] = [];
  if (!process.env.SMTP_HOST) missing.push("SMTP_HOST");
  if (!process.env.MAIL_FROM) missing.push("MAIL_FROM");
  return missing;
}

function getLength(value: string | undefined) {
  return value?.length ?? 0;
}

function hasTrimLengthChanged(value: string | undefined) {
  return Boolean(value && value.length !== value.trim().length);
}

function logSmtpEnvDiagnostics() {
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;
  const mailFrom = process.env.MAIL_FROM;

  // Temporary diagnostic log for staging SMTP env investigation. Remove after confirming Vercel env values.
  console.info("SMTP env diagnostics", {
    smtpHostConfigured: Boolean(process.env.SMTP_HOST),
    smtpPort: process.env.SMTP_PORT || "587",
    smtpUserConfigured: Boolean(smtpUser),
    smtpUserLength: getLength(smtpUser),
    smtpUserMatchesExpected: smtpUser === EXPECTED_GMAIL_ADDRESS,
    smtpUserTrimLengthChanged: hasTrimLengthChanged(smtpUser),
    smtpPasswordConfigured: Boolean(smtpPassword),
    smtpPasswordLength: getLength(smtpPassword),
    smtpPasswordTrimLengthChanged: hasTrimLengthChanged(smtpPassword),
    smtpPasswordContainsSpace: Boolean(smtpPassword && smtpPassword.includes(" ")),
    smtpPasswordContainsNewline: Boolean(smtpPassword && /[\r\n]/.test(smtpPassword)),
    mailFromConfigured: Boolean(mailFrom),
    mailFromMatchesExpected: mailFrom === EXPECTED_GMAIL_ADDRESS
  });
}

function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST;
  const from = process.env.MAIL_FROM;
  if (!host || !from) return null;

  const port = Number(process.env.SMTP_PORT || "587");
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  return {
    host,
    port,
    secure,
    startTls: !secure && process.env.SMTP_STARTTLS !== "false",
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from,
    heloHost: process.env.SMTP_HELO_HOST
  };
}

function createTransport(config: SmtpConfig) {
  const options: SMTPTransport.Options = {
    host: config.host,
    port: config.port,
    secure: config.secure,
    requireTLS: config.startTls,
    ignoreTLS: !config.secure && !config.startTls,
    name: config.heloHost || undefined,
    authMethod: config.user && config.password ? "LOGIN" : undefined,
    auth:
      config.user && config.password
        ? {
            user: config.user,
            pass: config.password
          }
        : undefined,
    tls: {
      servername: config.host
    }
  };

  return nodemailer.createTransport(options);
}

export async function sendMail(input: MailInput) {
  logSmtpEnvDiagnostics();

  const config = getSmtpConfig();
  if (!config) {
    return { sent: false, reason: "SMTP_NOT_CONFIGURED" as const, missing: getMissingSmtpConfig() };
  }

  const transporter = createTransport(config);

  try {
    await transporter.sendMail({
      from: config.from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      envelope: {
        from: config.from,
        to: input.to
      }
    });

    return { sent: true as const };
  } catch (error) {
    console.error("SMTP send failed", getSafeMailErrorDetails(error));
    throw error;
  } finally {
    transporter.close();
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
