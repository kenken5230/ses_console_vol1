import { buildExtractionBodyText } from "../lib/gmail-message-body";

export type ExtractTarget = "project" | "person";

export type MailExtractionSource = {
  id: string;
  category: "PROJECT_INTRO" | "PERSON_INTRO";
  externalMessageId: string;
  subject: string | null;
  normalizedSubject?: string | null;
  bodyText: string | null;
  bodyHtml?: string | null;
  normalizedBody: string | null;
  snippet?: string | null;
  fromEmail: string | null;
  fromName: string | null;
  receivedAt: Date;
};

export type ProjectExtraction = {
  target: "project";
  title: string;
  businessDescription: string | null;
  workDescription: string | null;
  usedTechnologies: string[];
  requiredSkills: string[];
  preferredSkills: string[];
  unitPriceMin: number | null;
  unitPriceMax: number | null;
  upperAmountMin: number | null;
  upperAmountMax: number | null;
  workLocationText: string | null;
  prefecture: string | null;
  startMonth: Date | null;
  settlementTimeMin: number | null;
  settlementTimeMax: number | null;
  interviewCount: number | null;
  commerceFlow: string | null;
  contractType: "UNKNOWN" | "SEMI_DELEGATION" | "DISPATCH" | "CONTRACT" | "OTHER";
  foreignNationalityPolicy: "UNKNOWN" | "NEED_CONFIRMATION" | "ACCEPTABLE" | "NOT_ACCEPTABLE";
  ageCondition: string | null;
  upperCompanyName: string | null;
  contactName: string | null;
  contactEmail: string | null;
  remoteType: "UNKNOWN" | "ONSITE" | "HYBRID" | "REMOTE" | "FULL_REMOTE";
  confidence: string;
  needsReview: boolean;
  missingFields: string[];
  raw: Record<string, unknown>;
};

export type PersonExtraction = {
  target: "person";
  name: string | null;
  initials: string | null;
  nameConfidence: "HIGH" | "MEDIUM" | "LOW";
  nameSource: "label" | "initials" | "none";
  rejectedNameCandidate: string | null;
  ownerCompanyName: string | null;
  desiredUnitPrice: number | null;
  availableFrom: Date | null;
  skills: string[];
  skillCountBeforeLimit: number;
  skillOverExtraction: boolean;
  careerSummary: string | null;
  processText: string | null;
  roleHeadline: string | null;
  classificationWarning: string | null;
  preferredLocation: string | null;
  remotePreference: string | null;
  age: number | null;
  nationality: string | null;
  status: "AVAILABLE" | "PROPOSING" | "JOINED" | "INACTIVE";
  contactName: string | null;
  contactEmail: string | null;
  confidence: string;
  needsReview: boolean;
  missingFields: string[];
  reviewReasons: string[];
  raw: Record<string, unknown>;
};

export type MailExtraction = ProjectExtraction | PersonExtraction;

const prefectures = [
  "北海道",
  "青森県",
  "岩手県",
  "宮城県",
  "秋田県",
  "山形県",
  "福島県",
  "茨城県",
  "栃木県",
  "群馬県",
  "埼玉県",
  "千葉県",
  "東京都",
  "神奈川県",
  "新潟県",
  "富山県",
  "石川県",
  "福井県",
  "山梨県",
  "長野県",
  "岐阜県",
  "静岡県",
  "愛知県",
  "三重県",
  "滋賀県",
  "京都府",
  "大阪府",
  "兵庫県",
  "奈良県",
  "和歌山県",
  "鳥取県",
  "島根県",
  "岡山県",
  "広島県",
  "山口県",
  "徳島県",
  "香川県",
  "愛媛県",
  "高知県",
  "福岡県",
  "佐賀県",
  "長崎県",
  "熊本県",
  "大分県",
  "宮崎県",
  "鹿児島県",
  "沖縄県",
];

const majorCities: Record<string, string> = {
  東京: "東京都",
  新宿: "東京都",
  渋谷: "東京都",
  品川: "東京都",
  神田: "東京都",
  銀座: "東京都",
  八王子: "東京都",
  横浜: "神奈川県",
  川崎: "神奈川県",
  大阪: "大阪府",
  名古屋: "愛知県",
  福岡: "福岡県",
  甲府: "山梨県",
};

const skillDefinitions: Array<{ canonical: string; aliases: string[] }> = [
  { canonical: "JavaScript", aliases: ["JavaScript", "JS"] },
  { canonical: "TypeScript", aliases: ["TypeScript", "TS"] },
  { canonical: "React", aliases: ["React", "React.js", "Reactjs"] },
  { canonical: "Next.js", aliases: ["Next.js", "Nextjs", "Next"] },
  { canonical: "Vue", aliases: ["Vue", "Vue.js", "Vuejs"] },
  { canonical: "Nuxt", aliases: ["Nuxt", "Nuxt.js", "Nuxtjs"] },
  { canonical: "Node", aliases: ["Node", "Node.js", "Nodejs"] },
  { canonical: "Java", aliases: ["Java"] },
  { canonical: "Spring", aliases: ["Spring", "Spring Boot"] },
  { canonical: "PHP", aliases: ["PHP"] },
  { canonical: "Laravel", aliases: ["Laravel"] },
  { canonical: "Python", aliases: ["Python"] },
  { canonical: "Django", aliases: ["Django"] },
  { canonical: "FastAPI", aliases: ["FastAPI"] },
  { canonical: "Go", aliases: ["Go", "Golang"] },
  { canonical: "C#", aliases: ["C#", "C#.NET", "C# .NET"] },
  { canonical: ".NET", aliases: [".NET", "C#.NET", "VB.NET", "ASP.NET"] },
  { canonical: "VB.NET", aliases: ["VB.NET", "VB .NET"] },
  { canonical: "C++", aliases: ["C++"] },
  { canonical: "AWS", aliases: ["AWS"] },
  { canonical: "Azure", aliases: ["Azure"] },
  { canonical: "GCP", aliases: ["GCP", "Google Cloud"] },
  { canonical: "Oracle", aliases: ["Oracle"] },
  { canonical: "MySQL", aliases: ["MySQL"] },
  { canonical: "PostgreSQL", aliases: ["PostgreSQL", "Postgres", "Postgre"] },
  { canonical: "SQL", aliases: ["SQL"] },
  { canonical: "Linux", aliases: ["Linux"] },
  { canonical: "Windows", aliases: ["Windows"] },
  { canonical: "VMware", aliases: ["VMware"] },
  { canonical: "Terraform", aliases: ["Terraform"] },
  { canonical: "Flutter", aliases: ["Flutter"] },
  { canonical: "Kotlin", aliases: ["Kotlin"] },
  { canonical: "Swift", aliases: ["Swift"] },
  { canonical: "SAP", aliases: ["SAP"] },
  { canonical: "PMO", aliases: ["PMO"] },
  { canonical: "PM", aliases: ["PM", "Project Manager"] },
  { canonical: "UiPath", aliases: ["UiPath"] },
  { canonical: "VBA", aliases: ["VBA"] },
  { canonical: "Access", aliases: ["Access"] },
  { canonical: "Figma", aliases: ["Figma"] },
  { canonical: "QA", aliases: ["QA"] },
];

const skillKeywords = skillDefinitions.map((definition) => definition.canonical);
const personSkillLimit = 12;
const projectLikeSubjectPattern =
  /案件のご紹介|熱い案件|急募案件|募集案件|参画案件|案件情報|作業内容|商流|面談|精算|勤務地|単価|募集人数/;
const lowConfidenceNamePattern =
  /\[SES配信\]|ご紹介です|案件|熱い案件|急募|募集|エンジニアのご紹介|要件定義|運用保守|弊社フリーランス|Laravel,\s*CakePHP|React\/Vue/i;
const roleHeadlinePatterns: Array<{ pattern: RegExp; value: string }> = [
  { pattern: /フルスタックエンジニア/i, value: "フルスタックエンジニア" },
  { pattern: /フロントエンドエンジニア|フロントエンド/i, value: "フロントエンドエンジニア" },
  { pattern: /バックエンドエンジニア|バックエンド/i, value: "バックエンドエンジニア" },
  { pattern: /PHPエンジニア|PHP/i, value: "PHPエンジニア" },
  { pattern: /\.NET|C#\.?NET|VB\.?NET/i, value: ".NETエンジニア" },
  { pattern: /Javaエンジニア|Java(?!Script)/i, value: "Javaエンジニア" },
  { pattern: /インフラSE|インフラエンジニア|インフラ/i, value: "インフラSE" },
  { pattern: /PM\/PL|PM・PL|PM、PL/i, value: "PM/PL" },
  { pattern: /PMO/i, value: "PMO" },
  { pattern: /SAP/i, value: "SAP" },
  { pattern: /Webディレクター|WEBディレクター/i, value: "Webディレクター" },
  { pattern: /SE/i, value: "SE" },
];

function clean(value: string | null | undefined): string | null {
  const cleaned = value?.replace(/\r/g, "").replace(/[ \t]+/g, " ").trim();
  return cleaned || null;
}

function mailText(mail: MailExtractionSource): string {
  const bodyText = buildExtractionBodyText(mail);
  const subject = clean(mail.subject);
  const body = clean(bodyText);
  return [subject, body && body !== subject ? body : null].filter(Boolean).join("\n");
}

function cleanSubject(subject: string | null): string {
  const cleaned = (subject ?? "")
    .replace(/^\s*(re|fw|fwd)\s*:\s*/i, "")
    .replace(/\[SES配信\]/g, "")
    .replace(/【株式会社SKV様】/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.slice(0, 255) || "Gmail取込案件";
}

function cleanPersonSubject(subject: string | null): string {
  return cleanSubject(subject)
    .replace(/のご紹介です[！!]?.*$/i, "")
    .replace(/ご紹介です[！!]?.*$/i, "")
    .replace(/[【[].*?[】\]]/g, " ")
    .replace(/[、。].*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function valueAfterLabel(text: string, labels: string[]): string | null {
  const escaped = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const pattern = new RegExp(`(?:^|\\n)\\s*(?:${escaped})\\s*[：:]\\s*([^\\n]+)`, "i");
  return clean(text.match(pattern)?.[1]);
}

function blockAfterLabel(text: string, labels: string[]): string | null {
  const escaped = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const stopLabels =
    "案件名|概要|内容|業務内容|作業内容|必須|尚可|スキル|単価|金額|場所|勤務地|開始|精算|面談|商流|契約|外国籍|年齢|会社|担当|連絡|氏名|名前|所属|稼働";
  const pattern = new RegExp(`(?:^|\\n)\\s*(?:${escaped})\\s*[：:]\\s*([\\s\\S]{1,800}?)(?=\\n\\s*(?:${stopLabels})\\s*[：:]|$)`, "i");
  return clean(text.match(pattern)?.[1]);
}

function unique(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((value) => clean(value)).filter((value): value is string => Boolean(value))));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsAsciiSkillAlias(text: string, alias: string): boolean {
  const escaped = escapeRegExp(alias);
  const pattern = new RegExp(`(^|[^A-Za-z0-9+#.])${escaped}($|[^A-Za-z0-9+#.])`, "i");
  return pattern.test(text);
}

function containsSkillAlias(text: string, alias: string): boolean {
  if (/^[A-Za-z0-9+#.\s]+$/.test(alias)) {
    return containsAsciiSkillAlias(text, alias);
  }

  return text.toLowerCase().includes(alias.toLowerCase());
}

function extractSkills(text: string): string[] {
  return skillDefinitions
    .filter((definition) => definition.aliases.some((alias) => containsSkillAlias(text, alias)))
    .map((definition) => definition.canonical);
}

function extractPrioritizedPersonSkills(text: string): { skills: string[]; rawSkillCount: number; overExtraction: boolean } {
  const focusedText = [
    blockAfterLabel(text, ["スキル", "経験スキル", "保有スキル", "得意技術", "技術"]),
    blockAfterLabel(text, ["経歴", "経験", "職務経歴"]),
    text,
  ].filter((value): value is string => Boolean(value));
  const rawSkills = unique(focusedText.flatMap((value) => extractSkills(value)));

  return {
    skills: rawSkills.slice(0, personSkillLimit),
    rawSkillCount: rawSkills.length,
    overExtraction: rawSkills.length > personSkillLimit,
  };
}

function extractInitials(text: string, subject: string | null): string | null {
  const labeled = valueAfterLabel(text, ["イニシャル", "initial"]);
  if (labeled) return labeled.slice(0, 40);

  const subjectInitials = subject?.match(/^\s*([A-Z]{1,3}(?:[.,][A-Z]{1,3})?)\s*(?=[\/（(]|$)/)?.[1];
  if (subjectInitials && /[\/（(]\s*\d{2}\s*歳/.test(subject ?? "")) return subjectInitials.replace(",", ".");

  const bodyInitials = text.match(/(?:^|\n)\s*([A-Z]{1,3}(?:[.,][A-Z]{1,3})?)\s*[\/（(]\s*\d{2}\s*歳/)?.[1];
  return bodyInitials?.replace(",", ".") ?? null;
}

function extractRoleHeadline(text: string, subject: string | null): string | null {
  const labeled = valueAfterLabel(text, ["経験職種", "得意領域", "職種", "ポジション"]);
  const candidates = unique([labeled, cleanPersonSubject(subject), text.slice(0, 240)]);

  for (const candidate of candidates) {
    for (const role of roleHeadlinePatterns) {
      if (role.pattern.test(candidate)) return role.value;
    }
  }

  return null;
}

function reviewConfidenceFromQuality(baseConfidence: string, nameConfidence: PersonExtraction["nameConfidence"], needsReview: boolean): string {
  const parsed = Number(baseConfidence);
  const base = Number.isFinite(parsed) ? parsed : 0.6;
  const penalty = nameConfidence === "LOW" ? 0.2 : nameConfidence === "MEDIUM" ? 0.08 : 0;
  const reviewPenalty = needsReview ? 0.05 : 0;
  return Math.max(0.35, Math.min(0.9, base - penalty - reviewPenalty)).toFixed(4);
}

export function personPlaceholderName(mailId: string): string {
  return `氏名未取得（GMAIL-${mailId.slice(0, 8).toUpperCase()}）`;
}

export function personDisplayName(mailId: string, name: string | null | undefined, initials: string | null | undefined): string {
  return clean(name) ?? clean(initials) ?? personPlaceholderName(mailId);
}

export function analyzePersonNameCandidate(input: {
  candidate: string | null;
  initials: string | null;
  subject: string | null;
  skills: string[];
}): {
  acceptedName: string | null;
  rejectedNameCandidate: string | null;
  nameConfidence: PersonExtraction["nameConfidence"];
  nameSource: PersonExtraction["nameSource"];
  reviewReasons: string[];
} {
  const candidate = clean(input.candidate);
  const subject = clean(input.subject);
  const reviewReasons: string[] = [];

  if (!candidate) {
    if (input.initials) {
      return {
        acceptedName: null,
        rejectedNameCandidate: null,
        nameConfidence: "MEDIUM",
        nameSource: "initials",
        reviewReasons: ["PERSON_NAME_INITIALS_ONLY"],
      };
    }

    return {
      acceptedName: null,
      rejectedNameCandidate: null,
      nameConfidence: "LOW",
      nameSource: "none",
      reviewReasons: ["PERSON_NAME_LOW_CONFIDENCE"],
    };
  }

  const candidateSkills = extractSkills(candidate);
  const looksLikeSubject =
    Boolean(subject && candidate.length >= 20 && (subject.includes(candidate) || candidate.includes(subject.slice(0, 24)))) ||
    lowConfidenceNamePattern.test(candidate) ||
    candidate.length >= 40 ||
    candidateSkills.length >= 3;

  if (looksLikeSubject) {
    reviewReasons.push("PERSON_NAME_LOW_CONFIDENCE", "PERSON_NAME_FROM_SUBJECT_REJECTED");
    if (candidateSkills.length >= 3) reviewReasons.push("PERSON_SKILLS_OVER_EXTRACTED");
    return {
      acceptedName: null,
      rejectedNameCandidate: candidate,
      nameConfidence: "LOW",
      nameSource: "none",
      reviewReasons: unique(reviewReasons),
    };
  }

  return {
    acceptedName: candidate.slice(0, 160),
    rejectedNameCandidate: null,
    nameConfidence: "HIGH",
    nameSource: "label",
    reviewReasons: [],
  };
}

function classificationWarningFromSubject(subject: string | null): string | null {
  return projectLikeSubjectPattern.test(subject ?? "") ? "PERSON_SUBJECT_LOOKS_LIKE_PROJECT" : null;
}

function parseMoneyRange(text: string, labels: string[]): { min: number | null; max: number | null; text: string | null } {
  const labeled = valueAfterLabel(text, labels);
  const target = labeled ?? text;
  const range =
    target.match(/(\d{2,3})\s*(?:万|万円)\s*[〜~～\-]\s*(\d{2,3})\s*(?:万|万円)?/) ??
    target.match(/(\d{2,3})\s*[〜~～\-]\s*(\d{2,3})\s*(?:万|万円)/);
  if (range) {
    return { min: Number(range[1]), max: Number(range[2]), text: range[0] };
  }

  const single = target.match(/(\d{2,3})\s*(?:万|万円)(?:以上|程度|前後|くらい|迄|まで)?/);
  if (single) {
    return { min: Number(single[1]), max: Number(single[1]), text: single[0] };
  }

  return { min: null, max: null, text: null };
}

function parseStartMonth(text: string): Date | null {
  const currentYear = new Date().getFullYear();
  const yearMonth = text.match(/(20\d{2})[\/年.-]\s*(\d{1,2})\s*(?:月)?/);
  if (yearMonth) {
    return new Date(Date.UTC(Number(yearMonth[1]), Number(yearMonth[2]) - 1, 1));
  }

  const month = text.match(/(\d{1,2})\s*月(?:開始|[〜～~]|から|参画|稼働)?/);
  if (month) {
    return new Date(Date.UTC(currentYear, Number(month[1]) - 1, 1));
  }

  if (/即日|随時/.test(text)) {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
  }

  return null;
}

function parseSettlement(text: string): { min: number | null; max: number | null } {
  const labeled = valueAfterLabel(text, ["精算", "精算幅", "精算時間", "時間幅"]);
  const target = labeled ?? text;
  const match = target.match(/(\d{3})\s*[〜~～\-]\s*(\d{3})/);
  if (!match) {
    return { min: null, max: null };
  }

  return { min: Number(match[1]), max: Number(match[2]) };
}

function parseInterviewCount(text: string): number | null {
  const match = text.match(/面談[^\d０-９]{0,12}([0-9０-９一二三四五六七八九])\s*回|([0-9０-９一二三四五六七八九])\s*回[^\n]{0,8}面談/);
  const raw = match?.[1] ?? match?.[2];
  if (!raw) return null;
  const map: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  return map[raw] ?? Number(raw.replace(/[０-９]/g, (char) => String(char.charCodeAt(0) - 0xff10)));
}

function parseAge(text: string): number | null {
  const match = text.match(/(\d{2})\s*歳|年齢[：:\s]*(\d{2})/);
  return match ? Number(match[1] ?? match[2]) : null;
}

function parseAgeCondition(text: string): string | null {
  return (
    valueAfterLabel(text, ["年齢", "年齢条件"]) ??
    clean(text.match(/(?:\d{2}代(?:まで|迄|前半|後半)?|\d{2}\s*歳(?:まで|迄)?)/)?.[0])
  );
}

function parsePrefecture(text: string): string | null {
  for (const pref of prefectures) {
    if (text.includes(pref)) return pref;
  }

  for (const [city, pref] of Object.entries(majorCities)) {
    if (text.includes(city)) return pref;
  }

  return null;
}

function parseRemoteType(text: string): ProjectExtraction["remoteType"] {
  if (/フルリモート|フルリモ|完全リモート/.test(text)) return "FULL_REMOTE";
  if (/リモート併用|一部リモート|基本リモート.*出社|出社.*リモート/.test(text)) return "HYBRID";
  if (/リモート|在宅/.test(text)) return "REMOTE";
  if (/常駐|出社/.test(text)) return "ONSITE";
  return "UNKNOWN";
}

function parseContractType(text: string): ProjectExtraction["contractType"] {
  if (/準委任|SES/.test(text)) return "SEMI_DELEGATION";
  if (/派遣/.test(text)) return "DISPATCH";
  if (/請負/.test(text)) return "CONTRACT";
  return "UNKNOWN";
}

function parseForeignPolicy(text: string): ProjectExtraction["foreignNationalityPolicy"] {
  if (/外国籍\s*(?:不可|NG|ＮＧ)|日本籍限定/.test(text)) return "NOT_ACCEPTABLE";
  if (/外国籍\s*(?:可|OK|ＯＫ)|外国籍歓迎/.test(text)) return "ACCEPTABLE";
  if (/外国籍|国籍/.test(text)) return "NEED_CONFIRMATION";
  return "UNKNOWN";
}

function parseNationality(text: string): string | null {
  const labeled = valueAfterLabel(text, ["国籍", "籍"]);
  if (labeled) return labeled.slice(0, 80);
  const match = text.match(/日本籍|中国籍|韓国籍|台湾籍|外国籍/);
  return match?.[0] ?? null;
}

function parseWorkLocation(text: string): string | null {
  return valueAfterLabel(text, ["勤務地", "場所", "作業場所", "現場", "最寄"]) ?? parsePrefecture(text);
}

function parseCompany(text: string, labels: string[]): string | null {
  const value = valueAfterLabel(text, labels);
  if (!value) return null;
  return value.replace(/様$/, "").slice(0, 255);
}

function parseContactName(mail: MailExtractionSource, text: string): string | null {
  return valueAfterLabel(text, ["担当", "担当者", "営業担当", "上位担当者"]) ?? mail.fromName;
}

function parseContactEmail(mail: MailExtractionSource, text: string): string | null {
  const labeled = valueAfterLabel(text, ["連絡先", "メール", "Email", "E-mail"]);
  return labeled?.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? mail.fromEmail;
}

function confidenceFromMissing(totalImportantFields: number, missingCount: number): string {
  const confidence = Math.max(0.35, Math.min(0.9, 0.9 - missingCount / totalImportantFields * 0.4));
  return confidence.toFixed(4);
}

export function extractProjectFromMail(mail: MailExtractionSource): ProjectExtraction {
  const text = mailText(mail);
  const title = valueAfterLabel(text, ["案件名", "案件", "PJ名", "プロジェクト"]) ?? cleanSubject(mail.subject);
  const businessDescription = blockAfterLabel(text, ["業務内容", "業務", "概要"]);
  const workDescription = blockAfterLabel(text, ["作業内容", "案件内容", "内容"]) ?? businessDescription ?? clean(text.slice(0, 800));
  const skills = extractSkills(text);
  const requiredSkills = unique([
    ...extractSkills(blockAfterLabel(text, ["必須", "必須スキル", "Must"]) ?? ""),
    ...skills.slice(0, 8),
  ]);
  const preferredSkills = extractSkills(blockAfterLabel(text, ["尚可", "尚良", "尚可スキル", "Want"]) ?? "");
  const unitPrice = parseMoneyRange(text, ["単価", "金額", "報酬"]);
  const upperAmount = parseMoneyRange(text, ["上位金額", "上限", "予算"]);
  const settlement = parseSettlement(text);
  const workLocationText = parseWorkLocation(text);
  const startMonth = parseStartMonth(text);
  const missingFields = [
    title ? null : "案件名",
    workDescription ? null : "作業内容",
    unitPrice.max ? null : "単価",
    workLocationText ? null : "作業場所",
    startMonth ? null : "開始月",
    requiredSkills.length ? null : "スキル",
  ].filter((value): value is string => Boolean(value));

  return {
    target: "project",
    title,
    businessDescription,
    workDescription,
    usedTechnologies: skills,
    requiredSkills,
    preferredSkills,
    unitPriceMin: unitPrice.min,
    unitPriceMax: unitPrice.max,
    upperAmountMin: upperAmount.min ?? unitPrice.min,
    upperAmountMax: upperAmount.max ?? unitPrice.max,
    workLocationText,
    prefecture: parsePrefecture(text),
    startMonth,
    settlementTimeMin: settlement.min,
    settlementTimeMax: settlement.max,
    interviewCount: parseInterviewCount(text),
    commerceFlow: valueAfterLabel(text, ["商流"]),
    contractType: parseContractType(text),
    foreignNationalityPolicy: parseForeignPolicy(text),
    ageCondition: parseAgeCondition(text),
    upperCompanyName: parseCompany(text, ["上位会社", "上位", "会社名", "会社"]),
    contactName: parseContactName(mail, text),
    contactEmail: parseContactEmail(mail, text),
    remoteType: parseRemoteType(text),
    confidence: confidenceFromMissing(6, missingFields.length),
    needsReview: missingFields.length > 1,
    missingFields,
    raw: { subject: mail.subject, unitPriceText: unitPrice.text, upperAmountText: upperAmount.text },
  };
}

export function extractPersonFromMail(mail: MailExtractionSource): PersonExtraction {
  const text = mailText(mail);
  const subject = cleanSubject(mail.subject);
  const nameCandidate = valueAfterLabel(text, ["氏名", "名前", "要員名", "人材名"]);
  const initials = extractInitials(text, mail.subject);
  const skillResult = extractPrioritizedPersonSkills(text);
  const skills = skillResult.skills;
  const price = parseMoneyRange(text, ["希望単価", "単価", "金額"]);
  const preferredLocation = valueAfterLabel(text, ["希望勤務地", "勤務地", "最寄", "場所"]);
  const availableFrom = parseStartMonth(text);
  const careerSummaryBlock = blockAfterLabel(text, ["経歴", "経験", "職務経歴"]);
  const roleHeadline = extractRoleHeadline(text, mail.subject);
  const careerSummary = careerSummaryBlock ?? roleHeadline;
  const classificationWarning = classificationWarningFromSubject(mail.subject);
  const nameQuality = analyzePersonNameCandidate({
    candidate: nameCandidate,
    initials,
    subject: mail.subject,
    skills,
  });
  const missingFields = [
    nameQuality.acceptedName || initials ? null : "要員名",
    skills.length ? null : "スキル",
    price.max ? null : "希望単価",
    availableFrom ? null : "稼働開始",
  ].filter((value): value is string => Boolean(value));
  const reviewReasons = unique([
    ...nameQuality.reviewReasons,
    classificationWarning,
    roleHeadline && !careerSummaryBlock ? "PERSON_ROLE_FROM_SUBJECT_ONLY" : null,
    skillResult.overExtraction ? "PERSON_SKILLS_OVER_EXTRACTED" : null,
  ]);
  const needsReview =
    missingFields.length > 1 ||
    nameQuality.nameConfidence !== "HIGH" ||
    Boolean(classificationWarning) ||
    skillResult.overExtraction;
  const baseConfidence = confidenceFromMissing(4, missingFields.length);

  return {
    target: "person",
    name: nameQuality.acceptedName,
    initials,
    nameConfidence: nameQuality.nameConfidence,
    nameSource: nameQuality.nameSource,
    rejectedNameCandidate: nameQuality.rejectedNameCandidate,
    ownerCompanyName: parseCompany(text, ["所属会社", "所属"]),
    desiredUnitPrice: price.max,
    availableFrom,
    skills,
    skillCountBeforeLimit: skillResult.rawSkillCount,
    skillOverExtraction: skillResult.overExtraction,
    careerSummary,
    processText: valueAfterLabel(text, ["対応工程", "工程"]),
    roleHeadline,
    classificationWarning,
    preferredLocation,
    remotePreference: valueAfterLabel(text, ["リモート", "リモート可否"]) ?? (parseRemoteType(text) !== "UNKNOWN" ? parseRemoteType(text) : null),
    age: parseAge(text),
    nationality: parseNationality(text),
    status: "AVAILABLE",
    contactName: parseContactName(mail, text),
    contactEmail: parseContactEmail(mail, text),
    confidence: reviewConfidenceFromQuality(baseConfidence, nameQuality.nameConfidence, needsReview),
    needsReview,
    missingFields,
    reviewReasons,
    raw: {
      subject: mail.subject,
      fallbackTitle: subject,
      unitPriceText: price.text,
      nameCandidate,
      rejectedNameCandidate: nameQuality.rejectedNameCandidate,
      nameConfidence: nameQuality.nameConfidence,
      reviewReasons,
      roleHeadline,
      skillCountBeforeLimit: skillResult.rawSkillCount,
      classificationWarning,
    },
  };
}

export function extractFromMail(mail: MailExtractionSource): MailExtraction {
  if (mail.category === "PROJECT_INTRO") {
    return extractProjectFromMail(mail);
  }

  return extractPersonFromMail(mail);
}

export function formatDate(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}
