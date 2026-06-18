import { useEffect } from "react";
import { Badge } from "./Badge";

function isEmpty(value) {
  return value === "-" || value === "未入力" || value === "" || value === null || value === undefined;
}

function DetailItemValue({ item, itemKeyPrefix = "detail-item" }) {
  if (item.type === "block") {
    return <p className={`detail-block ${isEmpty(item.value) ? "muted-value" : ""}`}>{item.value || "-"}</p>;
  }

  if (item.type === "tags") {
    return (
      <div className="tag-flow wrap">
        {item.tags.map((tag, tagIndex) => (
          <Badge key={`${itemKeyPrefix}-tag-${tagIndex}-${tag}`}>{tag}</Badge>
        ))}
      </div>
    );
  }

  if (item.type === "mail") {
    return (
      <details className="mail-body-box">
        <summary>元メール本文を表示</summary>
        <p className={`detail-block ${isEmpty(item.value) ? "muted-value" : ""}`}>{item.value || "-"}</p>
      </details>
    );
  }

  return <strong className={`${item.emphasis ? "important-value" : ""} ${isEmpty(item.value) ? "muted-value" : ""}`}>{item.value || "-"}</strong>;
}

export default function PersonDetailPane({ canEdit = true, onClose, onMoveToUnclassified, person }) {
  useEffect(() => {
    if (!person) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, person]);

  if (!person) return null;

  const detail = person.detail || { groups: [], highlights: [], meta: [] };
  const groups = detail.groups || [];
  const highlights = detail.highlights || [];
  const meta = detail.meta || [];
  const personKey = person.dbId ?? person.id ?? "person";

  return (
    <div className="detail-drawer-backdrop" onClick={onClose}>
      <aside
        aria-labelledby="person-detail-title"
        aria-modal="true"
        className="detail-pane detail-drawer"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="detail-toolbar">
          <div>
            <span className="detail-subtitle">要員詳細</span>
          </div>
          <button className="icon-button close-button" onClick={onClose} type="button" aria-label="閉じる">
            ×
          </button>
        </div>

        <div className="detail-scroll">
          <section className="detail-hero">
            <div className="detail-title-row">
              <div>
                <span className="drawer-eyebrow">要員名</span>
                <h2 id="person-detail-title">{person.name}</h2>
              </div>
              <div className="detail-title-badges">
                {person.needsReview ? <Badge tone="danger">要確認</Badge> : null}
                <Badge tone="outline">{person.status}</Badge>
              </div>
            </div>
            <div className="detail-meta">
              {meta.map((item, metaIndex) => (
                <span key={`${personKey}-meta-${metaIndex}-${item.label}`}>
                  {item.label}: <strong>{item.value || "-"}</strong>
                </span>
              ))}
            </div>
            <div className="detail-action-row">
              {canEdit ? (
                <button className="outline-primary" onClick={() => onMoveToUnclassified?.(person)} type="button">
                  未分類へ移行
                </button>
              ) : null}
              <button className="ghost-button detail-close-action" onClick={onClose} type="button">
                閉じる
              </button>
            </div>
          </section>

          {highlights.length ? (
            <section className="detail-highlight-grid">
              {highlights.map((item, highlightIndex) => (
                <div className="detail-highlight" key={`${personKey}-highlight-${highlightIndex}-${item.label}`}>
                  <span>{item.label}</span>
                  <strong className={isEmpty(item.value) ? "muted-value" : ""}>{item.value || "-"}</strong>
                </div>
              ))}
            </section>
          ) : null}

          <div className="detail-groups">
            {groups.map((group, groupIndex) => (
              <section className="detail-group" key={`${personKey}-group-${groupIndex}-${group.title}`}>
                <h3>{group.title}</h3>
                <div className="detail-group-body">
                  {group.items.map((item, itemIndex) => {
                    const itemKeyPrefix = `${personKey}-group-${groupIndex}-item-${itemIndex}-${item.label}`;

                    return (
                      <div className={`detail-item ${item.type === "block" || item.type === "tags" || item.type === "mail" ? "detail-item-wide" : ""}`} key={itemKeyPrefix}>
                        <span className="field-label">{item.label}</span>
                        <DetailItemValue item={item} itemKeyPrefix={itemKeyPrefix} />
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
