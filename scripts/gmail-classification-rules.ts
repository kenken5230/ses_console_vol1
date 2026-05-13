import type { ClassificationSource, MailCategory } from "../app/generated/prisma/enums";

export const GMAIL_RULE_CLASSIFICATION_VERSION = "gmail-rule-v0.2";

type MailForClassification = {
  subject: string | null;
  bodyText: string | null;
  normalizedBody: string | null;
  fromEmail: string | null;
  fromName: string | null;
  toEmails: string[];
  ccEmails: string[];
  inReplyTo: string | null;
  referencesHeader: string | null;
  isReply: boolean;
};

export type MailClassificationResult = {
  label: "project_intro" | "person_intro" | "seminar" | "newsletter" | "sales_ad" | "reply" | "needs_review" | "other";
  category: MailCategory;
  confidence: string;
  isExcluded: boolean;
  excludeReason: string | null;
  needsReview: boolean;
  classifiedBy: ClassificationSource;
  classificationVersion: string;
  matchedRules: Array<{
    rule: string;
    score: number;
    matches: string[];
  }>;
};

type KeywordRule = {
  label: Exclude<MailClassificationResult["label"], "reply" | "needs_review" | "other">;
  category: MailCategory;
  keywords: string[];
  scorePerMatch: number;
  threshold: number;
  isExcluded: boolean;
  excludeReason: string | null;
};

type StrongRule = {
  label: "project_intro" | "person_intro";
  category: MailCategory;
  keywords: string[];
  confidence: string;
};

const strongRules: StrongRule[] = [
  {
    label: "project_intro",
    category: "PROJECT_INTRO",
    keywords: [
      "要員募集",
      "人材募集",
      "経験者募集",
      "経験者急募",
      "経験者探してます",
      "方探してます",
      "エンジニア募集",
      "メンバー募集",
      "メンバー枠募集",
      "2名募集",
      "要員を1名募集",
      "要員探してます",
      "要員を探して",
      "作業要員",
      "開発作業要員",
      "要員交代",
      "PG募集",
      "ＰＧ募集",
      "体制提案歓迎",
      "増員枠",
      "交代枠",
    ],
    confidence: "0.9400",
  },
  {
    label: "person_intro",
    category: "PERSON_INTRO",
    keywords: [
      "要員のご紹介",
      "人材のご紹介",
      "エンジニアのご紹介",
      "技術者のご紹介",
      "候補者のご紹介",
      "弊社フリーランス",
      "弊社直フリーランス",
      "弊社正社員",
      "弊社社員",
      "弊社直個人事業主",
      "弊社個人",
      "当社タレント",
      "個人事業主",
      "一社先個人",
      "弊社プロパー",
      "プロパー",
      "正社員人材",
      "人材】",
      "プロ人材",
      "優秀な人材",
      "人材になります",
      "弊社直人材",
      "直人材",
      "直要員",
      "直フリーランス",
      "スペシャリストご紹介",
      "技術者の提案",
      "人材情報",
      "要員情報",
      "ml要員情報",
      "要員】",
      "要員提案",
      "■人材■",
      "【人材】",
      "人材｜",
      "QA人材",
      "稼働実績あり",
      "稼働実績有",
      "対応可能",
      "対応可",
      "得意です",
      "経験豊富",
      "外国籍ですが",
      "日本語は問題なし",
      "お任せ",
      "上流から対応可能",
      "スキルシート",
      "経歴書",
      "注力要員",
      "要員！",
      "ご紹介です",
      "案件探してます",
      "案件を探して",
    ],
    confidence: "0.9300",
  },
  {
    label: "project_intro",
    category: "PROJECT_INTRO",
    keywords: [
      "案件紹介",
      "案件情報",
      "案件のご紹介",
      "案件一覧",
      "案件 -",
      "現場直",
      "元請直",
      "元請け直",
      "関連業務支援",
      "導入支援",
      "支援プロジェクト",
      "基盤構築",
      "システム開発",
      "開発支援",
      "構築支援",
      "設計支援",
      "業務支援",
      "api設計支援",
      "クラウド移行",
      "web化プロジェクト",
      "aiエージェント開発",
      "運用業務",
      "運用保守",
      "保守pj",
      "基幹システム",
      "情報管理システム",
      "ツール精度向上",
      "リーダーエンジニア",
      "社員代替",
      "4月～■",
      "即日■",
      "即日～",
      "在宅併用",
      "勤務地選択可",
    ],
    confidence: "0.9300",
  },
  {
    label: "project_intro",
    category: "PROJECT_INTRO",
    keywords: ["案件", "エンド直", "元請け直", "フルリモート", "フルリモ", "基本リモート", "常駐", "万円", "単価"],
    confidence: "0.9000",
  },
];

const rules: KeywordRule[] = [
  {
    label: "seminar",
    category: "SEMINAR",
    keywords: ["セミナー", "ウェビナー", "イベント", "勉強会", "説明会", "ご招待", "交流会"],
    scorePerMatch: 2,
    threshold: 2,
    isExcluded: true,
    excludeReason: "セミナー・イベント案内のため通常一覧から除外",
  },
  {
    label: "newsletter",
    category: "NEWSLETTER",
    keywords: ["メルマガ", "ニュースレター", "今週の", "レポート", "市場動向", "トレンド"],
    scorePerMatch: 2,
    threshold: 2,
    isExcluded: true,
    excludeReason: "メルマガ・ニュースレターのため通常一覧から除外",
  },
  {
    label: "sales_ad",
    category: "SALES_AD",
    keywords: ["広告", "キャンペーン", "無料相談", "資料請求", "サービス紹介", "導入事例", "特別価格"],
    scorePerMatch: 2,
    threshold: 2,
    isExcluded: true,
    excludeReason: "営業広告のため通常一覧から除外",
  },
  {
    label: "person_intro",
    category: "PERSON_INTRO",
    keywords: [
      "要員",
      "人材",
      "ご紹介",
      "経歴書",
      "スキルシート",
      "稼働開始",
      "希望単価",
      "最寄",
      "所属",
      "候補者",
      "技術者",
      "弊社人材",
      "人材情報",
      "要員情報",
      "正社員人材",
      "要員】",
      "要員提案",
      "■人材■",
      "【人材】",
      "人材｜",
      "QA人材",
      "個人事業主",
      "フリーランス",
      "稼働実績あり",
      "稼働実績有",
      "経験豊富",
      "ベテラン",
      "外国籍ですが",
      "日本語は問題なし",
      "プロ人材",
      "優秀な人材",
      "人材になります",
      "対応可",
      "ベテラン",
      "お任せ",
    ],
    scorePerMatch: 1,
    threshold: 2,
    isExcluded: false,
    excludeReason: null,
  },
  {
    label: "project_intro",
    category: "PROJECT_INTRO",
    keywords: [
      "案件",
      "案件紹介",
      "募集",
      "PJ",
      "プロジェクト",
      "要員募集",
      "即日",
      "リモート",
      "単価",
      "スキル",
      "面談",
      "商流",
      "精算",
      "勤務地",
      "作業場所",
      "稼働",
      "参画",
      "急募",
      "経験者募集",
      "経験者急募",
      "経験者探してます",
      "方探してます",
      "エンジニア募集",
      "メンバー募集",
      "メンバー枠募集",
      "要員を1名募集",
      "要員探してます",
      "要員を探して",
      "作業要員",
      "要員交代",
      "PG募集",
      "ＰＧ募集",
      "体制提案歓迎",
      "増員枠",
      "交代枠",
      "現場直",
      "元請直",
      "元請け直",
      "関連業務支援",
      "導入支援",
      "支援",
      "向け",
      "ポジション",
      "設計",
      "設計～",
      "設計×",
      "要件定義",
      "構築",
      "構築対応",
      "app構築",
      "開発",
      "開発・運用",
      "開発／",
      "開発(",
      "開発（",
      "運用",
      "移行",
      "刷新",
      "更改",
      "インフラ",
      "推進",
      "長期",
      "在宅中心",
      "リモート併用",
      "テレワーク",
      "全国出張",
      "万",
      "4月～",
      "5月～",
      "6月～",
      "7月～",
      "8月～",
      "9月～",
      "即日～",
      "@",
      "＠",
      "面談1回",
      "開始",
    ],
    scorePerMatch: 1,
    threshold: 3,
    isExcluded: false,
    excludeReason: null,
  },
];

function buildSearchText(mail: MailForClassification): string {
  return [
    mail.subject,
    mail.bodyText,
    mail.normalizedBody,
    mail.fromEmail,
    mail.fromName,
    ...mail.toEmails,
    ...mail.ccEmails,
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
}

function isReplyMail(mail: MailForClassification): boolean {
  const subject = mail.subject?.trim().toLowerCase() ?? "";
  return Boolean(mail.isReply || mail.inReplyTo || mail.referencesHeader || subject.startsWith("re:") || subject.startsWith("fwd:"));
}

function scoreRule(text: string, rule: KeywordRule): { score: number; matches: string[] } {
  const matches = rule.keywords.filter((keyword) => text.includes(keyword.toLowerCase()));
  return {
    score: matches.length * rule.scorePerMatch,
    matches,
  };
}

function matchStrongRule(text: string): StrongRule & { matches: string[] } | null {
  for (const rule of strongRules) {
    const matches = rule.keywords.filter((keyword) => text.includes(keyword.toLowerCase()));
    if (matches.length > 0) {
      return {
        ...rule,
        matches,
      };
    }
  }

  return null;
}

function confidenceFromScore(score: number, threshold: number): string {
  const confidence = Math.max(0.55, Math.min(0.98, 0.55 + (score / Math.max(threshold, 1)) * 0.16));
  return confidence.toFixed(4);
}

export function classifyMailByRules(mail: MailForClassification): MailClassificationResult {
  if (isReplyMail(mail)) {
    return {
      label: "reply",
      category: "OTHER",
      confidence: "0.9500",
      isExcluded: true,
      excludeReason: "返信メールのため通常一覧から除外",
      needsReview: false,
      classifiedBy: "RULE",
      classificationVersion: GMAIL_RULE_CLASSIFICATION_VERSION,
      matchedRules: [{ rule: "reply", score: 10, matches: ["inReplyTo/references/Re:/Fwd:"] }],
    };
  }

  const text = buildSearchText(mail);
  const subjectText = (mail.subject ?? "").toLowerCase();
  const exclusionScored = rules
    .filter((rule) => rule.isExcluded)
    .map((rule) => {
      const result = scoreRule(subjectText, rule);
      return {
        ...rule,
        score: result.score,
        matches: result.matches,
      };
    })
    .filter((rule) => rule.score >= rule.threshold)
    .sort((a, b) => b.score - a.score || b.threshold - a.threshold);

  const exclusion = exclusionScored[0];
  if (exclusion) {
    return {
      label: exclusion.label,
      category: exclusion.category,
      confidence: confidenceFromScore(exclusion.score, exclusion.threshold),
      isExcluded: exclusion.isExcluded,
      excludeReason: exclusion.excludeReason,
      needsReview: false,
      classifiedBy: "RULE",
      classificationVersion: GMAIL_RULE_CLASSIFICATION_VERSION,
      matchedRules: exclusionScored.map((rule) => ({
        rule: rule.label,
        score: rule.score,
        matches: rule.matches,
      })),
    };
  }

  const strongRule = matchStrongRule(subjectText) ?? matchStrongRule(text);
  if (strongRule) {
    return {
      label: strongRule.label,
      category: strongRule.category,
      confidence: strongRule.confidence,
      isExcluded: false,
      excludeReason: null,
      needsReview: false,
      classifiedBy: "RULE",
      classificationVersion: GMAIL_RULE_CLASSIFICATION_VERSION,
      matchedRules: [{ rule: `strong_${strongRule.label}`, score: 10, matches: strongRule.matches }],
    };
  }

  const scored = rules
    .map((rule) => {
      const result = scoreRule(text, rule);
      return {
        ...rule,
        score: result.score,
        matches: result.matches,
      };
    })
    .filter((rule) => rule.score >= rule.threshold)
    .sort((a, b) => b.score - a.score || b.threshold - a.threshold);

  const best = scored[0];
  if (best) {
    return {
      label: best.label,
      category: best.category,
      confidence: confidenceFromScore(best.score, best.threshold),
      isExcluded: best.isExcluded,
      excludeReason: best.excludeReason,
      needsReview: false,
      classifiedBy: "RULE",
      classificationVersion: GMAIL_RULE_CLASSIFICATION_VERSION,
      matchedRules: scored.map((rule) => ({
        rule: rule.label,
        score: rule.score,
        matches: rule.matches,
      })),
    };
  }

  const hasAnyText = Boolean(text.trim());
  return {
    label: hasAnyText ? "other" : "needs_review",
    category: hasAnyText ? "OTHER" : "NEEDS_REVIEW",
    confidence: hasAnyText ? "0.5000" : "0.3000",
    isExcluded: false,
    excludeReason: null,
    needsReview: !hasAnyText,
    classifiedBy: "RULE",
    classificationVersion: GMAIL_RULE_CLASSIFICATION_VERSION,
    matchedRules: [],
  };
}
