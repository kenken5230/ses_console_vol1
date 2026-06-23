import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { inferGmailCompanyCandidate } from "./gmail-company-candidate";
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
  assert.equal(output.includes("Sensitive Partner Systems Inc."), false);
  assert.equal(output.includes("candidateName"), false);
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
    knownCompanies: [{ name: "Known Domain Company", mainEmailDomain: "domain-match.example.invalid" }],
  });
  assert.equal(candidate.candidateName, "Known Domain Company");
  assert.equal(candidate.source, "known_main_email_domain");
  assert.equal(candidate.confidence, "HIGH");
}

{
  const candidate = inferGmailCompanyCandidate({
    fromName: "Alias Labs recruiting",
    fromEmail: "sender@gmail.com",
    knownCompanies: [{ name: "Known Alias Company", aliases: ["Alias Labs"] }],
  });
  assert.equal(candidate.candidateName, "Known Alias Company");
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
  const auditSource = readProjectFile("scripts/gmail-extraction-quality-audit.ts");
  const evalSource = readProjectFile("scripts/gmail-extraction-quality-eval.ts");
  const reportSource = readProjectFile("scripts/gmail-extraction-quality-report.ts");
  const companyCandidateSource = readProjectFile("scripts/gmail-company-candidate.ts");
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
  assert(companyCandidateSource.includes('Omit<GmailCompanyCandidate, "candidateName">'), "quality report rows must omit raw company candidate names");
  assert(companyCandidateSource.includes("candidatePresent: Boolean(candidateValue.candidateName)"), "quality report rows may expose only company candidate presence");
}

console.log("gmail extraction quality tests passed");
