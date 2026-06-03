import assert from "node:assert/strict";

import { extractPersonFromMail, type MailExtractionSource } from "./gmail-extraction";

function mail(input: { subject: string; bodyText?: string | null }): MailExtractionSource {
  return {
    id: "12345678-1234-1234-1234-123456789abc",
    category: "PERSON_INTRO",
    externalMessageId: "test-message",
    subject: input.subject,
    bodyText: input.bodyText ?? null,
    bodyHtml: null,
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
  assert.deepEqual(extraction.reviewReasons.filter((reason) => reason.includes("PERSON_NAME")), []);
}

{
  const extraction = extractPersonFromMail(mail({ subject: "R.N / 33歳 / 45万" }));
  assert.equal(extraction.name, null);
  assert.equal(extraction.initials, "R.N");
  assert.equal(extraction.nameConfidence, "MEDIUM");
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
  assert.ok(extraction.reviewReasons.includes("PERSON_ROLE_FROM_SUBJECT_ONLY"));
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

console.log("gmail extraction quality tests passed");
