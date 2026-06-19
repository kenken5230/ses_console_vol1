import type { MailExtraction, MailExtractionSource } from "./gmail-extraction";

export type GmailCompanyCandidateSource =
  | "body_label"
  | "known_main_email_domain"
  | "known_alias"
  | "signature_company"
  | "from_name"
  | "sender_domain"
  | "generic_domain"
  | "none";

export type GmailCompanyCandidateConfidence = "HIGH" | "MEDIUM" | "LOW" | "NONE";

export type KnownCompanyIdentity = {
  name: string;
  normalizedName?: string | null;
  mainEmailDomain?: string | null;
  aliases?: Array<string | { aliasName: string; normalizedAliasName?: string | null }>;
};

export type GmailCompanyCandidate = {
  candidateName: string | null;
  source: GmailCompanyCandidateSource;
  confidence: GmailCompanyCandidateConfidence;
  confidenceScore: number;
  reasonCodes: string[];
  isGenericDomain: boolean;
};

export type GmailCompanyCandidateInput = {
  fromName?: string | null;
  fromEmail?: string | null;
  bodyText?: string | null;
  signatureText?: string | null;
  bodyLabelCompany?: string | null;
  knownCompanies?: KnownCompanyIdentity[];
};

const GENERIC_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.co.jp",
  "yahoo.com",
  "ymail.ne.jp",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "zoho.com",
  "gmx.com",
  "mail.com",
  "example.com",
  "example.net",
  "example.org",
  "example.test",
  "localhost",
]);

const COMPANY_DESIGNATOR_PATTERN =
  /\b(?:inc|inc\.|ltd|ltd\.|llc|corp|corporation|co\.,?\s*ltd\.?|company|systems|solutions|technologies|technology|partners|consulting|group|holdings|labs|studio)\b|(?:株式会社|有限会社|合同会社|合資会社|（株）|\(株\)|㈱)/i;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const URL_PATTERN = /(?:https?:\/\/|www\.)\S+/i;
const PHONE_PATTERN = /\b(?:tel|phone|fax)\b|(?:\+?\d[\d\s().-]{7,}\d)/i;
const PERSON_ONLY_ASCII_PATTERN = /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}$/;

function clean(value: string | null | undefined): string | null {
  const cleaned = value
    ?.replace(/\r/g, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return cleaned || null;
}

function cleanCompanyName(value: string | null | undefined): string | null {
  const cleaned = clean(value)
    ?.replace(EMAIL_PATTERN, " ")
    .replace(URL_PATTERN, " ")
    .replace(PHONE_PATTERN, " ")
    .replace(/["'<>]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s/|,;:-]+|[\s/|,;:-]+$/g, "")
    .trim();
  return cleaned ? cleaned.slice(0, 255) : null;
}

function normalizeKey(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[株式会社有限会社合同会社合資会社（）()\[\]【】"'`.,、。・\s_-]/g, "");
}

function senderDomain(fromEmail: string | null | undefined): string | null {
  const domain = fromEmail?.split("@")[1]?.trim().toLowerCase();
  return domain || null;
}

export function isGenericEmailDomain(domain: string | null | undefined): boolean {
  const normalized = domain?.trim().toLowerCase();
  if (!normalized) return false;
  return GENERIC_EMAIL_DOMAINS.has(normalized);
}

function candidate(
  candidateName: string | null,
  source: GmailCompanyCandidateSource,
  confidence: GmailCompanyCandidateConfidence,
  confidenceScore: number,
  reasonCodes: string[],
  isGenericDomain = false,
): GmailCompanyCandidate {
  return {
    candidateName: cleanCompanyName(candidateName),
    source,
    confidence,
    confidenceScore,
    reasonCodes,
    isGenericDomain,
  };
}

function none(reasonCodes: string[] = ["NO_COMPANY_CANDIDATE"]): GmailCompanyCandidate {
  return candidate(null, "none", "NONE", 0, reasonCodes);
}

function companyAliases(company: KnownCompanyIdentity): string[] {
  return [
    company.name,
    company.normalizedName,
    ...(company.aliases ?? []).map((alias) => (typeof alias === "string" ? alias : alias.aliasName)),
  ].filter((value): value is string => Boolean(clean(value)));
}

function knownCompanyFromDomain(
  domain: string | null,
  knownCompanies: KnownCompanyIdentity[] | undefined,
): GmailCompanyCandidate | null {
  if (!domain || !knownCompanies?.length || isGenericEmailDomain(domain)) return null;

  const match = knownCompanies.find((company) => {
    const knownDomain = company.mainEmailDomain?.trim().toLowerCase();
    return Boolean(knownDomain && (domain === knownDomain || domain.endsWith(`.${knownDomain}`)));
  });

  return match
    ? candidate(match.name, "known_main_email_domain", "HIGH", 0.92, ["KNOWN_COMPANY_MAIN_EMAIL_DOMAIN_MATCH"])
    : null;
}

function knownCompanyFromText(
  textValues: Array<string | null | undefined>,
  knownCompanies: KnownCompanyIdentity[] | undefined,
): GmailCompanyCandidate | null {
  if (!knownCompanies?.length) return null;
  const textKey = normalizeKey(textValues.filter(Boolean).join(" "));
  if (!textKey) return null;

  const matches = knownCompanies
    .map((company) => {
      const aliases = companyAliases(company)
        .map((alias) => ({ raw: alias, key: normalizeKey(alias) }))
        .filter((alias) => alias.key.length >= 3);
      const matchedAlias = aliases.find((alias) => textKey.includes(alias.key));
      return matchedAlias ? { company, matchedLength: matchedAlias.key.length } : null;
    })
    .filter((value): value is { company: KnownCompanyIdentity; matchedLength: number } => Boolean(value))
    .sort((left, right) => right.matchedLength - left.matchedLength);

  return matches[0]
    ? candidate(matches[0].company.name, "known_alias", "HIGH", 0.88, ["KNOWN_COMPANY_ALIAS_MATCH"])
    : null;
}

function signatureText(input: GmailCompanyCandidateInput): string | null {
  const explicit = clean(input.signatureText);
  if (explicit) return explicit;

  const body = clean(input.bodyText);
  if (!body) return null;

  const signatureMarkerIndex = body.search(/(?:^|\n)(?:--\s*$|Regards,?|Best regards,?|Sincerely,?|Thank you,?|敬具|以上)/im);
  if (signatureMarkerIndex >= 0) return body.slice(signatureMarkerIndex).trim();
  return body.split("\n").slice(-12).join("\n").trim();
}

function signatureCompany(input: GmailCompanyCandidateInput): string | null {
  const signature = signatureText(input);
  if (!signature) return null;

  const lines = signature
    .split("\n")
    .map((line) => cleanCompanyName(line))
    .filter((line): line is string => Boolean(line));

  return lines.find((line) => COMPANY_DESIGNATOR_PATTERN.test(line) && !EMAIL_PATTERN.test(line) && !URL_PATTERN.test(line)) ?? null;
}

function companyLikeSegmentFromName(fromName: string | null | undefined): string | null {
  const cleaned = cleanCompanyName(fromName);
  if (!cleaned) return null;

  const segments = cleaned
    .split(/\s*(?:[|/｜／]| - | – | — )\s*/)
    .map((segment) => cleanCompanyName(segment))
    .filter((segment): segment is string => Boolean(segment));

  const companySegment = segments.find((segment) => COMPANY_DESIGNATOR_PATTERN.test(segment));
  if (companySegment) return companySegment;

  if (segments.length === 1 && COMPANY_DESIGNATOR_PATTERN.test(cleaned)) return cleaned;
  if (PERSON_ONLY_ASCII_PATTERN.test(cleaned)) return null;

  return null;
}

function domainLabel(domain: string): string | null {
  const labels = domain.split(".").filter(Boolean);
  if (labels.length === 0) return null;

  const suffix2 = labels.slice(-2).join(".");
  const rootIndex = /^(?:co|ne|or|ac|go|ed|gr)\.jp$/.test(suffix2) ? labels.length - 3 : labels.length - 2;
  const root = labels[Math.max(0, rootIndex)];
  if (!root || root.length <= 2 || /^(?:mail|smtp|mx|email|corp|co|ne|or|ac|go)$/.test(root)) return null;

  return root
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function inferGmailCompanyCandidate(input: GmailCompanyCandidateInput): GmailCompanyCandidate {
  const domain = senderDomain(input.fromEmail);
  const knownDomain = knownCompanyFromDomain(domain, input.knownCompanies);
  if (knownDomain) return knownDomain;

  const knownAlias = knownCompanyFromText(
    [input.bodyLabelCompany, input.fromName, signatureText(input)],
    input.knownCompanies,
  );
  if (knownAlias) return knownAlias;

  const bodyLabel = cleanCompanyName(input.bodyLabelCompany);
  if (bodyLabel) return candidate(bodyLabel, "body_label", "HIGH", 0.86, ["BODY_LABEL_COMPANY"]);

  const fromNameCompany = companyLikeSegmentFromName(input.fromName);
  if (fromNameCompany) {
    return candidate(fromNameCompany, "from_name", "MEDIUM", 0.72, ["FROM_NAME_COMPANY_LIKE"]);
  }

  const signature = signatureCompany(input);
  if (signature) return candidate(signature, "signature_company", "MEDIUM", 0.68, ["SIGNATURE_COMPANY_LINE"]);

  if (domain) {
    if (isGenericEmailDomain(domain)) {
      return candidate(null, "generic_domain", "LOW", 0.2, ["GENERIC_EMAIL_DOMAIN_WEAK"], true);
    }

    const label = domainLabel(domain);
    if (label) return candidate(label, "sender_domain", "LOW", 0.42, ["SENDER_DOMAIN_DERIVED_WEAK"]);
  }

  return none();
}

export function inferGmailCompanyCandidateForExtraction(input: {
  mail: MailExtractionSource;
  extraction: MailExtraction;
  knownCompanies?: KnownCompanyIdentity[];
}): GmailCompanyCandidate {
  const bodyLabelCompany =
    input.extraction.target === "project"
      ? input.extraction.upperCompanyName
      : input.extraction.ownerCompanyName;

  return inferGmailCompanyCandidate({
    fromName: input.mail.fromName,
    fromEmail: input.mail.fromEmail,
    bodyText: input.mail.bodyText ?? input.mail.normalizedBody,
    bodyLabelCompany,
    knownCompanies: input.knownCompanies,
  });
}

export function anonymizedCompanyCandidate(candidateValue: GmailCompanyCandidate): Omit<GmailCompanyCandidate, "candidateName"> & {
  candidatePresent: boolean;
} {
  return {
    source: candidateValue.source,
    confidence: candidateValue.confidence,
    confidenceScore: candidateValue.confidenceScore,
    reasonCodes: candidateValue.reasonCodes,
    isGenericDomain: candidateValue.isGenericDomain,
    candidatePresent: Boolean(candidateValue.candidateName),
  };
}
