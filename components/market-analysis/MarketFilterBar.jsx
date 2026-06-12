"use client";

import { useEffect, useState } from "react";

import MarketShareButton from "./MarketShareButton";

const emptyFilters = {
  fromMonth: "",
  skill: "",
  region: "",
  priceBand: "",
  workStyle: "",
  contractType: "",
  toMonth: "",
};

const regionOptions = [
  { label: "未指定", value: "" },
  { label: "東京", value: "東京" },
  { label: "神奈川", value: "神奈川" },
  { label: "千葉", value: "千葉" },
  { label: "埼玉", value: "埼玉" },
  { label: "大阪", value: "大阪" },
  { label: "愛知", value: "愛知" },
  { label: "福岡", value: "福岡" },
  { label: "unknown", value: "unknown" },
];

const priceBandOptions = [
  { label: "未指定", value: "" },
  { label: "〜50万円", value: "under_50" },
  { label: "50〜60万円", value: "50_60" },
  { label: "60〜70万円", value: "60_70" },
  { label: "70〜80万円", value: "70_80" },
  { label: "80万円〜", value: "80_over" },
  { label: "未設定", value: "unknown" },
];

const workStyleOptions = [
  { label: "未指定", value: "" },
  { label: "常駐", value: "ONSITE" },
  { label: "一部リモート", value: "HYBRID" },
  { label: "リモート", value: "REMOTE" },
  { label: "フルリモート", value: "FULL_REMOTE" },
  { label: "未設定", value: "UNKNOWN" },
];

const contractTypeOptions = [
  { label: "未指定", value: "" },
  { label: "準委任", value: "SEMI_DELEGATION" },
  { label: "派遣", value: "DISPATCH" },
  { label: "請負", value: "CONTRACT" },
  { label: "その他", value: "OTHER" },
  { label: "未設定", value: "UNKNOWN" },
];

const barStyle = {
  alignItems: "flex-start",
  background: "#fff",
  border: "1px solid var(--line)",
  borderRadius: 8,
  display: "flex",
  flexWrap: "wrap",
  gap: 16,
  justifyContent: "space-between",
  padding: 18,
};

const controlsStyle = {
  alignItems: "center",
  display: "flex",
  flexWrap: "wrap",
  gap: 14,
};

const detailsStyle = {
  display: "grid",
  flex: "1 1 100%",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(164px, 1fr))",
  width: "100%",
};

const actionsStyle = {
  alignItems: "center",
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
};

const labelStyle = {
  alignItems: "center",
  color: "#334155",
  display: "inline-flex",
  fontSize: 15,
  fontWeight: 800,
  gap: 8,
};

const stackedLabelStyle = {
  ...labelStyle,
  alignItems: "stretch",
  flexDirection: "column",
  gap: 6,
};

const selectStyle = {
  background: "#fff",
  border: "1px solid var(--line)",
  borderRadius: 4,
  color: "var(--text)",
  fontWeight: 800,
  minHeight: 42,
  padding: "0 12px",
  width: "100%",
};

const inputStyle = {
  ...selectStyle,
  minWidth: 0,
};

export default function MarketFilterBar({
  filters = emptyFilters,
  focusOnly,
  isLoading,
  limit = "",
  onApplyFilters,
  onFocusOnlyChange,
  onReload,
  onResetFilters,
}) {
  const [draftFilters, setDraftFilters] = useState({ ...emptyFilters, ...filters });
  const [draftLimit, setDraftLimit] = useState(limit);

  useEffect(() => {
    setDraftFilters({ ...emptyFilters, ...filters });
  }, [filters]);

  useEffect(() => {
    setDraftLimit(limit);
  }, [limit]);

  function updateDraftFilter(key, value) {
    setDraftFilters((current) => ({ ...current, [key]: value }));
  }

  function applyFilters() {
    onApplyFilters?.(
      {
        contractType: draftFilters.contractType,
        fromMonth: draftFilters.fromMonth,
        priceBand: draftFilters.priceBand,
        region: draftFilters.region,
        skill: draftFilters.skill.trim(),
        toMonth: draftFilters.toMonth,
        workStyle: draftFilters.workStyle,
      },
      draftLimit,
    );
  }

  function resetFilters() {
    setDraftFilters(emptyFilters);
    setDraftLimit("");
    onResetFilters?.();
  }

  return (
    <section style={barStyle} aria-label="市場分析フィルター">
      <div style={controlsStyle}>
        <label style={labelStyle}>
          件数指定
          <input
            aria-label="件数指定"
            disabled={isLoading}
            inputMode="numeric"
            min="1"
            onChange={(event) => setDraftLimit(event.target.value)}
            placeholder="未指定"
            style={{ ...inputStyle, maxWidth: 132 }}
            type="number"
            value={draftLimit}
          />
        </label>
        <label style={labelStyle}>
          <input
            checked={focusOnly}
            disabled={isLoading}
            onChange={(event) => onFocusOnlyChange(event.target.checked)}
            type="checkbox"
          />
          注力案件のみ
        </label>
      </div>

      <div style={detailsStyle}>
        <label style={stackedLabelStyle}>
          統計開始月
          <input
            aria-label="統計開始月"
            disabled={isLoading}
            onChange={(event) => updateDraftFilter("fromMonth", event.target.value)}
            style={inputStyle}
            type="month"
            value={draftFilters.fromMonth}
          />
        </label>
        <label style={stackedLabelStyle}>
          統計終了月
          <input
            aria-label="統計終了月"
            disabled={isLoading}
            onChange={(event) => updateDraftFilter("toMonth", event.target.value)}
            style={inputStyle}
            type="month"
            value={draftFilters.toMonth}
          />
        </label>
        <label style={stackedLabelStyle}>
          スキル
          <input
            aria-label="スキル"
            disabled={isLoading}
            onChange={(event) => updateDraftFilter("skill", event.target.value)}
            placeholder="Java, AWS, React"
            style={inputStyle}
            type="text"
            value={draftFilters.skill}
          />
        </label>
        <label style={stackedLabelStyle}>
          地域
          <select
            aria-label="地域"
            disabled={isLoading}
            onChange={(event) => updateDraftFilter("region", event.target.value)}
            style={selectStyle}
            value={draftFilters.region}
          >
            {regionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label style={stackedLabelStyle}>
          単価帯
          <select
            aria-label="単価帯"
            disabled={isLoading}
            onChange={(event) => updateDraftFilter("priceBand", event.target.value)}
            style={selectStyle}
            value={draftFilters.priceBand}
          >
            {priceBandOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label style={stackedLabelStyle}>
          勤務形態
          <select
            aria-label="勤務形態"
            disabled={isLoading}
            onChange={(event) => updateDraftFilter("workStyle", event.target.value)}
            style={selectStyle}
            value={draftFilters.workStyle}
          >
            {workStyleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label style={stackedLabelStyle}>
          契約形態
          <select
            aria-label="契約形態"
            disabled={isLoading}
            onChange={(event) => updateDraftFilter("contractType", event.target.value)}
            style={selectStyle}
            value={draftFilters.contractType}
          >
            {contractTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={actionsStyle}>
        <button className="primary-button" disabled={isLoading} onClick={applyFilters} type="button">
          適用
        </button>
        <button className="outline-primary" disabled={isLoading} onClick={resetFilters} type="button">
          リセット
        </button>
        <button className="outline-primary" disabled={isLoading} onClick={onReload} type="button">
          再読み込み
        </button>
        <MarketShareButton disabled={isLoading} />
      </div>
    </section>
  );
}
