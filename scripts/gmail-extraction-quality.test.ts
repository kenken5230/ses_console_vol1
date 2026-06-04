import assert from "node:assert/strict";

import { classifyMailExtractionQuality, extractFromMail, extractPersonFromMail, extractProjectFromMail, type MailExtractionSource } from "./gmail-extraction";
import { assertNoSensitiveOutput, buildAnonymizedIssueRow } from "./gmail-extraction-quality-report";

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

console.log("gmail extraction quality tests passed");
