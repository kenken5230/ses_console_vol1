import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export const dynamic = "force-dynamic";

function formatDateTime(value: Date | null | undefined) {
  if (!value) return "";
  return value.toISOString().replace("T", " ").slice(0, 16);
}

function formatDate(value: Date | null | undefined) {
  if (!value) return "";
  return value.toISOString().slice(0, 10);
}

function formatMoneyRange(min?: number | null, max?: number | null, text?: string | null) {
  if (text) return text;
  if (min && max) return `${min}〜${max}万円`;
  if (min) return `${min}万円〜`;
  if (max) return `〜${max}万円`;
  return "未定";
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    DRAFT: "下書き",
    OPEN: "公開",
    PAUSED: "一時停止",
    CLOSED: "募集終了",
    ARCHIVED: "アーカイブ",
    AVAILABLE: "提案可",
    PROPOSING: "提案中",
    JOINED: "参画中",
    INACTIVE: "停止",
    PROPOSED: "提案済み",
    ENTERED: "エントリー済み",
    INTERVIEW_SCHEDULING: "面談調整中",
    INTERVIEWED: "面談済み",
    OFFERED: "オファー済み",
    REJECTED: "見送り",
    WITHDRAWN: "辞退",
    SENT: "送信済み",
    FAILED: "失敗",
    BOUNCED: "不達",
    REPLIED: "返信あり",
    UNKNOWN: "不明"
  };

  return labels[status] || status;
}

function categoryLabel(category: string) {
  const labels: Record<string, string> = {
    PROJECT_INTRO: "案件紹介",
    PERSON_INTRO: "要員紹介",
    SEMINAR: "セミナー",
    NEWSLETTER: "メルマガ",
    SALES_AD: "営業広告",
    NORMAL_CONTACT: "通常連絡",
    OTHER: "その他",
    NEEDS_REVIEW: "要確認",
    EXCLUDED: "除外"
  };

  return labels[category] || category;
}

function proposalTypeLabel(type: string) {
  const labels: Record<string, string> = {
    PERSON_TO_COMPANY: "要員→会社",
    PERSON_TO_PROJECT: "要員→案件"
  };

  return labels[type] || type;
}

function companyRoleLabel(role: string) {
  const labels: Record<string, string> = {
    UPPER_COMPANY: "上位会社",
    END_USER: "エンドユーザー",
    PRIME_CONTRACTOR: "元請",
    SECONDARY_CONTRACTOR: "二次請け",
    TERTIARY_CONTRACTOR: "三次請け",
    ACCOUNT_MANAGER_COMPANY: "AM会社",
    PROPOSAL_TARGET: "提案先",
    OTHER: "その他"
  };

  return labels[role] || role;
}

function remoteLabel(remoteType?: string | null) {
  const labels: Record<string, string> = {
    UNKNOWN: "未確認",
    ONSITE: "常駐",
    HYBRID: "リモート併用",
    REMOTE: "リモート",
    FULL_REMOTE: "フルリモート"
  };

  return remoteType ? labels[remoteType] || remoteType : "未確認";
}

function pickProjectCompany(project: any) {
  const preferredRoles = ["UPPER_COMPANY", "PRIME_CONTRACTOR", "END_USER"];
  for (const role of preferredRoles) {
    const found = project.companyRoles.find((item: any) => item.role === role);
    if (found) return found.company.name;
  }
  return project.companyRoles[0]?.company.name || "未入力";
}

function mapProject(project: any) {
  const condition = project.condition;
  const skills = project.skills.map((skill: any) => skill.skillName);
  const tags = project.tags.map((tag: any) => tag.tag);
  const locations = [condition?.prefecture, condition?.workLocationText].filter(Boolean);
  const unitPrice = formatMoneyRange(condition?.unitPriceMin, condition?.unitPriceMax, condition?.unitPriceText);
  const createdAt = formatDate(project.createdAt);
  const company = pickProjectCompany(project);
  const commerceItems = project.companyRoles
    .sort((a: any, b: any) => a.roleOrder - b.roleOrder)
    .map((role: any) => [companyRoleLabel(role.role), role.company.name]);

  return {
    id: project.projectCode || project.id.slice(0, 8),
    dbId: project.id,
    title: project.title,
    category: "SES",
    unitPrice,
    unitPriceValue: condition?.unitPriceMax || condition?.unitPriceMin || 0,
    locations: locations.length ? locations : ["未入力"],
    interviewCount: condition?.interviewCount ? `${condition.interviewCount}回` : "未入力",
    company,
    fee: condition?.commissionFeeAmount ? `${condition.commissionFeeAmount.toLocaleString()}円` : "0円",
    hasResult: project.companyRoles.some((role: any) => role.company.tradeStatus === "OK"),
    creator: project.createdBy?.name?.slice(0, 2) || "DB",
    createdAt,
    status: statusLabel(project.status),
    tags: [...skills, ...tags].slice(0, 10),
    attention: tags,
    detail: {
      memo: "DB seedデータを読み取り専用で表示しています",
      fields: [
        {
          label: "手数料",
          type: "fee",
          items: [
            { label: `AM案件手数料：${(condition?.amProjectFeeAmount || 0).toLocaleString()}円`, tone: "purple" },
            { label: `倒産予測値手数料：${(condition?.bankruptcyPredictionFeeAmount || 0).toLocaleString()}円`, tone: "danger" }
          ]
        },
        {
          label: "上位会社",
          type: "company",
          value: company,
          tags: [{ label: project.companyRoles.some((role: any) => role.company.tradeStatus === "OK") ? "取引OK" : "要確認", tone: "success" }]
        },
        {
          label: "作業内容",
          type: "longText",
          lines: ["■業務内容", project.workDescription || project.summary || "未入力", "", "■業務背景", project.businessDescription || "未入力"]
        },
        { label: "作業場所", value: locations.join(" / ") || "未入力" },
        { label: "スキル", type: "tags", tags: skills.length ? skills : ["未入力"] },
        { label: "上位金額", value: formatMoneyRange(condition?.upperAmountMin, condition?.upperAmountMax) },
        { label: "精算時間幅", value: condition?.settlementTimeMin && condition?.settlementTimeMax ? `${condition.settlementTimeMin}〜${condition.settlementTimeMax}h` : "未入力" },
        { label: "案件開始月", value: formatDate(condition?.startMonth) || "未入力" },
        { label: "想定稼働日数", value: condition?.expectedWorkDaysPerWeek ? `週${condition.expectedWorkDaysPerWeek}日` : "未入力" },
        { label: "就業環境", value: remoteLabel(condition?.remoteType) },
        { label: "契約形態", value: condition?.contractType || "未入力" },
        { label: "外国籍の受け入れ", value: condition?.foreignNationalityPolicy || "未入力" },
        { label: "年齢条件", value: condition?.ageCondition || "未入力" },
        { label: "現場の雰囲気", value: condition?.siteAtmosphere || "未入力" },
        { label: "作業時の服装", value: condition?.dressCode || "未入力" },
        { label: "髪型、爪等の規定", value: condition?.hairNailRule || "未入力" },
        { label: "面談回数", value: condition?.interviewCount ? `${condition.interviewCount}回` : "未入力" },
        { label: "募集人数", value: condition?.recruitingCount ? `${condition.recruitingCount}名` : "未入力" },
        { label: "商流", type: "commerce", items: commerceItems.length ? commerceItems : [["商流", "未入力"]] },
        { label: "上位担当者", value: project.companyRoles.find((role: any) => role.companyContact)?.companyContact?.name || "未入力" },
        { label: "連絡先", value: project.companyRoles.find((role: any) => role.companyContact)?.companyContact?.email || "未入力" },
        { label: "案件作成者", type: "person", value: project.createdBy?.name || "未入力", avatar: project.createdBy?.name?.slice(0, 1) || "D" },
        { label: "案件作成日", value: createdAt || "未入力" }
      ]
    }
  };
}

export async function GET() {
  const [projects, persons, mailNotifications, proposals, distributionLogs] = await Promise.all([
    prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        condition: true,
        companyRoles: {
          include: {
            company: true,
            companyContact: true
          },
          orderBy: { roleOrder: "asc" }
        },
        createdBy: true,
        skills: true,
        tags: true
      }
    }),
    prisma.person.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        ownerCompany: true,
        ownerContact: true,
        skills: true
      }
    }),
    prisma.mailNotification.findMany({
      orderBy: { receivedAt: "desc" },
      take: 20
    }),
    prisma.proposal.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        person: true,
        project: true,
        targetCompany: true,
        targetContact: true,
        salesMailAccount: true,
        ownerUser: true
      }
    }),
    prisma.distributionLog.findMany({
      orderBy: { sentAt: "desc" },
      include: {
        project: true,
        person: true,
        proposal: true,
        targetCompany: true,
        targetContact: true,
        mailAccount: true,
        senderUser: true
      }
    })
  ]);

  return NextResponse.json({
    projects: projects.map(mapProject),
    persons: persons.map((person) => ({
      id: person.personCode || person.id.slice(0, 8),
      name: person.name || person.initials || "未入力",
      status: statusLabel(person.status),
      company: person.ownerCompany?.name || "未入力",
      contact: person.ownerContact?.name || "未入力",
      unitPrice: person.desiredUnitPrice ? `${person.desiredUnitPrice}万円` : "未定",
      availableFrom: formatDate(person.availableFrom) || "未入力",
      skills: person.skills.map((skill) => skill.skillName).join(" / ") || "未入力"
    })),
    mailNotifications: mailNotifications.map((mail) => ({
      id: mail.id.slice(0, 8),
      subject: mail.subject || "件名なし",
      category: categoryLabel(mail.category),
      from: mail.fromName || mail.fromEmail || "未入力",
      receivedAt: formatDateTime(mail.receivedAt),
      isExcluded: mail.isExcluded,
      needsReview: mail.needsReview
    })),
    proposals: proposals.map((proposal) => ({
      id: proposal.id.slice(0, 8),
      proposalType: proposalTypeLabel(proposal.proposalType),
      person: proposal.person.name || proposal.person.initials || "未入力",
      project: proposal.project?.title || "案件未紐付け",
      company: proposal.targetCompany.name,
      contact: proposal.targetContact?.name || "未入力",
      status: statusLabel(proposal.status),
      salesMailAccount: proposal.salesMailAccount.email,
      owner: proposal.ownerUser?.name || "未入力"
    })),
    distributionLogs: distributionLogs.map((log) => ({
      id: log.id.slice(0, 8),
      subject: log.subject || "件名なし",
      project: log.project?.title || "案件未紐付け",
      person: log.person?.name || log.person?.initials || "要員未紐付け",
      company: log.targetCompany.name,
      contact: log.targetContact?.name || "未入力",
      mailAccount: log.mailAccount.email,
      sentAt: formatDateTime(log.sentAt),
      status: statusLabel(log.deliveryStatus)
    }))
  });
}
