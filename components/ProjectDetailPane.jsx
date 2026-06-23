import { useEffect, useMemo, useState } from "react";
import { Badge } from "./Badge";
import {
  buildProjectCompanyContactRoleLinkPayload,
  getProjectCompanyContactRoleLinkGate,
  PROJECT_COMPANY_CONTACT_ROLE_LINK_CONFIRMATION_LABEL,
  PROJECT_COMPANY_CONTACT_ROLE_LINK_DEFAULT_REASON_CODE,
  PROJECT_COMPANY_CONTACT_ROLE_LINK_REASON_OPTIONS,
  PROJECT_COMPANY_CONTACT_ROLE_LINK_ROLE_OPTIONS
} from "../lib/project-company-contact-role-link-ui";

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

function LazyMailBody({ header = "", mailDbId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [body, setBody] = useState("");
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    setIsOpen(false);
    setBody("");
    setStatus("idle");
  }, [mailDbId]);

  const handleToggle = async (event) => {
    const nextOpen = event.currentTarget.open;
    setIsOpen(nextOpen);
    if (!nextOpen || !mailDbId || status === "loaded" || status === "loading") return;

    setStatus("loading");
    try {
      const response = await fetch(`/api/mail-notifications/${encodeURIComponent(mailDbId)}/body`, { cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setBody(result?.message || "Failed to load mail body");
        setStatus("error");
        return;
      }
      setBody(result?.bodyText || "-");
      setStatus("loaded");
    } catch (error) {
      setBody(error instanceof Error ? error.message : "Failed to load mail body");
      setStatus("error");
    }
  };

  const text = [header, isOpen ? (status === "loading" ? "Loading..." : body) : ""].filter(Boolean).join("\n\n");

  return (
    <details className="mail-body-box" onToggle={handleToggle}>
      <summary>元メール本文を表示</summary>
      <p className={`detail-block ${isEmpty(text) ? "muted-value" : ""}`}>{text || "-"}</p>
    </details>
  );
}

function DetailItemValue({
  currentUserRole,
  item,
  itemKeyPrefix = "detail-item",
  onCompanyContactRoleLinked,
  project,
  projectCompanyContactRoleLinkWriteAllowed
}) {
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

  if (item.type === "commerce") {
    return (
      <div className="commerce-detail">
        {item.items.map(([label, value], itemIndex) => (
          <div key={`${itemKeyPrefix}-commerce-${itemIndex}-${label}-${value}`}>
            <span>{label}</span>
            <strong className={isEmpty(value) ? "muted-value" : ""}>{value}</strong>
          </div>
        ))}
      </div>
    );
  }

  if (item.type === "mail") {
    return <LazyMailBody header={item.value} mailDbId={item.mailDbId} />;
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
    const candidates = item.companyContactCandidates || [];
    return (
      <ProjectCompanyContactCandidateSection
        currentUserRole={currentUserRole}
        initialCandidates={candidates}
        onCompanyContactRoleLinked={onCompanyContactRoleLinked}
        project={project}
        projectCompanyContactRoleLinkWriteAllowed={projectCompanyContactRoleLinkWriteAllowed}
      />
    );
  }

  return <strong className={`${item.emphasis ? "important-value" : ""} ${isEmpty(item.value) ? "muted-value" : ""}`}>{item.value || "-"}</strong>;
}

function ProjectCompanyContactCandidateSection({
  currentUserRole,
  initialCandidates = [],
  onCompanyContactRoleLinked,
  project,
  projectCompanyContactRoleLinkWriteAllowed
}) {
  const [candidates, setCandidates] = useState(initialCandidates);
  const [status, setStatus] = useState(initialCandidates.length ? "loaded" : "idle");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let ignore = false;
    const projectId = project?.dbId;
    setCandidates(initialCandidates);
    setNotice("");
    if (!projectId) {
      setStatus(initialCandidates.length ? "loaded" : "idle");
      return undefined;
    }

    setStatus("loading");
    async function loadCandidates() {
      try {
        const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/company-contact-candidates`, {
          cache: "no-store"
        });
        const result = await response.json().catch(() => ({}));
        if (ignore) return;
        if (!response.ok) {
          setNotice(result?.message || "Failed to load candidates");
          setStatus("error");
          return;
        }
        setCandidates(Array.isArray(result?.candidates) ? result.candidates : []);
        setStatus("loaded");
      } catch (error) {
        if (ignore) return;
        setNotice(error instanceof Error ? error.message : "Failed to load candidates");
        setStatus("error");
      }
    }

    loadCandidates();
    return () => {
      ignore = true;
    };
  }, [initialCandidates, project?.dbId]);

  return (
    <>
      {status === "loading" ? <p className="readonly-candidate-empty">Loading candidates...</p> : null}
      {notice ? <p className="person-owner-link-notice" role="status">{notice}</p> : null}
      <CompanyContactCandidateList candidates={candidates} />
      <ProjectCompanyContactRoleLinkPanel
        candidates={candidates}
        currentUserRole={currentUserRole}
        onCompanyContactRoleLinked={onCompanyContactRoleLinked}
        project={project}
        projectCompanyContactRoleLinkWriteAllowed={projectCompanyContactRoleLinkWriteAllowed}
      />
    </>
  );
}

function candidateTitle(candidate) {
  const company = candidate.company || {};
  const contact = candidate.contact || {};
  return [company.name, contact.name].filter(Boolean).join(" / ") || "候補";
}

function projectLinkErrorMessage(status, result) {
  const reason = result?.reasonCode ? ` (${result.reasonCode})` : "";
  if (status === 409 || result?.status === "manual-review") {
    return `手動確認が必要です。最新状態を確認してから再実行してください${reason}`;
  }
  if (status === 403 || result?.status === "disabled") {
    return `この環境または権限ではリンクできません${reason}`;
  }
  return result?.message ? `${result.message}${reason}` : `リンクに失敗しました${reason}`;
}

function ProjectCompanyContactRoleLinkPanel({
  candidates,
  currentUserRole,
  onCompanyContactRoleLinked,
  project,
  projectCompanyContactRoleLinkWriteAllowed
}) {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedReasonCode, setSelectedReasonCode] = useState(PROJECT_COMPANY_CONTACT_ROLE_LINK_DEFAULT_REASON_CODE);
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setSelectedIndex(null);
    setSelectedRole("");
    setSelectedReasonCode(PROJECT_COMPANY_CONTACT_ROLE_LINK_DEFAULT_REASON_CODE);
    setConfirmed(false);
    setNotice("");
  }, [project?.dbId]);

  const rows = useMemo(() => {
    return candidates
      .map((candidate, index) => ({
        candidate,
        gate: getProjectCompanyContactRoleLinkGate({
          candidate,
          currentUserRole,
          project,
          projectCompanyContactRoleLinkWriteAllowed
        }),
        index
      }))
      .filter((row) => row.gate.visible);
  }, [candidates, currentUserRole, project, projectCompanyContactRoleLinkWriteAllowed]);

  if (!candidates.length || !rows.length) return null;

  const selectedRow = rows.find((row) => row.index === selectedIndex) || null;
  const selectedGate = selectedRow
    ? getProjectCompanyContactRoleLinkGate({
      candidate: selectedRow.candidate,
      currentUserRole,
      project,
      projectCompanyContactRoleLinkWriteAllowed,
      role: selectedRole || undefined
    })
    : null;
  const canSubmit = Boolean(selectedRow && selectedRole && selectedReasonCode && selectedGate?.enabled && confirmed && !isSubmitting);

  const openConfirmation = (row) => {
    if (!row.gate.enabled) return;
    setSelectedIndex(row.index);
    setSelectedRole("");
    setSelectedReasonCode(PROJECT_COMPANY_CONTACT_ROLE_LINK_DEFAULT_REASON_CODE);
    setConfirmed(false);
    setNotice("");
  };

  const handleRoleChange = (event) => {
    setSelectedRole(event.target.value);
    setConfirmed(false);
  };

  const handleReasonCodeChange = (event) => {
    setSelectedReasonCode(event.target.value);
    setConfirmed(false);
  };

  const submitLink = async () => {
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    setNotice("");
    try {
      const payload = buildProjectCompanyContactRoleLinkPayload(
        project,
        selectedRow.candidate,
        selectedRole,
        selectedReasonCode
      );
      const response = await fetch(`/api/projects/${encodeURIComponent(project.dbId)}/company-contact-role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || result?.status === "manual-review" || result?.status === "disabled" || result?.status === "error") {
        setNotice(projectLinkErrorMessage(response.status, result));
        return;
      }

      setNotice("リンクを保存しました。最新データを再取得しています。");
      await onCompanyContactRoleLinked?.(project.dbId, result);
      setSelectedIndex(null);
      setSelectedRole("");
      setSelectedReasonCode(PROJECT_COMPANY_CONTACT_ROLE_LINK_DEFAULT_REASON_CODE);
      setConfirmed(false);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "リンクに失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="person-owner-link-panel">
      <div className="person-owner-link-heading">
        <strong>既存会社・既存担当者にリンク</strong>
        <span>新規作成や上書きは行いません</span>
      </div>
      <div className="person-owner-link-candidates">
        {rows.map((row) => (
          <div className="person-owner-link-row" key={`project-company-contact-role-link-${row.index}-${candidateTitle(row.candidate)}`}>
            <div>
              <strong>{candidateTitle(row.candidate)}</strong>
              <span>
                Company ID: {row.candidate.company?.id || "-"} / Contact ID: {row.candidate.contact?.id || "-"}
              </span>
              {!row.gate.enabled ? <em>{row.gate.reason}</em> : null}
            </div>
            <button
              className="outline-primary"
              disabled={!row.gate.enabled || isSubmitting}
              onClick={() => openConfirmation(row)}
              type="button"
            >
              リンク確認へ
            </button>
          </div>
        ))}
      </div>

      {selectedRow ? (
        <div className="person-owner-link-confirmation" role="group" aria-label="案件の既存会社・既存担当者リンク確認">
          <strong>{candidateTitle(selectedRow.candidate)}</strong>
          <label className="person-owner-link-check">
            <span>ロール</span>
            <select disabled={isSubmitting} onChange={handleRoleChange} value={selectedRole}>
              <option value="">選択してください</option>
              {PROJECT_COMPANY_CONTACT_ROLE_LINK_ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="person-owner-link-check">
            <span>理由コード</span>
            <select disabled={isSubmitting} onChange={handleReasonCodeChange} value={selectedReasonCode}>
              {PROJECT_COMPANY_CONTACT_ROLE_LINK_REASON_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <ul>
            <li>既存会社・既存担当者を案件ロールにリンクするだけです。</li>
            <li>新規会社・新規担当者は作成しません。</li>
            <li>既存ロールは上書きしません。</li>
            <li>元メール本文や自由メモは送信しません。</li>
          </ul>
          {selectedRole && !selectedGate?.enabled ? <p className="person-owner-link-notice" role="status">{selectedGate?.reason}</p> : null}
          <label className="person-owner-link-check">
            <input
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              type="checkbox"
            />
            <span>{PROJECT_COMPANY_CONTACT_ROLE_LINK_CONFIRMATION_LABEL}</span>
          </label>
          <div className="person-owner-link-actions">
            <button className="ghost-button" disabled={isSubmitting} onClick={() => setSelectedIndex(null)} type="button">
              キャンセル
            </button>
            <button className="primary-button" disabled={!canSubmit} onClick={submitLink} type="button">
              {isSubmitting ? "リンク中..." : "確定してリンク"}
            </button>
          </div>
        </div>
      ) : null}

      {notice ? <p className="person-owner-link-notice" role="status">{notice}</p> : null}
    </div>
  );
}

export default function ProjectDetailPane({
  canEdit = true,
  currentUserRole,
  onAddProposal,
  onClose,
  onCompanyContactRoleLinked,
  onCopyUrl,
  onDetailAction,
  project,
  projectCompanyContactRoleLinkWriteAllowed = false
}) {
  useEffect(() => {
    if (!project) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, project]);

  if (!project) return null;

  const detail = project.detail || { groups: [], highlights: [], meta: [] };
  const groups = detail.groups || [];
  const highlights = detail.highlights || [];
  const meta = detail.meta || [];
  const projectKey = project.dbId ?? project.id ?? "project";

  const handleAction = (action) => {
    console.log(`project detail action: ${action}`, project?.id || project?.dbId || "");
    if (action === "copy") {
      onCopyUrl(project);
      return;
    }
    if (action === "proposal") {
      onAddProposal(project);
      return;
    }
    onDetailAction(action, project);
  };

  return (
    <div className="detail-drawer-backdrop" onClick={onClose}>
      <aside
        aria-labelledby="project-detail-title"
        aria-modal="true"
        className="detail-pane detail-drawer"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="detail-toolbar">
          <div>
            <span className="detail-subtitle">案件詳細</span>
          </div>
          <div className="detail-actions">
            <button className="icon-button close-button" onClick={onClose} type="button" aria-label="閉じる">
              ×
            </button>
          </div>
        </div>

        <div className="detail-scroll">
          <section className="detail-hero">
            <div className="detail-title-row">
              <div>
                <span className="drawer-eyebrow">案件名</span>
                <h2 id="project-detail-title">{project.title}</h2>
              </div>
              <div className="detail-title-badges">
                {project.needsReview ? <Badge tone="danger">要確認</Badge> : null}
                <Badge tone="outline">{project.status}</Badge>
              </div>
            </div>
            <div className="detail-meta">
              {meta.map((item, metaIndex) => (
                <span key={`${projectKey}-meta-${metaIndex}-${item.label}`}>
                  {item.label}: <strong>{item.value || "-"}</strong>
                </span>
              ))}
            </div>
            <div className="detail-action-row">
              {canEdit ? (
                <button className="outline-primary" onClick={() => handleAction("edit")} type="button">
                  編集
                </button>
              ) : null}
              <button className="outline-button" onClick={() => handleAction("copy")} type="button">
                コピー
              </button>
              {canEdit ? (
                <>
                  <button className="outline-button" onClick={() => handleAction("archive")} type="button">
                    アーカイブ
                  </button>
                  <button
                    aria-label="提案開始（未実装）"
                    className="outline-button proposal-unavailable-button"
                    onClick={() => handleAction("proposal")}
                    title="提案開始は未実装です。DB登録は行われません。"
                    type="button"
                  >
                    <span>提案開始</span>
                    <span className="proposal-unavailable-pill">未実装</span>
                  </button>
                  <button className="outline-primary" onClick={() => handleAction("unclassify")} type="button">
                    未分類へ移行
                  </button>
                </>
              ) : null}
              <button className="ghost-button detail-close-action" onClick={onClose} type="button">
                閉じる
              </button>
            </div>
          </section>

          {highlights.length ? (
            <section className="detail-highlight-grid">
              {highlights.map((item, highlightIndex) => (
                <div className="detail-highlight" key={`${projectKey}-highlight-${highlightIndex}-${item.label}`}>
                  <span>{item.label}</span>
                  <strong className={isEmpty(item.value) ? "muted-value" : ""}>{item.value || "-"}</strong>
                </div>
              ))}
            </section>
          ) : null}

          <div className="detail-groups">
            {groups.map((group, groupIndex) => (
              <section className="detail-group" key={`${projectKey}-group-${groupIndex}-${group.title}`}>
                <h3>{group.title}</h3>
                <div className="detail-group-body">
                  {group.items.map((item, itemIndex) => {
                    const itemKeyPrefix = `${projectKey}-group-${groupIndex}-item-${itemIndex}-${item.label}`;

                    return (
                      <div className={`detail-item ${item.type === "block" || item.type === "tags" || item.type === "commerce" || item.type === "mail" || item.type === "companyContacts" || item.type === "companyContactCandidates" ? "detail-item-wide" : ""}`} key={itemKeyPrefix}>
                        <span className="field-label">{item.label}</span>
                        <DetailItemValue
                          currentUserRole={currentUserRole}
                          item={item}
                          itemKeyPrefix={itemKeyPrefix}
                          onCompanyContactRoleLinked={onCompanyContactRoleLinked}
                          project={project}
                          projectCompanyContactRoleLinkWriteAllowed={projectCompanyContactRoleLinkWriteAllowed}
                        />
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
