import assert from "node:assert/strict";

import { classifyMailByRules, GMAIL_RULE_CLASSIFICATION_VERSION, type MailClassificationResult } from "./gmail-classification-rules";

type MailForClassification = Parameters<typeof classifyMailByRules>[0];

type ExpectedClassification = Pick<
  MailClassificationResult,
  "label" | "category" | "confidence" | "isExcluded" | "excludeReason" | "needsReview" | "classifiedBy" | "classificationVersion"
> & {
  matchedRules: Array<Pick<MailClassificationResult["matchedRules"][number], "rule" | "score" | "matches">>;
};

type Case = {
  id: string;
  note: string;
  mail: Partial<MailForClassification>;
  expected: ExpectedClassification;
};

function mail(input: Partial<MailForClassification>): MailForClassification {
  return {
    subject: null,
    bodyText: null,
    normalizedBody: null,
    fromEmail: "sender@example.test",
    fromName: "Sender",
    toEmails: ["recipient@example.test"],
    ccEmails: [],
    inReplyTo: null,
    referencesHeader: null,
    isReply: false,
    ...input,
  };
}

function assertClassification(testCase: Case) {
  const actual = classifyMailByRules(mail(testCase.mail));
  assert.deepEqual(
    {
      label: actual.label,
      category: actual.category,
      confidence: actual.confidence,
      isExcluded: actual.isExcluded,
      excludeReason: actual.excludeReason,
      needsReview: actual.needsReview,
      classifiedBy: actual.classifiedBy,
      classificationVersion: actual.classificationVersion,
      matchedRules: actual.matchedRules,
    },
    testCase.expected,
    `${testCase.id}: ${testCase.note}`,
  );
}

const cases: Case[] = [
  {
    id: "generic-anken",
    note: "The generic word 案件 is currently a strong project signal by itself.",
    mail: { subject: "案件" },
    expected: {
      label: "project_intro",
      category: "PROJECT_INTRO",
      confidence: "0.9000",
      isExcluded: false,
      excludeReason: null,
      needsReview: false,
      classifiedBy: "RULE",
      classificationVersion: GMAIL_RULE_CLASSIFICATION_VERSION,
      matchedRules: [{ rule: "strong_project_intro", score: 10, matches: ["案件"] }],
    },
  },
  {
    id: "generic-tanka",
    note: "The generic word 単価 is currently a strong project signal by itself.",
    mail: { subject: "単価" },
    expected: {
      label: "project_intro",
      category: "PROJECT_INTRO",
      confidence: "0.9000",
      isExcluded: false,
      excludeReason: null,
      needsReview: false,
      classifiedBy: "RULE",
      classificationVersion: GMAIL_RULE_CLASSIFICATION_VERSION,
      matchedRules: [{ rule: "strong_project_intro", score: 10, matches: ["単価"] }],
    },
  },
  {
    id: "generic-kibo-tanka",
    note: "希望単価 currently inherits the strong project signal from 単価.",
    mail: { subject: "希望単価" },
    expected: {
      label: "project_intro",
      category: "PROJECT_INTRO",
      confidence: "0.9000",
      isExcluded: false,
      excludeReason: null,
      needsReview: false,
      classifiedBy: "RULE",
      classificationVersion: GMAIL_RULE_CLASSIFICATION_VERSION,
      matchedRules: [{ rule: "strong_project_intro", score: 10, matches: ["単価"] }],
    },
  },
  {
    id: "generic-taiouka",
    note: "対応可 is currently a strong person signal by itself.",
    mail: { subject: "対応可" },
    expected: {
      label: "person_intro",
      category: "PERSON_INTRO",
      confidence: "0.9300",
      isExcluded: false,
      excludeReason: null,
      needsReview: false,
      classifiedBy: "RULE",
      classificationVersion: GMAIL_RULE_CLASSIFICATION_VERSION,
      matchedRules: [{ rule: "strong_person_intro", score: 10, matches: ["対応可"] }],
    },
  },
  {
    id: "generic-youin",
    note: "要員 alone is not enough for the current score threshold.",
    mail: { subject: "要員" },
    expected: {
      label: "other",
      category: "OTHER",
      confidence: "0.5000",
      isExcluded: false,
      excludeReason: null,
      needsReview: false,
      classifiedBy: "RULE",
      classificationVersion: GMAIL_RULE_CLASSIFICATION_VERSION,
      matchedRules: [],
    },
  },
  {
    id: "generic-boshu",
    note: "募集 alone is not enough for the current score threshold.",
    mail: { subject: "募集" },
    expected: {
      label: "other",
      category: "OTHER",
      confidence: "0.5000",
      isExcluded: false,
      excludeReason: null,
      needsReview: false,
      classifiedBy: "RULE",
      classificationVersion: GMAIL_RULE_CLASSIFICATION_VERSION,
      matchedRules: [],
    },
  },
  {
    id: "searching-project",
    note: "案件を探して currently remains person_intro because the person strong rule wins before the generic project rule.",
    mail: { subject: "案件を探して" },
    expected: {
      label: "person_intro",
      category: "PERSON_INTRO",
      confidence: "0.9300",
      isExcluded: false,
      excludeReason: null,
      needsReview: false,
      classifiedBy: "RULE",
      classificationVersion: GMAIL_RULE_CLASSIFICATION_VERSION,
      matchedRules: [{ rule: "strong_person_intro", score: 10, matches: ["案件を探して"] }],
    },
  },
  {
    id: "representative-project",
    note: "Representative project mail is classified as project_intro.",
    mail: {
      subject: "【案件】Java開発支援",
      bodyText: "作業内容: Java開発\n必須スキル: Java, Spring\n単価: 75万円\n勤務地: 東京\n開始: 7月",
      normalizedBody: "作業内容: Java開発\n必須スキル: Java, Spring\n単価: 75万円\n勤務地: 東京\n開始: 7月",
    },
    expected: {
      label: "project_intro",
      category: "PROJECT_INTRO",
      confidence: "0.9300",
      isExcluded: false,
      excludeReason: null,
      needsReview: false,
      classifiedBy: "RULE",
      classificationVersion: GMAIL_RULE_CLASSIFICATION_VERSION,
      matchedRules: [{ rule: "strong_project_intro", score: 10, matches: ["開発支援"] }],
    },
  },
  {
    id: "representative-person",
    note: "Representative person mail is classified as person_intro.",
    mail: {
      subject: "Javaエンジニアのご紹介",
      bodyText: "氏名: 山田太郎\n稼働可能: 7月\n希望単価: 70万円\nスキル: Java, Spring",
      normalizedBody: "氏名: 山田太郎\n稼働可能: 7月\n希望単価: 70万円\nスキル: Java, Spring",
    },
    expected: {
      label: "person_intro",
      category: "PERSON_INTRO",
      confidence: "0.9300",
      isExcluded: false,
      excludeReason: null,
      needsReview: false,
      classifiedBy: "RULE",
      classificationVersion: GMAIL_RULE_CLASSIFICATION_VERSION,
      matchedRules: [{ rule: "strong_person_intro", score: 10, matches: ["エンジニアのご紹介"] }],
    },
  },
  {
    id: "unclassified-greeting",
    note: "A normal greeting with text stays OTHER and does not require review.",
    mail: {
      subject: "ご挨拶",
      bodyText: "いつもお世話になっております。引き続きよろしくお願いいたします。",
      normalizedBody: "いつもお世話になっております。引き続きよろしくお願いいたします。",
    },
    expected: {
      label: "other",
      category: "OTHER",
      confidence: "0.5000",
      isExcluded: false,
      excludeReason: null,
      needsReview: false,
      classifiedBy: "RULE",
      classificationVersion: GMAIL_RULE_CLASSIFICATION_VERSION,
      matchedRules: [],
    },
  },
  {
    id: "unclassified-empty",
    note: "An empty mail is NEEDS_REVIEW.",
    mail: {
      subject: null,
      bodyText: null,
      normalizedBody: null,
      fromEmail: null,
      fromName: null,
      toEmails: [],
    },
    expected: {
      label: "needs_review",
      category: "NEEDS_REVIEW",
      confidence: "0.3000",
      isExcluded: false,
      excludeReason: null,
      needsReview: true,
      classifiedBy: "RULE",
      classificationVersion: GMAIL_RULE_CLASSIFICATION_VERSION,
      matchedRules: [],
    },
  },
  {
    id: "reply",
    note: "Replies are excluded as OTHER before keyword rules run.",
    mail: { subject: "Re: 案件", inReplyTo: "<message-id@example.test>" },
    expected: {
      label: "reply",
      category: "OTHER",
      confidence: "0.9500",
      isExcluded: true,
      excludeReason: "返信メールのため通常一覧から除外",
      needsReview: false,
      classifiedBy: "RULE",
      classificationVersion: GMAIL_RULE_CLASSIFICATION_VERSION,
      matchedRules: [{ rule: "reply", score: 10, matches: ["inReplyTo/references/Re:/Fwd:"] }],
    },
  },
  {
    id: "newsletter-excluded",
    note: "Newsletter-like subjects are excluded before strong entity rules.",
    mail: { subject: "今週の技術ニュースレター" },
    expected: {
      label: "newsletter",
      category: "NEWSLETTER",
      confidence: "0.8700",
      isExcluded: true,
      excludeReason: "メルマガ・ニュースレターのため通常一覧から除外",
      needsReview: false,
      classifiedBy: "RULE",
      classificationVersion: GMAIL_RULE_CLASSIFICATION_VERSION,
      matchedRules: [{ rule: "newsletter", score: 4, matches: ["ニュースレター", "今週の"] }],
    },
  },
];

for (const testCase of cases) {
  assertClassification(testCase);
}

console.log(`gmail classification rule characterization tests passed. cases=${cases.length}`);
