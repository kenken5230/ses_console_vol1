"use client";

const sectionStyle = {
  borderTop: "1px solid #e2e8f0",
  marginTop: 18,
  paddingTop: 16,
};

const descriptionStyle = {
  color: "#64748b",
  fontSize: 13,
  fontWeight: 800,
  lineHeight: 1.6,
  margin: "4px 0 12px",
};

const groupStyle = {
  marginTop: 12,
};

const groupTitleStyle = {
  color: "#334155",
  fontSize: 14,
  fontWeight: 900,
  margin: "0 0 8px",
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
  borderBottom: "1px solid #e2e8f0",
  color: "#475569",
  fontSize: 12,
  fontWeight: 900,
  padding: "9px 10px",
  textAlign: "left",
  whiteSpace: "nowrap",
};

const tdStyle = {
  borderBottom: "1px solid #eef2f6",
  color: "#1f2937",
  fontSize: 13,
  fontWeight: 750,
  padding: "9px 10px",
  whiteSpace: "nowrap",
};

const emptyStyle = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 6,
  color: "#64748b",
  fontSize: 13,
  fontWeight: 800,
  lineHeight: 1.7,
  margin: "8px 0 0",
  padding: 12,
};

const priceBandLabels = {
  under_50: "〜50万円",
  "50_60": "50〜60万円",
  "60_70": "60〜70万円",
  "70_80": "70〜80万円",
  "80_over": "80万円〜",
  unknown: "未設定",
};

const workStyleLabels = {
  ONSITE: "常駐",
  HYBRID: "一部リモート",
  REMOTE: "リモート",
  FULL_REMOTE: "フルリモート",
  UNKNOWN: "未設定",
};

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "-";
  return value;
}

function focusLabel(value) {
  if (value === true) return "あり";
  if (value === false) return "なし";
  return "-";
}

function labelForKind(kind) {
  return kind === "project" ? "案件" : "要員";
}

function renderRows(rows) {
  return (
    <div style={tableWrapStyle}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>区分</th>
            <th style={thStyle}>匿名ID</th>
            <th style={thStyle}>登録月</th>
            <th style={thStyle}>単価帯</th>
            <th style={thStyle}>地域</th>
            <th style={thStyle}>勤務形態</th>
            <th style={thStyle}>スキル数</th>
            <th style={thStyle}>必須</th>
            <th style={thStyle}>尚可</th>
            <th style={thStyle}>使用技術</th>
            <th style={thStyle}>注力</th>
            <th style={thStyle}>状態</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.anonymousId}>
              <td style={tdStyle}>{labelForKind(row.kind)}</td>
              <td style={tdStyle}>{row.anonymousId}</td>
              <td style={tdStyle}>{formatValue(row.registeredMonth)}</td>
              <td style={tdStyle}>{priceBandLabels[row.priceBand] || formatValue(row.priceBand)}</td>
              <td style={tdStyle}>{formatValue(row.region)}</td>
              <td style={tdStyle}>{workStyleLabels[row.workStyle] || formatValue(row.workStyle)}</td>
              <td style={tdStyle}>{formatValue(row.skillCount)}</td>
              <td style={tdStyle}>{formatValue(row.requiredSkillCount)}</td>
              <td style={tdStyle}>{formatValue(row.preferredSkillCount)}</td>
              <td style={tdStyle}>{formatValue(row.usedTechnologySkillCount)}</td>
              <td style={tdStyle}>{focusLabel(row.isFocus)}</td>
              <td style={tdStyle}>{formatValue(row.status)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ExampleGroup({ rows = [], title }) {
  return (
    <div style={groupStyle}>
      <h4 style={groupTitleStyle}>{title}</h4>
      {rows.length ? renderRows(rows) : <p style={emptyStyle}>該当する匿名代表例はありません</p>}
    </div>
  );
}

export default function MarketAnonymousExampleList({ examples }) {
  const projects = examples?.projects ?? [];
  const persons = examples?.persons ?? [];

  return (
    <section style={sectionStyle} aria-label="匿名代表例">
      <h3 style={groupTitleStyle}>匿名代表例</h3>
      <p style={descriptionStyle}>
        同一レスポンス内だけで使う表示用IDです。案件名・要員名・会社名・メール・本文・raw text・source payloadは表示しません。
      </p>
      <ExampleGroup rows={projects} title="案件例" />
      <ExampleGroup rows={persons} title="要員例" />
    </section>
  );
}
