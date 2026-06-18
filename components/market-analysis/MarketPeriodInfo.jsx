"use client";

import { useState } from "react";

const sectionStyle = {
  alignItems: "center",
  background: "#fff",
  border: "1px solid var(--line)",
  borderRadius: 8,
  display: "flex",
  flexWrap: "wrap",
  gap: 14,
  justifyContent: "space-between",
  padding: "16px 18px",
};

const titleStyle = {
  color: "#334155",
  display: "block",
  fontSize: 14,
  fontWeight: 900,
  marginBottom: 4,
};

const valueStyle = {
  color: "#1f2937",
  fontSize: 18,
  fontWeight: 900,
  lineHeight: 1.5,
};

const noteStyle = {
  color: "#64748b",
  fontSize: 13,
  fontWeight: 800,
  lineHeight: 1.6,
};

const detailGridStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  marginTop: 8,
};

const detailStyle = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 6,
  color: "#475569",
  fontSize: 13,
  fontWeight: 900,
  padding: "7px 10px",
};

const copyButtonStyle = {
  alignSelf: "center",
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

function monthLabel(value) {
  if (!value) return "未指定";
  return value.replace("-", "年") + "月";
}

function rangeLabel(fromMonth, toMonth) {
  if (!fromMonth && !toMonth) return "期間未指定";
  return `${monthLabel(fromMonth)} 〜 ${monthLabel(toMonth)}`;
}

function actualRangeLabel(period) {
  if (!period?.actualFromMonth && !period?.actualToMonth) return "対象データなし";
  return `${monthLabel(period.actualFromMonth)} 〜 ${monthLabel(period.actualToMonth)}`;
}

async function copyText(text) {
  if (typeof navigator === "undefined" || !navigator.clipboard) return false;
  await navigator.clipboard.writeText(text);
  return true;
}

export default function MarketPeriodInfo({ period }) {
  const [copied, setCopied] = useState(false);
  const basisLabel = period?.basisLabel || "データ登録月";
  const appliedRange = rangeLabel(period?.fromMonth, period?.toMonth);
  const actualRange = actualRangeLabel(period);
  const projectRange = rangeLabel(period?.projectFromMonth, period?.projectToMonth);
  const personRange = rangeLabel(period?.personFromMonth, period?.personToMonth);

  async function handleCopy() {
    const ok = await copyText([
      ["起算軸", basisLabel],
      ["指定期間", appliedRange],
      ["実集計期間", actualRange],
      ["案件登録月範囲", projectRange],
      ["要員登録月範囲", personRange],
    ].map((row) => row.join("\t")).join("\n"));
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <section style={sectionStyle} aria-label="市場分析の統計期間">
      <div>
        <span style={titleStyle}>統計期間</span>
        <div style={valueStyle}>{actualRange}</div>
        <div style={noteStyle}>
          起算軸は{basisLabel}です。期間未指定の場合は直近3か月をデフォルトにします。
        </div>
        <div style={detailGridStyle}>
          <span style={detailStyle}>指定期間: {appliedRange}</span>
          <span style={detailStyle}>案件: {projectRange}</span>
          <span style={detailStyle}>要員: {personRange}</span>
        </div>
      </div>
      <button onClick={handleCopy} style={copyButtonStyle} type="button">
        {copied ? "コピー済み" : "期間をコピー"}
      </button>
    </section>
  );
}
