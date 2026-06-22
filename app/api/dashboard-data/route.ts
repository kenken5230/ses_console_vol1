import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { authErrorResponse, requireAuth } from "../../../lib/auth";
import {
  mapPersonOwnerReadOnly,
  mapProjectCompanyRolesReadOnly,
  type SafeDashboardCompany,
  type SafeDashboardCompanyContact,
  type SafeDashboardProjectCompanyRole
} from "../../../lib/dashboard-company-readonly";
import { type CompanyContactCandidate } from "../../../lib/company-contact-candidates";
import { isCompanyContactLinkWriterRole } from "../../../lib/link-safety-policy";
import { mergePersonFormInitialValues } from "../../../lib/person-form-contract";
import { projectCompanyContactRoleLinkGuard } from "../../../lib/project-company-contact-role-link";

export const dynamic = "force-dynamic";
const EMPTY_VALUE = "-";

type DetailItem = {
  label: string;
  value?: string;
  type?: "block" | "tags" | "commerce" | "mail" | "companyContacts" | "companyContactCandidates";
  tags?: string[];
  items?: string[][];
  companyContacts?: DetailCompanyContact[];
  companyContactCandidates?: CompanyContactCandidate[];
  mailDbId?: string | null;
  emphasis?: boolean;
};

type DetailGroup = {
  title: string;
  items: DetailItem[];
};

type DetailCompanyContact = {
  role: string;
  roleLabel: string;
  isPrimary: boolean;
  company: SafeDashboardCompany | null;
  contact: SafeDashboardCompanyContact | null;
};

function formatDate(value: Date | null | undefined) {
  if (!value) return "";
  return value.toISOString().slice(0, 10);
}

function formatMonth(value: Date | null | undefined) {
  if (!value) return EMPTY_VALUE;
  return value.toISOString().slice(0, 7);
}

function formatTime(value: Date | null | undefined) {
  if (!value) return "";
  return value.toISOString().slice(11, 16);
}

function formatTimeRange(start?: Date | null, end?: Date | null) {
  const startText = formatTime(start);
  const endText = formatTime(end);
  if (startText && endText) return `${startText}〜${endText}`;
  if (startText) return `${startText}〜`;
  if (endText) return `〜${endText}`;
  return EMPTY_VALUE;
}

function formatInputTimeRange(start?: Date | null, end?: Date | null) {
  const startText = formatTime(start);
  const endText = formatTime(end);
  if (startText && endText) return `${startText}〜${endText}`;
  return "";
}

function formatSettlementInput(min?: number | null, max?: number | null) {
  if (min && max) return `${min}〜${max}h`;
  if (min) return `${min}h`;
  return "";
}

function formatInputNumber(value?: number | null) {
  return value === null || value === undefined ? "" : String(value);
}

function formatNullable(value: any) {
  if (value === null || value === undefined || value === "") return EMPTY_VALUE;
  return String(value);
}

function formatYen(value?: number | null) {
  if (!value) return EMPTY_VALUE;
  return `${value.toLocaleString()}円`;
}

function formatMoneyRange(min?: number | null, max?: number | null, text?: string | null) {
  if (text) return text;
  if (min && max) return `${min}〜${max}万円`;
  if (min) return `${min}万円〜`;
  if (max) return `〜${max}万円`;
  return EMPTY_VALUE;
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    DRAFT: "下書き",
    OPEN: "公開",
    PAUSED: "一時停止",
    CLOSED: "募集終了",
    ARCHIVED: "アーカイブ",
    AVAILABLE: "提案可",
    PROPOSING: "提案中",
    JOINED: "参画中",
    INACTIVE: "停止",
    PROPOSED: "提案済み",
    ENTERED: "エントリー済み",
    INTERVIEW_SCHEDULING: "面談調整中",
    INTERVIEWED: "面談済み",
    OFFERED: "オファー済み",
    REJECTED: "見送り",
    WITHDRAWN: "辞退",
    SENT: "送信済み",
    FAILED: "失敗",
    BOUNCED: "不達",
    REPLIED: "返信あり",
    UNKNOWN: "不明"
  };

  return labels[status] || status;
}

function personStatusInputLabel(status: string) {
  const labels: Record<string, string> = {
    AVAILABLE: "提案可",
    PROPOSING: "提案中",
    JOINED: "参画中",
    INACTIVE: "停止"
  };

  return labels[status] || status;
}

function tradeStatusInputLabel(status?: string | null) {
  const labels: Record<string, string> = {
    UNKNOWN: "未確認",
    OK: "取引OK",
    NG: "取引NG",
    SUSPENDED: "取引NG",
    NEEDS_REVIEW: "要確認"
  };

  return status ? labels[status] || "未確認" : "";
}

function contractTypeInputLabel(contractType?: string | null) {
  const labels: Record<string, string> = {
    UNKNOWN: "未確認",
    SEMI_DELEGATION: "準委任",
    DISPATCH: "派遣",
    CONTRACT: "請負",
    OTHER: "その他"
  };

  return contractType ? labels[contractType] || "未確認" : "";
}

function foreignNationalityInputLabel(policy?: string | null) {
  const labels: Record<string, string> = {
    UNKNOWN: "未確認",
    NEED_CONFIRMATION: "要確認",
    ACCEPTABLE: "可",
    NOT_ACCEPTABLE: "不可"
  };

  return policy ? labels[policy] || "未確認" : "";
}

function attendanceInputLabel(policy?: string | null) {
  const labels: Record<string, string> = {
    NEED_CONFIRMATION: "未確認",
    REQUIRED: "必要",
    NOT_REQUIRED: "不要"
  };

  return policy ? labels[policy] || "未確認" : "";
}

function companyRoleLabel(role: string) {
  const labels: Record<string, string> = {
    UPPER_COMPANY: "上位会社",
    END_USER: "エンドユーザー",
    PRIME_CONTRACTOR: "元請",
    SECONDARY_CONTRACTOR: "二次請け",
    TERTIARY_CONTRACTOR: "三次請け",
    PROPOSAL_TARGET: "提案先",
    OTHER: "その他"
  };

  return labels[role] || role;
}

function remoteLabel(remoteType?: string | null) {
  const labels: Record<string, string> = {
    UNKNOWN: "未確認",
    ONSITE: "常駐",
    HYBRID: "リモート併用",
    REMOTE: "リモート",
    FULL_REMOTE: "フルリモート"
  };

  return remoteType ? labels[remoteType] || remoteType : EMPTY_VALUE;
}

function remoteTypeInputLabel(remoteType?: string | null) {
  const label = remoteLabel(remoteType);
  return label === EMPTY_VALUE ? "" : label;
}

function contractTypeLabel(contractType?: string | null) {
  const labels: Record<string, string> = {
    UNKNOWN: "未確認",
    SEMI_DELEGATION: "準委任",
    DISPATCH: "派遣",
    CONTRACT: "請負",
    OTHER: "その他"
  };

  return contractType ? labels[contractType] || contractType : EMPTY_VALUE;
}

function foreignNationalityLabel(policy?: string | null) {
  const labels: Record<string, string> = {
    UNKNOWN: "未確認",
    NEED_CONFIRMATION: "要確認",
    ACCEPTABLE: "可",
    NOT_ACCEPTABLE: "不可"
  };

  return policy ? labels[policy] || policy : EMPTY_VALUE;
}

function salesInterviewAttendanceLabel(policy?: string | null) {
  const labels: Record<string, string> = {
    NEED_CONFIRMATION: "要確認",
    REQUIRED: "必要",
    NOT_REQUIRED: "不要"
  };

  return policy ? labels[policy] || policy : EMPTY_VALUE;
}

function findRole(project: any, role: string) {
  return project.companyRoles.find((item: any) => item.role === role);
}

function pickProjectCompanyRole(project: any) {
  const preferredRoles = ["UPPER_COMPANY", "PRIME_CONTRACTOR", "END_USER"];
  for (const role of preferredRoles) {
    const found = findRole(project, role);
    if (found) return found;
  }
  return project.companyRoles[0];
}

function roleCompanyName(project: any, role: string) {
  return findRole(project, role)?.company?.name || EMPTY_VALUE;
}

function formatSkillList(skills: string[]) {
  return skills.length ? skills : [EMPTY_VALUE];
}

function makeTextItem(label: string, value: any, emphasis = false): DetailItem {
  return { label, value: formatNullable(value), emphasis };
}

function makeBlockItem(label: string, value: any): DetailItem {
  return { label, type: "block", value: formatNullable(value) };
}

function makeMailItem(mail: any): DetailItem {
  if (!mail) return { label: "元メール", type: "mail", value: "元メール情報なし" };

  const headerLines = [
    mail.subject ? `件名: ${mail.subject}` : "件名: -",
    mail.fromName || mail.fromEmail ? `送信者: ${[mail.fromName, mail.fromEmail].filter(Boolean).join(" / ")}` : "送信者: -",
    mail.messageDate || mail.receivedAt ? `受信日時: ${formatDate(mail.messageDate || mail.receivedAt)}` : "受信日時: -",
    mail.externalMessageId ? `Gmail messageId: ${mail.externalMessageId}` : "Gmail messageId: -",
    mail.externalThreadId ? `threadId: ${mail.externalThreadId}` : "threadId: -"
  ].filter(Boolean);

  return {
    label: "元メール",
    type: "mail",
    value: headerLines.join("\n"),
    mailDbId: mail.id || null
  };
}

function hasNeedsReviewExtraction(sourceMail: any, targetType: "PROJECT" | "PERSON", targetId: string) {
  return matchingExtractionResults(sourceMail, targetType, targetId).some((result: any) => {
    return result.targetType === targetType && result.targetId === targetId && result.reviewStatus === "NEEDS_REVIEW";
  });
}

function matchingExtractionResults(sourceMail: any, targetType: "PROJECT" | "PERSON", targetId: string) {
  const extractionResults = sourceMail?.extractionResults || [];
  return extractionResults.filter((result: any) => {
    return result.targetType === targetType && result.targetId === targetId;
  });
}

function latestMatchingExtractionResult(sourceMail: any, targetType: "PROJECT" | "PERSON", targetId: string) {
  return matchingExtractionResults(sourceMail, targetType, targetId).sort((a: any, b: any) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  })[0];
}

function latestNormalizedExtraction(sourceMail: any, targetType: "PROJECT" | "PERSON", targetId: string) {
  const result = latestMatchingExtractionResult(sourceMail, targetType, targetId);
  return result?.normalizedResult && typeof result.normalizedResult === "object"
    ? result.normalizedResult
    : {};
}

function normalizedStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}

function missingPersonDisplayName(person: any) {
  const id = person.sourceMail?.id || person.sourceMailId || person.id;
  return `氏名未取得（GMAIL-${String(id).slice(0, 8).toUpperCase()}）`;
}

function formatDateTime(value: Date | null | undefined) {
  if (!value) return EMPTY_VALUE;
  return value.toISOString().replace("T", " ").slice(0, 16);
}

function normalizeCompanyLike(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function domainFromEmail(email?: string | null) {
  const domain = email?.split("@")[1]?.trim().toLowerCase();
  return domain || "";
}

function categoryLabel(category: string) {
  const labels: Record<string, string> = {
    PROJECT_INTRO: "案件紹介",
    PERSON_INTRO: "要員紹介",
    SEMINAR: "セミナー",
    NEWSLETTER: "メルマガ",
    SALES_AD: "営業広告",
    NORMAL_CONTACT: "通常連絡",
    OTHER: "その他",
    NEEDS_REVIEW: "要確認",
    EXCLUDED: "除外"
  };

  return labels[category] || category;
}

function inferSenderCompany(mail: any, companies: any[]) {
  const emailDomain = domainFromEmail(mail.fromEmail);
  const senderText = normalizeCompanyLike([mail.fromName, mail.fromEmail].filter(Boolean).join(" "));
  const domainMatch = emailDomain
    ? companies.find((company) => {
        const domain = company.mainEmailDomain?.toLowerCase();
        return domain && (emailDomain === domain || emailDomain.endsWith(`.${domain}`));
      })
    : null;
  if (domainMatch) return domainMatch;

  const nameMatch = companies.find((company) => company.normalizedName && senderText.includes(company.normalizedName));
  if (nameMatch) return nameMatch;

  return null;
}

function stripMailSignature(value?: string | null) {
  const text = value || "";
  const signatureMarkers = ["-- ", "――", "-----Original Message-----", "差出人:"];
  let result = text;
  for (const marker of signatureMarkers) {
    const index = result.indexOf(marker);
    if (index > 240) {
      result = result.slice(0, index).trim();
      break;
    }
  }
  return result || EMPTY_VALUE;
}

function htmlToText(html?: string | null) {
  if (!html) return "";
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function mailBodyText(mail: any) {
  return stripMailSignature(mail?.bodyText || mail?.normalizedBody || htmlToText(mail?.bodyHtml));
}

function makeTagsItem(label: string, tags: string[]): DetailItem {
  return { label, type: "tags", tags: formatSkillList(tags) };
}

function makeCommerceItem(label: string, items: string[][]): DetailItem {
  return { label, type: "commerce", items: items.length ? items : [["商流", EMPTY_VALUE]] };
}

function roleToCompanyContact(role: SafeDashboardProjectCompanyRole): DetailCompanyContact {
  return {
    role: role.role,
    roleLabel: companyRoleLabel(role.role),
    isPrimary: role.isPrimary,
    company: role.company,
    contact: role.contact
  };
}

function makeCompanyContactsItem(label: string, companyContacts: DetailCompanyContact[]): DetailItem {
  return {
    label,
    type: "companyContacts",
    companyContacts
  };
}

function makeCompanyContactCandidatesItem(
  label: string,
  companyContactCandidates: CompanyContactCandidate[]
): DetailItem {
  return {
    label,
    type: "companyContactCandidates",
    companyContactCandidates
  };
}

function makeOwnerCompanyContactItem(
  label: string,
  ownerCompany: SafeDashboardCompany | null,
  ownerContact: SafeDashboardCompanyContact | null
): DetailItem {
  return makeCompanyContactsItem(label, [
    {
      role: "OWNER_COMPANY",
      roleLabel: "所属会社",
      isPrimary: true,
      company: ownerCompany,
      contact: ownerContact
    }
  ]);
}

function mapProject(project: any) {
  const condition = project.condition;
  const skills = project.skills.map((skill: any) => skill.skillName);
  const requiredSkills = project.skills.filter((skill: any) => skill.skillType === "REQUIRED").map((skill: any) => skill.skillName);
  const preferredSkills = project.skills.filter((skill: any) => skill.skillType === "PREFERRED").map((skill: any) => skill.skillName);
  const usedTechnologySkills = project.skills.filter((skill: any) => skill.skillType === "USED_TECHNOLOGY").map((skill: any) => skill.skillName);
  const hiddenLegacyTags = new Set(["法人CS注力案件", "交代要員"]);
  const tags = project.tags.map((tag: any) => tag.tag).filter((tag: string) => !hiddenLegacyTags.has(tag));
  const locations = [condition?.prefecture, condition?.workLocationText].filter(Boolean);
  const upperAmount = formatMoneyRange(condition?.upperAmountMin, condition?.upperAmountMax);
  const unitPrice = upperAmount !== EMPTY_VALUE ? upperAmount : formatMoneyRange(condition?.unitPriceMin, condition?.unitPriceMax, condition?.unitPriceText);
  const projectUnitPrice = formatMoneyRange(condition?.unitPriceMin, condition?.unitPriceMax, condition?.unitPriceText);
  const createdAt = formatDate(project.createdAt);
  const companyRoles = mapProjectCompanyRolesReadOnly(project.companyRoles);
  const companyContactRows = companyRoles.map(roleToCompanyContact);
  const upperCompanyRole = pickProjectCompanyRole(project);
  const company = upperCompanyRole?.company?.name || EMPTY_VALUE;
  const upperCompany = upperCompanyRole?.company;
  const companyTradeStatuses = project.companyRoles.map((role: any) => role.company.tradeStatus).filter(Boolean);
  const endUser = roleCompanyName(project, "END_USER");
  const primeContractor = roleCompanyName(project, "PRIME_CONTRACTOR");
  const secondaryContractor = roleCompanyName(project, "SECONDARY_CONTRACTOR");
  const tertiaryContractor = roleCompanyName(project, "TERTIARY_CONTRACTOR");
  const commerceItems = project.companyRoles
    .filter((role: any) => role.role !== "ACCOUNT_MANAGER_COMPANY")
    .sort((a: any, b: any) => a.roleOrder - b.roleOrder)
    .map((role: any) => [companyRoleLabel(role.role), role.company.name]);
  const commercePath = commerceItems.map(([, name]: string[]) => name).join(" → ") || EMPTY_VALUE;
  const primaryContactRole = project.companyRoles.find((role: any) => role.companyContact);
  const primaryContact = primaryContactRole?.companyContact;
  const fixedWorkTime = formatTimeRange(condition?.fixedWorkStartTime, condition?.fixedWorkEndTime);
  const coreTime = formatTimeRange(condition?.coreTimeStart, condition?.coreTimeEnd);
  const commerceNote = condition?.notes?.startsWith("商流: ") ? condition.notes.replace(/^商流:\s*/, "") : "";
  const needsReview = hasNeedsReviewExtraction(project.sourceMail, "PROJECT", project.id);
  const companyContactCandidates: CompanyContactCandidate[] = [];
  const projectFormValues = {
    title: project.title || "",
    upperCompanyName: company === EMPTY_VALUE ? "" : company,
    tradeStatus: tradeStatusInputLabel(upperCompany?.tradeStatus),
    tdbScore: upperCompany?.tdbScore?.toString?.() || "",
    workDescription: project.workDescription || "",
    usedTechnologies: usedTechnologySkills.join("\n"),
    requiredSkills: requiredSkills.join("\n"),
    preferredSkills: preferredSkills.join("\n"),
    company: endUser === EMPTY_VALUE ? "" : endUser,
    unitPrice: formatInputNumber(condition?.unitPriceMax || condition?.unitPriceMin),
    recruitingCount: formatInputNumber(condition?.recruitingCount),
    workload: condition?.workload || "",
    startMonth: formatMonth(condition?.startMonth) === EMPTY_VALUE ? "" : formatMonth(condition?.startMonth),
    workEnvironment: condition?.workEnvironment || "",
    remoteType: remoteTypeInputLabel(condition?.remoteType),
    prefecture: condition?.prefecture || "",
    workLocation: condition?.workLocationText || "",
    skills: skills.join("\n"),
    upperAmount: formatInputNumber(condition?.upperAmountMax || condition?.upperAmountMin),
    settlementTimeRange: formatSettlementInput(condition?.settlementTimeMin, condition?.settlementTimeMax),
    projectStartMonth: formatMonth(condition?.startMonth) === EMPTY_VALUE ? "" : formatMonth(condition?.startMonth),
    expectedWorkDaysPerWeek: formatInputNumber(condition?.expectedWorkDaysPerWeek),
    fixedWorkTime: formatInputTimeRange(condition?.fixedWorkStartTime, condition?.fixedWorkEndTime),
    coreTime: formatInputTimeRange(condition?.coreTimeStart, condition?.coreTimeEnd),
    isFocus: project.isFocus ? "該当" : "非該当",
    salesInterviewAttendanceRequired: attendanceInputLabel(condition?.salesInterviewAttendanceRequired),
    contractType: contractTypeInputLabel(condition?.contractType),
    foreignNationalityPolicy: foreignNationalityInputLabel(condition?.foreignNationalityPolicy),
    ageCondition: condition?.ageCondition || "",
    siteAtmosphere: condition?.siteAtmosphere || "",
    dressCode: condition?.dressCode || "",
    hairNailRule: condition?.hairNailRule || "",
    interviewCount: formatInputNumber(condition?.interviewCount),
    commerceFlow: commerceNote,
    endUser: endUser === EMPTY_VALUE ? "" : endUser,
    primeContractor: primeContractor === EMPTY_VALUE ? "" : primeContractor,
    secondaryContractor: secondaryContractor === EMPTY_VALUE ? "" : secondaryContractor,
    tertiaryContractor: tertiaryContractor === EMPTY_VALUE ? "" : tertiaryContractor,
    upperContactName: primaryContact?.name || "",
    contact: primaryContact?.email || primaryContact?.phone || "",
    createdBy: project.createdBy?.name || "",
    createdAt: createdAt || ""
  };
  const detailGroups: DetailGroup[] = [
    {
      title: "会社/担当者 (read-only)",
      items: [makeCompanyContactsItem("会社ロール", companyContactRows)]
    },
    {
      title: "会社/担当者候補（表示のみ）",
      items: [makeCompanyContactCandidatesItem("会社/担当者候補（表示のみ）", companyContactCandidates)]
    },
    {
      title: "上位会社",
      items: [
        makeTextItem("会社名", company, true),
        makeTextItem("取引可否", upperCompany?.tradeStatus || EMPTY_VALUE)
      ]
    },
    {
      title: "元メール",
      items: [makeMailItem(project.sourceMail)]
    },
    {
      title: "作業内容",
      items: [
        makeBlockItem("業務内容", project.workDescription || project.summary),
        makeTagsItem("使用技術", usedTechnologySkills.length ? usedTechnologySkills : skills),
        makeTagsItem("必須スキル", requiredSkills.length ? requiredSkills : skills),
        makeTagsItem("尚良スキル", preferredSkills)
      ]
    },
    {
      title: "案件条件",
      items: [
        makeTextItem("企業", endUser, true),
        makeTextItem("単価", projectUnitPrice, true),
        makeTextItem("募集人数", condition?.recruitingCount ? `${condition.recruitingCount}名` : EMPTY_VALUE, true),
        makeTextItem("工数", condition?.workload || EMPTY_VALUE),
        makeTextItem("開始月", formatMonth(condition?.startMonth)),
        makeTextItem("就業環境", condition?.workEnvironment || remoteLabel(condition?.remoteType), true),
        makeTextItem("作業場所", locations.join(" / ") || EMPTY_VALUE, true),
        makeTagsItem("スキル", skills),
        makeTextItem("上位金額", upperAmount, true),
        makeTextItem("精算時間幅", condition?.settlementTimeMin && condition?.settlementTimeMax ? `${condition.settlementTimeMin}〜${condition.settlementTimeMax}h` : EMPTY_VALUE, true),
        makeTextItem("案件開始月", formatMonth(condition?.startMonth)),
        makeTextItem("想定稼働日数", condition?.expectedWorkDaysPerWeek ? `週${condition.expectedWorkDaysPerWeek}日` : EMPTY_VALUE),
        makeTextItem("現場の定時", fixedWorkTime),
        makeTextItem("コアタイム", coreTime)
      ]
    },
    {
      title: "営業・契約条件",
      items: [
        makeTextItem("注力案件", project.isFocus ? "該当" : tags.includes("高単価") || tags.length ? tags.join(" / ") : EMPTY_VALUE, true),
        makeTextItem("営業の面談同席の要否", salesInterviewAttendanceLabel(condition?.salesInterviewAttendanceRequired)),
        makeTextItem("契約形態", contractTypeLabel(condition?.contractType), true),
        makeTextItem("外国籍の受け入れ", foreignNationalityLabel(condition?.foreignNationalityPolicy), true),
        makeTextItem("年齢条件", condition?.ageCondition || EMPTY_VALUE),
        makeTextItem("現場の雰囲気", condition?.siteAtmosphere || EMPTY_VALUE),
        makeTextItem("作業時の服装", condition?.dressCode || EMPTY_VALUE),
        makeTextItem("髪型、爪等の規定", condition?.hairNailRule || EMPTY_VALUE),
        makeTextItem("面談回数", condition?.interviewCount ? `${condition.interviewCount}回` : EMPTY_VALUE, true)
      ]
    },
    {
      title: "商流",
      items: [
        makeCommerceItem("商流", commerceItems),
        makeTextItem("商流サマリ", commercePath),
        makeTextItem("エンドユーザー", endUser),
        makeTextItem("元請", primeContractor),
        makeTextItem("二次請け", secondaryContractor),
        makeTextItem("三次請け", tertiaryContractor)
      ]
    },
    {
      title: "担当者",
      items: [
        makeTextItem("上位担当者", primaryContact?.name || EMPTY_VALUE),
        makeTextItem("連絡先", primaryContact?.email || primaryContact?.phone || EMPTY_VALUE),
        makeTextItem("案件作成者", project.createdBy?.name || EMPTY_VALUE),
        makeTextItem("案件作成日", createdAt || EMPTY_VALUE)
      ]
    }
  ];

  return {
    id: project.projectCode || project.id.slice(0, 8),
    dbId: project.id,
    projectCompanyContactRoleLinkUpdatedAt: project.updatedAt?.toISOString?.() || "",
    sourceMailDbId: project.sourceMail?.id || project.sourceMailId || null,
    title: project.title,
    category: "SES",
    unitPrice,
    unitPriceValue: condition?.upperAmountMax || condition?.upperAmountMin || condition?.unitPriceMax || condition?.unitPriceMin || 0,
    locations: locations.length ? locations : [EMPTY_VALUE],
    interviewCount: condition?.interviewCount ? `${condition.interviewCount}回` : EMPTY_VALUE,
    company,
    companyRoles,
    fee: condition?.commissionFeeAmount ? `${condition.commissionFeeAmount.toLocaleString()}円` : EMPTY_VALUE,
    hasResult: project.companyRoles.some((role: any) => role.company.tradeStatus === "OK"),
    creator: project.createdBy?.name?.slice(0, 2) || "DB",
    createdAt,
    status: statusLabel(project.status),
    statusRaw: project.status,
    isRecruiting: project.status === "OPEN",
    createdByName: project.createdBy?.name || EMPTY_VALUE,
    createdByUserId: project.createdBy?.id || "",
    hasTradeNg: companyTradeStatuses.some((status: string) => status === "NG" || status === "SUSPENDED"),
    needsReview,
    foreignNationalityPolicyRaw: condition?.foreignNationalityPolicy || "UNKNOWN",
    ageConditionText: condition?.ageCondition || "",
    tags: [...skills, ...tags].slice(0, 10),
    attention: tags,
    detail: {
      meta: [
        { label: "案件ID", value: project.projectCode || project.id.slice(0, 8) },
        { label: "作成日", value: createdAt || EMPTY_VALUE },
        { label: "上位会社", value: company }
      ],
      highlights: [
        { label: "単価", value: projectUnitPrice },
        { label: "作業場所", value: locations.join(" / ") || EMPTY_VALUE },
        { label: "面談回数", value: condition?.interviewCount ? `${condition.interviewCount}回` : EMPTY_VALUE },
        { label: "契約形態", value: contractTypeLabel(condition?.contractType) }
      ],
      groups: detailGroups,
      fields: detailGroups.flatMap((group) => group.items)
    },
    formValues: projectFormValues
  };
}

function compactProject(project: any) {
  const mapped = mapProject(project);
  const { detail, formValues, ...summary } = mapped;
  return {
    ...summary,
    detailLoaded: false,
    formValuesLoaded: false,
    searchText: [
      summary.id,
      summary.title,
      summary.company,
      summary.unitPrice,
      summary.locations?.join(" "),
      summary.tags?.join(" "),
      summary.status,
      summary.createdByName,
      summary.ageConditionText
    ].filter(Boolean).join(" ").toLowerCase()
  };
}

function mapPerson(person: any) {
  const skillNames = person.skills.map((skill: any) => skill.skillName);
  const skillsText = skillNames.join(" / ") || "未入力";
  const createdAt = formatDate(person.createdAt);
  const availableFrom = formatDate(person.availableFrom);
  const company = person.ownerCompany?.name || "未入力";
  const contact = person.ownerContact?.name || "未入力";
  const status = statusLabel(person.status);
  const unitPrice = person.desiredUnitPrice ? `${person.desiredUnitPrice}万円` : "未定";
  const ownerCompanyTradeStatus = person.ownerCompany?.tradeStatus || "UNKNOWN";
  const { ownerCompany, ownerContact } = mapPersonOwnerReadOnly(person);
  const needsReview = hasNeedsReviewExtraction(person.sourceMail, "PERSON", person.id);
  const latestExtractionResult = latestMatchingExtractionResult(person.sourceMail, "PERSON", person.id);
  const ownerLinkReviewStatus = typeof latestExtractionResult?.reviewStatus === "string" ? latestExtractionResult.reviewStatus : "";
  const normalizedExtraction = latestNormalizedExtraction(person.sourceMail, "PERSON", person.id);
  const reviewReasons = normalizedStringArray(normalizedExtraction.reviewReasons);
  const nameConfidence = typeof normalizedExtraction.nameConfidence === "string" ? normalizedExtraction.nameConfidence : "";
  const roleHeadline = typeof normalizedExtraction.roleHeadline === "string" ? normalizedExtraction.roleHeadline : "";
  const careerOrRole = person.careerSummary || roleHeadline || EMPTY_VALUE;
  const companyContactCandidates: CompanyContactCandidate[] = [];
  const detailGroups: DetailGroup[] = [
    {
      title: "会社/担当者 (read-only)",
      items: [makeOwnerCompanyContactItem("所属会社/担当者", ownerCompany, ownerContact)]
    },
    {
      title: "会社/担当者候補（表示のみ）",
      items: [makeCompanyContactCandidatesItem("会社/担当者候補（表示のみ）", companyContactCandidates)]
    },
    {
      title: "基本情報",
      items: [
        makeTextItem("状態", status, true),
        makeTextItem("年齢", person.age ? `${person.age}歳` : EMPTY_VALUE),
        makeTextItem("国籍", person.nationality || EMPTY_VALUE),
        makeTextItem("人名confidence", nameConfidence || EMPTY_VALUE)
      ]
    },
    {
      title: "希望条件",
      items: [
        makeTextItem("希望単価", unitPrice, true),
        makeTextItem("希望勤務地", person.preferredLocation || EMPTY_VALUE),
        makeTextItem("リモート可否", person.remotePreference || EMPTY_VALUE),
        makeTextItem("稼働開始", availableFrom || EMPTY_VALUE)
      ]
    },
    {
      title: "所属会社",
      items: [
        makeTextItem("会社名", company, true),
        makeTextItem("取引可否", tradeStatusInputLabel(ownerCompanyTradeStatus))
      ]
    },
    {
      title: "元メール",
      items: [makeMailItem(person.sourceMail)]
    },
    {
      title: "スキル",
      items: [
        makeBlockItem("経験職種", careerOrRole),
        makeTextItem("対応工程", EMPTY_VALUE),
        makeTagsItem("使用技術", skillNames),
        makeBlockItem("得意領域", roleHeadline || person.careerSummary || EMPTY_VALUE)
      ]
    },
    {
      title: "抽出品質",
      items: [
        makeTextItem("要確認", needsReview ? "要確認" : "通常"),
        makeBlockItem("要確認理由", reviewReasons.join(" / ") || EMPTY_VALUE)
      ]
    },
    {
      title: "営業情報",
      items: [
        makeTextItem("担当者", contact),
        makeTextItem("作成者", person.createdBy?.name || EMPTY_VALUE),
        makeTextItem("作成日", createdAt || EMPTY_VALUE)
      ]
    }
  ];

  const displayName = person.name || person.initials || missingPersonDisplayName(person);

  return {
    id: person.personCode || person.id.slice(0, 8),
    dbId: person.id,
    sourceMailDbId: person.sourceMail?.id || person.sourceMailId || null,
    ownerCompanyId: person.ownerCompanyId || null,
    ownerContactId: person.ownerContactId || null,
    ownerLinkUpdatedAt: person.updatedAt?.toISOString?.() || "",
    ownerLinkReviewStatus,
    name: displayName,
    initials: person.initials || "",
    status,
    statusRaw: person.status,
    company,
    contact,
    ownerCompany,
    ownerContact,
    unitPrice,
    unitPriceValue: person.desiredUnitPrice || 0,
    availableFrom: availableFrom || "未入力",
    availableFromRaw: availableFrom || "",
    preferredLocation: person.preferredLocation || "",
    remotePreference: person.remotePreference || "",
    age: person.age || null,
    nationality: person.nationality || "",
    hasResult: ownerCompanyTradeStatus === "OK",
    hasTradeNg: ownerCompanyTradeStatus === "NG" || ownerCompanyTradeStatus === "SUSPENDED",
    needsReview,
    nameConfidence,
    reviewReasons,
    roleHeadline,
    skills: skillsText,
    skillList: skillNames,
    createdAt,
    createdByName: person.createdBy?.name || EMPTY_VALUE,
    detail: {
      meta: [
        { label: "要員ID", value: person.personCode || person.id.slice(0, 8) },
        { label: "作成日", value: createdAt || EMPTY_VALUE },
        { label: "所属会社", value: company }
      ],
      highlights: [],
      groups: detailGroups,
      fields: detailGroups.flatMap((group) => group.items)
    },
    formValues: mergePersonFormInitialValues({
      name: person.name || "",
      initials: person.initials || "",
      ownerCompanyName: person.ownerCompany?.name || "",
      status: personStatusInputLabel(person.status),
      skills: skillNames.join("\n"),
      availableFrom: availableFrom || "",
      desiredUnitPrice: formatInputNumber(person.desiredUnitPrice),
      preferredLocation: person.preferredLocation || "",
      remotePreference: person.remotePreference || "",
      age: formatInputNumber(person.age),
      nationality: person.nationality || "",
      careerSummary: person.careerSummary || "",
      summary: person.summary || "",
      ownerContactName: person.ownerContact?.name || "",
      ownerContactEmail: person.ownerContact?.email || "",
      createdBy: person.createdBy?.name || "",
      createdAt: createdAt || ""
    })
  };
}

function compactPerson(person: any) {
  const mapped = mapPerson(person);
  const { detail, formValues, ...summary } = mapped;
  return {
    ...summary,
    detailLoaded: false,
    formValuesLoaded: false,
    searchText: [
      summary.id,
      summary.name,
      summary.company,
      summary.status,
      summary.unitPrice,
      summary.availableFrom,
      summary.preferredLocation,
      summary.remotePreference,
      summary.nationality,
      summary.skills,
      summary.createdAt,
      summary.createdByName
    ].filter(Boolean).join(" ").toLowerCase()
  };
}

function mapUnclassifiedMail(mail: any, companies: any[]) {
  const matchedCompany = inferSenderCompany(mail, companies);
  const senderCompany = matchedCompany?.name || mail.fromName || domainFromEmail(mail.fromEmail) || EMPTY_VALUE;
  const sender = [mail.fromName, mail.fromEmail].filter(Boolean).join(" / ") || EMPTY_VALUE;
  const needsReview =
    mail.needsReview ||
    mail.category === "NEEDS_REVIEW" ||
    mail.extractionResults.some((result: any) => result.reviewStatus === "NEEDS_REVIEW");
  const bodyText = "";

  return {
    id: mail.externalMessageId?.slice(0, 12) || mail.id.slice(0, 8),
    dbId: mail.id,
    subject: mail.subject || "(件名なし)",
    senderCompany,
    sender,
    fromName: mail.fromName || "",
    fromEmail: mail.fromEmail || "",
    receivedAt: formatDateTime(mail.messageDate || mail.receivedAt),
    receivedAtRaw: (mail.messageDate || mail.receivedAt)?.toISOString?.() || "",
    classification: categoryLabel(mail.category),
    categoryRaw: mail.category,
    isExcluded: mail.isExcluded,
    excludedLabel: mail.isExcluded ? "除外" : "通常",
    excludeReason: mail.excludeReason || "",
    needsReview,
    hasResult: matchedCompany?.tradeStatus === "OK",
    hasTradeNg: matchedCompany?.tradeStatus === "NG" || matchedCompany?.tradeStatus === "SUSPENDED",
    bodyText,
    externalMessageId: mail.externalMessageId,
    externalThreadId: mail.externalThreadId || "",
    detail: {
      meta: [
        { label: "メールID", value: mail.externalMessageId || mail.id.slice(0, 8) },
        { label: "threadId", value: mail.externalThreadId || EMPTY_VALUE },
        { label: "分類", value: categoryLabel(mail.category) }
      ],
      fields: [
        { label: "送付元の会社", value: senderCompany },
        { label: "担当者 / 送信者", value: sender },
        { label: "受信日時", value: formatDateTime(mail.messageDate || mail.receivedAt) },
        { label: "元メール", value: bodyText, type: "mail" }
      ]
    }
  };
}

export async function GET(request: Request) {
  try {
    const currentUser = await requireAuth(request);
    const personOwnerLinkWriteAllowed = isCompanyContactLinkWriterRole(currentUser.role);
    const projectCompanyContactRoleLinkWriteAllowed =
      isCompanyContactLinkWriterRole(currentUser.role) && projectCompanyContactRoleLinkGuard().allowed;
    const requestUrl = new URL(request.url);
    const detailType = requestUrl.searchParams.get("detail");
    const detailId = requestUrl.searchParams.get("id");

    if (detailType === "project" && detailId) {
      const project = await prisma.project.findFirst({
        where: {
          id: detailId,
          status: { not: "ARCHIVED" }
        },
        include: {
          condition: true,
          companyRoles: {
            include: {
              company: {
                select: {
                  id: true,
                  name: true,
                  tradeStatus: true,
                  mainEmailDomain: true,
                  tdbScore: true
                }
              },
              companyContact: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                  department: true,
                  position: true,
                  isActive: true
                }
              }
            },
            orderBy: { roleOrder: "asc" }
          },
          createdBy: {
            select: {
              id: true,
              name: true
            }
          },
          sourceMail: {
            select: {
              id: true,
              externalMessageId: true,
              externalThreadId: true,
              subject: true,
              fromName: true,
              fromEmail: true,
              messageDate: true,
              receivedAt: true,
              extractionResults: {
                orderBy: { createdAt: "desc" },
                select: {
                  targetType: true,
                  targetId: true,
                  extractionType: true,
                  reviewStatus: true,
                  createdAt: true
                }
              }
            }
          },
          skills: true,
          tags: true
        }
      });
      if (!project) return NextResponse.json({ message: "Not found" }, { status: 404 });
      return NextResponse.json({ project: mapProject(project) });
    }

    if (detailType === "person" && detailId) {
      const person = await prisma.person.findFirst({
        where: {
          id: detailId,
          status: { not: "ARCHIVED" }
        },
        include: {
          ownerCompany: {
            select: {
              id: true,
              name: true,
              tradeStatus: true,
              mainEmailDomain: true,
              tdbScore: true
            }
          },
          ownerContact: {
            select: {
              id: true,
              companyId: true,
              name: true,
              email: true,
              phone: true,
              department: true,
              position: true,
              isActive: true
            }
          },
          createdBy: {
            select: {
              id: true,
              name: true
            }
          },
          sourceMail: {
            select: {
              id: true,
              externalMessageId: true,
              externalThreadId: true,
              subject: true,
              fromName: true,
              fromEmail: true,
              messageDate: true,
              receivedAt: true,
              extractionResults: {
                orderBy: { createdAt: "desc" },
                select: {
                  targetType: true,
                  targetId: true,
                  extractionType: true,
                  reviewStatus: true,
                  createdAt: true,
                  normalizedResult: true
                }
              }
            }
          },
          skills: true
        }
      });
      if (!person) return NextResponse.json({ message: "Not found" }, { status: 404 });
      return NextResponse.json({ person: mapPerson(person) });
    }

    const [projects, persons, unclassifiedMails, companies] = await Promise.all([
    prisma.project.findMany({
      where: {
        status: { not: "ARCHIVED" }
      },
      orderBy: { createdAt: "desc" },
      include: {
        condition: true,
        companyRoles: {
          include: {
            company: {
              select: {
                id: true,
                name: true,
                tradeStatus: true,
                mainEmailDomain: true,
                tdbScore: true
              }
            },
            companyContact: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                department: true,
                position: true,
                isActive: true
              }
            }
          },
          orderBy: { roleOrder: "asc" }
        },
        createdBy: {
          select: {
            id: true,
            name: true
          }
        },
        sourceMail: {
          select: {
            id: true,
            externalMessageId: true,
            externalThreadId: true,
            subject: true,
            fromName: true,
            fromEmail: true,
            messageDate: true,
            receivedAt: true,
            extractionResults: {
              orderBy: { createdAt: "desc" },
              select: {
                targetType: true,
                targetId: true,
                extractionType: true,
                reviewStatus: true,
                createdAt: true
              }
            }
          }
        },
        skills: true,
        tags: true
      }
    }),
    prisma.person.findMany({
      where: {
        status: { not: "ARCHIVED" }
      },
      orderBy: { createdAt: "desc" },
      include: {
        ownerCompany: {
          select: {
            id: true,
            name: true,
            tradeStatus: true,
            mainEmailDomain: true,
            tdbScore: true
          }
        },
        ownerContact: {
          select: {
            id: true,
            companyId: true,
            name: true,
            email: true,
            phone: true,
            department: true,
            position: true,
            isActive: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true
          }
        },
        sourceMail: {
          select: {
            id: true,
            externalMessageId: true,
            externalThreadId: true,
            subject: true,
            fromName: true,
            fromEmail: true,
            messageDate: true,
            receivedAt: true,
            extractionResults: {
              orderBy: { createdAt: "desc" },
              select: {
                targetType: true,
                targetId: true,
                extractionType: true,
                reviewStatus: true,
                createdAt: true,
                normalizedResult: true
              }
            }
          }
        },
        skills: true
      }
    }),
    prisma.mailNotification.findMany({
      where: {
        category: { in: ["NEEDS_REVIEW", "OTHER", "NORMAL_CONTACT"] },
        isExcluded: false,
        sourceProjects: { none: { status: { not: "ARCHIVED" } } },
        sourcePersons: { none: { status: { not: "ARCHIVED" } } }
      },
      orderBy: { receivedAt: "desc" },
      select: {
        id: true,
        externalMessageId: true,
        externalThreadId: true,
        messageDate: true,
        receivedAt: true,
        fromEmail: true,
        fromName: true,
        subject: true,
        category: true,
        isExcluded: true,
        excludeReason: true,
        needsReview: true,
        extractionResults: {
          orderBy: { createdAt: "desc" },
          select: {
            reviewStatus: true,
            targetType: true,
            targetId: true,
            createdAt: true,
            normalizedResult: true
          }
        }
      }
    }),
    prisma.company.findMany({
      select: {
        name: true,
        normalizedName: true,
        mainEmailDomain: true,
        tradeStatus: true
      }
    })
  ]);

    return NextResponse.json({
      currentUser,
      personOwnerLinkWriteAllowed,
      projectCompanyContactRoleLinkWriteAllowed,
      projects: projects.map((project) => compactProject(project)),
      persons: persons.map((person) => compactPerson(person)),
      unclassifiedMails: unclassifiedMails.map((mail) => mapUnclassifiedMail(mail, companies))
    });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    return NextResponse.json({ message: "DBデータの取得に失敗しました" }, { status: 500 });
  }
}
