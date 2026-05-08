import { Badge } from "./Badge";

export default function ProjectTable({
  compact,
  menuProjectId,
  onAddProposal,
  onCopyUrl,
  onDetailAction,
  onMenuToggle,
  onSelectProject,
  projects,
  proposalIds,
  selectedProjectId
}) {
  const visibleColumns = compact
    ? ["ID", "案件名", "上位金額/月", "都道府県", "面談回数"]
    : ["ID", "案件名", "上位金額/月", "都道府県", "面談回数", "上位会社", "取引手数料", "取引実績", "作成者", "添付", "作成日", ""];

  return (
    <div className={`table-wrap ${compact ? "table-compact" : ""}`}>
      <table className="project-table">
        <thead>
          <tr>
            {visibleColumns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr
              className={selectedProjectId === project.id ? "selected" : ""}
              key={project.id}
              onClick={() => onSelectProject(project)}
            >
              <td className="id-cell">{project.id}</td>
              <td className="title-cell" title={project.title}>
                {project.title}
              </td>
              <td className={project.unitPrice !== "未定" ? "price-cell" : ""}>{project.unitPrice}</td>
              <td>
                <div className="badge-list">
                  {project.locations.slice(0, compact ? 2 : 3).map((location) => (
                    <Badge key={location}>{location}</Badge>
                  ))}
                  {project.locations.length > (compact ? 2 : 3) ? <span>…</span> : null}
                </div>
              </td>
              <td>{project.interviewCount}</td>
              {!compact ? (
                <>
                  <td className="company-cell">{project.company}</td>
                  <td>{project.fee}</td>
                  <td>{project.hasResult ? <Badge tone="outline">実績あり</Badge> : null}</td>
                  <td>
                    <span className="avatar" aria-label={`${project.creator} 作成`}>
                      {project.creator}
                    </span>
                  </td>
                  <td />
                  <td>{project.createdAt}</td>
                  <td className="action-cell" onClick={(event) => event.stopPropagation()}>
                    <button className="kebab-button" onClick={() => onMenuToggle(project.id)} type="button" aria-label="案件メニュー">
                      ⋯
                    </button>
                    {menuProjectId === project.id ? (
                      <div className="row-action-menu">
                        <button onClick={() => onAddProposal(project)} type="button">
                          {proposalIds.includes(project.id) ? "提案リストに追加済み" : "提案リストに追加"}
                        </button>
                        <button onClick={() => onCopyUrl(project)} type="button">
                          案件URLをコピー
                        </button>
                        <button onClick={() => onDetailAction("hide", project)} type="button">
                          案件ではないので非表示
                        </button>
                        <button className="muted" onClick={() => onDetailAction("closeRecruiting", project)} type="button">
                          募集を終了
                        </button>
                        <button className="muted" onClick={() => onDetailAction("delete", project)} type="button">
                          案件を削除
                        </button>
                      </div>
                    ) : null}
                  </td>
                </>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
