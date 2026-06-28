const fs = require("node:fs");
const { scryptSync, timingSafeEqual } = require("node:crypto");

const sqlPath = "update_initial_passwords.sql";

if (!fs.existsSync(sqlPath)) {
  console.error("NG: update_initial_passwords.sql が見つかりません。");
  process.exit(1);
}

const sql = fs.readFileSync(sqlPath, "utf8");

const users = [
  { name: "板東聡", email: "vando@skv.co.jp", env: "PW_VANDO" },
  { name: "仲村悠太", email: "yu.nakamura@skv.co.jp", env: "PW_NAKAMURA" },
  { name: "溝上佳那", email: "kana.mizokami@skv.co.jp", env: "PW_MIZOKAMI" },
  { name: "木村涼太", email: "ryo.kimura@skv.co.jp", env: "PW_KIMURA" }
];

function extractHashForEmail(email) {
  const escapedEmail = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(
    "password_hash\\s*=\\s*'([^']+)'[\\s\\S]*?where\\s+email\\s*=\\s*'" + escapedEmail + "'",
    "i"
  );
  const match = sql.match(regex);
  return match ? match[1] : null;
}

function verifyPassword(password, storedHash) {
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

let allOk = true;

for (const user of users) {
  const password = process.env[user.env];
  const storedHash = extractHashForEmail(user.email);

  if (!storedHash) {
    console.log(`NG: ${user.name} / ${user.email} のpassword_hashがSQL内に見つかりません`);
    allOk = false;
    continue;
  }

  if (!password) {
    console.log(`NG: ${user.name} の確認用パスワードが入力されていません`);
    allOk = false;
    continue;
  }

  const ok = verifyPassword(password, storedHash);
  console.log(`${ok ? "OK" : "NG"}: ${user.name} / ${user.email}`);

  if (!ok) allOk = false;
}

if (!allOk) {
  console.error("NG: 一致しないものがあります。Neonにはまだ貼らないでください。");
  process.exit(1);
}

console.log("OK: 4人分すべて、入力した仮パスワードとSQL内のpassword_hashが一致しました。");
