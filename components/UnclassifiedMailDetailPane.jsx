import { useEffect, useState } from "react";
import { Badge } from "./Badge";

function isEmpty(value) {
  return value === "-" || value === "" || value === null || value === undefined;
}

export default function UnclassifiedMailDetailPane({ canEdit = true, isMoving, mail, onClose, onMoveToPerson, onMoveToProject }) {
  const [bodyOpen, setBodyOpen] = useState(true);

  useEffect(() => {
    setBodyOpen(true);
  }, [mail?.id]);

  useEffect(() => {
    if (!mail) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, mail]);

  if (!mail) return null;

  const fields = mail.detail?.fields || [];
  const body = fields.find((field) => field.label === "メール本文")?.value || mail.bodyText || "-";

  return (
    <div className="detail-drawer-backdrop" onClick={isMoving ? undefined : onClose}>
      <aside
        aria-labelledby="unclassified-mail-title"
        aria-modal="true"
        className="detail-pane detail-drawer"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="detail-toolbar">
          <div>
            <span className="detail-subtitle">未分類メール詳細</span>
          </div>
          <div className="detail-actions">
            <button className="icon-button close-button" disabled={isMoving} onClick={onClose} type="button" aria-label="閉じる">
              ×
            </button>
          </div>
        </div>

        <div className="detail-scroll">
          <section className="detail-hero">
            <div className="detail-title-row">
              <div>
                <span className="drawer-eyebrow">件名</span>
                <h2 id="unclassified-mail-title">{mail.subject}</h2>
              </div>
              <div className="detail-title-badges">
                {mail.needsReview ? <Badge tone="danger">要確認</Badge> : null}
                <Badge tone="outline">{mail.classification}</Badge>
              </div>
            </div>
            <div className="detail-meta">
              {(mail.detail?.meta || []).map((item) => (
                <span key={item.label}>
                  {item.label}: <strong>{item.value || "-"}</strong>
                </span>
              ))}
            </div>
            <div className="detail-action-row">
              {canEdit ? (
                <>
                  <button className="outline-primary detail-primary" disabled={isMoving} onClick={() => onMoveToProject(mail)} type="button">
                    案件として扱う
                  </button>
                  <button className="outline-primary" disabled={isMoving} onClick={() => onMoveToPerson(mail)} type="button">
                    要員として扱う
                  </button>
                </>
              ) : null}
              <button className="ghost-button detail-close-action" disabled={isMoving} onClick={onClose} type="button">
                閉じる
              </button>
            </div>
          </section>

          <div className="detail-groups">
            <section className="detail-group">
              <h3>送付元</h3>
              <div className="detail-group-body">
                {fields
                  .filter((field) => field.label !== "元メール")
                  .map((field) => (
                    <div className="detail-item" key={field.label}>
                      <span className="field-label">{field.label}</span>
                      <strong className={isEmpty(field.value) ? "muted-value" : ""}>{field.value || "-"}</strong>
                    </div>
                  ))}
              </div>
            </section>

            <section className="detail-group">
              <h3>元メール</h3>
              <div className="detail-group-body">
                <div className="detail-item detail-item-wide">
                  <details className="mail-body-box" open={bodyOpen} onToggle={(event) => setBodyOpen(event.currentTarget.open)}>
                    <summary>元メール本文を表示</summary>
                    <p className={`detail-block ${isEmpty(body) ? "muted-value" : ""}`}>{body || "-"}</p>
                  </details>
                </div>
              </div>
            </section>
          </div>
        </div>
      </aside>
    </div>
  );
}
