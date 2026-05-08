function DataPanel({ columns, rows, title }) {
  return (
    <section className="db-panel">
      <div className="db-panel-heading">
        <h2>{title}</h2>
        <span>{rows.length}件</span>
      </div>
      <div className="db-table-wrap">
        <table className="db-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row) => (
                <tr key={row.id}>
                  {columns.map((column) => (
                    <td key={column.key} title={String(row[column.key] ?? "")}>
                      {column.render ? column.render(row[column.key], row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length}>表示できるデータがありません</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function DbReadOnlyPanels({ data }) {
  const persons = data?.persons || [];
  const mailNotifications = data?.mailNotifications || [];
  const proposals = data?.proposals || [];
  const distributionLogs = data?.distributionLogs || [];

  return (
    <section className="db-panels">
      <DataPanel
        title="要員一覧"
        rows={persons}
        columns={[
          { key: "id", label: "ID" },
          { key: "name", label: "要員名" },
          { key: "status", label: "状態" },
          { key: "company", label: "所属会社" },
          { key: "unitPrice", label: "希望単価" },
          { key: "availableFrom", label: "稼働開始" },
          { key: "skills", label: "スキル" }
        ]}
      />
      <DataPanel
        title="メール通知一覧"
        rows={mailNotifications}
        columns={[
          { key: "id", label: "ID" },
          { key: "category", label: "分類" },
          { key: "subject", label: "件名" },
          { key: "from", label: "送信者" },
          { key: "receivedAt", label: "受信日時" },
          { key: "isExcluded", label: "除外", render: (value) => (value ? "除外" : "表示") },
          { key: "needsReview", label: "確認", render: (value) => (value ? "要確認" : "") }
        ]}
      />
      <DataPanel
        title="提案一覧"
        rows={proposals}
        columns={[
          { key: "id", label: "ID" },
          { key: "proposalType", label: "種別" },
          { key: "person", label: "要員" },
          { key: "project", label: "案件" },
          { key: "company", label: "提案先" },
          { key: "status", label: "状態" },
          { key: "salesMailAccount", label: "送信元" }
        ]}
      />
      <DataPanel
        title="配信履歴"
        rows={distributionLogs}
        columns={[
          { key: "id", label: "ID" },
          { key: "subject", label: "件名" },
          { key: "person", label: "要員" },
          { key: "project", label: "案件" },
          { key: "company", label: "送信先会社" },
          { key: "sentAt", label: "送信日時" },
          { key: "status", label: "状態" }
        ]}
      />
    </section>
  );
}
