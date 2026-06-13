import { UNKNOWN_MONTH, UNKNOWN_REGION } from "./constants";
import type { MarketMetricBase, SalesPriorityScore } from "./types";

type ScoreInput = MarketMetricBase & {
  region?: string | null;
  startMonth?: string | null;
  workStyle?: string | null;
  priceBand?: string | null;
};

function monthDistance(startMonth: string | null | undefined, today: Date) {
  if (!startMonth || startMonth === UNKNOWN_MONTH) return null;
  const matched = startMonth.match(/^(\d{4})-(\d{2})$/);
  if (!matched) return null;
  const year = Number(matched[1]);
  const monthIndex = Number(matched[2]) - 1;
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex)) return null;
  return (year - today.getFullYear()) * 12 + (monthIndex - today.getMonth());
}

export function calculateSalesPriorityScore(metric: ScoreInput, today = new Date()): SalesPriorityScore {
  const demandScore = Math.min(metric.recruitingCount, 10) * 2;
  const gapScore = Math.max(metric.demandSupplyGap, 0) * 3;
  const priceScore = metric.projectMedianPrice !== null && metric.projectMedianPrice >= 80
    ? 10
    : metric.projectMedianPrice !== null && metric.projectMedianPrice >= 70
      ? 6
      : 0;
  const focusScore = metric.focusProjectCount * 2;
  const distance = monthDistance(metric.startMonth, today);
  const timingScore = distance === 0 ? 6 : distance === 1 ? 4 : 0;

  let qualityPenalty = Math.min(metric.qualityIssueCount * 2, 10);
  if (metric.projectMedianPrice === null || metric.priceBand === "unknown") qualityPenalty += 2;
  if (!metric.region || metric.region === UNKNOWN_REGION) qualityPenalty += 2;
  if (!metric.workStyle || metric.workStyle === "UNKNOWN") qualityPenalty += 1;

  const reasons: string[] = [];
  if (demandScore >= 10) reasons.push("案件需要が多い");
  if (gapScore > 0) reasons.push("要員供給が不足");
  if (priceScore >= 10) reasons.push("高単価帯");
  if (focusScore > 0) reasons.push("注力案件を含む");
  if (timingScore > 0) reasons.push("開始月が近い");
  if (metric.projectMedianPrice === null || metric.priceBand === "unknown") reasons.push("単価未設定が多い");
  if (!metric.region || metric.region === UNKNOWN_REGION) reasons.push("地域未設定が多い");
  if (!metric.workStyle || metric.workStyle === "UNKNOWN") reasons.push("勤務形態未設定が多い");

  return {
    score: Math.max(0, demandScore + gapScore + priceScore + focusScore + timingScore - qualityPenalty),
    reasons,
    components: {
      demandScore,
      gapScore,
      priceScore,
      focusScore,
      timingScore,
      qualityPenalty,
    },
  };
}
