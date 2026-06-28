require("dotenv").config();

const raw = process.env.DATABASE_URL;

if (!raw) {
  console.log("DATABASE_URL: not set");
  process.exit(0);
}

try {
  const url = new URL(raw);
  console.log("DATABASE_URL is set");
  console.log("host:", url.hostname);
  console.log("database:", url.pathname.replace("/", ""));
  console.log("sslmode:", url.searchParams.get("sslmode"));
  console.log("pooler:", url.hostname.includes("pooler"));
} catch (error) {
  console.log("DATABASE_URL parse error");
}
