"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import MarketFilterBar from "../../components/market-analysis/MarketFilterBar";
import MarketQualityAlerts from "../../components/market-analysis/MarketQualityAlerts";
import MarketRankingTable from "../../components/market-analysis/MarketRankingTable";
import MarketSummaryCards from "../../components/market-analysis/MarketSummaryCards";

const pageStyle = {
  background: "#f6f7f9",
  minHeight: "100vh",
  minWidth: 1180,
  padding: "30px 28px 48px",
};

const headerStyle = {
  alignItems: "flex-start",
  display: "flex",
  justifyContent: "space-between",
  gap: 24,
  marginBottom: 22,
};

const titleStyle = {
  fontSize: 32,
  fontWeight: 900,
  lineHeight: 1.25,
  margin: 0,
};

const descriptionStyle = {
  color: "#64748b",
  fontSize: 16,
  fontWeight: 700,
  lineHeight: 1.7,
  margin: "8px 0 0",
  maxWidth: 760,
};

const metaStyle = {
  color: "#64748b",
  fontSize: 13,
  fontWeight: 800,
  lineHeight: 1.7,
  textAlign: "right",
};

const stackStyle = {
  display: "grid",
  gap: 18,
};

const stateBoxStyle = {
  background: "#fff",
  border: "1px solid var(--line)",
  borderRadius: 8,
  color: "#334155",
  fontSize: 16,
  fontWeight: 800,
  padding: 24,
};

const priceBandLabels = {
  under_50: "〜50万円",
  "50_60": "50〜60万円",
  "60_70": "60〜70万円",
  "70_80": "70〜80万円",
  "80_over": "80万円〜",
  unknown: "未設定",
};

const workStyleLabels = {
  ONSITE: "常駐",
  HYBRID: "一部リモート",
  REMOTE: "リモート",
  FULL_REMOTE: "フルリモート",
  UNKNOWN: "未設定",
};

const contractTypeLabels = {
  SEMI_DELEGATION: "準委任",
  DISPATCH: "派遣",
  CONTRACT: "請負",
  OTHER: "その他",
  UNKNOWN: "未設定",
};

const commonMetricColumns = [
  { key: "projectCount", label: "案件数" },
  { key: "recruitingCount", label: "募集人数" },
  { key: "personCount", label: "要員数" },
  { key: "demandSupplyGap", label: "需給ギャップ" },
  { key: "projectMedianPrice", label: "案件単価中央値", type: "price" },
  { key: "personDesiredMedianPrice", label: "要員希望単価中央値", type: "price" },
  { key: "focusProjectCount", label: "注力案件数" },
];

const skillColumns = [
  { key: "skill", label: "スキル", render: (row) => row.skill || "-" },
  ...commonMetricColumns,
];

const priceBandColumns = [
  { key: "priceBand", label: "単価帯", render: (row) => priceBandLabels[row.priceBand] || row.priceBand || "-" },
  ...commonMetricColumns,
];

const regionColumns = [
  {
    key: "region",
    label: "地域・勤務形態",
    render: (row) => `${row.region || "-"} / ${workStyleLabels[row.workStyle] || row.workStyle || "-"}`,
  },
  ...commonMetricColumns,
];

const marketCellColumns = [
  {
    key: "cell",
    label: "市場セル",
    render: (row) => [
      row.skill || "-",
      priceBandLabels[row.priceBand] || row.priceBand || "-",
      row.region || "-",
      workStyleLabels[row.workStyle] || row.workStyle || "-",
      row.startMonth || "-",
      contractTypeLabels[row.contractType] || row.contractType || "-",
    ].join(" / "),
  },
  ...commonMetricColumns,
  { key: "salesPriorityScore", label: "営業優先度スコア", type: "score" },
];

async function fetchMarketAnalysis({ focusOnly, limit, signal }) {
  const params = new URLSearchParams({
    limit: String(limit),
    focusOnly: focusOnly ? "true" : "false",
  });
  const response = await fetch(`/api/market-analysis?${params.toString()}`, {
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || "市場分析データの取得に失敗しました。");
  }

  return response.json();
}

function formatGeneratedAt(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function MarketAnalysisPage() {
  const [limit, setLimit] = useState(500);
  const [focusOnly, setFocusOnly] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setReloadKey((current) => current + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError("");

    fetchMarketAnalysis({ focusOnly, limit, signal: controller.signal })
      .then(setData)
      .catch((fetchError) => {
        if (fetchError.name === "AbortError") return;
        setError(fetchError.message || "市場分析データの取得に失敗しました。");
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [focusOnly, limit, reloadKey]);

  const generatedAt = useMemo(() => formatGeneratedAt(data?.generatedAt), [data?.generatedAt]);

  return (
    <main style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <h1 style={titleStyle}>市場分析</h1>
          <p style={descriptionStyle}>
            案件・要員データから、スキル、単価帯、地域、需給ギャップ、営業注力候補を確認できます。
          </p>
        </div>
        <div style={metaStyle}>
          <div>最終更新</div>
          <strong>{generatedAt}</strong>
        </div>
      </header>

      <div style={stackStyle}>
        <MarketFilterBar
          focusOnly={focusOnly}
          isLoading={isLoading}
          limit={limit}
          onFocusOnlyChange={setFocusOnly}
          onLimitChange={setLimit}
          onReload={reload}
        />

        {isLoading && !data ? (
          <div style={stateBoxStyle}>市場分析データを読み込んでいます。</div>
        ) : null}

        {error ? (
          <div style={{ ...stateBoxStyle, borderColor: "#fecaca", color: "#b91c1c" }}>
            {error}
          </div>
        ) : null}

        {data ? (
          <>
            <MarketSummaryCards summary={data.summary} />
            <MarketRankingTable columns={skillColumns} rows={data.skillRankings} title="スキル別ランキング" />
            <MarketRankingTable columns={priceBandColumns} rows={data.priceBandRankings} title="単価帯別ランキング" />
            <MarketRankingTable columns={regionColumns} rows={data.regionRankings} title="地域・勤務形態別ランキング" />
            <MarketRankingTable columns={marketCellColumns} rows={data.marketCellRankings} title="市場セル別ランキング" />
            <MarketQualityAlerts alerts={data.qualityAlerts} />
          </>
        ) : null}
      </div>
    </main>
  );
}
