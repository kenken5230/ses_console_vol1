type Nullable<T> = T | null | undefined;

type DecimalLike = {
  toString?: () => string;
};

export type CompanyContactCandidateReasonCode =
  | "company_name_exact"
  | "company_name_variant"
  | "email_domain_match"
  | "contact_email_match"
  | "contact_name_exact"
  | "contact_name_variant";

export type CompanyContactCandidateCompanyLike = {
  id?: Nullable<string>;
  name?: Nullable<string>;
  tradeStatus?: Nullable<string>;
  mainEmailDomain?: Nullable<string>;
  tdbScore?: Nullable<string | number | DecimalLike>;
};

export type CompanyContactCandidateContactLike = {
  id?: Nullable<string>;
  name?: Nullable<string>;
  email?: Nullable<string>;
  phone?: Nullable<string>;
  department?: Nullable<string>;
  position?: Nullable<string>;
  isActive?: Nullable<boolean>;
};

export type CompanyContactCandidateSource = {
  company?: Nullable<CompanyContactCandidateCompanyLike>;
  contact?: Nullable<CompanyContactCandidateContactLike>;
};

export type CompanyContactCandidateInput = {
  companyName?: Nullable<string>;
  email?: Nullable<string>;
  contactEmail?: Nullable<string>;
  contactName?: Nullable<string>;
};

export type CompanyContactCandidateOptions = {
  maxCandidates?: number;
  maxRecordsToInspect?: number;
};

export type CompanyContactCandidateCompany = {
  id: string | null;
  name: string;
  tradeStatus: string;
  mainEmailDomain: string | null;
  tdbScore: string | null;
};

export type CompanyContactCandidateContact = {
  id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  department: string | null;
  position: string | null;
  isActive: boolean;
};

export type CompanyContactCandidate = {
  score: number;
  reasonCodes: CompanyContactCandidateReasonCode[];
  company: CompanyContactCandidateCompany | null;
  contact: CompanyContactCandidateContact | null;
};

const DEFAULT_MAX_CANDIDATES = 10;
const MAX_CANDIDATES_LIMIT = 50;
const DEFAULT_MAX_RECORDS_TO_INSPECT = 5000;
const MAX_RECORDS_TO_INSPECT_LIMIT = 20000;
const DEFAULT_TRADE_STATUS = "UNKNOWN";

const COMPANY_LEGAL_MARKERS = [
  "株式会社",
  "有限会社",
  "合同会社",
  "合資会社",
  "合名会社",
  "一般社団法人",
  "一般財団法人",
  "公益社団法人",
  "公益財団法人",
  "特定非営利活動法人",
  "(株)",
  "(有)",
  "(同)",
  "（株）",
  "（有）",
  "（同）"
];

const ENGLISH_LEGAL_SUFFIXES = new Set([
  "co",
  "company",
  "corp",
  "corporation",
  "gk",
  "inc",
  "incorporated",
  "kk",
  "limited",
  "llc",
  "ltd"
]);

const JAPANESE_LEGAL_TOKENS = new Set(["株", "有", "同"]);

const GENERIC_EMAIL_DOMAINS = new Set([
  "aol.com",
  "gmail.com",
  "googlemail.com",
  "hotmail.com",
  "icloud.com",
  "live.com",
  "me.com",
  "msn.com",
  "outlook.com",
  "proton.me",
  "protonmail.com",
  "yahoo.co.jp",
  "yahoo.com",
  "ymail.com"
]);

function cleanText(value: Nullable<unknown>, maxLength: number) {
  if (value === null || value === undefined) return null;
  const text = String(value).normalize("NFKC").replace(/\s+/g, " ").trim();
  if (!text) return null;
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

function decimalText(value: Nullable<string | number | DecimalLike>) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : null;
  if (typeof value === "string") return cleanText(value, 32);
  if (typeof value.toString === "function") return cleanText(value.toString(), 32);
  return null;
}

function clampInteger(value: Nullable<number>, fallback: number, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function normalizeBaseText(value: Nullable<string>) {
  return cleanText(value, 512)
    ?.toLowerCase()
    .replace(/[&＆]/g, " and ")
    .replace(/[‐‑‒–—―－ｰ]/g, "-")
    .replace(/[.,，。、・/\\|:;'"`()[\]{}<>【】「」『』]/g, " ")
    .replace(/\s+/g, " ")
    .trim() || "";
}

function compactSearchText(value: string) {
  return value.replace(/[^0-9a-z\u3040-\u30ff\u3400-\u9fff]+/g, "");
}

export function normalizeCompanyNameForCandidate(value: Nullable<string>) {
  let text = normalizeBaseText(value);
  for (const marker of COMPANY_LEGAL_MARKERS) {
    text = text.split(marker.toLowerCase()).join(" ");
  }

  const tokens = text
    .replace(/[^0-9a-z\u3040-\u30ff\u3400-\u9fff]+/g, " ")
    .split(/\s+/)
    .filter((token) => token && !ENGLISH_LEGAL_SUFFIXES.has(token) && !JAPANESE_LEGAL_TOKENS.has(token));

  return tokens.join("");
}

export function normalizeContactNameForCandidate(value: Nullable<string>) {
  const text = normalizeBaseText(value)
    .replace(/\b(mr|mrs|ms|san|sama)\b/g, " ")
    .replace(/[様殿氏]/g, " ");
  return compactSearchText(text);
}

function contactNameVariantKeys(value: Nullable<string>) {
  const base = normalizeBaseText(value)
    .replace(/\b(mr|mrs|ms|san|sama)\b/g, " ")
    .replace(/[様殿氏]/g, " ");
  const compact = compactSearchText(base);
  const latinTokens = base.split(/\s+/).filter((token) => /^[a-z]+$/.test(token));
  const keys = new Set<string>();
  if (compact) keys.add(compact);
  if (latinTokens.length >= 2) keys.add(latinTokens.sort().join(""));
  return keys;
}

function normalizeDomain(value: Nullable<string>) {
  const domain = cleanText(value, 255)
    ?.toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split(/[/?#:>\s,;)]+/)[0]
    .replace(/\.$/, "");
  if (!domain || !domain.includes(".")) return null;
  return domain;
}

export function emailDomainForCandidate(value: Nullable<string>) {
  const email = cleanText(value, 320)?.toLowerCase();
  if (!email) return null;
  const atIndex = email.lastIndexOf("@");
  if (atIndex <= 0 || atIndex === email.length - 1) return null;
  return normalizeDomain(email.slice(atIndex + 1));
}

function normalizeEmail(value: Nullable<string>) {
  const email = cleanText(value, 320)?.toLowerCase();
  if (!email || !email.includes("@")) return null;
  return email.replace(/^.*<([^>]+)>.*$/, "$1");
}

function isGenericDomain(domain: string) {
  return GENERIC_EMAIL_DOMAINS.has(domain);
}

function domainsMatch(inputDomain: string, candidateDomain: string) {
  if (isGenericDomain(inputDomain) || isGenericDomain(candidateDomain)) return false;
  return (
    inputDomain === candidateDomain ||
    inputDomain.endsWith(`.${candidateDomain}`) ||
    candidateDomain.endsWith(`.${inputDomain}`)
  );
}

function nameSimilarity(left: string, right: string) {
  if (!left || !right) return 0;
  if (left === right) return 1;
  const maxLength = Math.max(left.length, right.length);
  if (maxLength === 0) return 0;

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = Array.from({ length: right.length + 1 }, () => 0);

  for (let i = 1; i <= left.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const substitutionCost = left[i - 1] === right[j - 1] ? 0 : 1;
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + substitutionCost
      );
    }
    for (let j = 0; j <= right.length; j += 1) previous[j] = current[j];
  }

  return 1 - previous[right.length] / maxLength;
}

function isCompanyNameVariant(inputName: string, candidateName: string) {
  if (!inputName || !candidateName || inputName === candidateName) return false;
  const shorter = inputName.length <= candidateName.length ? inputName : candidateName;
  const longer = inputName.length > candidateName.length ? inputName : candidateName;
  if (shorter.length >= 4 && longer.includes(shorter)) return true;
  return Math.min(inputName.length, candidateName.length) >= 6 && nameSimilarity(inputName, candidateName) >= 0.82;
}

function safeCompany(company: Nullable<CompanyContactCandidateCompanyLike>): CompanyContactCandidateCompany | null {
  if (!company) return null;
  const name = cleanText(company.name, 255);
  if (!name) return null;
  return {
    id: cleanText(company.id, 80),
    name,
    tradeStatus: cleanText(company.tradeStatus, 40) || DEFAULT_TRADE_STATUS,
    mainEmailDomain: normalizeDomain(company.mainEmailDomain),
    tdbScore: decimalText(company.tdbScore)
  };
}

function safeContact(contact: Nullable<CompanyContactCandidateContactLike>): CompanyContactCandidateContact | null {
  if (!contact) return null;
  const name = cleanText(contact.name, 160);
  const email = normalizeEmail(contact.email);
  const phone = cleanText(contact.phone, 80);
  if (!name && !email && !phone) return null;
  return {
    id: cleanText(contact.id, 80),
    name: name || email || phone || "-",
    email,
    phone,
    department: cleanText(contact.department, 160),
    position: cleanText(contact.position, 160),
    isActive: contact.isActive !== false
  };
}

function addReason(
  reasonCodes: CompanyContactCandidateReasonCode[],
  reasonCode: CompanyContactCandidateReasonCode,
  points: number
) {
  if (!reasonCodes.includes(reasonCode)) reasonCodes.push(reasonCode);
  return points;
}

function candidateKey(candidate: CompanyContactCandidate) {
  const companyKey = candidate.company?.id || candidate.company?.name || "-";
  const contactKey = candidate.contact?.id || candidate.contact?.email || candidate.contact?.name || "-";
  return `${companyKey}\n${contactKey}`;
}

function mergeCandidate(existing: CompanyContactCandidate, next: CompanyContactCandidate) {
  if (next.score > existing.score) return next;
  if (next.score < existing.score) return existing;
  const reasonCodes = [...existing.reasonCodes];
  for (const reasonCode of next.reasonCodes) {
    if (!reasonCodes.includes(reasonCode)) reasonCodes.push(reasonCode);
  }
  return {
    ...existing,
    reasonCodes,
    score: existing.score
  };
}

export function findCompanyContactCandidates(
  input: CompanyContactCandidateInput,
  sources: readonly CompanyContactCandidateSource[],
  options: CompanyContactCandidateOptions = {}
): CompanyContactCandidate[] {
  const maxCandidates = clampInteger(options.maxCandidates, DEFAULT_MAX_CANDIDATES, 1, MAX_CANDIDATES_LIMIT);
  const maxRecordsToInspect = clampInteger(
    options.maxRecordsToInspect,
    DEFAULT_MAX_RECORDS_TO_INSPECT,
    1,
    MAX_RECORDS_TO_INSPECT_LIMIT
  );
  const inputCompanyName = normalizeCompanyNameForCandidate(input.companyName);
  const inputContactName = normalizeContactNameForCandidate(input.contactName);
  const inputContactNameKeys = contactNameVariantKeys(input.contactName);
  const inputEmails = [normalizeEmail(input.contactEmail), normalizeEmail(input.email)].filter(
    (email): email is string => Boolean(email)
  );
  const inputDomains = [emailDomainForCandidate(input.contactEmail), emailDomainForCandidate(input.email)].filter(
    (domain): domain is string => Boolean(domain)
  );
  const byKey = new Map<string, CompanyContactCandidate>();

  for (const source of sources.slice(0, maxRecordsToInspect)) {
    const company = safeCompany(source.company);
    const contact = safeContact(source.contact);
    if (!company && !contact) continue;

    const reasonCodes: CompanyContactCandidateReasonCode[] = [];
    let score = 0;

    const candidateCompanyName = normalizeCompanyNameForCandidate(company?.name);
    if (inputCompanyName && candidateCompanyName) {
      if (inputCompanyName === candidateCompanyName) {
        score += addReason(reasonCodes, "company_name_exact", 46);
      } else if (isCompanyNameVariant(inputCompanyName, candidateCompanyName)) {
        score += addReason(reasonCodes, "company_name_variant", 28);
      }
    }

    const candidateEmail = normalizeEmail(contact?.email);
    if (candidateEmail && inputEmails.includes(candidateEmail)) {
      score += addReason(reasonCodes, "contact_email_match", 62);
    }

    const candidateDomains = [company?.mainEmailDomain, emailDomainForCandidate(candidateEmail)].filter(
      (domain): domain is string => Boolean(domain)
    );
    if (
      inputDomains.length &&
      candidateDomains.some((candidateDomain) => inputDomains.some((inputDomain) => domainsMatch(inputDomain, candidateDomain)))
    ) {
      score += addReason(reasonCodes, "email_domain_match", 34);
    }

    const candidateContactName = normalizeContactNameForCandidate(contact?.name);
    if (inputContactName && candidateContactName) {
      if (inputContactName === candidateContactName) {
        score += addReason(reasonCodes, "contact_name_exact", 40);
      } else {
        const candidateContactNameKeys = contactNameVariantKeys(contact?.name);
        const hasVariant = [...inputContactNameKeys].some((key) => candidateContactNameKeys.has(key));
        if (hasVariant || nameSimilarity(inputContactName, candidateContactName) >= 0.84) {
          score += addReason(reasonCodes, "contact_name_variant", 22);
        }
      }
    }

    if (score <= 0) continue;

    const candidate: CompanyContactCandidate = {
      score: Math.min(100, score),
      reasonCodes,
      company,
      contact
    };
    const key = candidateKey(candidate);
    const existing = byKey.get(key);
    byKey.set(key, existing ? mergeCandidate(existing, candidate) : candidate);
  }

  return [...byKey.values()]
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (right.reasonCodes.length !== left.reasonCodes.length) return right.reasonCodes.length - left.reasonCodes.length;
      return (left.company?.name || left.contact?.name || "").localeCompare(right.company?.name || right.contact?.name || "");
    })
    .slice(0, maxCandidates);
}
