import { useEffect, useState } from "react";
import { sidePaneItemLabels } from "../data/mockProjects";
import { Badge } from "./Badge";

function orderDetailFields(fields) {
  const order = new Map(sidePaneItemLabels.map((label, index) => [label, index]));
  return [...fields].sort((a, b) => (order.get(a.label) ?? 999) - (order.get(b.label) ?? 999));
}

function DetailValue({ field }) {
  if (field.type === "fee") {
    return (
      <div className="tag-flow">
        {field.items.map((item) => (
          <Badge tone={item.tone} key={item.label}>
            {item.label}
          </Badge>
        ))}
      </div>
    );
  }

  if (field.type === "company") {
    return (
      <div>
        <strong>{field.value}</strong>
        <div className="tag-flow detail-tags">
          {field.tags.map((tag) => (
            <Badge tone={tag.tone} key={tag.label}>
              {tag.label}
            </Badge>
          ))}
        </div>
      </div>
    );
  }

  if (field.type === "longText") {
    return (
      <div className="work-text">
        {field.lines.map((line, index) =>
          line ? (
            <p key={`${line}-${index}`}>{line}</p>
          ) : (
            <div className="text-spacer" key={`spacer-${index}`} />
          )
        )}
      </div>
    );
  }

  if (field.type === "tags") {
    return (
      <div className="tag-flow wrap">
        {field.tags.map((tag) => (
          <Badge key={tag}>{tag}</Badge>
        ))}
      </div>
    );
  }

  if (field.type === "commerce") {
    return (
      <div className="commerce-detail">
        {field.items.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong className={value === "未入力" ? "muted-value" : ""}>{value}</strong>
          </div>
        ))}
      </div>
    );
  }

  if (field.type === "person") {
    return (
      <span className="person-value">
        <span className="avatar small">{field.avatar}</span>
        <strong>{field.value}</strong>
      </span>
    );
  }

  return <strong className={field.muted ? "muted-value" : ""}>{field.value}</strong>;
}

export default function ProjectDetailPane({
  menuOpen,
  onAddProposal,
  onClose,
  onCopyUrl,
  onDetailAction,
  onMemoSave,
  onMenuToggle,
  project,
  proposalIds
}) {
  const [isEditingMemo, setIsEditingMemo] = useState(false);
  const [memoDraft, setMemoDraft] = useState("");

  useEffect(() => {
    setMemoDraft(project?.detail?.memo || "SKV内全員が閲覧できます");
    setIsEditingMemo(false);
  }, [project]);

  if (!project) return null;

  const detail = project.detail || {
    memo: "SKV内全員が閲覧できます",
    fields: [
      {
        label: "手数料",
        type: "fee",
        items: [{ label: "AM案件手数料：10,000円", tone: "purple" }]
      },
      {
        label: "上位会社",
        type: "company",
        value: project.company,
        tags: [{ label: "取引OK", tone: "success" }]
      },
      {
        label: "作業内容",
        type: "longText",
        lines: ["■業務内容", `${project.title} の詳細説明が入ります。`, `関連スキル：${project.tags.join("、")}`]
      },
      { label: "作業場所", value: project.locations.join(" / ") },
      { label: "スキル", type: "tags", tags: project.tags },
      { label: "上位金額", value: project.unitPrice },
      { label: "面談回数", value: project.interviewCount },
      { label: "案件作成日", value: project.createdAt }
    ]
  };
  const fields = orderDetailFields(detail.fields);

  const handleMemoSave = () => {
    onMemoSave(project.id, memoDraft);
    setIsEditingMemo(false);
  };

  return (
    <aside className="detail-pane">
      <div className="detail-toolbar">
        <div>
          <span className="detail-subtitle">案件の詳細（ID：{project.id}）</span>
        </div>
        <div className="detail-actions">
          <button className="outline-primary" onClick={() => onAddProposal(project)} type="button">
            ＋ {proposalIds.includes(project.id) ? "提案リスト追加済み" : "提案リストに追加"}
          </button>
          <button className="icon-button tooltip-target" onClick={() => onCopyUrl(project)} type="button" aria-label="案件URLをコピー">
            ⛓
            <span className="tooltip">案件URLをコピー</span>
          </button>
          <div className="relative">
            <button className={`icon-button bordered ${menuOpen ? "active" : ""}`} onClick={onMenuToggle} type="button" aria-label="案件操作">
              ⋯
            </button>
            {menuOpen ? (
              <div className="side-menu">
                <button onClick={() => onDetailAction("edit", project)} type="button">
                  編集
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
          </div>
          <button className="icon-button close-button" onClick={onClose} type="button" aria-label="閉じる">
            ×
          </button>
        </div>
      </div>

      <div className="detail-scroll">
        <div className="detail-title-row">
          <h2>{project.title}</h2>
          <Badge tone="outline">{project.status}</Badge>
        </div>
        <div className="memo-card">
          <strong>案件に関しての共有メモ</strong>
          {isEditingMemo ? (
            <input aria-label="共有メモ" onChange={(event) => setMemoDraft(event.target.value)} value={memoDraft} />
          ) : (
            <span>{detail.memo}</span>
          )}
          {isEditingMemo ? (
            <button onClick={handleMemoSave} type="button">
              保存
            </button>
          ) : (
            <button onClick={() => setIsEditingMemo(true)} type="button">
              メモを編集
            </button>
          )}
        </div>
        <section className="detail-section">
          {fields.map((field) => (
            <div className={`detail-grid-row ${field.type === "longText" ? "top-align long-row" : ""}`} key={field.label}>
              <span className="field-label">{field.label}</span>
              <DetailValue field={field} />
            </div>
          ))}
        </section>
      </div>
    </aside>
  );
}
