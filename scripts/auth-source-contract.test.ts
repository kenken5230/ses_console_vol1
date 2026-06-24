import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

const protectedFilePattern = /(^|\/)(\.env(?:\..*)?|.*secret.*|.*credentials.*|.*\.(?:pem|key|p12|pfx|db|sqlite|sqlite3|dump))$/i;

function toProjectPath(filePath: string) {
  return filePath.replace(/\\/g, "/");
}

function assertAllowedSourcePath(filePath: string) {
  const normalized = toProjectPath(filePath);
  assert(!protectedFilePattern.test(normalized), `protected file must not be read: ${normalized}`);
  assert(
    normalized === "lib/auth.ts" || normalized.startsWith("app/api/auth/"),
    `auth source contract may only read auth/session source files: ${normalized}`,
  );
}

function readProjectFile(filePath: string) {
  const normalized = toProjectPath(filePath);
  assertAllowedSourcePath(normalized);
  return readFileSync(path.join(rootDir, normalized), "utf8");
}

function listFilesRecursively(relativeDir: string) {
  const absoluteDir = path.join(rootDir, relativeDir);
  if (!existsSync(absoluteDir)) return [];

  const files: string[] = [];
  for (const entry of readdirSync(absoluteDir)) {
    const absoluteEntry = path.join(absoluteDir, entry);
    const relativeEntry = toProjectPath(path.join(relativeDir, entry));
    if (statSync(absoluteEntry).isDirectory()) {
      files.push(...listFilesRecursively(relativeEntry));
    } else if (/\/route\.tsx?$/.test(relativeEntry)) {
      files.push(relativeEntry);
    }
  }

  return files.sort();
}

function sectionBetween(source: string, startNeedle: string, endNeedle: string, label: string) {
  const start = source.indexOf(startNeedle);
  assert.notEqual(start, -1, `${label} must include ${startNeedle}`);
  const end = source.indexOf(endNeedle, start);
  assert.notEqual(end, -1, `${label} must include ${endNeedle} after ${startNeedle}`);
  return source.slice(start, end);
}

function balancedCallAt(source: string, callee: string, startIndex: number) {
  const openIndex = source.indexOf("(", startIndex + callee.length);
  assert.notEqual(openIndex, -1, `${callee} call must include an opening parenthesis`);

  let depth = 0;
  let quote: "'" | "\"" | "`" | null = null;
  let escaped = false;
  for (let index = openIndex; index < source.length; index += 1) {
    const char = source[index];

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === "'" || char === "\"" || char === "`") {
      quote = char;
      continue;
    }

    if (char === "(") depth += 1;
    if (char === ")") {
      depth -= 1;
      if (depth === 0) return source.slice(startIndex, index + 1);
    }
  }

  throw new Error(`${callee} call is not balanced`);
}

function findCalls(source: string, callee: string) {
  const calls: string[] = [];
  let searchFrom = 0;
  while (true) {
    const start = source.indexOf(callee, searchFrom);
    if (start === -1) return calls;
    calls.push(balancedCallAt(source, callee, start));
    searchFrom = start + callee.length;
  }
}

function assertJsonResponseIsSanitized(filePath: string, callSource: string) {
  for (const forbidden of [
    /\bpasswordHash\b/,
    /\btokenHash\b/,
    /\bstoredHash\b/,
    /\bresetToken\b/,
    /[{,]\s*token\s*[:}]/,
    /[{,]\s*password\s*[:}]/,
    /\bcreateSessionToken\s*\(/,
    /\bcreatePasswordResetToken\s*\(/,
    /\bprocess\.env\b/,
    /\bAUTH_SECRET\b/,
    /\bgetAuthSecret\s*\(/,
    /\.stack\b/,
    /\bJSON\.stringify\s*\(\s*error\s*\)/,
    /\bString\s*\(\s*error\s*\)/,
  ]) {
    assert(!forbidden.test(callSource), `${filePath} response must not expose sensitive auth material: ${forbidden}`);
  }
}

function assertRouteSourceContract(filePath: string, source: string) {
  for (const callSource of findCalls(source, "NextResponse.json")) {
    assertJsonResponseIsSanitized(filePath, callSource);
    if (/\buser\s*:(?!\s*null\b)/.test(callSource)) {
      assert(callSource.includes("publicAuthUser("), `${filePath} user responses must be produced through publicAuthUser`);
    }
  }

  assert(!/user\s*:\s*user\s*[,}]/.test(source), `${filePath} must not return a raw user object`);
  assert(!/NextResponse\.json\s*\(\s*\{\s*user\s*\}/.test(source), `${filePath} must not return shorthand raw user`);
  assert(!/publicAuthUser\s*\([^)]*passwordHash/.test(source), `${filePath} must not pass passwordHash to publicAuthUser`);
  assert(!/console\.error\s*\([^)]*\.stack/.test(source), `${filePath} must not log stack traces from auth routes`);
}

const authPath = "lib/auth.ts";
assert(existsSync(path.join(rootDir, authPath)), `${authPath} must exist`);
const authSource = readProjectFile(authPath);

const authRoutePaths = listFilesRecursively("app/api/auth");
assert(authRoutePaths.length > 0, "auth source contract must inspect at least one auth route");
assert(authRoutePaths.includes("app/api/auth/session/route.ts"), "auth session route must be included in the contract");

const authUserType = sectionBetween(authSource, "export type AuthUser = {", "};", authPath);
for (const publicField of ["id: string", "name: string", "email: string", "role: AppRole"]) {
  assert(authUserType.includes(publicField), `${authPath} AuthUser must include public field ${publicField}`);
}
for (const forbidden of ["passwordHash", "token", "tokenHash", "secret", "stack"]) {
  assert(!authUserType.includes(forbidden), `${authPath} AuthUser must not include ${forbidden}`);
}

const sessionPayloadType = sectionBetween(authSource, "type SessionPayload = AuthUser & {", "};", authPath);
for (const allowedSessionField of ["iat: number", "exp: number"]) {
  assert(sessionPayloadType.includes(allowedSessionField), `${authPath} SessionPayload must include ${allowedSessionField}`);
}
for (const forbidden of ["passwordHash", "token", "tokenHash", "secret", "stack"]) {
  assert(!sessionPayloadType.includes(forbidden), `${authPath} SessionPayload must not include ${forbidden}`);
}

const publicAuthUserFunction = sectionBetween(authSource, "export function publicAuthUser(user: AuthUser)", "export function normalizeEmail", authPath);
for (const requiredPublicMapping of ["id: user.id", "name: user.name", "email: user.email", "role: user.role"]) {
  assert(publicAuthUserFunction.includes(requiredPublicMapping), `${authPath} publicAuthUser must map ${requiredPublicMapping}`);
}
for (const forbidden of ["passwordHash", "token", "tokenHash", "secret", "stack", "...user"]) {
  assert(!publicAuthUserFunction.includes(forbidden), `${authPath} publicAuthUser must not expose ${forbidden}`);
}

const setSessionCookieFunction = sectionBetween(authSource, "export function setSessionCookie", "export function clearSessionCookie", authPath);
assert(setSessionCookieFunction.includes("httpOnly: true"), `${authPath} session cookie must be httpOnly`);
assert(setSessionCookieFunction.includes('sameSite: "lax"'), `${authPath} session cookie must set sameSite`);
assert(setSessionCookieFunction.includes("secure: process.env.NODE_ENV === \"production\""), `${authPath} session cookie must be secure in production`);
assert(!findCalls(authSource, "NextResponse.json").some((callSource) => callSource.includes("token")), `${authPath} must not JSON-return raw tokens`);
assert(!authSource.includes("error.stack"), `${authPath} must not expose stack traces in auth error handling`);
assert(!authSource.includes("JSON.stringify(error)"), `${authPath} must not stringify raw auth errors`);

for (const routePath of authRoutePaths) {
  assertAllowedSourcePath(routePath);
  assertRouteSourceContract(routePath, readProjectFile(routePath));
}

const loginRoutePath = "app/api/auth/login/route.ts";
if (existsSync(path.join(rootDir, loginRoutePath))) {
  const loginSource = readProjectFile(loginRoutePath);
  assert(loginSource.includes("verifyPassword(password, user.passwordHash)"), `${loginRoutePath} may use passwordHash only for verification`);
  assert(loginSource.includes("publicAuthUser(authUser)"), `${loginRoutePath} must sanitize login user response`);
  assert(loginSource.includes("setSessionCookie(response, createSessionToken(authUser))"), `${loginRoutePath} must put session token in the httpOnly cookie path`);
}

const sessionRoutePath = "app/api/auth/session/route.ts";
const sessionSource = readProjectFile(sessionRoutePath);
assert(sessionSource.includes("publicAuthUser(user)"), `${sessionRoutePath} must sanitize public session user`);
assert(!sessionSource.includes("passwordHash"), `${sessionRoutePath} must not mention passwordHash`);

console.log(`auth source contract tests passed for ${1 + authRoutePaths.length} files`);
