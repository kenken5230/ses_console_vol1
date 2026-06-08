"use client";

import { useMemo, useState } from "react";

const sectionStyle = {
  background: "#fff",
  border: "1px solid var(--line)",
  borderRadius: 8,
  overflow: "hidden",
};

const headerStyle = {
  alignItems: "center",
  borderBottom: "1px solid var(--line)",
  display: "flex",
  gap: 12,
  justifyContent: "space-between",
  padding: "16px 18px",
};

const titleStyle = {
  fontSize: 19,
  margin: 0,
};

const chartGridStyle = {
  display: "grid",
  gap: 18,
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  padding: 18,
};

const chartStyle = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  padding: 14,
};

const chartTitleStyle = {
  color: "#334155",
  fontSize: 15,
  fontWeight: 900,
  margin: "0 0 12px",
};

const rowStyle = {
  display: "grid",
  gap: 8,
  gridTemplateColumns: "112px 1fr 54px",
  marginBottom: 10,
};

const labelStyle = {
  color: "#475569",
  fontSize: 13,
  fontWeight: 900,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const barTrackStyle = {
  background: "#e2e8f0",
  borderRadius: 4,
  height: 12,
  overflow: "hidden",
};

const barStyle = {
  background: "#1f5fc5",
  borderRadius: 4,
  height: "100%",
  minWidth: 2,
};

const valueStyle = {
  color: "#1f2937",
  fontSize: 13,
  fontWeight: 900,
  textAlign: "right",
};

const copyButtonStyle = {
  background: "#fff",
  border: "1px solid var(--line)",
  borderRadius: 4,
  color: "#1f5fc5",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 900,
  minHeight: 36,
  padding: "0 12px",
};

const emptyStyle = {
  color: "#64748b",
  fontSize: 14,
  fontWeight: 800,
  padding: 18,
};

function formatNumber(value) {
  return Number(value || 0).toLocaleString("ja-JP");
}

function truncateLabel(value) {
  if (!value) return "-";
  return String(value);
}

function chartRows(rows, labelFor) {
  return (rows || []).slice(0, 8).map((row) => ({
    gap: Number(row.demandSupplyGap || 0),
    label: labelFor(row),
    recruitingCount: Number(row.recruitingCount || 0),
  }));
}

function Chart({ rows, title }) {
  const maxValue = Math.max(1, ...rows.map((row) => row.recruitingCount));

  return (
    <div style={chartStyle}>
      <h3 style={chartTitleStyle}>{title}</h3>
      {rows.length ? rows.map((row) => (
        <div key={`${title}-${row.label}`} style={rowStyle}>
          <span style={labelStyle} title={row.label}>{truncateLabel(row.label)}</span>
          <div aria-hidden="true" style={barTrackStyle}>
            <div style={{ ...barStyle, width: `${Math.max(3, Math.round((row.recruitingCount / maxValue) * 100))}%` }} />
          </div>
          <span style={valueStyle}>{formatNumber(row.recruitingCount)}</span>
        </div>
      )) : (
        <div style={emptyStyle}>該当データがありません</div>
      )}
    </div>
  );
}

async function copyText(text) {
  if (typeof navigator === "undefined" || !navigator.clipboard) return false;
  await navigator.clipboard.writeText(text);
  return true;
}

export default function MarketChartPanel({
  priceBandLabels = {},
  priceBandRankings = [],
  regionRankings = [],
  skillRankings = [],
  workStyleLabels = {},
}) {
  const [copied, setCopied] = useState(false);
  const charts = useMemo(() => [
    {
      rows: chartRows(skillRankings, (row) => row.skill || "-"),
      title: "スキル別 募集人数",
    },
    {
      rows: chartRows(priceBandRankings, (row) => priceBandLabels[row.priceBand] || row.priceBand || "-"),
      title: "単価帯別 募集人数",
    },
    {
      rows: chartRows(regionRankings, (row) => `${row.region || "-"} / ${workStyleLabels[row.workStyle] || row.workStyle || "-"}`),
      title: "地域・勤務形態別 募集人数",
    },
  ], [priceBandLabels, priceBandRankings, regionRankings, skillRankings, workStyleLabels]);

  async function handleCopy() {
    const text = charts.flatMap((chart) => [
      [chart.title, "募集人数", "需給ギャップ"].join("\t"),
      ...chart.rows.map((row) => [row.label, row.recruitingCount, row.gap].join("\t")),
      "",
    ]).join("\n");
    const ok = await copyText(text);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <section style={sectionStyle} aria-label="市場分析グラフ">
      <div style={headerStyle}>
        <h2 style={titleStyle}>グラフ</h2>
        <button onClick={handleCopy} style={copyButtonStyle} type="button">
          {copied ? "コピー済み" : "グラフ数値をコピー"}
        </button>
      </div>
      <div style={chartGridStyle}>
        {charts.map((chart) => (
          <Chart key={chart.title} rows={chart.rows} title={chart.title} />
        ))}
      </div>
    </section>
  );
}
