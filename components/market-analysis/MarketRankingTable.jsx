"use client";

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
  justifyContent: "space-between",
  padding: "16px 18px",
};

const titleStyle = {
  fontSize: 19,
  margin: 0,
};

const tableWrapStyle = {
  overflowX: "auto",
};

const tableStyle = {
  borderCollapse: "collapse",
  minWidth: 940,
  width: "100%",
};

const thStyle = {
  background: "#f8fafc",
  borderBottom: "1px solid var(--line)",
  color: "#475569",
  fontSize: 13,
  fontWeight: 900,
  padding: "11px 12px",
  textAlign: "left",
  whiteSpace: "nowrap",
};

const tdStyle = {
  borderBottom: "1px solid #eef2f6",
  color: "#1f2937",
  fontSize: 14,
  fontWeight: 700,
  padding: "12px",
  verticalAlign: "top",
};

const emptyStyle = {
  color: "#64748b",
  fontSize: 14,
  fontWeight: 700,
  padding: 18,
};

const emptyTitleStyle = {
  color: "#334155",
  display: "block",
  fontSize: 15,
  marginBottom: 6,
};

function formatNumber(value) {
  if (value === null || value === undefined || value === "") return "-";
  return Number(value).toLocaleString("ja-JP");
}

function formatPrice(value) {
  if (value === null || value === undefined) return "-";
  return `${Number(value).toLocaleString("ja-JP")}万円`;
}

function formatScore(value) {
  if (value === null || value === undefined) return "-";
  return Number(value).toLocaleString("ja-JP");
}

function recommendedActionFor(row) {
  if (Number(row.demandSupplyGap || 0) >= 3) return "要員掘り起こし";
  if (Number(row.projectMedianPrice || 0) >= 80) return "高単価案件として営業注力";
  if (Number(row.focusProjectCount || 0) >= 1) return "注力案件の提案候補確認";
  if (Number(row.qualityAlertCount || row.qualityIssueCount || 0) >= 3) return "データ補完";
  return "状況確認";
}

function valueFor(row, column) {
  if (column.type === "price") return formatPrice(row[column.key]);
  if (column.type === "score") return formatScore(row.salesPriorityScore?.score ?? row[column.key]);
  if (column.type === "action") return recommendedActionFor(row);
  if (column.render) return column.render(row);
  return formatNumber(row[column.key]);
}

export default function MarketRankingTable({ columns, rows = [], title }) {
  const visibleRows = rows.slice(0, 20);

  return (
    <section style={sectionStyle}>
      <div style={headerStyle}>
        <h2 style={titleStyle}>{title}</h2>
        <span style={{ color: "#64748b", fontSize: 13, fontWeight: 800 }}>上位{visibleRows.length}件</span>
      </div>
      {visibleRows.length ? (
        <div style={tableWrapStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.key} style={thStyle}>
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, index) => (
                <tr key={row.key || `${title}-${index}`}>
                  {columns.map((column) => (
                    <td key={column.key} style={tdStyle}>
                      {valueFor(row, column)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={emptyStyle}>
          <strong style={emptyTitleStyle}>該当データがありません</strong>
          <span>条件を変更するか、案件・要員データを追加してください</span>
        </div>
      )}
    </section>
  );
}
