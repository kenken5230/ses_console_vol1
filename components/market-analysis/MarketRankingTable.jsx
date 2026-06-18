"use client";

import { useState } from "react";

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
  gap: 10,
  justifyContent: "space-between",
  padding: "10px 12px",
};

const titleStyle = {
  fontSize: 17,
  margin: 0,
};

const tableWrapStyle = {
  overflowX: "auto",
};

const tableStyle = {
  borderCollapse: "collapse",
  minWidth: 860,
  width: "100%",
};

const thStyle = {
  background: "#f8fafc",
  borderBottom: "1px solid var(--line)",
  color: "#475569",
  fontSize: 12,
  fontWeight: 900,
  padding: "7px 8px",
  textAlign: "left",
  whiteSpace: "nowrap",
};

const tdStyle = {
  borderBottom: "1px solid #eef2f6",
  color: "#1f2937",
  fontSize: 13,
  fontWeight: 700,
  padding: "7px 8px",
  verticalAlign: "top",
};

const clickableRowStyle = {
  cursor: "pointer",
};

const selectedRowStyle = {
  background: "#eff6ff",
  boxShadow: "inset 4px 0 0 #2563eb",
};

const headerActionsStyle = {
  alignItems: "center",
  display: "flex",
  gap: 8,
};

const copyButtonStyle = {
  background: "#fff",
  border: "1px solid var(--line)",
  borderRadius: 4,
  color: "#1f5fc5",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 900,
  minHeight: 30,
  padding: "0 10px",
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

const numericColumnKeys = new Set([
  "projectCount",
  "recruitingCount",
  "personCount",
  "demandSupplyGap",
  "focusProjectCount",
  "qualityIssueCount",
]);

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

function isNumericColumn(column) {
  return column.type === "price" || column.type === "score" || numericColumnKeys.has(column.key);
}

function headerStyleFor(column) {
  return {
    ...thStyle,
    textAlign: isNumericColumn(column) ? "right" : "left",
  };
}

function cellStyleFor(column) {
  const isNumeric = isNumericColumn(column);
  return {
    ...tdStyle,
    fontVariantNumeric: isNumeric ? "tabular-nums" : undefined,
    textAlign: isNumeric ? "right" : "left",
    whiteSpace: isNumeric ? "nowrap" : undefined,
  };
}

async function copyText(text) {
  if (typeof navigator === "undefined" || !navigator.clipboard) return false;
  await navigator.clipboard.writeText(text);
  return true;
}

export default function MarketRankingTable({ columns, onRowSelect, rows = [], selectedRow = null, title, type }) {
  const [copied, setCopied] = useState(false);
  const visibleRows = rows.slice(0, 20);
  const isClickable = Boolean(onRowSelect);

  async function handleCopy() {
    const header = columns.map((column) => column.label).join("\t");
    const body = visibleRows.map((row) => columns.map((column) => valueFor(row, column)).join("\t")).join("\n");
    const ok = await copyText([header, body].filter(Boolean).join("\n"));
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <section style={sectionStyle}>
      <div style={headerStyle}>
        <h2 style={titleStyle}>{title}</h2>
        <div style={headerActionsStyle}>
          <span style={{ color: "#64748b", fontSize: 12, fontWeight: 800 }}>上位{visibleRows.length}件</span>
          <button disabled={!visibleRows.length} onClick={handleCopy} style={copyButtonStyle} type="button">
            {copied ? "コピー済み" : "表をコピー"}
          </button>
        </div>
      </div>
      {visibleRows.length ? (
        <div style={tableWrapStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.key} style={headerStyleFor(column)}>
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, index) => (
                <tr
                  aria-selected={selectedRow === row}
                  key={row.key || `${title}-${index}`}
                  onClick={isClickable ? () => onRowSelect({ row, title, type }) : undefined}
                  onKeyDown={isClickable ? (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onRowSelect({ row, title, type });
                    }
                  } : undefined}
                  role={isClickable ? "button" : undefined}
                  style={{
                    ...(isClickable ? clickableRowStyle : {}),
                    ...(selectedRow === row ? selectedRowStyle : {}),
                  }}
                  tabIndex={isClickable ? 0 : undefined}
                >
                  {columns.map((column) => (
                    <td key={column.key} style={cellStyleFor(column)}>
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
