import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { authErrorResponse, requireAnyRole } from "../../../lib/auth";
import {
  InputValidationError,
  emptyToNull,
  parseDateInput,
  parseEmailInput,
  parseNumberInput,
  parseSelectInput,
  splitListInput
} from "../../../lib/input-standard-validation";

export const dynamic = "force-dynamic";

type PersonCreatePayload = Record<string, string | undefined>;

const normalizeCompanyName = (name: string) => name.trim().toLowerCase().replace(/\s+/g, "");

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
  const email = parseEmailInput(payload.ownerContactEmail, "担当者メール");
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
    const createdAt = parseDateInput(payload.createdAt, "作成日");
    const skillNames = splitListInput(payload.skills);

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
          desiredUnitPrice: parseNumberInput(payload.desiredUnitPrice, "希望単価"),
          availableFrom: parseDateInput(payload.availableFrom, "稼働開始日"),
          preferredLocation: emptyToNull(payload.preferredLocation),
          remotePreference: emptyToNull(payload.remotePreference),
          age: parseNumberInput(payload.age, "年齢"),
          nationality: emptyToNull(payload.nationality),
          status: parseSelectInput(payload.status, "状態", statusMap, "AVAILABLE"),
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
    const status = error instanceof InputValidationError || message.includes("必須") ? 400 : 500;

    return NextResponse.json({ message }, { status });
  }
}
