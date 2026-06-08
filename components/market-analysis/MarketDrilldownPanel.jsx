"use client";

const panelStyle = {
  background: "#fff",
  border: "1px solid var(--line)",
  borderRadius: 8,
  padding: 18,
};

const headerStyle = {
  alignItems: "flex-start",
  display: "flex",
  gap: 16,
  justifyContent: "space-between",
  marginBottom: 14,
};

const titleStyle = {
  fontSize: 20,
  margin: 0,
};

const subtitleStyle = {
  color: "#64748b",
  fontSize: 14,
  fontWeight: 800,
  lineHeight: 1.6,
  margin: "4px 0 0",
};

const badgeStyle = {
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  borderRadius: 4,
  color: "#1d4ed8",
  display: "inline-flex",
  fontSize: 13,
  fontWeight: 900,
  padding: "6px 10px",
  whiteSpace: "nowrap",
};

const gridStyle = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(auto-fit, minmax(168px, 1fr))",
  marginTop: 14,
};

const itemStyle = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 6,
  padding: "12px 14px",
};

const labelStyle = {
  color: "#64748b",
  display: "block",
  fontSize: 12,
  fontWeight: 900,
  marginBottom: 6,
};

const valueStyle = {
  color: "#1f2937",
  fontSize: 18,
  fontWeight: 900,
  lineHeight: 1.35,
};

const sectionTitleStyle = {
  color: "#334155",
  fontSize: 15,
  fontWeight: 900,
  margin: "18px 0 8px",
};

const reasonListStyle = {
  color: "#334155",
  fontSize: 14,
  fontWeight: 800,
  lineHeight: 1.7,
  margin: 0,
  paddingLeft: 20,
};

const emptyStyle = {
  color: "#64748b",
  fontSize: 15,
  fontWeight: 800,
  lineHeight: 1.7,
  margin: 0,
};

const typeLabels = {
  skill: "スキル",
  priceBand: "単価帯",
  region: "地域・勤務形態",
  marketCell: "市場セル",
};

function formatNumber(value) {
  if (value === null || value === undefined || value === "") return "-";
  return Number(value).toLocaleString("ja-JP");
}

function formatPrice(value) {
  if (value === null || value === undefined) return "-";
  return `${Number(value).toLocaleString("ja-JP")}万円`;
}

function formatScore(row) {
  const score = row?.salesPriorityScore?.score ?? row?.salesPriorityScore;
  if (score === null || score === undefined) return "-";
  return Number(score).toLocaleString("ja-JP");
}

function recommendedActionFor(row) {
  if (Number(row?.demandSupplyGap || 0) >= 3) return "要員掘り起こし";
  if (Number(row?.projectMedianPrice || 0) >= 80) return "高単価案件として営業注力";
  if (Number(row?.focusProjectCount || 0) >= 1) return "注力案件の提案候補確認";
  if (Number(row?.qualityAlertCount || row?.qualityIssueCount || 0) >= 3) return "データ補完";
  return "状況確認";
}

function fallbackReasons(row) {
  const reasons = [];
  if (Number(row?.demandSupplyGap || 0) >= 3) reasons.push("需給ギャップが大きいため、要員掘り起こしを優先してください。");
  if (Number(row?.projectMedianPrice || 0) >= 80) reasons.push("案件単価中央値が高いため、営業注力候補です。");
  if (Number(row?.focusProjectCount || 0) >= 1) reasons.push("注力案件が含まれるため、提案候補を優先確認してください。");
  if (Number(row?.qualityAlertCount || row?.qualityIssueCount || 0) >= 3) reasons.push("データ品質警告が多いため、先に情報補完が必要です。");
  if (!Number(row?.personCount || 0) && Number(row?.recruitingCount || 0) > 0) reasons.push("該当要員が不足しているため、候補者の確認が必要です。");
  if (!reasons.length) reasons.push("案件数、要員数、単価帯を継続確認してください。");
  return reasons;
}

function reasonsFor(row) {
  if (Array.isArray(row?.salesPriorityScore?.reasons) && row.salesPriorityScore.reasons.length) {
    return row.salesPriorityScore.reasons;
  }
  return fallbackReasons(row);
}

export default function MarketDrilldownPanel({ selection }) {
  if (!selection?.row) {
    return (
      <section style={panelStyle} aria-label="市場分析ドリルダウン">
        <p style={emptyStyle}>ランキング行を選択すると、営業判断に使う詳細が表示されます。</p>
      </section>
    );
  }

  const row = selection.row;
  const items = [
    { label: "分析種別", value: typeLabels[selection.type] || "分析" },
    { label: "対象条件", value: selection.title },
    { label: "案件数", value: formatNumber(row.projectCount) },
    { label: "募集人数", value: formatNumber(row.recruitingCount) },
    { label: "要員数", value: formatNumber(row.personCount) },
    { label: "需給ギャップ", value: formatNumber(row.demandSupplyGap) },
    { label: "案件単価中央値", value: formatPrice(row.projectMedianPrice) },
    { label: "要員希望単価中央値", value: formatPrice(row.personDesiredMedianPrice) },
    { label: "注力案件数", value: formatNumber(row.focusProjectCount) },
    { label: "データ品質警告数", value: formatNumber(row.qualityIssueCount) },
    { label: "営業優先度スコア", value: formatScore(row) },
    { label: "推奨アクション", value: recommendedActionFor(row) },
  ];
  const reasons = reasonsFor(row);

  return (
    <section style={panelStyle} aria-label="市場分析ドリルダウン">
      <div style={headerStyle}>
        <div>
          <h2 style={titleStyle}>安全な詳細</h2>
          <p style={subtitleStyle}>{selection.title}</p>
        </div>
        <span style={badgeStyle}>{typeLabels[selection.type] || "分析"}</span>
      </div>

      <div style={gridStyle}>
        {items.map((item) => (
          <div key={item.label} style={itemStyle}>
            <span style={labelStyle}>{item.label}</span>
            <strong style={valueStyle}>{item.value}</strong>
          </div>
        ))}
      </div>

      <h3 style={sectionTitleStyle}>判断理由</h3>
      <ul style={reasonListStyle}>
        {reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
    </section>
  );
}
