const { Client } = require("pg");

const url = process.env.DATABASE_URL;

if (!url) {
  console.error("NG: DATABASE_URL is not set");
  process.exit(1);
}

async function main() {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    console.error("NG: DATABASE_URL parse failed");
    process.exit(1);
  }

  console.log("DATABASE_URL is set");
  console.log("host:", parsed.hostname);
  console.log("database:", parsed.pathname.replace("/", ""));
  console.log("sslmode:", parsed.searchParams.get("sslmode"));
  console.log("pooler:", parsed.hostname.includes("pooler"));

  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const result = await client.query("select count(*)::int as users_count from users");
    console.log("DB CONNECT OK");
    console.log("users_count:", result.rows[0].users_count);
  } catch (error) {
    console.error("DB CONNECT NG");
    console.error("code:", error.code || "");
    console.error("message:", error.message || "");
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
}

main();
