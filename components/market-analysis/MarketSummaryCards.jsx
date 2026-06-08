"use client";

const gridStyle = {
  display: "grid",
  gap: 14,
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
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

function formatCount(value) {
  return Number(value || 0).toLocaleString("ja-JP");
}

export default function MarketSummaryCards({ summary }) {
  const items = [
    { label: "案件数", value: summary?.projectCount },
    { label: "要員数", value: summary?.personCount },
    { label: "注力案件数", value: summary?.focusProjectCount },
    { label: "データ品質アラート件数", value: summary?.qualityAlertCount },
  ];

  return (
    <section style={gridStyle} aria-label="市場分析サマリー">
      {items.map((item) => (
        <article key={item.label} style={cardStyle}>
          <span style={labelStyle}>{item.label}</span>
          <strong style={valueStyle}>{formatCount(item.value)}</strong>
        </article>
      ))}
    </section>
  );
}
