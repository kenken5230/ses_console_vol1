"use client";

const sectionStyle = {
  background: "#fff",
  border: "1px solid var(--line)",
  borderRadius: 8,
  overflow: "hidden",
};

const headerStyle = {
  borderBottom: "1px solid var(--line)",
  padding: "16px 18px",
};

const titleStyle = {
  fontSize: 19,
  margin: 0,
};

const tableStyle = {
  borderCollapse: "collapse",
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
};

const tdStyle = {
  borderBottom: "1px solid #eef2f6",
  fontSize: 14,
  fontWeight: 700,
  padding: "12px",
  verticalAlign: "top",
};

const badgeStyle = {
  borderRadius: 4,
  display: "inline-flex",
  fontSize: 12,
  fontWeight: 900,
  padding: "4px 8px",
};

const severityColor = {
  critical: { background: "#fee2e2", color: "#b91c1c" },
  warning: { background: "#fef3c7", color: "#92400e" },
  info: { background: "#dbeafe", color: "#1d4ed8" },
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

export default function MarketQualityAlerts({ alerts = [] }) {
  return (
    <section style={sectionStyle}>
      <div style={headerStyle}>
        <h2 style={titleStyle}>データ品質アラート</h2>
      </div>
      {alerts.length ? (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>code</th>
              <th style={thStyle}>severity</th>
              <th style={thStyle}>target</th>
              <th style={thStyle}>count</th>
              <th style={thStyle}>message</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((alert) => (
              <tr key={`${alert.code}-${alert.target}`}>
                <td style={tdStyle}>{alert.code}</td>
                <td style={tdStyle}>
                  <span style={{ ...badgeStyle, ...(severityColor[alert.severity] || severityColor.info) }}>
                    {alert.severity}
                  </span>
                </td>
                <td style={tdStyle}>{alert.target}</td>
                <td style={tdStyle}>{Number(alert.count || 0).toLocaleString("ja-JP")}</td>
                <td style={tdStyle}>{alert.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div style={emptyStyle}>
          <strong style={emptyTitleStyle}>該当データがありません</strong>
          <span>条件を変更するか、案件・要員データを追加してください</span>
        </div>
      )}
    </section>
  );
}
