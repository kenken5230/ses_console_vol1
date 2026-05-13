import { randomBytes } from "node:crypto";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

import {
  GMAIL_READONLY_SCOPE,
  OAUTH_CLIENT_PATH,
  assertCanUseLocalGmailSecretFiles,
  getGmailScriptConfig,
  requestJson,
  saveStoredToken,
  withExpiryDate,
} from "./gmail-common";

type OAuthClientJson = {
  installed?: OAuthClientSource;
  web?: OAuthClientSource;
};

type OAuthClientSource = {
  auth_uri?: string;
  token_uri?: string;
  client_id?: string;
  client_secret?: string;
  redirect_uris?: string[];
};

type OAuthRuntimeClient = {
  authUri: string;
  tokenUri: string;
  clientId: string;
  clientSecret: string;
  configuredRedirectUri: string;
};

type TokenEndpointResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

async function loadOAuthRuntimeClient(): Promise<OAuthRuntimeClient> {
  assertCanUseLocalGmailSecretFiles("gmail:auth");
  const raw = await readFile(OAUTH_CLIENT_PATH, "utf8");
  const parsed = JSON.parse(raw) as OAuthClientJson;
  const source = parsed.installed ?? parsed.web;
  const configuredRedirectUri = source?.redirect_uris?.[0];

  if (!source?.client_id || !source.client_secret || !configuredRedirectUri) {
    throw new Error("OAuth client JSON must include client_id, client_secret, and redirect_uris[0].");
  }

  return {
    authUri: source.auth_uri ?? "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUri: source.token_uri ?? "https://oauth2.googleapis.com/token",
    clientId: source.client_id,
    clientSecret: source.client_secret,
    configuredRedirectUri,
  };
}

function openBrowser(url: string): void {
  if (process.platform === "win32") {
    execFile("rundll32.exe", ["url.dll,FileProtocolHandler", url], { windowsHide: true }, () => {
      // If the browser does not open automatically, use the printed URL manually.
    });
    return;
  }

  const command = process.platform === "darwin" ? "open" : "xdg-open";
  execFile(command, [url], () => {
    // If the browser does not open automatically, use the printed URL manually.
  });
}

function buildRedirectUri(configuredRedirectUri: string, actualPort: number): string {
  const configured = new URL(configuredRedirectUri);

  if (!["http:", "https:"].includes(configured.protocol)) {
    throw new Error(`Unsupported redirect_uri protocol: ${configured.protocol}`);
  }

  if (configured.port) {
    return configured.toString();
  }

  const pathname = configured.pathname || "/";
  return `${configured.protocol}//${configured.hostname}:${actualPort}${pathname}`;
}

function buildAuthUrl(params: {
  authUri: string;
  clientId: string;
  redirectUri: string;
  state: string;
  loginHint: string;
}): string {
  const authUrl = new URL(params.authUri);

  authUrl.searchParams.set("client_id", params.clientId);
  authUrl.searchParams.set("redirect_uri", params.redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", GMAIL_READONLY_SCOPE);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", params.state);
  authUrl.searchParams.set("login_hint", params.loginHint);

  for (const requiredParam of [
    "client_id",
    "redirect_uri",
    "response_type",
    "scope",
    "access_type",
    "prompt",
  ]) {
    if (!authUrl.searchParams.get(requiredParam)) {
      throw new Error(`OAuth auth URL is missing required parameter: ${requiredParam}`);
    }
  }

  if (authUrl.searchParams.get("response_type") !== "code") {
    throw new Error("OAuth auth URL response_type must be code.");
  }

  return authUrl.toString();
}

async function main(): Promise<void> {
  const client = await loadOAuthRuntimeClient();
  const config = getGmailScriptConfig();
  const configuredRedirect = new URL(client.configuredRedirectUri);
  const callbackPath = configuredRedirect.pathname || "/";
  const state = randomBytes(24).toString("hex");

  let resolveCode: (code: string) => void;
  let rejectCode: (error: Error) => void;
  const codePromise = new Promise<string>((resolve, reject) => {
    resolveCode = resolve;
    rejectCode = reject;
  });

  const server = createServer((req, res) => {
    const requestUrl = new URL(req.url ?? "/", `http://${req.headers.host}`);

    if (requestUrl.pathname !== callbackPath) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    const error = requestUrl.searchParams.get("error");
    if (error) {
      res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Gmail OAuth failed. You can close this window.");
      rejectCode(new Error(`Gmail OAuth error: ${error}`));
      return;
    }

    if (requestUrl.searchParams.get("state") !== state) {
      res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Invalid state. You can close this window.");
      rejectCode(new Error("Gmail OAuth state mismatch."));
      return;
    }

    const code = requestUrl.searchParams.get("code");
    if (!code) {
      res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Authorization code is missing. You can close this window.");
      rejectCode(new Error("Gmail OAuth authorization code was not returned."));
      return;
    }

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<p>Gmail OAuth completed. You can close this window.</p>");
    resolveCode(code);
  });

  await new Promise<void>((resolve) => {
    const port = configuredRedirect.port ? Number(configuredRedirect.port) : 0;
    server.listen(port, configuredRedirect.hostname, resolve);
  });

  const address = server.address() as AddressInfo;
  const redirectUri = buildRedirectUri(client.configuredRedirectUri, address.port);
  const authUrl = buildAuthUrl({
    authUri: client.authUri,
    clientId: client.clientId,
    redirectUri,
    state,
    loginHint: config.authUser,
  });

  console.log("Starting Gmail OAuth.");
  console.log(`Auth user: ${config.authUser}`);
  console.log("If the browser does not open automatically, open this full URL:");
  console.log(authUrl);
  openBrowser(authUrl);

  try {
    const code = await codePromise;
    const params = new URLSearchParams({
      code,
      client_id: client.clientId,
      client_secret: client.clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });

    const tokenResponse = await requestJson<TokenEndpointResponse>(client.tokenUri, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const tokenWithExpiry = withExpiryDate(tokenResponse);

    if (!tokenWithExpiry.refresh_token) {
      throw new Error("refresh_token was not returned. Re-run auth and approve the consent screen again.");
    }

    await saveStoredToken({
      type: "authorized_user",
      auth_user: config.authUser,
      scope: tokenWithExpiry.scope,
      token_type: tokenWithExpiry.token_type,
      access_token: tokenWithExpiry.access_token,
      refresh_token: tokenWithExpiry.refresh_token,
      expiry_date: tokenWithExpiry.expiry_date,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    console.log("Gmail OAuth token saved.");
    console.log("Token path: secrets/gmail-token.json");
  } finally {
    server.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
