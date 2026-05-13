import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { authErrorResponse, requireAnyRole } from "../../../lib/auth";

export const dynamic = "force-dynamic";

type ProjectCreatePayload = Record<string, string | undefined>;
type ProjectSkillTypeValue = "USED_TECHNOLOGY" | "REQUIRED" | "PREFERRED" | "OTHER";
type ProjectSkillCreateRow = {
  projectId: string;
  skillName: string;
  skillType: ProjectSkillTypeValue;
};
type TransactionClient = any;

const emptyToNull = (value?: string) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const normalizeCompanyName = (name: string) => name.trim().toLowerCase().replace(/\s+/g, "");

const parseNumber = (value?: string, label = "数値") => {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const normalized = trimmed.replace(/,/g, "");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label}は数値で入力してください`);
  }

  return Math.trunc(parsed);
};

const parseMonth = (value?: string) => {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}$/.test(trimmed)) {
    throw new Error("月項目はYYYY-MM形式で入力してください");
  }

  return new Date(`${trimmed}-01T00:00:00.000Z`);
};

const parseDate = (value?: string) => {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error("日付項目はYYYY-MM-DD形式で入力してください");
  }

  return new Date(`${trimmed}T00:00:00.000Z`);
};

const parseTimeRange = (value?: string) => {
  const trimmed = value?.trim();
  if (!trimmed) return { start: null, end: null };

  const match = trimmed.match(/(\d{1,2}):(\d{2}).*?(\d{1,2}):(\d{2})/);
  if (!match) return { start: null, end: null };

  const [, startHour, startMinute, endHour, endMinute] = match;
  return {
    start: new Date(`1970-01-01T${startHour.padStart(2, "0")}:${startMinute}:00.000Z`),
    end: new Date(`1970-01-01T${endHour.padStart(2, "0")}:${endMinute}:00.000Z`)
  };
};

const parseSettlementRange = (value?: string) => {
  const trimmed = value?.trim();
  if (!trimmed) return { min: null, max: null };

  const numbers = trimmed.match(/\d+/g)?.map(Number).filter(Number.isFinite) || [];
  return {
    min: numbers[0] ?? null,
    max: numbers[1] ?? numbers[0] ?? null
  };
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

const tradeStatusMap: Record<string, "UNKNOWN" | "OK" | "NG" | "NEEDS_REVIEW"> = {
  未確認: "UNKNOWN",
  取引OK: "OK",
  取引NG: "NG",
  要確認: "NEEDS_REVIEW"
};

const contractTypeMap: Record<string, "UNKNOWN" | "SEMI_DELEGATION" | "DISPATCH" | "CONTRACT" | "OTHER"> = {
  未確認: "UNKNOWN",
  準委任: "SEMI_DELEGATION",
  派遣: "DISPATCH",
  請負: "CONTRACT",
  その他: "OTHER"
};

const foreignNationalityMap: Record<string, "UNKNOWN" | "NEED_CONFIRMATION" | "ACCEPTABLE" | "NOT_ACCEPTABLE"> = {
  未確認: "UNKNOWN",
  要確認: "NEED_CONFIRMATION",
  可: "ACCEPTABLE",
  不可: "NOT_ACCEPTABLE"
};

const attendanceMap: Record<string, "NEED_CONFIRMATION" | "REQUIRED" | "NOT_REQUIRED"> = {
  未確認: "NEED_CONFIRMATION",
  必要: "REQUIRED",
  不要: "NOT_REQUIRED"
};

const roleLabels = [
  { key: "upperCompanyName", role: "UPPER_COMPANY", order: 1 },
  { key: "endUser", fallbackKey: "company", role: "END_USER", order: 2 },
  { key: "primeContractor", role: "PRIME_CONTRACTOR", order: 3 },
  { key: "secondaryContractor", role: "SECONDARY_CONTRACTOR", order: 4 },
  { key: "tertiaryContractor", role: "TERTIARY_CONTRACTOR", order: 5 }
] as const;

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

  if (salesUser) return salesUser.id;

  const anyUser = await prisma.user.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true }
  });

  return anyUser?.id || null;
}

async function findOrCreateCompany(tx: any, name: string, payload: ProjectCreatePayload, isUpperCompany: boolean) {
  const normalizedName = normalizeCompanyName(name);
  const existing = await tx.company.findFirst({ where: { normalizedName } });
  if (existing) return existing;

  return tx.company.create({
    data: {
      name,
      normalizedName,
      tradeStatus: isUpperCompany ? tradeStatusMap[payload.tradeStatus || ""] || "UNKNOWN" : "UNKNOWN",
      tdbScore: isUpperCompany ? parseNumber(payload.tdbScore, "帝国データバンク点数") : null
    }
  });
}

function buildConditionData(payload: ProjectCreatePayload) {
  const settlement = parseSettlementRange(payload.settlementTimeRange);
  const fixedWorkTime = parseTimeRange(payload.fixedWorkTime);
  const coreTime = parseTimeRange(payload.coreTime);
  const unitPrice = parseNumber(payload.unitPrice, "単価");
  const upperAmount = parseNumber(payload.upperAmount, "上位金額");
  const commerceNotes = emptyToNull(payload.commerceFlow);

  return {
    unitPriceMin: unitPrice,
    unitPriceMax: unitPrice,
    unitPriceText: unitPrice ? `${unitPrice}万円` : null,
    upperAmountMin: upperAmount,
    upperAmountMax: upperAmount,
    commissionFeeAmount: null,
    amProjectFeeAmount: 0,
    bankruptcyPredictionFeeAmount: null,
    recruitingCount: parseNumber(payload.recruitingCount, "募集人数"),
    workload: emptyToNull(payload.workload),
    startMonth: parseMonth(payload.projectStartMonth || payload.startMonth),
    expectedWorkDaysPerWeek: parseNumber(payload.expectedWorkDaysPerWeek, "想定稼働日数"),
    settlementTimeMin: settlement.min,
    settlementTimeMax: settlement.max,
    fixedWorkStartTime: fixedWorkTime.start,
    fixedWorkEndTime: fixedWorkTime.end,
    coreTimeStart: coreTime.start,
    coreTimeEnd: coreTime.end,
    workLocationText: emptyToNull(payload.workLocation),
    prefecture: emptyToNull(payload.prefecture),
    remoteType: "UNKNOWN" as const,
    workEnvironment: emptyToNull(payload.workEnvironment),
    contractType: contractTypeMap[payload.contractType || ""] || "UNKNOWN",
    foreignNationalityPolicy: foreignNationalityMap[payload.foreignNationalityPolicy || ""] || "UNKNOWN",
    ageCondition: emptyToNull(payload.ageCondition),
    siteAtmosphere: emptyToNull(payload.siteAtmosphere),
    dressCode: emptyToNull(payload.dressCode),
    hairNailRule: emptyToNull(payload.hairNailRule),
    interviewCount: parseNumber(payload.interviewCount, "面談回数"),
    salesInterviewAttendanceRequired: attendanceMap[payload.salesInterviewAttendanceRequired || ""] || "NEED_CONFIRMATION",
    amContactRequired: false,
    amContactName: null,
    notes: commerceNotes ? `商流: ${commerceNotes}` : null
  };
}

async function upsertCompanyRoles(tx: TransactionClient, projectId: string, payload: ProjectCreatePayload) {
  const createdCompanyByRole = new Map<string, any>();
  const commerceNotes = emptyToNull(payload.commerceFlow);

  for (const roleConfig of roleLabels) {
    const fallbackKey = "fallbackKey" in roleConfig ? roleConfig.fallbackKey : undefined;
    const companyName = emptyToNull(payload[roleConfig.key]) || emptyToNull(fallbackKey ? payload[fallbackKey] : undefined);
    if (!companyName) continue;

    const roleKey = `${roleConfig.role}:${normalizeCompanyName(companyName)}`;
    if (createdCompanyByRole.has(roleKey)) continue;

    const company = await findOrCreateCompany(tx, companyName, payload, roleConfig.role === "UPPER_COMPANY");
    const contact = roleConfig.role === "UPPER_COMPANY" ? await findOrCreateUpperContact(tx, company.id, payload) : null;
    const existingRole = await tx.projectCompanyRole.findFirst({
      where: { projectId, role: roleConfig.role }
    });

    if (existingRole) {
      await tx.projectCompanyRole.update({
        where: { id: existingRole.id },
        data: {
          companyId: company.id,
          companyContactId: contact?.id || null,
          roleOrder: roleConfig.order,
          isPrimary: roleConfig.role === "UPPER_COMPANY",
          notes: commerceNotes
        }
      });
    } else {
      await tx.projectCompanyRole.create({
        data: {
          projectId,
          companyId: company.id,
          companyContactId: contact?.id || null,
          role: roleConfig.role,
          roleOrder: roleConfig.order,
          isPrimary: roleConfig.role === "UPPER_COMPANY",
          notes: commerceNotes
        }
      });
    }

    createdCompanyByRole.set(roleKey, company);
  }
}

async function replaceProjectSkills(tx: TransactionClient, projectId: string, payload: ProjectCreatePayload) {
  await tx.projectSkill.deleteMany({ where: { projectId } });
  const skillRows = buildSkillRows(projectId, payload);
  if (skillRows.length) {
    await tx.projectSkill.createMany({ data: skillRows });
  }
}

async function syncFocusTag(tx: TransactionClient, projectId: string, isFocus: boolean) {
  const tag = "注力案件";
  if (!isFocus) {
    await tx.projectTag.deleteMany({ where: { projectId, tag, tagType: "MANUAL" } });
    return;
  }

  const existingTag = await tx.projectTag.findFirst({ where: { projectId, tag, tagType: "MANUAL" } });
  if (!existingTag) {
    await tx.projectTag.create({ data: { projectId, tag, tagType: "MANUAL" } });
  }
}

async function findOrCreateUpperContact(tx: any, companyId: string, payload: ProjectCreatePayload) {
  const contactName = emptyToNull(payload.upperContactName);
  const contactValue = emptyToNull(payload.contact);
  if (!contactName && !contactValue) return null;

  const email = contactValue?.includes("@") ? contactValue : null;
  const phone = contactValue && !contactValue.includes("@") ? contactValue : null;
  const name = contactName || contactValue || "上位担当者";

  const existing = await tx.companyContact.findFirst({
    where: {
      companyId,
      OR: [{ name }, email ? { email } : undefined, phone ? { phone } : undefined].filter(Boolean)
    }
  });

  if (existing) return existing;

  return tx.companyContact.create({
    data: {
      companyId,
      name,
      email,
      phone,
      contactPolicy: "案件作成フォームから登録"
    }
  });
}

function buildSkillRows(projectId: string, payload: ProjectCreatePayload): ProjectSkillCreateRow[] {
  const toRows = (value: string | undefined, skillType: ProjectSkillTypeValue): ProjectSkillCreateRow[] => {
    return splitList(value).map((skillName) => ({ projectId, skillName, skillType }));
  };

  const rows: ProjectSkillCreateRow[] = [
    ...toRows(payload.usedTechnologies, "USED_TECHNOLOGY"),
    ...toRows(payload.requiredSkills, "REQUIRED"),
    ...toRows(payload.preferredSkills, "PREFERRED"),
    ...toRows(payload.skills, "OTHER")
  ];

  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = `${row.skillType}:${row.skillName}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function POST(request: Request) {
  try {
    const authUser = await requireAnyRole(request, ["ADMIN", "MANAGER", "SALES"]);
    const payload = (await request.json()) as ProjectCreatePayload;
    const title = emptyToNull(payload.title);
    if (!title) {
      return NextResponse.json({ message: "案件名は必須です" }, { status: 400 });
    }

    const createdByUserId = authUser.id || (await findDefaultUserId(emptyToNull(payload.createdBy)));
    const projectCreatedAt = parseDate(payload.createdAt);
    const projectCode = `MOC-${Date.now().toString(36).toUpperCase()}`;
    const isFocus = payload.isFocus === "該当";
    const conditionData = buildConditionData(payload);

    const project = await prisma.$transaction(async (tx) => {
      const createdProject = await tx.project.create({
        data: {
          projectCode,
          title,
          summary: emptyToNull(payload.workDescription)?.slice(0, 500) || null,
          workDescription: emptyToNull(payload.workDescription),
          createdByUserId,
          ownerUserId: createdByUserId,
          status: "OPEN",
          priorityLevel: isFocus ? 2 : null,
          isFocus,
          createdAt: projectCreatedAt || undefined,
          publishedAt: new Date()
        }
      });

      await tx.projectCondition.create({
        data: {
          projectId: createdProject.id,
          ...conditionData
        }
      });

      await upsertCompanyRoles(tx, createdProject.id, payload);
      await replaceProjectSkills(tx, createdProject.id, payload);
      await syncFocusTag(tx, createdProject.id, isFocus);

      return createdProject;
    });

    return NextResponse.json({ projectId: project.id, message: "案件を作成しました" }, { status: 201 });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    const message = error instanceof Error ? error.message : "案件作成に失敗しました";
    const status = message.includes("必須") || message.includes("数値") || message.includes("形式") ? 400 : 500;

    return NextResponse.json({ message }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    const authUser = await requireAnyRole(request, ["ADMIN", "MANAGER", "SALES"]);
    const payload = (await request.json()) as ProjectCreatePayload & { id?: string; action?: string };
    const projectId = emptyToNull(payload.id);
    if (!projectId) {
      return NextResponse.json({ message: "案件IDが必要です" }, { status: 400 });
    }

    if (payload.action === "archive") {
      await prisma.project.update({
        where: { id: projectId },
        data: { status: "ARCHIVED" }
      });

      return NextResponse.json({ projectId, message: "案件をアーカイブしました" });
    }

    const title = emptyToNull(payload.title);
    if (!title) {
      return NextResponse.json({ message: "案件名は必須です" }, { status: 400 });
    }

    const existingProject = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
    if (!existingProject) {
      return NextResponse.json({ message: "案件が見つかりません" }, { status: 404 });
    }

    const createdByUserId = authUser.id || (await findDefaultUserId(emptyToNull(payload.createdBy)));
    const projectCreatedAt = parseDate(payload.createdAt);
    const isFocus = payload.isFocus === "該当";
    const conditionData = buildConditionData(payload);

    await prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id: projectId },
        data: {
          title,
          summary: emptyToNull(payload.workDescription)?.slice(0, 500) || null,
          workDescription: emptyToNull(payload.workDescription),
          createdByUserId,
          ownerUserId: createdByUserId,
          priorityLevel: isFocus ? 2 : null,
          isFocus,
          createdAt: projectCreatedAt || undefined
        }
      });

      await tx.projectCondition.upsert({
        where: { projectId },
        create: {
          projectId,
          ...conditionData
        },
        update: conditionData
      });

      await upsertCompanyRoles(tx, projectId, payload);
      await replaceProjectSkills(tx, projectId, payload);
      await syncFocusTag(tx, projectId, isFocus);
    });

    return NextResponse.json({ projectId, message: "案件を更新しました" });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    const message = error instanceof Error ? error.message : "案件更新に失敗しました";
    const status = message.includes("必須") || message.includes("数値") || message.includes("形式") ? 400 : 500;

    return NextResponse.json({ message }, { status });
  }
}
