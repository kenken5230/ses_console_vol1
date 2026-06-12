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
  gap: 14,
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
};

const cardStyle = {
  background: "#fff",
  border: "1px solid var(--line)",
  borderRadius: 8,
  minHeight: 104,
  padding: "18px 20px",
};

const labelStyle = {
  color: "#64748b",
  fontSize: 14,
  fontWeight: 800,
};

const valueStyle = {
  color: "#1f5fc5",
  display: "block",
  fontSize: 32,
  fontWeight: 900,
  lineHeight: 1.25,
  marginTop: 8,
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
  const items = [
    { label: "案件数", value: summary?.projectCount },
    { label: "要員数", value: summary?.personCount },
    { label: "注力案件数", value: summary?.focusProjectCount },
    { label: "データ品質アラート件数", value: summary?.qualityAlertCount },
    { label: `累計案件数（${cumulativeFromMonth}以降）`, value: summary?.cumulativeProjectCount },
    { label: `累計要員数（${cumulativeFromMonth}以降）`, value: summary?.cumulativePersonCount },
  ];

  async function handleCopy() {
    const ok = await copyText(items.map((item) => [item.label, item.value ?? 0].join("\t")).join("\n"));
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
            <strong style={valueStyle}>{formatCount(item.value)}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}
