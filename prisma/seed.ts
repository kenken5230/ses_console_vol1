import "dotenv/config";
import { createHash } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const id = {
  userAdmin: "10000000-0000-4000-8000-000000000001",
  userSales: "10000000-0000-4000-8000-000000000002",
  mailSes: "20000000-0000-4000-8000-000000000001",
  mailSales: "20000000-0000-4000-8000-000000000002",
  companySampleSi: "30000000-0000-4000-8000-000000000001",
  companyEastCloud: "30000000-0000-4000-8000-000000000002",
  companyMetroDigital: "30000000-0000-4000-8000-000000000003",
  companyFutureLink: "30000000-0000-4000-8000-000000000004",
  companyTalentPartners: "30000000-0000-4000-8000-000000000005",
  contactSampleSi: "31000000-0000-4000-8000-000000000001",
  contactEastCloud: "31000000-0000-4000-8000-000000000002",
  contactMetroDigital: "31000000-0000-4000-8000-000000000003",
  contactFutureLink: "31000000-0000-4000-8000-000000000004",
  contactTalentPartners: "31000000-0000-4000-8000-000000000005",
  mailProject: "40000000-0000-4000-8000-000000000001",
  mailPerson: "40000000-0000-4000-8000-000000000002",
  mailSeminar: "40000000-0000-4000-8000-000000000003",
  mailNewsletter: "40000000-0000-4000-8000-000000000004",
  mailSalesAd: "40000000-0000-4000-8000-000000000005",
  mailReview: "40000000-0000-4000-8000-000000000006",
  projectConsole: "50000000-0000-4000-8000-000000000001",
  projectAws: "50000000-0000-4000-8000-000000000002",
  projectConsoleCondition: "51000000-0000-4000-8000-000000000001",
  projectAwsCondition: "51000000-0000-4000-8000-000000000002",
  roleConsoleEnd: "52000000-0000-4000-8000-000000000001",
  roleConsolePrime: "52000000-0000-4000-8000-000000000002",
  roleConsoleUpper: "52000000-0000-4000-8000-000000000003",
  roleAwsEnd: "52000000-0000-4000-8000-000000000004",
  roleAwsUpper: "52000000-0000-4000-8000-000000000005",
  skillProjectReact: "53000000-0000-4000-8000-000000000001",
  skillProjectNext: "53000000-0000-4000-8000-000000000002",
  skillProjectAws: "53000000-0000-4000-8000-000000000003",
  skillProjectTerraform: "53000000-0000-4000-8000-000000000004",
  tagProjectFocus: "54000000-0000-4000-8000-000000000001",
  tagProjectRemote: "54000000-0000-4000-8000-000000000002",
  personFrontend: "60000000-0000-4000-8000-000000000001",
  personInfra: "60000000-0000-4000-8000-000000000002",
  personSkillReact: "61000000-0000-4000-8000-000000000001",
  personSkillTypeScript: "61000000-0000-4000-8000-000000000002",
  personSkillAws: "61000000-0000-4000-8000-000000000003",
  personSkillTerraform: "61000000-0000-4000-8000-000000000004",
  proposalCompany: "70000000-0000-4000-8000-000000000001",
  proposalProject: "70000000-0000-4000-8000-000000000002",
  proposalInterview: "70000000-0000-4000-8000-000000000003",
  distributionCompany: "80000000-0000-4000-8000-000000000001",
  distributionProject: "80000000-0000-4000-8000-000000000002",
  distributionInterview: "80000000-0000-4000-8000-000000000003"
};

function hashText(text: string) {
  return createHash("sha256").update(text).digest("hex");
}

function date(value: string) {
  return new Date(value);
}

const mailBodies = {
  project:
    "【案件紹介】管理画面リニューアル支援です。React、Next.js、TypeScript の経験者を募集します。場所は東京都、リモート併用、単価は80から95万円です。",
  person:
    "【要員紹介】フロントエンド要員のご紹介です。React、TypeScript、Next.js の実務経験があり、6月から稼働可能です。希望単価は85万円です。",
  seminar:
    "【セミナー案内】クラウド活用ウェビナーを開催します。SES案件紹介メールではないため通常一覧から除外します。",
  newsletter:
    "【メルマガ】今週のIT市場レポートをお送りします。案件・要員紹介ではない定期配信です。",
  salesAd:
    "【営業広告】採用管理ツールのキャンペーン案内です。通常のSES案件管理対象外として除外します。",
  review:
    "【要確認】件名だけでは案件紹介か通常連絡か判断が難しいため、レビュー対象にします。"
};

async function seedUsers() {
  await prisma.user.upsert({
    where: { email: "admin@example.invalid" },
    update: { name: "MOC管理者", role: "ADMIN", isActive: true },
    create: { id: id.userAdmin, name: "MOC管理者", email: "admin@example.invalid", role: "ADMIN", isActive: true }
  });

  await prisma.user.upsert({
    where: { email: "sales-a@example.invalid" },
    update: { name: "営業担当A", role: "SALES", isActive: true },
    create: { id: id.userSales, name: "営業担当A", email: "sales-a@example.invalid", role: "SALES", isActive: true }
  });
}

async function seedMailAccounts() {
  await prisma.mailAccount.upsert({
    where: { email: "ses@skv.co.jp" },
    update: { displayName: "SES共有受信", purpose: "INBOUND_SHARED", provider: "GMAIL", isPrimaryIngest: true, isActive: true },
    create: {
      id: id.mailSes,
      email: "ses@skv.co.jp",
      provider: "GMAIL",
      displayName: "SES共有受信",
      purpose: "INBOUND_SHARED",
      isPrimaryIngest: true,
      isActive: true
    }
  });

  await prisma.mailAccount.upsert({
    where: { email: "sales-demo@example.invalid" },
    update: { displayName: "営業送信用デモ", purpose: "SALES_OUTBOUND", provider: "GMAIL", isPrimaryIngest: false, isActive: true },
    create: {
      id: id.mailSales,
      email: "sales-demo@example.invalid",
      provider: "GMAIL",
      displayName: "営業送信用デモ",
      purpose: "SALES_OUTBOUND",
      isPrimaryIngest: false,
      isActive: true
    }
  });
}

async function seedCompanies() {
  const companies = [
    {
      id: id.companySampleSi,
      name: "サンプルSI株式会社",
      normalizedName: "サンプルsi株式会社",
      mainEmailDomain: "sample-si.example.invalid",
      tradeStatus: "OK",
      tdbScore: "62.5",
      bankruptcyRiskScore: "12.0",
      notes: "MOC用の架空SI会社"
    },
    {
      id: id.companyEastCloud,
      name: "東雲クラウド合同会社",
      normalizedName: "東雲クラウド合同会社",
      mainEmailDomain: "east-cloud.example.invalid",
      tradeStatus: "OK",
      tdbScore: "58.0",
      bankruptcyRiskScore: "18.0",
      notes: "MOC用の架空クラウド会社"
    },
    {
      id: id.companyMetroDigital,
      name: "メトロデジタル株式会社",
      normalizedName: "メトロデジタル株式会社",
      mainEmailDomain: "metro-digital.example.invalid",
      tradeStatus: "NEEDS_REVIEW",
      tdbScore: "51.0",
      bankruptcyRiskScore: "24.0",
      notes: "取引条件確認中の架空会社"
    },
    {
      id: id.companyFutureLink,
      name: "フューチャーリンク株式会社",
      normalizedName: "フューチャーリンク株式会社",
      mainEmailDomain: "future-link.example.invalid",
      tradeStatus: "OK",
      tdbScore: "65.0",
      bankruptcyRiskScore: "9.0",
      notes: "MOC用の架空エンド企業"
    },
    {
      id: id.companyTalentPartners,
      name: "テック人材パートナーズ株式会社",
      normalizedName: "テック人材パートナーズ株式会社",
      mainEmailDomain: "talent-partners.example.invalid",
      tradeStatus: "OK",
      tdbScore: "55.0",
      bankruptcyRiskScore: "20.0",
      notes: "MOC用の架空要員所属会社"
    }
  ] as const;

  for (const company of companies) {
    await prisma.company.upsert({
      where: { id: company.id },
      update: company,
      create: company
    });
  }
}

async function seedCompanyContacts() {
  const contacts = [
    {
      id: id.contactSampleSi,
      companyId: id.companySampleSi,
      name: "サンプルSI 担当A",
      email: "contact-a@sample-si.example.invalid",
      phone: "03-0000-0001",
      department: "営業部",
      position: "アカウント担当",
      contactPolicy: "通常連絡可"
    },
    {
      id: id.contactEastCloud,
      companyId: id.companyEastCloud,
      name: "東雲クラウド 担当B",
      email: "contact-b@east-cloud.example.invalid",
      phone: "03-0000-0002",
      department: "パートナー推進",
      position: "営業担当",
      contactPolicy: "AM経由連絡推奨"
    },
    {
      id: id.contactMetroDigital,
      companyId: id.companyMetroDigital,
      name: "メトロデジタル 担当C",
      email: "contact-c@metro-digital.example.invalid",
      phone: "03-0000-0003",
      department: "開発推進部",
      position: "調達担当",
      contactPolicy: "取引可否確認後に連絡"
    },
    {
      id: id.contactFutureLink,
      companyId: id.companyFutureLink,
      name: "フューチャーリンク 担当D",
      email: "contact-d@future-link.example.invalid",
      phone: "03-0000-0004",
      department: "DX企画部",
      position: "案件窓口",
      contactPolicy: "通常連絡可"
    },
    {
      id: id.contactTalentPartners,
      companyId: id.companyTalentPartners,
      name: "テック人材P 担当E",
      email: "contact-e@talent-partners.example.invalid",
      phone: "03-0000-0005",
      department: "人材営業部",
      position: "要員窓口",
      contactPolicy: "要員紹介連絡可"
    }
  ];

  for (const contact of contacts) {
    await prisma.companyContact.upsert({
      where: { id: contact.id },
      update: { ...contact, isActive: true },
      create: { ...contact, isActive: true }
    });
  }
}

async function seedMailNotifications() {
  const mails = [
    {
      id: id.mailProject,
      externalMessageId: "moc-project-intro-001@example.invalid",
      externalThreadId: "thread-project-intro-001",
      messageDate: date("2026-05-08T09:10:00+09:00"),
      receivedAt: date("2026-05-08T09:11:00+09:00"),
      fromEmail: "contact-a@sample-si.example.invalid",
      fromName: "サンプルSI 担当A",
      subject: "【案件紹介】React / Next.js 管理画面開発支援",
      bodyText: mailBodies.project,
      category: "PROJECT_INTRO",
      categoryConfidence: "0.94",
      isExcluded: false,
      needsReview: false,
      classifiedBy: "MANUAL"
    },
    {
      id: id.mailPerson,
      externalMessageId: "moc-person-intro-001@example.invalid",
      externalThreadId: "thread-person-intro-001",
      messageDate: date("2026-05-08T10:00:00+09:00"),
      receivedAt: date("2026-05-08T10:01:00+09:00"),
      fromEmail: "contact-e@talent-partners.example.invalid",
      fromName: "テック人材P 担当E",
      subject: "【要員紹介】React / TypeScript フロントエンド要員",
      bodyText: mailBodies.person,
      category: "PERSON_INTRO",
      categoryConfidence: "0.92",
      isExcluded: false,
      needsReview: false,
      classifiedBy: "MANUAL"
    },
    {
      id: id.mailSeminar,
      externalMessageId: "moc-seminar-001@example.invalid",
      externalThreadId: "thread-seminar-001",
      messageDate: date("2026-05-08T10:30:00+09:00"),
      receivedAt: date("2026-05-08T10:31:00+09:00"),
      fromEmail: "event@example.invalid",
      fromName: "イベント事務局",
      subject: "【セミナー】クラウド活用ウェビナーのご案内",
      bodyText: mailBodies.seminar,
      category: "SEMINAR",
      categoryConfidence: "0.98",
      isExcluded: true,
      excludeReason: "セミナー案内のため通常一覧から除外",
      needsReview: false,
      classifiedBy: "RULE"
    },
    {
      id: id.mailNewsletter,
      externalMessageId: "moc-newsletter-001@example.invalid",
      externalThreadId: "thread-newsletter-001",
      messageDate: date("2026-05-08T11:00:00+09:00"),
      receivedAt: date("2026-05-08T11:01:00+09:00"),
      fromEmail: "newsletter@example.invalid",
      fromName: "IT市場レポート",
      subject: "【メルマガ】今週のIT市場レポート",
      bodyText: mailBodies.newsletter,
      category: "NEWSLETTER",
      categoryConfidence: "0.97",
      isExcluded: true,
      excludeReason: "メルマガのため通常一覧から除外",
      needsReview: false,
      classifiedBy: "RULE"
    },
    {
      id: id.mailSalesAd,
      externalMessageId: "moc-sales-ad-001@example.invalid",
      externalThreadId: "thread-sales-ad-001",
      messageDate: date("2026-05-08T11:20:00+09:00"),
      receivedAt: date("2026-05-08T11:21:00+09:00"),
      fromEmail: "promotion@example.invalid",
      fromName: "デモ広告配信",
      subject: "【営業広告】採用管理ツール キャンペーン案内",
      bodyText: mailBodies.salesAd,
      category: "SALES_AD",
      categoryConfidence: "0.96",
      isExcluded: true,
      excludeReason: "営業広告のため通常一覧から除外",
      needsReview: false,
      classifiedBy: "RULE"
    },
    {
      id: id.mailReview,
      externalMessageId: "moc-needs-review-001@example.invalid",
      externalThreadId: "thread-needs-review-001",
      messageDate: date("2026-05-08T11:40:00+09:00"),
      receivedAt: date("2026-05-08T11:41:00+09:00"),
      fromEmail: "unknown@example.invalid",
      fromName: "確認待ち送信者",
      subject: "【要確認】ご相談事項",
      bodyText: mailBodies.review,
      category: "NEEDS_REVIEW",
      categoryConfidence: "0.42",
      isExcluded: false,
      needsReview: true,
      classifiedBy: "SYSTEM"
    }
  ] as const;

  for (const mail of mails) {
    await prisma.mailNotification.upsert({
      where: {
        sourceAccountId_externalMessageId: {
          sourceAccountId: id.mailSes,
          externalMessageId: mail.externalMessageId
        }
      },
      update: {
        ...mail,
        sourceAccountId: id.mailSes,
        toEmails: ["ses@skv.co.jp"],
        ccEmails: [],
        bccEmails: [],
        bodyHash: hashText(mail.bodyText),
        normalizedSubject: mail.subject.toLowerCase(),
        normalizedBody: mail.bodyText.toLowerCase(),
        classificationVersion: "moc-seed-v1",
        sourceRawHeaders: { seeded: true, source: "moc" }
      },
      create: {
        ...mail,
        sourceAccountId: id.mailSes,
        toEmails: ["ses@skv.co.jp"],
        ccEmails: [],
        bccEmails: [],
        bodyHash: hashText(mail.bodyText),
        normalizedSubject: mail.subject.toLowerCase(),
        normalizedBody: mail.bodyText.toLowerCase(),
        classificationVersion: "moc-seed-v1",
        sourceRawHeaders: { seeded: true, source: "moc" }
      }
    });
  }
}

async function seedProjects() {
  await prisma.project.upsert({
    where: { id: id.projectConsole },
    update: {
      title: "React / Next.js 管理画面開発支援",
      summary: "SES管理画面の改修支援。React、Next.js、TypeScript を利用。",
      workDescription: "既存管理画面の機能追加、検索条件UI、一覧パフォーマンス改善、軽微なAPI連携調整。",
      businessDescription: "営業管理・案件管理業務の効率化を目的とした業務システム開発。",
      sourceMailId: id.mailProject,
      createdByUserId: id.userSales,
      ownerUserId: id.userSales,
      status: "OPEN",
      priorityLevel: 2,
      isFocus: true,
      publishedAt: date("2026-05-08T09:30:00+09:00")
    },
    create: {
      id: id.projectConsole,
      projectCode: "MOC-PJ-001",
      title: "React / Next.js 管理画面開発支援",
      summary: "SES管理画面の改修支援。React、Next.js、TypeScript を利用。",
      workDescription: "既存管理画面の機能追加、検索条件UI、一覧パフォーマンス改善、軽微なAPI連携調整。",
      businessDescription: "営業管理・案件管理業務の効率化を目的とした業務システム開発。",
      sourceMailId: id.mailProject,
      createdByUserId: id.userSales,
      ownerUserId: id.userSales,
      status: "OPEN",
      priorityLevel: 2,
      isFocus: true,
      publishedAt: date("2026-05-08T09:30:00+09:00")
    }
  });

  await prisma.project.upsert({
    where: { id: id.projectAws },
    update: {
      title: "AWS基盤運用自動化支援",
      summary: "AWS運用基盤の改善、IaC整備、監視設計の支援。",
      workDescription: "Terraform整備、CloudWatch監視設計、運用手順の自動化、障害対応フロー改善。",
      businessDescription: "クラウド運用の標準化と保守負荷削減。",
      createdByUserId: id.userSales,
      ownerUserId: id.userSales,
      status: "OPEN",
      priorityLevel: 3,
      isFocus: false,
      publishedAt: date("2026-05-08T10:20:00+09:00")
    },
    create: {
      id: id.projectAws,
      projectCode: "MOC-PJ-002",
      title: "AWS基盤運用自動化支援",
      summary: "AWS運用基盤の改善、IaC整備、監視設計の支援。",
      workDescription: "Terraform整備、CloudWatch監視設計、運用手順の自動化、障害対応フロー改善。",
      businessDescription: "クラウド運用の標準化と保守負荷削減。",
      createdByUserId: id.userSales,
      ownerUserId: id.userSales,
      status: "OPEN",
      priorityLevel: 3,
      isFocus: false,
      publishedAt: date("2026-05-08T10:20:00+09:00")
    }
  });
}

async function seedProjectConditions() {
  await prisma.projectCondition.upsert({
    where: { projectId: id.projectConsole },
    update: {
      unitPriceMin: 80,
      unitPriceMax: 95,
      unitPriceText: "80〜95万円",
      upperAmountMin: 85,
      upperAmountMax: 100,
      commissionFeeAmount: 10000,
      amProjectFeeAmount: 10000,
      bankruptcyPredictionFeeAmount: 0,
      recruitingCount: 2,
      workload: "1人月",
      startMonth: date("2026-06-01T00:00:00Z"),
      expectedWorkDaysPerWeek: 5,
      settlementTimeMin: 140,
      settlementTimeMax: 180,
      workLocationText: "東京都千代田区 / リモート併用",
      prefecture: "東京都",
      remoteType: "HYBRID",
      workEnvironment: "週2出社、週3リモート想定",
      contractType: "SEMI_DELEGATION",
      foreignNationalityPolicy: "NEED_CONFIRMATION",
      ageCondition: "50代まで相談可",
      siteAtmosphere: "落ち着いた業務系開発チーム",
      dressCode: "オフィスカジュアル",
      hairNailRule: "清潔感があれば可",
      interviewCount: 1,
      salesInterviewAttendanceRequired: "NEED_CONFIRMATION",
      amContactRequired: true,
      amContactName: "営業担当A",
      notes: "MOC確認用の案件条件"
    },
    create: {
      id: id.projectConsoleCondition,
      projectId: id.projectConsole,
      unitPriceMin: 80,
      unitPriceMax: 95,
      unitPriceText: "80〜95万円",
      upperAmountMin: 85,
      upperAmountMax: 100,
      commissionFeeAmount: 10000,
      amProjectFeeAmount: 10000,
      bankruptcyPredictionFeeAmount: 0,
      recruitingCount: 2,
      workload: "1人月",
      startMonth: date("2026-06-01T00:00:00Z"),
      expectedWorkDaysPerWeek: 5,
      settlementTimeMin: 140,
      settlementTimeMax: 180,
      workLocationText: "東京都千代田区 / リモート併用",
      prefecture: "東京都",
      remoteType: "HYBRID",
      workEnvironment: "週2出社、週3リモート想定",
      contractType: "SEMI_DELEGATION",
      foreignNationalityPolicy: "NEED_CONFIRMATION",
      ageCondition: "50代まで相談可",
      siteAtmosphere: "落ち着いた業務系開発チーム",
      dressCode: "オフィスカジュアル",
      hairNailRule: "清潔感があれば可",
      interviewCount: 1,
      salesInterviewAttendanceRequired: "NEED_CONFIRMATION",
      amContactRequired: true,
      amContactName: "営業担当A",
      notes: "MOC確認用の案件条件"
    }
  });

  await prisma.projectCondition.upsert({
    where: { projectId: id.projectAws },
    update: {
      unitPriceMin: 75,
      unitPriceMax: 90,
      unitPriceText: "75〜90万円",
      upperAmountMin: 80,
      upperAmountMax: 95,
      commissionFeeAmount: 0,
      amProjectFeeAmount: 0,
      bankruptcyPredictionFeeAmount: 0,
      recruitingCount: 1,
      workload: "1人月",
      startMonth: date("2026-07-01T00:00:00Z"),
      expectedWorkDaysPerWeek: 5,
      settlementTimeMin: 150,
      settlementTimeMax: 190,
      workLocationText: "神奈川県横浜市 / 基本リモート",
      prefecture: "神奈川県",
      remoteType: "REMOTE",
      workEnvironment: "基本リモート、月数回出社",
      contractType: "SEMI_DELEGATION",
      foreignNationalityPolicy: "ACCEPTABLE",
      ageCondition: "年齢不問",
      siteAtmosphere: "自律的に進めるインフラ改善チーム",
      dressCode: "自由",
      hairNailRule: "規定なし",
      interviewCount: 2,
      salesInterviewAttendanceRequired: "NOT_REQUIRED",
      amContactRequired: false,
      notes: "MOC確認用のインフラ案件条件"
    },
    create: {
      id: id.projectAwsCondition,
      projectId: id.projectAws,
      unitPriceMin: 75,
      unitPriceMax: 90,
      unitPriceText: "75〜90万円",
      upperAmountMin: 80,
      upperAmountMax: 95,
      commissionFeeAmount: 0,
      amProjectFeeAmount: 0,
      bankruptcyPredictionFeeAmount: 0,
      recruitingCount: 1,
      workload: "1人月",
      startMonth: date("2026-07-01T00:00:00Z"),
      expectedWorkDaysPerWeek: 5,
      settlementTimeMin: 150,
      settlementTimeMax: 190,
      workLocationText: "神奈川県横浜市 / 基本リモート",
      prefecture: "神奈川県",
      remoteType: "REMOTE",
      workEnvironment: "基本リモート、月数回出社",
      contractType: "SEMI_DELEGATION",
      foreignNationalityPolicy: "ACCEPTABLE",
      ageCondition: "年齢不問",
      siteAtmosphere: "自律的に進めるインフラ改善チーム",
      dressCode: "自由",
      hairNailRule: "規定なし",
      interviewCount: 2,
      salesInterviewAttendanceRequired: "NOT_REQUIRED",
      amContactRequired: false,
      notes: "MOC確認用のインフラ案件条件"
    }
  });
}

async function seedProjectCompanyRoles() {
  const roles = [
    {
      id: id.roleConsoleEnd,
      projectId: id.projectConsole,
      companyId: id.companyFutureLink,
      companyContactId: id.contactFutureLink,
      role: "END_USER",
      roleOrder: 1,
      isPrimary: true,
      notes: "エンドユーザー"
    },
    {
      id: id.roleConsolePrime,
      projectId: id.projectConsole,
      companyId: id.companySampleSi,
      companyContactId: id.contactSampleSi,
      role: "PRIME_CONTRACTOR",
      roleOrder: 2,
      isPrimary: false,
      notes: "元請"
    },
    {
      id: id.roleConsoleUpper,
      projectId: id.projectConsole,
      companyId: id.companyEastCloud,
      companyContactId: id.contactEastCloud,
      role: "UPPER_COMPANY",
      roleOrder: 3,
      isPrimary: false,
      notes: "上位会社"
    },
    {
      id: id.roleAwsEnd,
      projectId: id.projectAws,
      companyId: id.companyMetroDigital,
      companyContactId: id.contactMetroDigital,
      role: "END_USER",
      roleOrder: 1,
      isPrimary: true,
      notes: "エンドユーザー"
    },
    {
      id: id.roleAwsUpper,
      projectId: id.projectAws,
      companyId: id.companyEastCloud,
      companyContactId: id.contactEastCloud,
      role: "UPPER_COMPANY",
      roleOrder: 2,
      isPrimary: false,
      notes: "上位会社"
    }
  ] as const;

  for (const role of roles) {
    await prisma.projectCompanyRole.upsert({
      where: {
        projectId_companyId_role: {
          projectId: role.projectId,
          companyId: role.companyId,
          role: role.role
        }
      },
      update: role,
      create: role
    });
  }
}

async function seedProjectSkillsAndTags() {
  const projectSkills = [
    { id: id.skillProjectReact, projectId: id.projectConsole, skillName: "React", skillType: "REQUIRED", yearsRequired: "3.0" },
    { id: id.skillProjectNext, projectId: id.projectConsole, skillName: "Next.js", skillType: "REQUIRED", yearsRequired: "2.0" },
    { id: id.skillProjectAws, projectId: id.projectAws, skillName: "AWS", skillType: "REQUIRED", yearsRequired: "3.0" },
    { id: id.skillProjectTerraform, projectId: id.projectAws, skillName: "Terraform", skillType: "PREFERRED", yearsRequired: "1.0" }
  ] as const;

  for (const skill of projectSkills) {
    await prisma.projectSkill.upsert({
      where: { id: skill.id },
      update: skill,
      create: skill
    });
  }

  await prisma.projectTag.upsert({
    where: { projectId_tag_tagType: { projectId: id.projectConsole, tag: "高単価", tagType: "FOCUS" } },
    update: { tag: "高単価" },
    create: { id: id.tagProjectFocus, projectId: id.projectConsole, tag: "高単価", tagType: "FOCUS" }
  });

  await prisma.projectTag.upsert({
    where: { projectId_tag_tagType: { projectId: id.projectAws, tag: "基本リモート", tagType: "FILTER" } },
    update: { tag: "基本リモート" },
    create: { id: id.tagProjectRemote, projectId: id.projectAws, tag: "基本リモート", tagType: "FILTER" }
  });
}

async function seedPersons() {
  await prisma.person.upsert({
    where: { id: id.personFrontend },
    update: {
      personCode: "MOC-PS-001",
      name: "フロントエンド要員A",
      initials: "FE-A",
      sourceMailId: id.mailPerson,
      ownerCompanyId: id.companyTalentPartners,
      ownerContactId: id.contactTalentPartners,
      summary: "React / TypeScript を中心としたフロントエンド開発要員。",
      careerSummary: "業務系Webアプリ、検索画面、管理画面の開発経験あり。",
      desiredUnitPrice: 85,
      availableFrom: date("2026-06-01T00:00:00Z"),
      preferredLocation: "東京都 / リモート併用",
      remotePreference: "週3以上リモート希望",
      age: 32,
      nationality: "日本",
      status: "AVAILABLE",
      createdByUserId: id.userSales
    },
    create: {
      id: id.personFrontend,
      personCode: "MOC-PS-001",
      name: "フロントエンド要員A",
      initials: "FE-A",
      sourceMailId: id.mailPerson,
      ownerCompanyId: id.companyTalentPartners,
      ownerContactId: id.contactTalentPartners,
      summary: "React / TypeScript を中心としたフロントエンド開発要員。",
      careerSummary: "業務系Webアプリ、検索画面、管理画面の開発経験あり。",
      desiredUnitPrice: 85,
      availableFrom: date("2026-06-01T00:00:00Z"),
      preferredLocation: "東京都 / リモート併用",
      remotePreference: "週3以上リモート希望",
      age: 32,
      nationality: "日本",
      status: "AVAILABLE",
      createdByUserId: id.userSales
    }
  });

  await prisma.person.upsert({
    where: { id: id.personInfra },
    update: {
      personCode: "MOC-PS-002",
      name: "クラウド要員B",
      initials: "CL-B",
      ownerCompanyId: id.companyTalentPartners,
      ownerContactId: id.contactTalentPartners,
      summary: "AWS基盤運用、Terraform、監視改善に強いクラウド要員。",
      careerSummary: "AWS運用、IaC、監視設計、運用自動化の経験あり。",
      desiredUnitPrice: 90,
      availableFrom: date("2026-07-01T00:00:00Z"),
      preferredLocation: "神奈川県 / 基本リモート",
      remotePreference: "基本リモート希望",
      age: 38,
      nationality: "日本",
      status: "PROPOSING",
      createdByUserId: id.userSales
    },
    create: {
      id: id.personInfra,
      personCode: "MOC-PS-002",
      name: "クラウド要員B",
      initials: "CL-B",
      ownerCompanyId: id.companyTalentPartners,
      ownerContactId: id.contactTalentPartners,
      summary: "AWS基盤運用、Terraform、監視改善に強いクラウド要員。",
      careerSummary: "AWS運用、IaC、監視設計、運用自動化の経験あり。",
      desiredUnitPrice: 90,
      availableFrom: date("2026-07-01T00:00:00Z"),
      preferredLocation: "神奈川県 / 基本リモート",
      remotePreference: "基本リモート希望",
      age: 38,
      nationality: "日本",
      status: "PROPOSING",
      createdByUserId: id.userSales
    }
  });
}

async function seedPersonSkills() {
  const skills = [
    { id: id.personSkillReact, personId: id.personFrontend, skillName: "React", years: "4.0", level: "実装主担当" },
    { id: id.personSkillTypeScript, personId: id.personFrontend, skillName: "TypeScript", years: "4.0", level: "実装主担当" },
    { id: id.personSkillAws, personId: id.personInfra, skillName: "AWS", years: "5.0", level: "設計・運用" },
    { id: id.personSkillTerraform, personId: id.personInfra, skillName: "Terraform", years: "2.5", level: "設計・実装" }
  ] as const;

  for (const skill of skills) {
    await prisma.personSkill.upsert({
      where: { id: skill.id },
      update: skill,
      create: skill
    });
  }
}

async function seedProposals() {
  await prisma.proposal.upsert({
    where: { id: id.proposalCompany },
    update: {
      personId: id.personFrontend,
      projectId: null,
      proposalType: "PERSON_TO_COMPANY",
      targetCompanyId: id.companySampleSi,
      targetContactId: id.contactSampleSi,
      salesMailAccountId: id.mailSales,
      ownerUserId: id.userSales,
      sourceMailId: id.mailPerson,
      status: "PROPOSED",
      statusChangedAt: date("2026-05-08T13:00:00+09:00"),
      proposedAt: date("2026-05-08T13:00:00+09:00"),
      notes: "具体案件紐付け前の会社向け要員紹介"
    },
    create: {
      id: id.proposalCompany,
      personId: id.personFrontend,
      projectId: null,
      proposalType: "PERSON_TO_COMPANY",
      targetCompanyId: id.companySampleSi,
      targetContactId: id.contactSampleSi,
      salesMailAccountId: id.mailSales,
      ownerUserId: id.userSales,
      sourceMailId: id.mailPerson,
      status: "PROPOSED",
      statusChangedAt: date("2026-05-08T13:00:00+09:00"),
      proposedAt: date("2026-05-08T13:00:00+09:00"),
      notes: "具体案件紐付け前の会社向け要員紹介"
    }
  });

  await prisma.proposal.upsert({
    where: { id: id.proposalProject },
    update: {
      personId: id.personFrontend,
      projectId: id.projectConsole,
      proposalType: "PERSON_TO_PROJECT",
      targetCompanyId: id.companyEastCloud,
      targetContactId: id.contactEastCloud,
      salesMailAccountId: id.mailSales,
      ownerUserId: id.userSales,
      sourceMailId: id.mailPerson,
      status: "ENTERED",
      statusChangedAt: date("2026-05-08T14:00:00+09:00"),
      proposedAt: date("2026-05-08T13:30:00+09:00"),
      enteredAt: date("2026-05-08T14:00:00+09:00"),
      notes: "React案件へのエントリー済み"
    },
    create: {
      id: id.proposalProject,
      personId: id.personFrontend,
      projectId: id.projectConsole,
      proposalType: "PERSON_TO_PROJECT",
      targetCompanyId: id.companyEastCloud,
      targetContactId: id.contactEastCloud,
      salesMailAccountId: id.mailSales,
      ownerUserId: id.userSales,
      sourceMailId: id.mailPerson,
      status: "ENTERED",
      statusChangedAt: date("2026-05-08T14:00:00+09:00"),
      proposedAt: date("2026-05-08T13:30:00+09:00"),
      enteredAt: date("2026-05-08T14:00:00+09:00"),
      notes: "React案件へのエントリー済み"
    }
  });

  await prisma.proposal.upsert({
    where: { id: id.proposalInterview },
    update: {
      personId: id.personInfra,
      projectId: id.projectAws,
      proposalType: "PERSON_TO_PROJECT",
      targetCompanyId: id.companyEastCloud,
      targetContactId: id.contactEastCloud,
      salesMailAccountId: id.mailSales,
      ownerUserId: id.userSales,
      status: "INTERVIEW_SCHEDULING",
      statusChangedAt: date("2026-05-08T15:00:00+09:00"),
      proposedAt: date("2026-05-08T14:30:00+09:00"),
      enteredAt: date("2026-05-08T14:45:00+09:00"),
      interviewScheduledAt: date("2026-05-10T11:00:00+09:00"),
      notes: "AWS案件で面談調整中"
    },
    create: {
      id: id.proposalInterview,
      personId: id.personInfra,
      projectId: id.projectAws,
      proposalType: "PERSON_TO_PROJECT",
      targetCompanyId: id.companyEastCloud,
      targetContactId: id.contactEastCloud,
      salesMailAccountId: id.mailSales,
      ownerUserId: id.userSales,
      status: "INTERVIEW_SCHEDULING",
      statusChangedAt: date("2026-05-08T15:00:00+09:00"),
      proposedAt: date("2026-05-08T14:30:00+09:00"),
      enteredAt: date("2026-05-08T14:45:00+09:00"),
      interviewScheduledAt: date("2026-05-10T11:00:00+09:00"),
      notes: "AWS案件で面談調整中"
    }
  });
}

async function seedDistributionLogs() {
  const logs = [
    {
      id: id.distributionCompany,
      proposalId: id.proposalCompany,
      projectId: null,
      personId: id.personFrontend,
      targetCompanyId: id.companySampleSi,
      targetContactId: id.contactSampleSi,
      externalMessageId: "moc-outbound-person-company-001@example.invalid",
      externalThreadId: "thread-outbound-person-company-001",
      subject: "【要員紹介】フロントエンド要員Aのご紹介",
      bodyText: "フロントエンド要員Aを会社向けに紹介したMOC配信履歴です。",
      sentAt: date("2026-05-08T13:05:00+09:00"),
      deliveryStatus: "SENT",
      notes: "person_to_company の配信履歴"
    },
    {
      id: id.distributionProject,
      proposalId: id.proposalProject,
      projectId: id.projectConsole,
      personId: id.personFrontend,
      targetCompanyId: id.companyEastCloud,
      targetContactId: id.contactEastCloud,
      externalMessageId: "moc-outbound-person-project-001@example.invalid",
      externalThreadId: "thread-outbound-person-project-001",
      subject: "【エントリー】React / Next.js案件 フロントエンド要員A",
      bodyText: "React / Next.js案件にフロントエンド要員Aを提案したMOC配信履歴です。",
      sentAt: date("2026-05-08T13:35:00+09:00"),
      deliveryStatus: "SENT",
      notes: "person_to_project の配信履歴"
    },
    {
      id: id.distributionInterview,
      proposalId: id.proposalInterview,
      projectId: id.projectAws,
      personId: id.personInfra,
      targetCompanyId: id.companyEastCloud,
      targetContactId: id.contactEastCloud,
      externalMessageId: "moc-outbound-person-project-002@example.invalid",
      externalThreadId: "thread-outbound-person-project-002",
      subject: "【面談調整】AWS基盤運用自動化支援 クラウド要員B",
      bodyText: "AWS案件でクラウド要員Bの面談調整を行ったMOC配信履歴です。",
      sentAt: date("2026-05-08T15:05:00+09:00"),
      deliveryStatus: "SENT",
      notes: "面談調整中の配信履歴"
    }
  ] as const;

  for (const log of logs) {
    await prisma.distributionLog.upsert({
      where: { id: log.id },
      update: {
        mailAccountId: id.mailSales,
        senderUserId: id.userSales,
        targetCompanyId: log.targetCompanyId,
        targetContactId: log.targetContactId,
        projectId: log.projectId,
        personId: log.personId,
        proposalId: log.proposalId,
        externalMessageId: log.externalMessageId,
        externalThreadId: log.externalThreadId,
        subject: log.subject,
        bodyHash: hashText(log.bodyText),
        sentAt: log.sentAt,
        deliveryStatus: log.deliveryStatus,
        excludedFromResend: false,
        notes: log.notes
      },
      create: {
        id: log.id,
        mailAccountId: id.mailSales,
        senderUserId: id.userSales,
        targetCompanyId: log.targetCompanyId,
        targetContactId: log.targetContactId,
        projectId: log.projectId,
        personId: log.personId,
        proposalId: log.proposalId,
        externalMessageId: log.externalMessageId,
        externalThreadId: log.externalThreadId,
        subject: log.subject,
        bodyHash: hashText(log.bodyText),
        sentAt: log.sentAt,
        deliveryStatus: log.deliveryStatus,
        excludedFromResend: false,
        notes: log.notes
      }
    });
  }

  await prisma.proposal.update({
    where: { id: id.proposalCompany },
    data: { latestDistributionLogId: id.distributionCompany }
  });
  await prisma.proposal.update({
    where: { id: id.proposalProject },
    data: { latestDistributionLogId: id.distributionProject }
  });
  await prisma.proposal.update({
    where: { id: id.proposalInterview },
    data: { latestDistributionLogId: id.distributionInterview }
  });
}

async function main() {
  await seedUsers();
  await seedMailAccounts();
  await seedCompanies();
  await seedCompanyContacts();
  await seedMailNotifications();
  await seedProjects();
  await seedProjectConditions();
  await seedProjectCompanyRoles();
  await seedProjectSkillsAndTags();
  await seedPersons();
  await seedPersonSkills();
  await seedProposals();
  await seedDistributionLogs();
}

main()
  .then(async () => {
    console.log("MOC seed data has been inserted.");
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
