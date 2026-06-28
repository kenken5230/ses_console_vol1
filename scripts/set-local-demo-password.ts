import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import { hashPassword } from "../lib/auth";
import { assertNotProductionMutation } from "../lib/production-guard";

const DEFAULT_EMAIL = "sales-a@example.invalid";

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

async function main() {
  if (process.env.ALLOW_LOCAL_DEMO_PASSWORD !== "1") {
    throw new Error("Refusing to set a demo password unless ALLOW_LOCAL_DEMO_PASSWORD=1.");
  }

  assertNotProductionMutation("set local demo password");

  const connectionString = requiredEnv("DATABASE_URL");
  const password = requiredEnv("LOCAL_DEMO_PASSWORD");
  const email = process.env.LOCAL_DEMO_EMAIL?.trim().toLowerCase() || DEFAULT_EMAIL;

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, role: true, isActive: true }
    });

    if (!user) {
      throw new Error(`User not found: ${email}`);
    }

    if (!user.isActive) {
      throw new Error(`User is inactive: ${email}`);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashPassword(password),
        passwordChangedAt: new Date()
      }
    });

    console.log(`OK: local demo password was set for ${user.email} (${user.role}).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(`NG: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
