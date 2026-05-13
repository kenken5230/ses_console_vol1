import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { authErrorResponse, requireAnyRole } from "../../../lib/auth";

export const dynamic = "force-dynamic";

type PersonCreatePayload = Record<string, string | undefined>;

const emptyToNull = (value?: string) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const normalizeCompanyName = (name: string) => name.trim().toLowerCase().replace(/\s+/g, "");

const parseNumber = (value?: string, label = "数値") => {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed.replace(/,/g, ""));
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label}は数値で入力してください`);
  }

  return Math.trunc(parsed);
};

const parseDate = (value?: string) => {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error("日付項目はYYYY-MM-DD形式で入力してください");
  }

  return new Date(`${trimmed}T00:00:00.000Z`);
};

const splitList = (value?: string) => {
  return Array.from(
    new Set(
      (value || "")
        .split(/[\n,、/／]+/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
};

const statusMap: Record<string, "AVAILABLE" | "PROPOSING" | "JOINED" | "INACTIVE"> = {
  提案可: "AVAILABLE",
  提案中: "PROPOSING",
  参画中: "JOINED",
  停止: "INACTIVE"
};

async function findDefaultUserId(createdByName?: string | null) {
  if (createdByName) {
    const namedUser = await prisma.user.findFirst({
      where: {
        OR: [{ name: createdByName }, { email: createdByName }]
      },
      select: { id: true }
    });

    if (namedUser) return namedUser.id;
  }

  const salesUser = await prisma.user.findFirst({
    where: { role: "SALES", isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true }
  });

  return salesUser?.id || null;
}

async function findOrCreateCompany(tx: any, name?: string | null) {
  if (!name) return null;
  const normalizedName = normalizeCompanyName(name);
  const existing = await tx.company.findFirst({ where: { normalizedName } });
  if (existing) return existing;

  return tx.company.create({
    data: {
      name,
      normalizedName,
      tradeStatus: "UNKNOWN"
    }
  });
}

async function findOrCreateContact(tx: any, companyId: string | null, payload: PersonCreatePayload) {
  if (!companyId) return null;
  const name = emptyToNull(payload.ownerContactName);
  const email = emptyToNull(payload.ownerContactEmail);
  if (!name && !email) return null;

  const existing = await tx.companyContact.findFirst({
    where: {
      companyId,
      OR: [{ name: name || "" }, email ? { email } : undefined].filter(Boolean)
    }
  });

  if (existing) return existing;

  return tx.companyContact.create({
    data: {
      companyId,
      name: name || email || "要員担当者",
      email,
      contactPolicy: "要員作成フォームから登録"
    }
  });
}

export async function POST(request: Request) {
  try {
    const authUser = await requireAnyRole(request, ["ADMIN", "MANAGER", "SALES"]);
    const payload = (await request.json()) as PersonCreatePayload;
    const name = emptyToNull(payload.name);
    if (!name) {
      return NextResponse.json({ message: "要員名は必須です" }, { status: 400 });
    }

    const createdByUserId = authUser.id || (await findDefaultUserId(emptyToNull(payload.createdBy)));
    const createdAt = parseDate(payload.createdAt);
    const skillNames = splitList(payload.skills);

    const person = await prisma.$transaction(async (tx) => {
      const company = await findOrCreateCompany(tx, emptyToNull(payload.ownerCompanyName));
      const contact = await findOrCreateContact(tx, company?.id || null, payload);
      const createdPerson = await tx.person.create({
        data: {
          personCode: `MOC-PER-${Date.now().toString(36).toUpperCase()}`,
          name,
          initials: emptyToNull(payload.initials),
          ownerCompanyId: company?.id || null,
          ownerContactId: contact?.id || null,
          summary: emptyToNull(payload.summary),
          careerSummary: emptyToNull(payload.careerSummary),
          desiredUnitPrice: parseNumber(payload.desiredUnitPrice, "希望単価"),
          availableFrom: parseDate(payload.availableFrom),
          preferredLocation: emptyToNull(payload.preferredLocation),
          remotePreference: emptyToNull(payload.remotePreference),
          age: parseNumber(payload.age, "年齢"),
          nationality: emptyToNull(payload.nationality),
          status: statusMap[payload.status || ""] || "AVAILABLE",
          createdByUserId,
          createdAt: createdAt || undefined
        }
      });

      if (skillNames.length) {
        await tx.personSkill.createMany({
          data: skillNames.map((skillName) => ({
            personId: createdPerson.id,
            skillName
          }))
        });
      }

      return createdPerson;
    });

    return NextResponse.json({ personId: person.id, message: "要員を作成しました" }, { status: 201 });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    const message = error instanceof Error ? error.message : "要員作成に失敗しました";
    const status = message.includes("必須") || message.includes("数値") || message.includes("形式") ? 400 : 500;

    return NextResponse.json({ message }, { status });
  }
}
