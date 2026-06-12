"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReviewQueuePanel,
  SavedSuggestionsPanel,
} from "../../components/matching/MatchSuggestionPanels";

const STATUS_OPTIONS = ["", "SUGGESTED", "NEEDS_REVIEW", "APPROVED", "REJECTED", "ARCHIVED"];
const SORT_OPTIONS = ["createdAt", "updatedAt", "score", "lastReviewedAt"];
const REJECT_REASONS = [
  "SKILL_MISMATCH",
  "RATE_MISMATCH",
  "AVAILABILITY_MISMATCH",
  "LOCATION_MISMATCH",
  "CONTRACT_CONDITION_MISMATCH",
  "DUPLICATE",
  "STALE_INFORMATION",
  "INSUFFICIENT_EVIDENCE",
  "BUSINESS_PRIORITY_LOW",
  "DO_NOT_CONTACT",
];
const REOPEN_REASONS = [
  "SOURCE_UPDATED",
  "MATCHING_RULE_UPDATED",
  "HUMAN_RECONSIDERATION",
  "DUPLICATE_RESOLVED",
  "STALE_RESOLVED",
];

const initialSaveDraft = {
  projectId: "",
  personId: "",
  suggestionPairKey: "",
  suggestionRevisionKey: "",
  score: "",
  scoreBand: "REVIEW",
  systemReasonCodes: "MANUAL_SOURCE_SIGNAL",
  systemWarningCodes: "",
  warningSeverity: "NONE",
  stalenessState: "UNKNOWN",
  duplicateState: "NONE",
  sourceEvidenceState: "OPTIONAL_MISSING",
  sourceRecordId: "",
  safeSummary: "",
};

export default function MatchesPage() {
  const [tenantId, setTenantId] = useState("default");
  const [status, setStatus] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [list, setList] = useState({ items: [], pageInfo: null });
  const [queue, setQueue] = useState({ items: [], pageInfo: null });
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saveDraft, setSaveDraft] = useState(initialSaveDraft);
  const [decisionReason, setDecisionReason] = useState(REJECT_REASONS[0]);
  const [reopenReason, setReopenReason] = useState(REOPEN_REASONS[0]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      tenantId,
      page: String(page),
      pageSize: String(pageSize),
      sortBy,
      sortOrder,
    });
    if (status) params.set("status", status);
    return params.toString();
  }, [page, pageSize, sortBy, sortOrder, status, tenantId]);

  const loadData = useCallback(async () => {
    if (!tenantId.trim()) return;
    setIsLoading(true);
    setError("");
    try {
      const [listResponse, queueResponse] = await Promise.all([
        fetch(`/api/matches/suggestions?${queryString}`, { cache: "no-store" }),
        fetch(`/api/matches/suggestions/review-queue?tenantId=${encodeURIComponent(tenantId)}&page=1&pageSize=20`, { cache: "no-store" }),
      ]);
      const listBody = await listResponse.json().catch(() => ({}));
      const queueBody = await queueResponse.json().catch(() => ({}));
      if (!listResponse.ok) throw new Error(listBody.message || "Failed to load saved suggestions");
      if (!queueResponse.ok) throw new Error(queueBody.message || "Failed to load review queue");
      setList(listBody);
      setQueue(queueBody);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to load match suggestions");
    } finally {
      setIsLoading(false);
    }
  }, [queryString, tenantId]);

  const loadDetail = useCallback(async (id) => {
    if (!id) {
      setDetail(null);
      return;
    }
    setError("");
    try {
      const response = await fetch(`/api/matches/suggestions/${id}?tenantId=${encodeURIComponent(tenantId)}`, { cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || "Failed to load suggestion detail");
      setDetail(body.item);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to load suggestion detail");
    }
  }, [tenantId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadDetail(selectedId);
  }, [loadDetail, selectedId]);

  async function handleSave(event) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setNotice("");
    try {
      const payload = buildSavePayload(saveDraft);
      payload.confirmationToken = await createConfirmationToken(payload);
      const response = await fetch(`/api/matches/suggestions?tenantId=${encodeURIComponent(tenantId)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || "Failed to save suggestion");
      setNotice(body.duplicate ? "Duplicate suggestion found; existing record returned." : "Suggestion saved.");
      setSelectedId(body.item?.id || "");
      setSaveDraft(initialSaveDraft);
      await loadData();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to save suggestion");
    } finally {
      setIsSaving(false);
    }
  }

  async function runMutation(path, method, body) {
    if (!detail) return;
    setError("");
    setNotice("");
    const response = await fetch(`/api/matches/suggestions/${detail.id}/${path}?tenantId=${encodeURIComponent(tenantId)}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "If-Match": String(detail.lockVersion),
      },
      body: JSON.stringify({ ...body, lockVersion: detail.lockVersion }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || "Mutation failed");
    setDetail(result.item);
    setNotice("Review action saved.");
    await loadData();
  }

  async function handleReviewAction(action) {
    try {
      if (action === "approve") {
        await runMutation("decision", "PATCH", { action: "approve" });
      } else if (action === "reject") {
        await runMutation("decision", "PATCH", { action: "reject", reasonCode: decisionReason });
      } else if (action === "archive") {
        await runMutation("archive", "PATCH", {});
      } else if (action === "reopen") {
        await runMutation("reopen", "POST", { reasonCode: reopenReason });
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Review action failed");
    }
  }

  return (
    <main className="matches-app">
      <header className="matches-header">
        <div>
          <span className="matches-eyebrow">SES Console</span>
          <h1>Match suggestions</h1>
        </div>
        <label className="matches-tenant">
          <span>Tenant</span>
          <input value={tenantId} onChange={(event) => setTenantId(event.target.value)} />
        </label>
      </header>

      {notice ? <div className="matches-notice">{notice}</div> : null}
      {error ? <div className="matches-error">{error}</div> : null}

      <section className="matches-layout">
        <div className="matches-main-column">
          <form className="matches-filterbar" onSubmit={(event) => event.preventDefault()}>
            <label>
              <span>Status</span>
              <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
                {STATUS_OPTIONS.map((option) => <option key={option || "all"} value={option}>{option || "ALL"}</option>)}
              </select>
            </label>
            <label>
              <span>Sort</span>
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                {SORT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            <label>
              <span>Order</span>
              <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
                <option value="desc">desc</option>
                <option value="asc">asc</option>
              </select>
            </label>
            <label>
              <span>Page size</span>
              <input type="number" min="1" max="100" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value) || 20)} />
            </label>
            <button className="primary-button" onClick={loadData} type="button" disabled={isLoading}>Reload</button>
          </form>

          {isLoading ? <div className="matches-loading">Loading saved suggestions...</div> : null}

          <SavedSuggestionsPanel
            items={list.items || []}
            pageInfo={list.pageInfo}
            onSelect={(id) => setSelectedId(id)}
          />
          <div className="matches-pagination">
            <button type="button" disabled={!list.pageInfo?.hasPreviousPage} onClick={() => setPage((current) => Math.max(1, current - 1))}>Prev</button>
            <span>{list.pageInfo ? `${list.pageInfo.page} / ${Math.max(list.pageInfo.totalPages, 1)}` : "1 / 1"}</span>
            <button type="button" disabled={!list.pageInfo?.hasNextPage} onClick={() => setPage((current) => current + 1)}>Next</button>
          </div>

          <ReviewQueuePanel items={queue.items || []} onSelect={(id) => setSelectedId(id)} />
        </div>

        <aside className="matches-side-column">
          <SaveSuggestionForm draft={saveDraft} isSaving={isSaving} onChange={setSaveDraft} onSubmit={handleSave} />
          <SuggestionDetail
            detail={detail}
            decisionReason={decisionReason}
            reopenReason={reopenReason}
            onDecisionReasonChange={setDecisionReason}
            onReopenReasonChange={setReopenReason}
            onReviewAction={handleReviewAction}
          />
        </aside>
      </section>
    </main>
  );
}

function SaveSuggestionForm({ draft, isSaving, onChange, onSubmit }) {
  const update = (key, value) => onChange((current) => ({ ...current, [key]: value }));

  return (
    <section className="matches-card">
      <h2>Supervised save</h2>
      <form className="matches-save-form" onSubmit={onSubmit}>
        <label><span>Project ID</span><input required value={draft.projectId} onChange={(event) => update("projectId", event.target.value)} /></label>
        <label><span>Person ID</span><input required value={draft.personId} onChange={(event) => update("personId", event.target.value)} /></label>
        <label><span>Pair key</span><input required value={draft.suggestionPairKey} onChange={(event) => update("suggestionPairKey", event.target.value)} /></label>
        <label><span>Revision key</span><input required value={draft.suggestionRevisionKey} onChange={(event) => update("suggestionRevisionKey", event.target.value)} /></label>
        <label><span>Score</span><input value={draft.score} onChange={(event) => update("score", event.target.value)} /></label>
        <label><span>Score band</span><input value={draft.scoreBand} onChange={(event) => update("scoreBand", event.target.value)} /></label>
        <label><span>Reason codes</span><input value={draft.systemReasonCodes} onChange={(event) => update("systemReasonCodes", event.target.value)} /></label>
        <label><span>Warning codes</span><input value={draft.systemWarningCodes} onChange={(event) => update("systemWarningCodes", event.target.value)} /></label>
        <label><span>Warning severity</span><select value={draft.warningSeverity} onChange={(event) => update("warningSeverity", event.target.value)}><option>NONE</option><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option></select></label>
        <label><span>Source record ID</span><input value={draft.sourceRecordId} onChange={(event) => update("sourceRecordId", event.target.value)} /></label>
        <label className="wide"><span>Safe summary</span><textarea value={draft.safeSummary} onChange={(event) => update("safeSummary", event.target.value)} /></label>
        <button className="primary-button" disabled={isSaving} type="submit">{isSaving ? "Saving..." : "Save selected candidate"}</button>
      </form>
    </section>
  );
}

function SuggestionDetail({ detail, decisionReason, reopenReason, onDecisionReasonChange, onReopenReasonChange, onReviewAction }) {
  if (!detail) {
    return <section className="matches-card"><h2>Detail</h2><p className="matches-muted">Select a suggestion.</p></section>;
  }

  return (
    <section className="matches-card">
      <h2>Detail</h2>
      <dl className="matches-detail-list">
        <dt>ID</dt><dd>{detail.id}</dd>
        <dt>Status</dt><dd>{detail.status}</dd>
        <dt>Readiness</dt><dd>{detail.downstreamReadiness}</dd>
        <dt>Project ref</dt><dd>{detail.projectRef?.id}</dd>
        <dt>Person ref</dt><dd>{detail.personRef?.id}</dd>
        <dt>Lock version</dt><dd>{detail.lockVersion}</dd>
        <dt>Warnings</dt><dd>{detail.systemWarningCodes?.join(", ") || "-"}</dd>
        <dt>Blockers</dt><dd>{detail.promotionBlockers?.join(", ") || "-"}</dd>
      </dl>

      <div className="matches-action-row">
        <button type="button" className="primary-button" onClick={() => onReviewAction("approve")} disabled={!["SUGGESTED", "NEEDS_REVIEW"].includes(detail.status)}>Approve</button>
        <select value={decisionReason} onChange={(event) => onDecisionReasonChange(event.target.value)}>
          {REJECT_REASONS.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
        </select>
        <button type="button" className="outline-button" onClick={() => onReviewAction("reject")} disabled={!["SUGGESTED", "NEEDS_REVIEW"].includes(detail.status)}>Reject</button>
        <button type="button" className="outline-button" onClick={() => onReviewAction("archive")} disabled={detail.status === "ARCHIVED"}>Archive</button>
      </div>
      <div className="matches-action-row">
        <select value={reopenReason} onChange={(event) => onReopenReasonChange(event.target.value)}>
          {REOPEN_REASONS.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
        </select>
        <button type="button" className="outline-button" onClick={() => onReviewAction("reopen")} disabled={!["REJECTED", "ARCHIVED"].includes(detail.status)}>Reopen</button>
      </div>

      <h3>Review events</h3>
      <ul className="matches-event-list">
        {(detail.reviewEvents || []).map((event) => (
          <li key={event.id}>{event.eventType}: {event.fromStatus || "-"} to {event.toStatus || "-"} {event.reasonCode ? `(${event.reasonCode})` : ""}</li>
        ))}
      </ul>
    </section>
  );
}

function buildSavePayload(draft) {
  const sourceRecords = draft.sourceRecordId.trim()
    ? [{
        sourceType: "MANUAL",
        sourceRecordId: draft.sourceRecordId.trim(),
        evidenceRole: "OPTIONAL",
        safeSummary: draft.safeSummary.trim() || null,
      }]
    : [];

  return {
    projectId: draft.projectId.trim(),
    personId: draft.personId.trim(),
    suggestionPairKey: draft.suggestionPairKey.trim(),
    suggestionRevisionKey: draft.suggestionRevisionKey.trim(),
    score: draft.score.trim() || null,
    scoreBand: draft.scoreBand.trim() || null,
    systemReasonCodes: splitCodes(draft.systemReasonCodes),
    systemWarningCodes: splitCodes(draft.systemWarningCodes),
    warningSeverity: draft.warningSeverity,
    stalenessState: draft.stalenessState,
    duplicateState: draft.duplicateState,
    sourceEvidenceState: draft.sourceEvidenceState,
    scoringVersion: "manual-v1",
    taxonomyVersion: "match-taxonomy-v1",
    redactionPolicyVersion: "redaction-v1",
    sourceRecords,
  };
}

function splitCodes(value) {
  return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
}

async function createConfirmationToken(payload) {
  const input = buildSavePayloadFingerprintInput(payload);
  const hash = await sha256(stableStringify(input));
  return `confirm:${hash.slice(0, 20)}`;
}

function buildSavePayloadFingerprintInput(payload) {
  return {
    organizationId: payload.organizationId || null,
    projectId: payload.projectId,
    personId: payload.personId,
    suggestionPairKey: payload.suggestionPairKey,
    suggestionRevisionKey: payload.suggestionRevisionKey,
    score: normalizeScoreForFingerprint(payload.score),
    scoreBand: payload.scoreBand || null,
    systemReasonCodes: [...(payload.systemReasonCodes || [])].sort(),
    systemWarningCodes: [...(payload.systemWarningCodes || [])].sort(),
    warningSeverity: payload.warningSeverity || "NONE",
    stalenessState: payload.stalenessState || "UNKNOWN",
    duplicateState: payload.duplicateState || "NONE",
    sourceEvidenceState: payload.sourceEvidenceState || "NONE",
    attentionState: payload.attentionState || "NORMAL",
    promotionBlockers: [...(payload.promotionBlockers || [])].sort(),
    scoringVersion: payload.scoringVersion || "manual-v1",
    taxonomyVersion: payload.taxonomyVersion || "match-taxonomy-v1",
    redactionPolicyVersion: payload.redactionPolicyVersion || "redaction-v1",
    sourceRecords: payload.sourceRecords || [],
  };
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => `${JSON.stringify(key)}:${stableStringify(child)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function normalizeScoreForFingerprint(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return String(value);
  return (Math.round(parsed * 10000) / 10000).toFixed(4);
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
