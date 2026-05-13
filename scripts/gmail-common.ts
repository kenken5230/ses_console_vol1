import "dotenv/config";

import { existsSync } from "node:fs";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isDeployedRuntime, missingEnvNames } from "../lib/production-guard";

export const GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

export const OAUTH_CLIENT_PATH = path.join(process.cwd(), "secrets", "gmail-oauth-client.json");
export const TOKEN_PATH = path.join(process.cwd(), "secrets", "gmail-token.json");
const GMAIL_CLIENT_ENV_NAMES = ["GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET"];
const GMAIL_TOKEN_ENV_NAMES = ["GMAIL_REFRESH_TOKEN"];

type OAuthClientJson = {
  installed?: {
    client_id?: string;
    client_secret?: string;
    redirect_uris?: string[];
  };
  web?: {
    client_id?: string;
    client_secret?: string;
    redirect_uris?: string[];
  };
};

export type OAuthClientConfig = {
  clientId: string;
  clientSecret: string;
  redirectUris: string[];
};

export type StoredGmailToken = {
  type: "authorized_user";
  auth_user: string;
  scope?: string;
  token_type?: string;
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
  created_at?: string;
  updated_at: string;
};

type TokenEndpointResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

export type GmailScriptConfig = {
  authUser: string;
  userId: string;
  query: string;
  initialSyncLimit: number;
  syncFrom: string;
  syncTo: string | null;
  syncPageSize: number;
  syncMaxResults: number | null;
};

export function getGmailScriptConfig(): GmailScriptConfig {
  const initialSyncLimit = Number(process.env.GMAIL_INITIAL_SYNC_LIMIT ?? "50");
  const syncPageSize = Number(process.env.GMAIL_SYNC_PAGE_SIZE ?? "500");
  const rawSyncMaxResults = process.env.GMAIL_SYNC_MAX_RESULTS;
  const syncMaxResults = rawSyncMaxResults ? Number(rawSyncMaxResults) : null;

  return {
    authUser: process.env.GMAIL_AUTH_USER ?? "sho.sato@skv.co.jp",
    userId: process.env.GMAIL_USER_ID ?? "me",
    query: process.env.GMAIL_QUERY ?? "to:ses@skv.co.jp",
    initialSyncLimit: Number.isFinite(initialSyncLimit) && initialSyncLimit > 0 ? initialSyncLimit : 50,
    syncFrom: process.env.GMAIL_SYNC_FROM ?? "2026-03-01",
    syncTo: process.env.GMAIL_SYNC_TO ?? null,
    syncPageSize: Number.isFinite(syncPageSize) && syncPageSize > 0 ? Math.min(syncPageSize, 500) : 500,
    syncMaxResults: rawSyncMaxResults && Number.isFinite(syncMaxResults) && syncMaxResults > 0 ? syncMaxResults : null,
  };
}

function hasAnyEnv(names: string[]): boolean {
  return names.some((name) => Boolean(process.env[name]?.trim()));
}

function missingEnvMessage(context: string, names: string[]): string {
  return `${context} requires missing environment variables: ${names.join(", ")}`;
}

export function shouldUseGmailClientEnv(): boolean {
  return isDeployedRuntime() || hasAnyEnv(GMAIL_CLIENT_ENV_NAMES);
}

export function shouldUseGmailTokenEnv(): boolean {
  return isDeployedRuntime() || hasAnyEnv(GMAIL_TOKEN_ENV_NAMES);
}

export function assertCanUseLocalGmailSecretFiles(context: string): void {
  if (!isDeployedRuntime()) return;
  throw new Error(`${context} cannot read local secrets/*.json in deployed or production runtime. Use Gmail OAuth environment variables.`);
}

export async function loadOAuthClient(): Promise<OAuthClientConfig> {
  if (shouldUseGmailClientEnv()) {
    const missing = missingEnvNames(GMAIL_CLIENT_ENV_NAMES);
    if (missing.length) {
      throw new Error(missingEnvMessage("Gmail OAuth client env", missing));
    }

    return {
      clientId: process.env.GMAIL_CLIENT_ID!.trim(),
      clientSecret: process.env.GMAIL_CLIENT_SECRET!.trim(),
      redirectUris: [process.env.GMAIL_REDIRECT_URI?.trim() || "http://localhost"],
    };
  }

  assertCanUseLocalGmailSecretFiles("Gmail OAuth client");
  const raw = await readFile(OAUTH_CLIENT_PATH, "utf8");
  const parsed = JSON.parse(raw) as OAuthClientJson;
  const source = parsed.installed ?? parsed.web;

  if (!source?.client_id || !source.client_secret) {
    throw new Error("secrets/gmail-oauth-client.json に client_id / client_secret が見つかりません。");
  }

  return {
    clientId: source.client_id,
    clientSecret: source.client_secret,
    redirectUris: source.redirect_uris?.length ? source.redirect_uris : ["http://localhost"],
  };
}

export async function readStoredToken(): Promise<StoredGmailToken> {
  if (shouldUseGmailTokenEnv()) {
    const missing = missingEnvNames(GMAIL_TOKEN_ENV_NAMES);
    if (missing.length) {
      throw new Error(missingEnvMessage("Gmail OAuth token env", missing));
    }

    return {
      type: "authorized_user",
      auth_user: getGmailScriptConfig().authUser,
      scope: GMAIL_READONLY_SCOPE,
      token_type: "Bearer",
      access_token: "",
      refresh_token: process.env.GMAIL_REFRESH_TOKEN!.trim(),
      updated_at: new Date().toISOString(),
    };
  }

  assertCanUseLocalGmailSecretFiles("Gmail OAuth token");
  if (!existsSync(TOKEN_PATH)) {
    throw new Error("Gmail認証トークンがありません。先に npm run gmail:auth を実行してください。");
  }

  const raw = await readFile(TOKEN_PATH, "utf8");
  const token = JSON.parse(raw) as StoredGmailToken;

  if (!token.access_token && !token.refresh_token) {
    throw new Error("Gmail認証トークンに access_token / refresh_token が見つかりません。再認証してください。");
  }

  return token;
}

export async function saveStoredToken(token: StoredGmailToken): Promise<void> {
  if (shouldUseGmailTokenEnv()) {
    return;
  }

  await mkdir(path.dirname(TOKEN_PATH), { recursive: true });
  await writeFile(TOKEN_PATH, `${JSON.stringify(token, null, 2)}\n`, "utf8");

  try {
    await chmod(TOKEN_PATH, 0o600);
  } catch {
    // Windowsでは権限変更が効かない場合があるため、gitignore済みのsecrets配下で守る。
  }
}

export function withExpiryDate(token: TokenEndpointResponse): TokenEndpointResponse & { expiry_date?: number } {
  return {
    ...token,
    expiry_date: token.expires_in ? Date.now() + token.expires_in * 1000 : undefined,
  };
}

export function shouldRefreshToken(token: StoredGmailToken): boolean {
  if (!token.access_token) {
    return true;
  }

  if (!token.expiry_date) {
    return false;
  }

  return token.expiry_date <= Date.now() + 60_000;
}

export async function refreshAccessToken(
  client: OAuthClientConfig,
  token: StoredGmailToken,
): Promise<StoredGmailToken> {
  if (!token.refresh_token) {
    throw new Error("refresh_token が保存されていません。npm run gmail:auth で再認証してください。");
  }

  const params = new URLSearchParams({
    client_id: client.clientId,
    client_secret: client.clientSecret,
    refresh_token: token.refresh_token,
    grant_type: "refresh_token",
  });

  const refreshed = await requestJson<TokenEndpointResponse>("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const withExpiry = withExpiryDate(refreshed);

  const updatedToken: StoredGmailToken = {
    ...token,
    access_token: withExpiry.access_token,
    expiry_date: withExpiry.expiry_date,
    scope: withExpiry.scope ?? token.scope,
    token_type: withExpiry.token_type ?? token.token_type,
    updated_at: new Date().toISOString(),
  };

  await saveStoredToken(updatedToken);
  return updatedToken;
}

export async function getValidAccessToken(): Promise<string> {
  const client = await loadOAuthClient();
  const token = await readStoredToken();
  const validToken = shouldRefreshToken(token) ? await refreshAccessToken(client, token) : token;

  return validToken.access_token;
}

export async function requestJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${text.slice(0, 500)}`);
  }

  return text ? (JSON.parse(text) as T) : ({} as T);
}
