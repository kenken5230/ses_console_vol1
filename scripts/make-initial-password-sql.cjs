const { randomBytes, scryptSync } = require("node:crypto");
const fs = require("node:fs");

function hashPassword(password) {
  if (!password || password.length < 12) {
    throw new Error("Password must be at least 12 characters.");
  }

  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, 64, {
    N: 16384,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024
  }).toString("base64url");

  return `scrypt$v1$16384$8$1$${salt}$${hash}`;
}

function sqlString(value) {
  return "'" + String(value).replace(/'/g, "''") + "'";
}

const users = [
  { name: "板東聡", email: "vando@skv.co.jp", env: "PW_VANDO" },
  { name: "仲村悠太", email: "yu.nakamura@skv.co.jp", env: "PW_NAKAMURA" },
  { name: "溝上佳那", email: "kana.mizokami@skv.co.jp", env: "PW_MIZOKAMI" },
  { name: "木村涼太", email: "ryo.kimura@skv.co.jp", env: "PW_KIMURA" }
];

const lines = [
  "-- SES Console initial password setup",
  "-- Generated locally. Do not share password values.",
  "begin;"
];

for (const user of users) {
  const password = process.env[user.env];
  if (!password) {
    throw new Error(`Missing password env: ${user.env}`);
  }

  const passwordHash = hashPassword(password);

  lines.push("");
  lines.push(`update users`);
  lines.push(`set`);
  lines.push(`  password_hash = ${sqlString(passwordHash)},`);
  lines.push(`  password_changed_at = now(),`);
  lines.push(`  updated_at = now()`);
  lines.push(`where email = ${sqlString(user.email)};`);
}

lines.push("");
lines.push("commit;");
lines.push("");
lines.push("select name, email, role, is_active, password_hash is not null as has_password");
lines.push("from users");
lines.push("where email in ('vando@skv.co.jp','yu.nakamura@skv.co.jp','kana.mizokami@skv.co.jp','ryo.kimura@skv.co.jp')");
lines.push("order by email;");

fs.writeFileSync("update_initial_passwords.sql", lines.join("\n"), "utf8");

console.log("OK: update_initial_passwords.sql を作成しました。");
