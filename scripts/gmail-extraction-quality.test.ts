import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { decideGmailCompanyCandidateAutoApply, inferGmailCompanyCandidate } from "./gmail-company-candidate";
import { classifyMailExtractionQuality, extractFromMail, extractPersonFromMail, extractProjectFromMail, type MailExtractionSource } from "./gmail-extraction";
import { assertNoSensitiveOutput, buildAnonymizedIssueRow } from "./gmail-extraction-quality-report";

const rootDir = process.cwd();

function readProjectFile(filePath: string) {
  return readFileSync(path.join(rootDir, filePath), "utf8");
}

function mail(input: { subject: string; bodyText?: string | null; bodyHtml?: string | null; category?: "PROJECT_INTRO" | "PERSON_INTRO" }): MailExtractionSource {
  return {
    id: "12345678-1234-1234-1234-123456789abc",
    category: input.category ?? "PERSON_INTRO",
    externalMessageId: "test-message",
    subject: input.subject,
    bodyText: input.bodyText ?? null,
    bodyHtml: input.bodyHtml ?? null,
    normalizedBody: input.bodyText ?? null,
    fromEmail: "sender@example.test",
    fromName: "Sender",
    receivedAt: new Date("2026-06-03T00:00:00.000Z"),
  };
}

{
  const extraction = extractPersonFromMail(mail({ subject: "氏名：山田太郎" }));
  assert.equal(extraction.name, "山田太郎");
  assert.equal(extraction.nameConfidence, "HIGH");
  assert.equal(extraction.nameSource, "body_labeled_field");
  assert.deepEqual(extraction.reviewReasons.filter((reason) => reason.includes("PERSON_NAME")), []);
}

{
  const extraction = extractPersonFromMail(mail({ subject: "R.N / 33歳 / 45万" }));
  assert.equal(extraction.name, null);
  assert.equal(extraction.initials, "R.N");
  assert.equal(extraction.nameConfidence, "MEDIUM");
  assert.equal(extraction.nameSource, "initials");
  assert.equal(extraction.needsReview, true);
  assert.equal(extraction.age, 33);
  assert.equal(extraction.desiredUnitPrice, 45);
  assert.ok(extraction.reviewReasons.includes("PERSON_NAME_INITIALS_ONLY"));
}

{
  const extraction = extractPersonFromMail(mail({ subject: "[SES配信] PHPエンジニアのご紹介です！ Laravel, CakePHP, Java, Python, React/Vue" }));
  assert.equal(extraction.name, null);
  assert.equal(extraction.nameConfidence, "LOW");
  assert.equal(extraction.roleHeadline, "PHPエンジニア");
  assert.ok(extraction.reviewReasons.includes("PERSON_NAME_LOW_CONFIDENCE"));
  assert.ok(extraction.reviewReasons.includes("PERSON_NAME_REJECTED_SUBJECT_LIKE"));
  assert.ok(extraction.reviewReasons.includes("PERSON_ROLE_FROM_SUBJECT_ONLY"));
  assert.equal(extraction.roleHeadlineSource, "subject_only");
}

{
  const extraction = extractPersonFromMail(mail({ subject: "[SES配信] 熱い案件のご紹介です【クリア横山】" }));
  assert.equal(extraction.classificationWarning, "PERSON_SUBJECT_LOOKS_LIKE_PROJECT");
  assert.ok(extraction.reviewReasons.includes("PERSON_SUBJECT_LOOKS_LIKE_PROJECT"));
}

{
  const extraction = extractPersonFromMail(mail({
    subject: "氏名：佐藤花子",
    bodyText: "スキル：React.js / Nextjs / Postgres / C#.NET / VB.NET",
  }));
  assert.deepEqual(extraction.skills, ["React", "Next.js", "C#", ".NET", "VB.NET", "PostgreSQL"]);
}

{
  const extraction = extractPersonFromMail(mail({
    subject: "署名担当者を誤採用しない",
    bodyText: "稼働可能: 7月\n希望単価: 60万円\nスキル: Java\nサンプル株式会社 営業担当 田島営業\nMail: sample@example.test",
  }));
  assert.equal(extraction.name, null);
  assert.equal(extraction.nameConfidence, "LOW");
  assert.ok(extraction.reviewReasons.includes("PERSON_NAME_REJECTED_COMPANY_OR_SIGNATURE"));
}

{
  const extraction = extractPersonFromMail(mail({
    subject: "本文roleあり要員",
    bodyText: "氏名: 高橋三郎\n職種: インフラSE\n希望単価: 80万円\n稼働: 8月\nスキル: AWS, Linux",
  }));
  assert.equal(extraction.roleHeadline, "インフラSE");
  assert.equal(extraction.roleHeadlineSource, "body_labeled_field");
}

{
  const extraction = extractProjectFromMail(mail({
    category: "PROJECT_INTRO",
    subject: "【案件】スキル多数の開発支援",
    bodyText: "案件名: 匿名開発支援\n作業内容: Web開発\n必須スキル: Java, Spring, JavaScript, TypeScript, React, Next.js, Node, Python, Go, AWS, Azure, GCP, MySQL, PostgreSQL, Linux, Windows, SAP, PMO\n単価: 95万円\n勤務地: 新宿\n開始: 7月",
  }));
  assert.equal(extraction.skillOverExtraction, true);
  assert.ok(extraction.reviewReasons.includes("PROJECT_SKILL_OVER_EXTRACTION"));
  assert.ok(extraction.requiredSkills.length <= 10);
}

{
  const quality = classifyMailExtractionQuality(mail({
    category: "PROJECT_INTRO",
    subject: "【案件】Java募集",
    bodyText: "氏名: 青木一\n稼働可能: 7月\n希望単価: 70万円\nスキル: Java, Spring",
  }));
  assert.equal(quality.predictedType, "other");
  assert.ok(quality.warnings.includes("CLASSIFICATION_SIGNAL_CONFLICT"));
}

{
  const extraction = extractFromMail(mail({
    category: "PERSON_INTRO",
    subject: "HTML only person",
    bodyHtml: "<div>氏名: 小林六花</div><div>希望単価: 66万円</div><div>稼働可能: 7月</div><div>職種: PHPエンジニア</div><div>スキル: PHP, Laravel</div>",
  }));
  assert.equal(extraction.target, "person");
  assert.equal(extraction.name, "小林六花");
}

{
  const extraction = extractPersonFromMail(mail({
    subject: "PII redaction test",
    bodyText: "氏名: 山田太郎\n希望単価: 70万円\nスキル: Java\n連絡先: sample@example.test",
  }));
  const output = JSON.stringify(buildAnonymizedIssueRow({ id: "mail-with-secret-like-values", extraction }));
  assertNoSensitiveOutput(output);
  assert.equal(output.includes("sample@example.test"), false);
  assert.equal(output.includes("山田太郎"), false);
}

{
  const extraction = extractPersonFromMail(mail({
    subject: "company candidate redaction test",
    bodyText: "Name: Redaction Fixture\nRate: 70\nSkills: Java",
  }));
  const companyCandidate = inferGmailCompanyCandidate({
    bodyLabelCompany: "Sensitive Partner Systems Inc.",
    fromEmail: "sender@sensitive-partner.test",
  });
  const row = buildAnonymizedIssueRow({
    id: "mail-with-company-candidate",
    extraction,
    companyCandidate,
  });
  const output = JSON.stringify(row);
  assertNoSensitiveOutput(output);
  assert.equal(row.companyCandidate?.candidatePresent, true);
  assert.equal(row.companyCandidate?.existingCompanyLinkPresent, false);
  assert.equal(output.includes("Sensitive Partner Systems Inc."), false);
  assert.equal(output.includes("candidateName"), false);
  assert.equal(output.includes("existingCompanyId"), false);
}

{
  const candidate = inferGmailCompanyCandidate({
    bodyLabelCompany: "Body Label Systems Inc.",
    fromEmail: "sender@relay.example.invalid",
  });
  assert.equal(candidate.candidateName, "Body Label Systems Inc.");
  assert.equal(candidate.source, "body_label");
  assert.equal(candidate.confidence, "HIGH");
  assert.ok(candidate.reasonCodes.includes("BODY_LABEL_COMPANY"));
}

{
  const candidate = inferGmailCompanyCandidate({
    fromName: "Taro Yamada / FromName Systems Inc.",
    fromEmail: "taro@gmail.com",
  });
  assert.equal(candidate.candidateName, "FromName Systems Inc.");
  assert.equal(candidate.source, "from_name");
  assert.equal(candidate.candidateName?.includes("Taro Yamada"), false);
}

{
  const candidate = inferGmailCompanyCandidate({
    fromName: "Fixture Sender",
    fromEmail: "sender@engineering.domain-match.example.invalid",
    knownCompanies: [{ id: "company-domain-existing", name: "Known Domain Company", mainEmailDomain: "domain-match.example.invalid" }],
  });
  assert.equal(candidate.candidateName, "Known Domain Company");
  assert.equal(candidate.existingCompanyId, "company-domain-existing");
  assert.equal(candidate.source, "known_main_email_domain");
  assert.equal(candidate.confidence, "HIGH");
}

{
  const candidate = inferGmailCompanyCandidate({
    fromName: "Alias Labs recruiting",
    fromEmail: "sender@gmail.com",
    knownCompanies: [{ id: "company-alias-existing", name: "Known Alias Company", aliases: ["Alias Labs"] }],
  });
  assert.equal(candidate.candidateName, "Known Alias Company");
  assert.equal(candidate.existingCompanyId, "company-alias-existing");
  assert.equal(candidate.source, "known_alias");
}

{
  const candidate = inferGmailCompanyCandidate({
    fromName: "Taro Yamada",
    fromEmail: "taro@gmail.com",
  });
  assert.equal(candidate.candidateName, null);
  assert.equal(candidate.source, "generic_domain");
  assert.equal(candidate.confidence, "LOW");
  assert.equal(candidate.isGenericDomain, true);
}

{
  const candidate = inferGmailCompanyCandidate({
    fromEmail: "sales@relay.example.invalid",
    bodyText: "Regards,\nSignature Systems LLC\nSales Team\n",
  });
  assert.equal(candidate.candidateName, "Signature Systems LLC");
  assert.equal(candidate.source, "signature_company");
  assert.equal(candidate.confidence, "MEDIUM");
}

{
  const existingDomainCandidate = inferGmailCompanyCandidate({
    fromEmail: "sender@engineering.domain-match.example.invalid",
    knownCompanies: [{ id: "company-domain-existing", name: "Known Domain Company", mainEmailDomain: "domain-match.example.invalid" }],
  });
  assert.deepEqual(decideGmailCompanyCandidateAutoApply(existingDomainCandidate), {
    autoApplyEligible: true,
    applyMode: "existing_company_link",
    reasonCodes: ["EXISTING_COMPANY_LINK_CANDIDATE"],
  });

  const existingAliasCandidate = inferGmailCompanyCandidate({
    fromName: "Alias Labs recruiting",
    fromEmail: "sender@gmail.com",
    knownCompanies: [{ id: "company-alias-existing", name: "Known Alias Company", aliases: ["Alias Labs"] }],
  });
  assert.equal(existingAliasCandidate.source, "known_alias");
  assert.equal(existingAliasCandidate.isGenericDomain, false, "known_alias is existing-company evidence, not generic-domain-derived evidence");
  assert.deepEqual(decideGmailCompanyCandidateAutoApply(existingAliasCandidate), {
    autoApplyEligible: true,
    applyMode: "existing_company_link",
    reasonCodes: ["EXISTING_COMPANY_LINK_CANDIDATE"],
  });

  const bodyLabelCandidate = inferGmailCompanyCandidate({
    bodyLabelCompany: "New Body Label Systems Inc.",
    fromEmail: "sender@relay.example.invalid",
  });
  const bodyLabelDecision = decideGmailCompanyCandidateAutoApply(bodyLabelCandidate);
  assert.equal(bodyLabelDecision.autoApplyEligible, false, "body label candidates must not create new Companies automatically");
  assert.equal(bodyLabelDecision.applyMode, "advisory_only");
  assert.ok(bodyLabelDecision.reasonCodes.includes("NON_EXISTING_COMPANY_SOURCE_ADVISORY_ONLY"));

  const knownDomainWithoutIdCandidate = inferGmailCompanyCandidate({
    fromEmail: "sender@engineering.domain-match.example.invalid",
    knownCompanies: [{ name: "Known Domain Company", mainEmailDomain: "domain-match.example.invalid" }],
  });
  const knownDomainWithoutIdDecision = decideGmailCompanyCandidateAutoApply(knownDomainWithoutIdCandidate);
  assert.equal(knownDomainWithoutIdCandidate.source, "known_main_email_domain");
  assert.equal(knownDomainWithoutIdCandidate.confidence, "HIGH");
  assert.equal(knownDomainWithoutIdCandidate.existingCompanyId, null);
  assert.equal(knownDomainWithoutIdDecision.autoApplyEligible, false, "known domain matches without an existing company id are advisory-only");
  assert.ok(knownDomainWithoutIdDecision.reasonCodes.includes("MISSING_EXISTING_COMPANY_ID_ADVISORY_ONLY"));

  const knownAliasWithoutIdCandidate = inferGmailCompanyCandidate({
    fromName: "Alias Labs recruiting",
    fromEmail: "sender@gmail.com",
    knownCompanies: [{ name: "Known Alias Company", aliases: ["Alias Labs"] }],
  });
  const knownAliasWithoutIdDecision = decideGmailCompanyCandidateAutoApply(knownAliasWithoutIdCandidate);
  assert.equal(knownAliasWithoutIdCandidate.source, "known_alias");
  assert.equal(knownAliasWithoutIdCandidate.confidence, "HIGH");
  assert.equal(knownAliasWithoutIdCandidate.existingCompanyId, null);
  assert.equal(knownAliasWithoutIdDecision.autoApplyEligible, false, "known alias matches without an existing company id are advisory-only");
  assert.ok(knownAliasWithoutIdDecision.reasonCodes.includes("MISSING_EXISTING_COMPANY_ID_ADVISORY_ONLY"));

  const genericDerivedCandidateWithStrongFields = {
    existingCompanyId: "company-generic-derived",
    candidateName: "Generic Derived Company",
    source: "generic_domain" as const,
    confidence: "HIGH" as const,
    confidenceScore: 0.99,
    reasonCodes: ["GENERIC_EMAIL_DOMAIN_WEAK"],
    isGenericDomain: true,
  };
  const genericDerivedDecision = decideGmailCompanyCandidateAutoApply(genericDerivedCandidateWithStrongFields);
  assert.equal(
    genericDerivedDecision.autoApplyEligible,
    false,
    "generic-domain-derived candidates stay advisory-only even if other fields look strong"
  );
  assert.ok(genericDerivedDecision.reasonCodes.includes("GENERIC_DOMAIN_ADVISORY_ONLY"));
  assert.ok(genericDerivedDecision.reasonCodes.includes("NON_EXISTING_COMPANY_SOURCE_ADVISORY_ONLY"));

  const fallbackCases = [
    inferGmailCompanyCandidate({ fromName: "Taro Yamada / FromName Systems Inc.", fromEmail: "taro@gmail.com" }),
    inferGmailCompanyCandidate({
      fromEmail: "sales@relay.example.invalid",
      bodyText: "Regards,\nSignature Systems LLC\nSales Team\n",
    }),
    inferGmailCompanyCandidate({ fromName: "Taro Yamada", fromEmail: "taro@gmail.com" }),
    inferGmailCompanyCandidate({ fromEmail: "sender@unmatched-systems.example.invalid" }),
  ];

  for (const fallbackCandidate of fallbackCases) {
    const decision = decideGmailCompanyCandidateAutoApply(fallbackCandidate);
    assert.equal(decision.autoApplyEligible, false, `${fallbackCandidate.source} must not be auto-apply eligible`);
    assert.equal(decision.applyMode, "advisory_only");
  }

  const fromNameDecision = decideGmailCompanyCandidateAutoApply(fallbackCases[0]);
  assert.ok(fromNameDecision.reasonCodes.includes("NON_HIGH_CONFIDENCE_ADVISORY_ONLY"));
  assert.ok(fromNameDecision.reasonCodes.includes("NON_EXISTING_COMPANY_SOURCE_ADVISORY_ONLY"));

  const signatureDecision = decideGmailCompanyCandidateAutoApply(fallbackCases[1]);
  assert.ok(signatureDecision.reasonCodes.includes("NON_HIGH_CONFIDENCE_ADVISORY_ONLY"));
  assert.ok(signatureDecision.reasonCodes.includes("NON_EXISTING_COMPANY_SOURCE_ADVISORY_ONLY"));

  const genericDecision = decideGmailCompanyCandidateAutoApply(fallbackCases[2]);
  assert.ok(genericDecision.reasonCodes.includes("NO_COMPANY_CANDIDATE_NAME"));
  assert.ok(genericDecision.reasonCodes.includes("GENERIC_DOMAIN_ADVISORY_ONLY"));
  assert.ok(genericDecision.reasonCodes.includes("NON_HIGH_CONFIDENCE_ADVISORY_ONLY"));

  const lowConfidenceDecision = decideGmailCompanyCandidateAutoApply(fallbackCases[3]);
  assert.ok(lowConfidenceDecision.reasonCodes.includes("NON_HIGH_CONFIDENCE_ADVISORY_ONLY"));
}

{
  const auditSource = readProjectFile("scripts/gmail-extraction-quality-audit.ts");
  const evalSource = readProjectFile("scripts/gmail-extraction-quality-eval.ts");
  const reportSource = readProjectFile("scripts/gmail-extraction-quality-report.ts");
  const companyCandidateSource = readProjectFile("scripts/gmail-company-candidate.ts");
  const extractEntitiesSource = readProjectFile("lib/gmail-extract-entities.ts");
  const dashboardDataSource = readProjectFile("app/api/dashboard-data/route.ts");
  const prismaWritePattern =
    /\b(?:prisma|db|tx)\.[A-Za-z0-9_]+\.(?:create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(/;

  assert(auditSource.includes("function assertNoApplyFlag"), "quality-audit must keep an explicit apply flag guard");
  assert(auditSource.includes('process.argv.includes("--apply")'), "quality-audit must reject --apply before DB reads");
  assert(auditSource.includes("readOnly: true"), "quality-audit summary must advertise read-only mode");
  assert(!prismaWritePattern.test(auditSource), "quality-audit must not contain Prisma write calls");
  assert(!/\bprisma\.\$transaction\s*\(/.test(auditSource), "quality-audit must not open write transactions");
  assert(auditSource.includes("assertNoSensitiveOutput(serialized)"), "quality-audit must run serialized output through the leak guard");
  assert(!/candidateName\s*:/.test(auditSource), "quality-audit output source must not print raw company candidate names");

  assert(!/lib\/prisma|@prisma\/client|\bprisma\./.test(evalSource), "quality-eval must stay Prisma-free");
  assert(!/process\.argv/.test(evalSource), "quality-eval must not grow runtime apply-style flags");
  assert(evalSource.includes("buildAnonymizedIssueRow"), "quality-eval high-risk samples must use anonymized rows");
  assert(evalSource.includes("assertNoSensitiveOutput(serialized)"), "quality-eval must run serialized output through the leak guard");

  assert(reportSource.includes("anonymizedCompanyCandidate(params.companyCandidate)"), "quality report rows must anonymize company candidates");
  assert(companyCandidateSource.includes('Omit<GmailCompanyCandidate, "candidateName" | "existingCompanyId">'), "quality report rows must omit raw company candidate names and ids");
  assert(companyCandidateSource.includes("candidatePresent: Boolean(candidateValue.candidateName)"), "quality report rows may expose only company candidate presence");
  assert(companyCandidateSource.includes("existingCompanyLinkPresent: Boolean(candidateValue.existingCompanyId)"), "quality report rows may expose only existing link presence");
  assert(!/lib\/prisma|@prisma\/client|\bprisma\.|\bdb\.|\btx\.|\$transaction/.test(companyCandidateSource), "company candidate policy must stay DB-free");
  assert(!/create_new_company|new_company|company\.create|company\.createMany/.test(companyCandidateSource), "company candidate policy must not grow new Company creation semantics");

  assert(!/gmail-company-candidate|GmailCompanyCandidate|inferGmailCompanyCandidate/.test(extractEntitiesSource), "entity apply helpers must not consume advisory company candidates");
  assert(!/companyCandidate|inferGmailCompanyCandidate/.test(dashboardDataSource), "dashboard data API must not inline advisory company candidates by default");
}

console.log("gmail extraction quality tests passed");
