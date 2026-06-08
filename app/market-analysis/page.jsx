"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import MarketChartPanel from "../../components/market-analysis/MarketChartPanel";
import MarketDrilldownPanel from "../../components/market-analysis/MarketDrilldownPanel";
import MarketFilterBar from "../../components/market-analysis/MarketFilterBar";
import MarketPeriodInfo from "../../components/market-analysis/MarketPeriodInfo";
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

const errorTitleStyle = {
  display: "block",
  marginBottom: 6,
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

const DEFAULT_LIMIT = 500;
const DEFAULT_DETAIL_FILTERS = {
  fromMonth: "",
  skill: "",
  region: "",
  priceBand: "",
  workStyle: "",
  contractType: "",
  toMonth: "",
};
const limitOptions = [100, 500, 1000];
const filterKeys = ["skill", "region", "priceBand", "workStyle", "contractType"];

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

function formatPriceBand(row) {
  return priceBandLabels[row.priceBand] || row.priceBand || "-";
}

const priceBandColumns = [
  { key: "priceBand", label: "単価帯", render: formatPriceBand },
  ...commonMetricColumns,
];

function formatRegion(row) {
  return `${row.region || "-"} / ${workStyleLabels[row.workStyle] || row.workStyle || "-"}`;
}

const regionColumns = [
  {
    key: "region",
    label: "地域・勤務形態",
    render: formatRegion,
  },
  ...commonMetricColumns,
];

function formatMarketCell(row) {
  return [
    row.skill || "-",
    priceBandLabels[row.priceBand] || row.priceBand || "-",
    row.region || "-",
    workStyleLabels[row.workStyle] || row.workStyle || "-",
    row.startMonth || "-",
    contractTypeLabels[row.contractType] || row.contractType || "-",
  ].join(" / ");
}

const marketCellColumns = [
  {
    key: "cell",
    label: "市場セル",
    render: formatMarketCell,
  },
  { key: "recruitingCount", label: "募集人数" },
  { key: "personCount", label: "要員数" },
  { key: "demandSupplyGap", label: "需給ギャップ" },
  { key: "projectMedianPrice", label: "案件単価中央値", type: "price" },
  { key: "salesPriorityScore", label: "営業優先度スコア", type: "score" },
  { key: "recommendedAction", label: "推奨アクション", type: "action" },
];

function buildFetchError(response, payload) {
  if (response.status === 401) {
    return {
      detail: "再ログイン後に市場分析画面を開き直してください",
      title: "ログインが必要です",
    };
  }

  return {
    detail: response.status >= 500 ? "時間を置いて再読み込みしてください。" : "",
    title: payload.message || "市場分析データの取得に失敗しました。",
  };
}

function appendOptionalParam(params, key, value) {
  if (value) params.set(key, value);
}

function booleanParam(value) {
  const normalized = value?.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

function parseLimit(value) {
  const parsed = Number(value);
  return limitOptions.includes(parsed) ? parsed : DEFAULT_LIMIT;
}

function filtersFromParams(params) {
  return filterKeys.reduce((result, key) => {
    result[key] = params.get(key)?.trim() || "";
    return result;
  }, { ...DEFAULT_DETAIL_FILTERS });
}

function stateFromUrl() {
  if (typeof window === "undefined") {
    return {
      filters: DEFAULT_DETAIL_FILTERS,
      focusOnly: false,
      limit: DEFAULT_LIMIT,
    };
  }
  const params = new URLSearchParams(window.location.search);
  return {
    filters: filtersFromParams(params),
    focusOnly: booleanParam(params.get("focusOnly")),
    limit: parseLimit(params.get("limit")),
  };
}

function buildMarketAnalysisSearch({ filters, focusOnly, limit }) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (focusOnly) params.set("focusOnly", "true");
  for (const key of filterKeys) {
    appendOptionalParam(params, key, filters[key]);
  }
  return params.toString();
}

function replaceMarketAnalysisUrl(nextState) {
  if (typeof window === "undefined") return;
  const search = buildMarketAnalysisSearch(nextState);
  const nextUrl = search ? `${window.location.pathname}?${search}` : window.location.pathname;
  window.history.replaceState(null, "", nextUrl);
}

async function fetchMarketAnalysis({ filters, focusOnly, limit, signal }) {
  const params = new URLSearchParams({
    limit: String(limit),
    focusOnly: focusOnly ? "true" : "false",
  });
  appendOptionalParam(params, "fromMonth", filters.fromMonth);
  appendOptionalParam(params, "toMonth", filters.toMonth);
  appendOptionalParam(params, "skill", filters.skill);
  appendOptionalParam(params, "region", filters.region);
  appendOptionalParam(params, "priceBand", filters.priceBand);
  appendOptionalParam(params, "workStyle", filters.workStyle);
  appendOptionalParam(params, "contractType", filters.contractType);

  const response = await fetch(`/api/market-analysis?${params.toString()}`, {
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const errorInfo = buildFetchError(response, payload);
    const error = new Error(errorInfo.title);
    error.info = errorInfo;
    throw error;
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

function drilldownTitleFor(type, row) {
  if (type === "skill") return row.skill || "未設定スキル";
  if (type === "priceBand") return formatPriceBand(row);
  if (type === "region") return formatRegion(row);
  if (type === "marketCell") return formatMarketCell(row);
  return "選択中のランキング";
}

function selectedRowFor(selection, type) {
  return selection?.type === type ? selection.row : null;
}

export default function MarketAnalysisPage() {
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [focusOnly, setFocusOnly] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_DETAIL_FILTERS);
  const [isUrlStateReady, setIsUrlStateReady] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedDrilldown, setSelectedDrilldown] = useState(null);

  const reload = useCallback(() => {
    setSelectedDrilldown(null);
    setReloadKey((current) => current + 1);
  }, []);

  const applyFilters = useCallback((nextFilters) => {
    setSelectedDrilldown(null);
    setFilters(nextFilters);
    replaceMarketAnalysisUrl({ filters: nextFilters, focusOnly, limit });
  }, [focusOnly, limit]);

  const changeLimit = useCallback((nextLimit) => {
    setSelectedDrilldown(null);
    setLimit(nextLimit);
    replaceMarketAnalysisUrl({ filters, focusOnly, limit: nextLimit });
  }, [filters, focusOnly]);

  const changeFocusOnly = useCallback((nextFocusOnly) => {
    setSelectedDrilldown(null);
    setFocusOnly(nextFocusOnly);
    replaceMarketAnalysisUrl({ filters, focusOnly: nextFocusOnly, limit });
  }, [filters, limit]);

  const resetFilters = useCallback(() => {
    setLimit(DEFAULT_LIMIT);
    setFocusOnly(false);
    setFilters(DEFAULT_DETAIL_FILTERS);
    setSelectedDrilldown(null);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", window.location.pathname);
    }
    setReloadKey((current) => current + 1);
  }, []);

  const selectDrilldown = useCallback(({ row, type }) => {
    setSelectedDrilldown({
      row,
      title: drilldownTitleFor(type, row),
      type,
    });
  }, []);

  useEffect(() => {
    const initialState = stateFromUrl();
    setLimit(initialState.limit);
    setFocusOnly(initialState.focusOnly);
    setFilters(initialState.filters);
    setIsUrlStateReady(true);
  }, []);

  useEffect(() => {
    if (!isUrlStateReady) return undefined;
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    fetchMarketAnalysis({ filters, focusOnly, limit, signal: controller.signal })
      .then(setData)
      .catch((fetchError) => {
        if (fetchError.name === "AbortError") return;
        setError(
          fetchError.info || {
            detail: "",
            title: fetchError.message || "市場分析データの取得に失敗しました。",
          },
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [filters, focusOnly, isUrlStateReady, limit, reloadKey]);

  useEffect(() => {
    setSelectedDrilldown(null);
  }, [data]);

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
          filters={filters}
          focusOnly={focusOnly}
          isLoading={isLoading}
          limit={limit}
          onApplyFilters={applyFilters}
          onFocusOnlyChange={changeFocusOnly}
          onLimitChange={changeLimit}
          onReload={reload}
          onResetFilters={resetFilters}
        />

        {isLoading && !data ? (
          <div style={stateBoxStyle}>市場分析データを読み込んでいます。</div>
        ) : null}

        {error ? (
          <div style={{ ...stateBoxStyle, borderColor: "#fecaca", color: "#b91c1c" }}>
            <strong style={errorTitleStyle}>{error.title}</strong>
            {error.detail ? <span>{error.detail}</span> : null}
          </div>
        ) : null}

        {data ? (
          <>
            <MarketPeriodInfo period={data.period} />
            <MarketSummaryCards summary={data.summary} />
            <MarketChartPanel
              priceBandLabels={priceBandLabels}
              priceBandRankings={data.priceBandRankings}
              regionRankings={data.regionRankings}
              skillRankings={data.skillRankings}
              workStyleLabels={workStyleLabels}
            />
            <MarketDrilldownPanel selection={selectedDrilldown} />
            <MarketRankingTable
              columns={skillColumns}
              onRowSelect={selectDrilldown}
              rows={data.skillRankings}
              selectedRow={selectedRowFor(selectedDrilldown, "skill")}
              title="スキル別ランキング"
              type="skill"
            />
            <MarketRankingTable
              columns={priceBandColumns}
              onRowSelect={selectDrilldown}
              rows={data.priceBandRankings}
              selectedRow={selectedRowFor(selectedDrilldown, "priceBand")}
              title="単価帯別ランキング"
              type="priceBand"
            />
            <MarketRankingTable
              columns={regionColumns}
              onRowSelect={selectDrilldown}
              rows={data.regionRankings}
              selectedRow={selectedRowFor(selectedDrilldown, "region")}
              title="地域・勤務形態別ランキング"
              type="region"
            />
            <MarketRankingTable
              columns={marketCellColumns}
              onRowSelect={selectDrilldown}
              rows={data.marketCellRankings}
              selectedRow={selectedRowFor(selectedDrilldown, "marketCell")}
              title="市場セル別ランキング"
              type="marketCell"
            />
            <MarketQualityAlerts alerts={data.qualityAlerts} />
          </>
        ) : null}
      </div>
    </main>
  );
}
