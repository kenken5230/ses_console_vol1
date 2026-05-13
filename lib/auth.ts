import { randomBytes, scryptSync, timingSafeEqual, createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "./prisma";

export const SESSION_COOKIE_NAME = "ses_console_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;
const PASSWORD_MIN_LENGTH = 12;
const RESET_TOKEN_TTL_MINUTES = 30;

export const APP_ROLES = ["ADMIN", "MANAGER", "SALES", "VIEWER", "SYSTEM"] as const;
export type AppRole = (typeof APP_ROLES)[number];

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
};

type SessionPayload = AuthUser & {
  iat: number;
  exp: number;
};

export class AuthError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new AuthError(500, "AUTH_SECRET is not configured");
  }

  return secret;
}

function base64UrlEncode(input: string | Buffer) {
  return Buffer.from(input).toString("base64url");
}

function sign(value: string) {
  return createHmac("sha256", getAuthSecret()).update(value).digest("base64url");
}

function constantTimeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function parseCookieHeader(header: string | null) {
  const cookies = new Map<string, string>();
  if (!header) return cookies;

  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key) cookies.set(key, decodeURIComponent(value));
  }

  return cookies;
}

function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && APP_ROLES.includes(value as AppRole);
}

export function hasAnyRole(user: AuthUser, roles: AppRole[]) {
  return roles.includes(user.role);
}

export function canEditEntities(user: AuthUser | null | undefined) {
  return Boolean(user && hasAnyRole(user, ["ADMIN", "MANAGER", "SALES"]));
}

export function canManageSync(user: AuthUser | null | undefined) {
  return Boolean(user && hasAnyRole(user, ["ADMIN", "MANAGER", "SYSTEM"]));
}

export function validatePasswordPolicy(password: string) {
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new AuthError(400, `パスワードは${PASSWORD_MIN_LENGTH}文字以上で入力してください`);
  }
}

export function hashPassword(password: string) {
  validatePasswordPolicy(password);
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, 64, {
    N: 16384,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024
  }).toString("base64url");

  return `scrypt$v1$16384$8$1$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash: string | null | undefined) {
  if (!storedHash) return false;

  const [algorithm, version, nValue, rValue, pValue, salt, hash] = storedHash.split("$");
  if (algorithm !== "scrypt" || version !== "v1" || !salt || !hash) return false;

  const expected = Buffer.from(hash, "base64url");
  const actual = scryptSync(password, salt, expected.length, {
    N: Number(nValue),
    r: Number(rValue),
    p: Number(pValue),
    maxmem: 64 * 1024 * 1024
  });

  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function createSessionToken(user: AuthUser) {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    ...user,
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

function verifySessionToken(token: string): SessionPayload {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) throw new AuthError(401, "Unauthorized");

  if (!constantTimeEqual(signature, sign(encodedPayload))) {
    throw new AuthError(401, "Unauthorized");
  }

  const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as SessionPayload;
  if (!payload?.id || !payload?.email || !isAppRole(payload.role)) {
    throw new AuthError(401, "Unauthorized");
  }

  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp <= now) {
    throw new AuthError(401, "Session expired");
  }

  return payload;
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}

export async function getCurrentUserFromRequest(request: Request): Promise<AuthUser | null> {
  const token = parseCookieHeader(request.headers.get("cookie")).get(SESSION_COOKIE_NAME);
  if (!token) return null;

  const payload = verifySessionToken(token);
  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      passwordChangedAt: true
    }
  });

  if (!user || !user.isActive) return null;
  if (!isAppRole(user.role)) return null;

  if (user.passwordChangedAt && Math.floor(user.passwordChangedAt.getTime() / 1000) > payload.iat) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };
}

export async function requireAuth(request: Request) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) throw new AuthError(401, "Unauthorized");
  return user;
}

export async function requireAnyRole(request: Request, roles: AppRole[]) {
  const user = await requireAuth(request);
  if (!hasAnyRole(user, roles)) throw new AuthError(403, "Forbidden");
  return user;
}

export function hashResetToken(token: string) {
  return createHmac("sha256", getAuthSecret()).update(token).digest("hex");
}

export async function createPasswordResetToken(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt
    }
  });

  return token;
}

export async function consumePasswordResetToken(token: string, password: string) {
  validatePasswordPolicy(password);
  const tokenHash = hashResetToken(token);
  const now = new Date();

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true }
  });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= now || !resetToken.user.isActive) {
    throw new AuthError(400, "パスワード再設定リンクが無効または期限切れです");
  }

  const passwordHash = hashPassword(password);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: {
        passwordHash,
        passwordChangedAt: now
      }
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: now }
    })
  ]);
}

export function publicAuthUser(user: AuthUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function authErrorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ message: error.status === 401 ? "Unauthorized" : error.message }, { status: error.status });
  }

  return null;
}
