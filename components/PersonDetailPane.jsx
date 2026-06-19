import { useEffect } from "react";
import { Badge } from "./Badge";

function isEmpty(value) {
  return value === "-" || value === "未入力" || value === "" || value === null || value === undefined;
}

function ContactLine({ href, label, value }) {
  if (isEmpty(value)) return null;

  return (
    <span className="readonly-contact-line">
      <span>{label}</span>
      {href ? <a href={href}>{value}</a> : <strong>{value}</strong>}
    </span>
  );
}

const candidateReasonLabels = {
  company_name_exact: "会社名一致",
  company_name_variant: "会社名ゆれ一致",
  email_domain_match: "メールドメイン一致",
  contact_email_match: "担当者メール一致",
  contact_name_exact: "担当者名一致",
  contact_name_variant: "担当者名ゆれ一致"
};

function CandidateField({ label, value }) {
  if (isEmpty(value)) return null;

  return (
    <span className="readonly-candidate-field">
      <span>{label}</span>
      <strong>{value}</strong>
    </span>
  );
}

function CompanyContactCandidateList({ candidates = [] }) {
  return (
    <div className="readonly-candidate-panel">
      <div className="readonly-candidate-notice">
        <strong>会社/担当者候補（表示のみ）</strong>
        <span>DBには保存されません</span>
        <span>自動反映なし</span>
      </div>
      {!candidates.length ? (
        <p className="readonly-candidate-empty">候補なし</p>
      ) : (
        <div className="readonly-candidate-list">
          {candidates.map((candidate, candidateIndex) => {
            const company = candidate.company || {};
            const contact = candidate.contact || {};
            const contactTitle = [contact.department, contact.position].filter(Boolean).join(" / ");
            const candidateKey = [
              company.id || company.name || "company-none",
              contact.id || contact.email || contact.name || "contact-none",
              candidateIndex
            ].join("-");

            return (
              <div className="readonly-candidate-row" key={candidateKey}>
                <div className="readonly-candidate-main">
                  <span className="readonly-candidate-score">score {candidate.score}</span>
                  <strong className={isEmpty(company.name) ? "muted-value" : ""}>{company.name || "-"}</strong>
                  <span className="readonly-candidate-sub">取引: {company.tradeStatus || "-"}</span>
                  <CandidateField label="ドメイン" value={company.mainEmailDomain} />
                  <CandidateField label="TDB" value={company.tdbScore} />
                </div>
                <div className="readonly-candidate-contact">
                  <CandidateField label="担当者" value={contact.name} />
                  <CandidateField label="メール" value={contact.email} />
                  <CandidateField label="電話" value={contact.phone} />
                  <CandidateField label="部署/役職" value={contactTitle} />
                  {!candidate.contact ? <span className="readonly-candidate-sub">担当者なし</span> : null}
                </div>
                <div className="readonly-candidate-reasons" aria-label="候補理由">
                  {(candidate.reasonCodes || []).map((reasonCode) => (
                    <span key={`${candidateKey}-${reasonCode}`}>{candidateReasonLabels[reasonCode] || reasonCode}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
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

  if (item.type === "companyContacts") {
    const companyContacts = item.companyContacts || [];
    if (!companyContacts.length) return <p className="detail-block muted-value">-</p>;

    return (
      <div className="readonly-company-list">
        {companyContacts.map((entry, entryIndex) => {
          const company = entry.company || {};
          const contact = entry.contact || {};
          const contactTitle = [contact.department, contact.position].filter(Boolean).join(" / ");

          return (
            <div className="readonly-company-row" key={`${itemKeyPrefix}-company-contact-${entryIndex}-${entry.role}-${company.id || company.name || "none"}`}>
              <div className="readonly-company-main">
                <span className="readonly-company-role">
                  {entry.roleLabel || entry.role}
                  {entry.isPrimary ? <small>primary</small> : null}
                </span>
                <strong className={isEmpty(company.name) ? "muted-value" : ""}>{company.name || "-"}</strong>
                <span className="readonly-company-meta">取引: {company.tradeStatus || "-"}</span>
              </div>
              <div className="readonly-contact-lines">
                <ContactLine label="担当者" value={contact.name} />
                <ContactLine label="メール" href={contact.email ? `mailto:${contact.email}` : undefined} value={contact.email} />
                <ContactLine label="電話" href={contact.phone ? `tel:${contact.phone}` : undefined} value={contact.phone} />
                <ContactLine label="部署/役職" value={contactTitle} />
                {!entry.contact ? <span className="readonly-contact-empty">担当者 -</span> : null}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (item.type === "companyContactCandidates") {
    return <CompanyContactCandidateList candidates={item.companyContactCandidates || []} />;
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
                      <div className={`detail-item ${item.type === "block" || item.type === "tags" || item.type === "mail" || item.type === "companyContacts" || item.type === "companyContactCandidates" ? "detail-item-wide" : ""}`} key={itemKeyPrefix}>
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
