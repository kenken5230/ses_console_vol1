"use client";

import { useState } from "react";

const sectionStyle = {
  display: "grid",
  gap: 10,
};

const headerStyle = {
  alignItems: "center",
  display: "flex",
  justifyContent: "space-between",
};

const titleStyle = {
  color: "#334155",
  fontSize: 18,
  fontWeight: 900,
  margin: 0,
};

const gridStyle = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
};

const cardStyle = {
  background: "#fff",
  border: "1px solid var(--line)",
  borderRadius: 8,
  minHeight: 82,
  padding: "12px 14px",
};

const labelStyle = {
  color: "#64748b",
  fontSize: 12,
  fontWeight: 800,
};

const noteStyle = {
  color: "#64748b",
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  lineHeight: 1.4,
  marginTop: 3,
};

const valueStyle = {
  color: "#1f5fc5",
  display: "block",
  fontSize: 24,
  fontWeight: 900,
  lineHeight: 1.2,
  marginTop: 6,
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

function formatCount(value) {
  return Number(value || 0).toLocaleString("ja-JP");
}

async function copyText(text) {
  if (typeof navigator === "undefined" || !navigator.clipboard) return false;
  await navigator.clipboard.writeText(text);
  return true;
}

export default function MarketSummaryCards({ summary }) {
  const [copied, setCopied] = useState(false);
  const cumulativeFromMonth = summary?.cumulativeFromMonth || "2026-01";
  const projectScope = summary?.focusOnly ? "注力案件のみ" : "全案件";
  const items = [
    { label: "累計案件数", note: `${cumulativeFromMonth}以降 / ${projectScope}`, value: summary?.projectCount },
    { label: "累計要員数", note: `${cumulativeFromMonth}以降 / 全要員`, value: summary?.personCount },
    { label: "累計注力案件数", note: `${cumulativeFromMonth}以降 / 注力案件`, value: summary?.focusProjectCount },
    {
      label: "ランキング集計案件数",
      note: `取得・フィルター後${summary?.focusOnly ? " / 注力のみ" : ""}`,
      value: summary?.sampleProjectCount ?? summary?.projectCount,
    },
    {
      label: "ランキング集計要員数",
      note: "取得・フィルター後 / 全要員",
      value: summary?.samplePersonCount ?? summary?.personCount,
    },
    { label: "データ品質アラート件数", note: "ランキング集計対象内", value: summary?.qualityAlertCount },
  ];

  async function handleCopy() {
    const ok = await copyText(items.map((item) => [`${item.label} (${item.note})`, item.value ?? 0].join("\t")).join("\n"));
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <section style={sectionStyle} aria-label="市場分析サマリー">
      <div style={headerStyle}>
        <h2 style={titleStyle}>サマリー</h2>
        <button onClick={handleCopy} style={copyButtonStyle} type="button">
          {copied ? "コピー済み" : "サマリーをコピー"}
        </button>
      </div>
      <div style={gridStyle}>
        {items.map((item) => (
          <article key={item.label} style={cardStyle}>
            <span style={labelStyle}>{item.label}</span>
            <span style={noteStyle}>{item.note}</span>
            <strong style={valueStyle}>{formatCount(item.value)}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}
