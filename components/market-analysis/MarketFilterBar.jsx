"use client";

const limitOptions = [100, 500, 1000];

const barStyle = {
  alignItems: "center",
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

const labelStyle = {
  alignItems: "center",
  color: "#334155",
  display: "inline-flex",
  fontSize: 15,
  fontWeight: 800,
  gap: 8,
};

const selectStyle = {
  background: "#fff",
  border: "1px solid var(--line)",
  borderRadius: 4,
  color: "var(--text)",
  fontWeight: 800,
  minHeight: 42,
  padding: "0 12px",
};

export default function MarketFilterBar({
  focusOnly,
  isLoading,
  limit,
  onFocusOnlyChange,
  onLimitChange,
  onReload,
}) {
  return (
    <section style={barStyle} aria-label="市場分析フィルター">
      <div style={controlsStyle}>
        <label style={labelStyle}>
          取得件数
          <select
            aria-label="取得件数"
            disabled={isLoading}
            onChange={(event) => onLimitChange(Number(event.target.value))}
            style={selectStyle}
            value={limit}
          >
            {limitOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
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
      <button className="outline-primary" disabled={isLoading} onClick={onReload} type="button">
        再読み込み
      </button>
    </section>
  );
}
