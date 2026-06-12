"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  buildSavedSuggestionQuery,
  buildMatchSuggestionReviewUpdateBody,
  buildMatchSuggestionSaveBody,
  countLabel as safeCountLabel,
  getMatchSuggestionReviewActionOptions,
  interpretMatchSuggestionSaveResponse,
  isMatchSuggestionReviewUiEnabled,
  isSafeUuid,
  isMatchSuggestionSaveUiEnabled,
  MATCH_SUGGESTION_REVIEW_REASON_CODES,
  requestMatchSuggestionReviewUpdate,
  safeJsonText,
  sanitizeSuggestionUiValue,
  shortDate as safeShortDate,
} from "../lib/match-suggestion-ui-safe";
import LoginPanel from "./LoginPanel";

const defaultResponse = {
  summary: {
    scannedProjects: 0,
    scannedPersons: 0,
    candidatePairs: 0,
    displayed: 0,
    totalCandidates: 0,
    scoreDistribution: { HIGH: 0, MEDIUM: 0, LOW: 0, REVIEW: 0 },
    filteredScoreDistribution: { HIGH: 0, MEDIUM: 0, LOW: 0, REVIEW: 0 },
    warningCounts: {},
    reviewReasonCounts: {},
    dataSource: "synthetic-fixture-no-db",
  },
  filters: { minScore: 0 },
  sort: "score-desc",
  totalPages: 1,
  items: [],
};
const defaultSavedResponse = {
  items: [],
  page: 1,
  limit: 20,
  maxLimit: 100,
  migrationRequired: false,
  readOnly: true,
  summary: { displayed: 0, total: 0, readOnly: true, piiSafe: true },
  total: 0,
  totalPages: 1,
};

const scoreBandOptions = ["", "HIGH", "MEDIUM", "LOW", "REVIEW"];
const compatibilityOptions = ["", "match", "mismatch", "unknown"];
const booleanOptions = ["", "true", "false"];
const sortOptions = ["score-desc", "score-asc", "review-first", "newest"];
const savedStatusOptions = ["", "SUGGESTED", "NEEDS_REVIEW", "APPROVED", "REJECTED", "ARCHIVED"];
const savedScoreBandOptions = ["", "HIGH", "MEDIUM", "LOW", "REVIEW"];
const attentionStateOptions = ["", "HIGH_SCORE", "NEEDS_REVIEW", "WARNING"];
const savedSortOptions = ["newest", "score-desc", "score-asc"];
const savedLimitOptions = ["20", "50", "100"];
const saveUiEnabled = isMatchSuggestionSaveUiEnabled(process.env.NEXT_PUBLIC_MATCH_SUGGESTION_SAVE_UI_ENABLED);
const reviewUiEnabled = isMatchSuggestionReviewUiEnabled(process.env.NEXT_PUBLIC_MATCH_SUGGESTION_REVIEW_UI_ENABLED);

const scoreBandHelp = [
  ["HIGH", "75+; strong deterministic fit"],
  ["MEDIUM", "55-74; worth checking"],
  ["LOW", "35-54; weak but visible"],
  ["REVIEW", "Needs human review or low coverage"],
];
const compatibilityHelp = [
  ["match", "Looks compatible"],
  ["mismatch", "Check before proposing"],
  ["unknown", "Input coverage is missing"],
];
const sortLabels = {
  "score-desc": "Score high to low",
  "score-asc": "Score low to high",
  "review-first": "Review first",
  newest: "Newest",
};
const reasonCodeLabels = {
  MATCH_SKILL_REQUIRED_OVERLAP: "Required skill overlap",
  MATCH_SKILL_NICE_TO_HAVE_OVERLAP: "Nice-to-have skill overlap",
  MATCH_RATE_COMPATIBLE: "Rate looks compatible",
  MATCH_RATE_UNKNOWN: "Rate coverage missing",
  MATCH_RATE_MISMATCH: "Rate mismatch",
  MATCH_START_COMPATIBLE: "Start timing compatible",
  MATCH_START_UNKNOWN: "Start timing coverage missing",
  MATCH_LOCATION_COMPATIBLE: "Location or remote compatible",
  MATCH_LOCATION_UNKNOWN: "Location coverage missing",
  MATCH_ROLE_COMPATIBLE: "Role text compatible",
  MATCH_MISSING_PROJECT_SKILLS: "Project skills missing",
  MATCH_MISSING_PERSON_SKILLS: "Person skills missing",
  MATCH_LOW_FIELD_COVERAGE: "Low field coverage",
  MATCH_REVIEW_REQUIRED: "Human review required",
};

function isReviewer(user) {
  return ["ADMIN", "MANAGER"].includes(user?.role);
}

function countLabel(value) {
  return Number.isFinite(Number(value)) ? Number(value).toLocaleString() : "0";
}

function badgeClass(value) {
  if (value === "HIGH" || value === "match") return "import-badge import-badge-good";
  if (value === "MEDIUM" || value === "LOW" || value === "unknown") return "import-badge import-badge-warn";
  if (value === "REVIEW" || value === "mismatch") return "import-badge import-badge-danger";
  return "import-badge";
}

function candidateStatus(candidate) {
  if (!candidate) return { label: "No selection", className: "match-status-neutral", hint: "Select a row" };
  if (candidate.hasReviewFlag || candidate.attention === "NEEDS_REVIEW") {
    return { label: "Needs review", className: "match-status-review", hint: "Review flags or warning codes present" };
  }
  if (candidate.scoreBand === "HIGH" || candidate.attention === "HIGH_SCORE") {
    return { label: "High fit", className: "match-status-high", hint: "Strong score with compatible signals" };
  }
  if (Number(candidate.warningCount || 0) > 0 || candidate.attention === "WARNING") {
    return { label: "Warning", className: "match-status-warning", hint: "Some field coverage needs checking" };
  }
  return { label: "Candidate", className: "match-status-neutral", hint: "Review before any supervised action" };
}

function compatibilityText(value) {
  if (value === "match") return "OK";
  if (value === "mismatch") return "Check";
  return "Unknown";
}

function reasonLabel(code) {
  return reasonCodeLabels[code] || code;
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || "Request failed");
  return result;
}

async function fetchSavedJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  const result = await response.json().catch(() => ({}));
  if (response.status === 503 && result?.migrationRequired) return result;
  if (!response.ok) throw new Error(result.message || "Saved match suggestion request failed");
  return result;
}

async function postSavedSuggestion(body) {
  const response = await fetch("/api/matches/suggestions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const result = await response.json().catch(() => ({}));
  return interpretMatchSuggestionSaveResponse(response.status, result);
}

async function patchSavedSuggestionReview(suggestionId, body) {
  return requestMatchSuggestionReviewUpdate(fetch, suggestionId, body);
}

function optionLabel(value, fallback) {
  return value || fallback;
}

function SelectField({ label, onChange, options, value }) {
  return (
    <label className="import-filter-field">
      <span>{label}</span>
      <select onChange={(event) => onChange(event.target.value)} value={value}>
        {options.map((option) => (
          <option key={option || "all"} value={option}>
            {optionLabel(option, "All")}
          </option>
        ))}
      </select>
    </label>
  );
}

function InputField({ label, onChange, placeholder = "", type = "text", value }) {
  return (
    <label className="import-filter-field">
      <span>{label}</span>
      <input onChange={(event) => onChange(event.target.value)} placeholder={placeholder} type={type} value={value} />
    </label>
  );
}

function activeFilterChips(filters) {
  const chips = [];
  if (filters.scoreBand) chips.push(["Band", filters.scoreBand]);
  if (filters.minScore && filters.minScore !== "0") chips.push(["Min", filters.minScore]);
  if (filters.hasReviewFlag) chips.push(["Review", filters.hasReviewFlag]);
  if (filters.rateCompatibility) chips.push(["Rate", filters.rateCompatibility]);
  if (filters.dateCompatibility) chips.push(["Date", filters.dateCompatibility]);
  if (filters.locationCompatibility) chips.push(["Location", filters.locationCompatibility]);
  if (filters.skillOverlapPresent) chips.push(["Skills", filters.skillOverlapPresent]);
  if (filters.projectId) chips.push(["Project UUID", "set"]);
  if (filters.personId) chips.push(["Person UUID", "set"]);
  return chips;
}

function savedActiveFilterChips(filters) {
  const chips = [];
  if (filters.status) chips.push(["Status", filters.status]);
  if (filters.scoreBand) chips.push(["Band", filters.scoreBand]);
  if (filters.attentionState) chips.push(["Attention", filters.attentionState]);
  if (filters.minScore) chips.push(["Min", filters.minScore]);
  if (filters.maxScore) chips.push(["Max", filters.maxScore]);
  if (filters.projectId) chips.push(["Project UUID", isSafeUuid(filters.projectId) ? "set" : "invalid"]);
  if (filters.personId) chips.push(["Person UUID", isSafeUuid(filters.personId) ? "set" : "invalid"]);
  if (filters.limit && filters.limit !== "20") chips.push(["Limit", filters.limit]);
  return chips;
}

function Pager({ onPageChange, response }) {
  const currentPage = response?.summary?.page || 1;
  const totalPages = response?.totalPages || 1;
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return (
    <div className="import-pager" aria-label="Matching candidates pagination">
      <button disabled={!canGoPrev} onClick={() => onPageChange(currentPage - 1)} type="button">
        Prev
      </button>
      <span>{currentPage} / {totalPages}</span>
      <button disabled={!canGoNext} onClick={() => onPageChange(currentPage + 1)} type="button">
        Next
      </button>
    </div>
  );
}

function savedSuggestionStatus(suggestion) {
  if (!suggestion) return { label: "No selection", className: "match-status-neutral", hint: "Select a saved suggestion" };
  if (suggestion.status === "NEEDS_REVIEW" || Number(suggestion.reviewReasonCount || 0) > 0) {
    return { label: "Needs review", className: "match-status-review", hint: "Review reasons are present" };
  }
  if (Number(suggestion.warningCount || 0) > 0 || suggestion.attentionState === "WARNING") {
    return { label: "Warning", className: "match-status-warning", hint: "Warning codes are present" };
  }
  if (suggestion.scoreBand === "HIGH" || suggestion.attentionState === "HIGH_SCORE") {
    return { label: "High fit", className: "match-status-high", hint: "Strong saved score signals" };
  }
  return { label: suggestion.status || "Saved", className: "match-status-neutral", hint: "Saved match suggestion metadata" };
}

function safeObjectEntries(value, limit = 4) {
  const sanitized = sanitizeSuggestionUiValue(value);
  if (!sanitized || typeof sanitized !== "object" || Array.isArray(sanitized)) return [];
  return Object.entries(sanitized).slice(0, limit);
}

function InlineSummary({ value }) {
  const entries = safeObjectEntries(value, 3);
  return (
    <div className="match-inline-summary">
      {entries.length ? entries.map(([key, item]) => <span key={key}>{key}: {String(item ?? "-")}</span>) : <span>none</span>}
    </div>
  );
}

export function MatchingReviewEmptyState({ isFiltered = false } = {}) {
  return (
    <div className="import-review-empty" role="status">
      <h2>{isFiltered ? "No candidates match current filters" : "No match candidates found"}</h2>
      <p>{isFiltered ? "Clear filters or lower the minimum score to widen the review set." : "Check project/person field coverage and rerun deterministic matching dry-run review."}</p>
    </div>
  );
}

export function MatchingReviewLoadingState() {
  return (
    <div className="match-state-panel" role="status">
      <span className="match-loading-dot" />
      <div>
        <h2>Loading match candidates</h2>
        <p>Reading deterministic dry-run results without saving anything.</p>
      </div>
    </div>
  );
}

export function MatchingReviewErrorState({ message, onRetry = null }) {
  return (
    <div className="match-state-panel match-state-error" role="alert">
      <div>
        <h2>Matching dry-run failed</h2>
        <p>{message || "The read-only API did not return a usable response."}</p>
      </div>
      {onRetry ? <button className="outline-button" onClick={onRetry} type="button">Retry</button> : null}
    </div>
  );
}

function SummaryStrip({ response }) {
  const summary = response?.summary || defaultResponse.summary;
  const distribution = summary.filteredScoreDistribution || summary.scoreDistribution || {};
  const warningTotal = Object.values(summary.warningCounts || {}).reduce((sum, value) => sum + Number(value || 0), 0);
  const reasonTotal = Object.values(summary.reviewReasonCounts || {}).reduce((sum, value) => sum + Number(value || 0), 0);

  return (
    <section className="match-summary-panel" aria-label="Matching review summary">
      <div className="match-summary-primary">
        <div>
          <span>Displayed</span>
          <strong>{countLabel(summary.displayed)}</strong>
          <small>of {countLabel(summary.totalCandidates)} filtered</small>
        </div>
        <div>
          <span>Candidate pairs</span>
          <strong>{countLabel(summary.candidatePairs)}</strong>
          <small>{countLabel(summary.scannedProjects)} projects x {countLabel(summary.scannedPersons)} persons</small>
        </div>
        <div>
          <span>Review load</span>
          <strong>{countLabel(distribution.REVIEW)}</strong>
          <small>{countLabel(warningTotal)} warning codes</small>
        </div>
        <div>
          <span>Reason signals</span>
          <strong>{countLabel(reasonTotal)}</strong>
          <small>{summary.dataSource === "synthetic-fixture-no-db" ? "synthetic fallback" : "read-only database"}</small>
        </div>
      </div>
      <div className="match-band-overview" aria-label="Score band distribution">
        {["HIGH", "MEDIUM", "LOW", "REVIEW"].map((band) => (
          <div className={`match-band-card match-band-${band.toLowerCase()}`} key={band}>
            <span>{band}</span>
            <strong>{countLabel(distribution[band])}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

export function MatchExplanationPanel() {
  return (
    <section className="match-help-grid" aria-label="Matching score explanation">
      <div>
        <h2>Score bands</h2>
        <ul>
          {scoreBandHelp.map(([band, label]) => (
            <li key={band}><span className={badgeClass(band)}>{band}</span><p>{label}</p></li>
          ))}
        </ul>
      </div>
      <div>
        <h2>Compatibility</h2>
        <ul>
          {compatibilityHelp.map(([state, label]) => (
            <li key={state}><span className={badgeClass(state)}>{compatibilityText(state)}</span><p>{label}</p></li>
          ))}
        </ul>
      </div>
      <div>
        <h2>Review required</h2>
        <p>Review appears when score is low, key fields are missing, or deterministic warning codes are present.</p>
        <p>Skill, rate, date, location, and role signals are rule-based only.</p>
      </div>
    </section>
  );
}

function CodeFlow({ codes, describe = false }) {
  return (
    <div className={`import-code-flow ${describe ? "match-code-flow-descriptive" : ""}`}>
      {(codes || []).length ? codes.map((code) => (
        <span key={code}>
          {code}
          {describe ? <small>{reasonLabel(code)}</small> : null}
        </span>
      )) : <span>none</span>}
    </div>
  );
}

function CountBlock({ title, counts }) {
  const entries = Object.entries(counts || {});
  return (
    <div className="import-detail-block">
      <h3>{title}</h3>
      <div className="import-code-flow">
        {entries.length ? entries.map(([code, count]) => <span key={code}>{code}: {countLabel(count)}</span>) : <span>none</span>}
      </div>
    </div>
  );
}

function CandidateTable({ candidates, onSelectCandidate, selectedCandidate }) {
  return (
    <section className="import-review-section" aria-labelledby="match-candidates-title">
      <div className="import-review-section-heading">
        <h2 id="match-candidates-title">Match candidates</h2>
        <span>{countLabel(candidates.length)} shown</span>
      </div>
      {candidates.length ? (
        <div className="import-table-wrap">
          <table className="import-review-table match-review-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Project</th>
                <th>Person</th>
                <th>Score</th>
                <th>Band</th>
                <th>Review</th>
                <th>Warnings</th>
                <th>Skills</th>
                <th>Rate</th>
                <th>Date</th>
                <th>Location</th>
                <th>Role</th>
                <th>Reasons</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((candidate) => {
                const status = candidateStatus(candidate);
                return (
                  <tr
                    className={`match-row ${status.className} ${selectedCandidate === candidate ? "selected" : ""}`}
                    key={`${candidate.projectShortId}-${candidate.personShortId}`}
                    onClick={() => onSelectCandidate(candidate)}
                  >
                    <td><span className={`match-status-pill ${status.className}`}>{status.label}</span></td>
                    <td>{candidate.projectShortId}</td>
                    <td>{candidate.personShortId}</td>
                    <td>
                      <div className="match-score-cell">
                        <strong>{candidate.score}</strong>
                        <span><i style={{ width: `${Math.max(0, Math.min(100, Number(candidate.score || 0)))}%` }} /></span>
                      </div>
                    </td>
                    <td><span className={badgeClass(candidate.scoreBand)}>{candidate.scoreBand}</span></td>
                    <td>{candidate.hasReviewFlag ? "yes" : "no"}</td>
                    <td>{countLabel(candidate.warningCount ?? candidate.missingFieldCodes?.length)}</td>
                    <td>{countLabel(candidate.skillOverlapCount)}</td>
                    <td><span className={badgeClass(candidate.rateCompatibility)}>{compatibilityText(candidate.rateCompatibility)}</span></td>
                    <td><span className={badgeClass(candidate.dateCompatibility)}>{compatibilityText(candidate.dateCompatibility)}</span></td>
                    <td><span className={badgeClass(candidate.locationCompatibility)}>{compatibilityText(candidate.locationCompatibility)}</span></td>
                    <td>{candidate.roleCompatible ? "match" : "unknown"}</td>
                    <td>{countLabel(candidate.reviewReasonCount ?? candidate.reasonCodes?.length)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <MatchingReviewEmptyState isFiltered />
      )}
    </section>
  );
}

function SaveSuggestionPanel({ isSaving, onOpenConfirm, saveDraft, saveState, uiEnabled }) {
  const canSave = Boolean(uiEnabled && saveDraft?.canSave);
  const disabledReason = uiEnabled ? saveDraft?.disabledReason : "Save controls are disabled in this environment.";
  const stateClass = saveState?.state ? `match-save-state-${saveState.state}` : "";

  return (
    <div className="match-save-panel" aria-label="Supervised match suggestion save">
      <div>
        <h3>Supervised save</h3>
        <p>{canSave ? "Ready to save this candidate for later review." : disabledReason}</p>
      </div>
      <button
        className="primary-button"
        disabled={!canSave || isSaving}
        onClick={onOpenConfirm}
        type="button"
      >
        {isSaving ? "Saving" : "Save suggestion"}
      </button>
      {saveState?.message ? (
        <p className={`match-save-message ${stateClass}`} role={saveState.state === "error" ? "alert" : "status"}>
          {saveState.message}{saveState.shortId ? ` ${saveState.shortId}` : ""}
        </p>
      ) : null}
    </div>
  );
}

function DetailList({ items }) {
  return (
    <dl className="import-detail-list">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value === undefined || value === null || value === "" ? "-" : value}</dd>
        </div>
      ))}
    </dl>
  );
}

function CandidateDetail({ candidate, isSaving, onOpenSaveConfirm, response, saveDraft, saveState, saveUiEnabled }) {
  if (!candidate) {
    return (
      <aside className="import-review-detail">
        <h2>Redacted detail</h2>
        <p>Select a match candidate to inspect deterministic score details.</p>
        <CountBlock counts={response?.summary?.warningCounts} title="Warning counts" />
        <CountBlock counts={response?.summary?.reviewReasonCounts} title="Reason counts" />
      </aside>
    );
  }

  const status = candidateStatus(candidate);

  return (
    <aside className="import-review-detail" aria-label="Redacted match candidate detail">
      <h2>Redacted detail</h2>
      <div className="match-reference-grid">
        <div>
          <span>Project ref</span>
          <strong>{candidate.projectShortId}</strong>
        </div>
        <div>
          <span>Person ref</span>
          <strong>{candidate.personShortId}</strong>
        </div>
      </div>
      <div className={`match-detail-status ${status.className}`}>
        <strong>{status.label}</strong>
        <span>{status.hint}</span>
      </div>
      <DetailList
        items={[
          ["Project", candidate.projectShortId],
          ["Person", candidate.personShortId],
          ["Score", candidate.score],
          ["Band", candidate.scoreBand],
          ["Review flag", candidate.hasReviewFlag ? "yes" : "no"],
          ["Warnings", candidate.warningCount ?? candidate.missingFieldCodes?.length],
          ["Reasons", candidate.reviewReasonCount ?? candidate.reasonCodes?.length],
          ["Skill overlap", candidate.skillOverlapCount],
          ["Required overlap", candidate.requiredSkillOverlapCount],
          ["Nice overlap", candidate.niceToHaveSkillOverlapCount],
          ["Tech overlap", candidate.technologyOverlapCount],
          ["Rate", compatibilityText(candidate.rateCompatibility)],
          ["Date", compatibilityText(candidate.dateCompatibility)],
          ["Location", compatibilityText(candidate.locationCompatibility)],
          ["Role", candidate.roleCompatible ? "match" : "unknown"],
        ]}
      />
      <div className="import-detail-block">
        <h3>Score breakdown</h3>
        <pre>{JSON.stringify(candidate.scoreBreakdown || {}, null, 2)}</pre>
      </div>
      <div className="import-detail-block">
        <h3>Reason codes</h3>
        <CodeFlow codes={candidate.reasonCodes} describe />
      </div>
      <div className="import-detail-block">
        <h3>Missing field codes</h3>
        <CodeFlow codes={candidate.missingFieldCodes} describe />
      </div>
      <div className="import-detail-block">
        <h3>Review flags</h3>
        <CodeFlow codes={candidate.reviewFlags} describe />
      </div>
      <SaveSuggestionPanel
        isSaving={isSaving}
        onOpenConfirm={onOpenSaveConfirm}
        saveDraft={saveDraft}
        saveState={saveState}
        uiEnabled={saveUiEnabled}
      />
      <CountBlock counts={response?.summary?.warningCounts} title="Warning counts" />
      <CountBlock counts={response?.summary?.reviewReasonCounts} title="Reason counts" />
    </aside>
  );
}

function SaveConfirmationDialog({ isSaving, onCancel, onConfirm, saveDraft }) {
  if (!saveDraft?.canSave) return null;

  return (
    <div className="match-save-dialog-backdrop" role="presentation">
      <section className="match-save-dialog" role="dialog" aria-modal="true" aria-labelledby="match-save-dialog-title">
        <h2 id="match-save-dialog-title">Confirm supervised save</h2>
        <p>This will call the guarded save endpoint with redacted match metadata only.</p>
        <DetailList
          items={[
            ["Score", saveDraft.body?.score],
            ["Band", saveDraft.body?.scoreBand],
            ["Attention", saveDraft.body?.attentionState],
            ["Warnings", saveDraft.body?.warningCount],
            ["Review reasons", saveDraft.body?.reviewReasonCount],
            ["Source evidence", "0"],
          ]}
        />
        <div className="match-save-dialog-actions">
          <button className="ghost-button" disabled={isSaving} onClick={onCancel} type="button">Cancel</button>
          <button className="primary-button" disabled={isSaving} onClick={onConfirm} type="button">
            {isSaving ? "Saving" : "Confirm save"}
          </button>
        </div>
      </section>
    </div>
  );
}

function ReviewReasonSelector({ disabled, onToggleReason, selectedReasons }) {
  return (
    <div className="import-detail-block" aria-label="Review reason codes">
      <h3>Review reason codes</h3>
      <div className="import-code-flow match-code-flow-descriptive">
        {MATCH_SUGGESTION_REVIEW_REASON_CODES.map((code) => {
          const selected = selectedReasons.includes(code);
          return (
            <label key={code}>
              <input
                checked={selected}
                disabled={disabled}
                onChange={() => onToggleReason(code)}
                type="checkbox"
              />
              <span>{code}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function MatchSuggestionReviewControls({
  isUpdating,
  onOpenConfirm,
  onToggleReason,
  reviewState,
  selectedReasons,
  suggestion,
  uiEnabled,
}) {
  const options = getMatchSuggestionReviewActionOptions(suggestion);
  const stateClass = reviewState?.state ? `match-save-state-${reviewState.state}` : "";

  return (
    <div className="match-save-panel" aria-label="Saved match suggestion review update controls">
      <div>
        <h3>Review update</h3>
        <p>
          {uiEnabled
            ? "Review actions call the guarded endpoint after confirmation."
            : "Review update controls are disabled in this environment."}
        </p>
      </div>
      <ReviewReasonSelector disabled={!uiEnabled || isUpdating} onToggleReason={onToggleReason} selectedReasons={selectedReasons} />
      <div className="match-save-dialog-actions">
        {options.map((option) => {
          const draft = buildMatchSuggestionReviewUpdateBody(suggestion, option.action, selectedReasons);
          const disabled = !uiEnabled || isUpdating || option.disabled || !draft.canSubmit;
          return (
            <button
              className={option.action === "APPROVE" ? "primary-button" : "outline-button"}
              disabled={disabled}
              key={option.action}
              onClick={() => onOpenConfirm(option.action)}
              title={option.disabled ? option.disabledReason : draft.disabledReason || option.label}
              type="button"
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {reviewState?.message ? (
        <p className={`match-save-message ${stateClass}`} role={reviewState.state === "error" ? "alert" : "status"}>
          {reviewState.message}{reviewState.shortId ? ` ${reviewState.shortId}` : ""}
        </p>
      ) : null}
      <p className="match-save-message">Server guard remains authoritative.</p>
    </div>
  );
}

function ReviewUpdateConfirmationDialog({ isUpdating, onCancel, onConfirm, reviewDraft, selectedAction }) {
  if (!reviewDraft?.canSubmit) return null;

  return (
    <div className="match-save-dialog-backdrop" role="presentation">
      <section className="match-save-dialog" role="dialog" aria-modal="true" aria-labelledby="match-review-dialog-title">
        <h2 id="match-review-dialog-title">Confirm review update</h2>
        <p>This will call the guarded review update endpoint with safe reason codes only.</p>
        <DetailList
          items={[
            ["Action", selectedAction],
            ["Target status", reviewDraft.body?.toStatus],
            ["Expected status", reviewDraft.body?.expectedStatus],
            ["Reason codes", (reviewDraft.body?.reasonCodes || []).length],
            ["Confirm", reviewDraft.body?.confirmReviewAction ? "yes" : "no"],
          ]}
        />
        <div className="match-save-dialog-actions">
          <button className="ghost-button" disabled={isUpdating} onClick={onCancel} type="button">Cancel</button>
          <button className="primary-button" disabled={isUpdating} onClick={onConfirm} type="button">
            {isUpdating ? "Updating" : "Confirm review update"}
          </button>
        </div>
      </section>
    </div>
  );
}

function SavedSuggestionSummary({ queueResponse, suggestionsResponse }) {
  const savedTotal = suggestionsResponse?.total ?? suggestionsResponse?.items?.length ?? 0;
  const queueTotal = queueResponse?.total ?? queueResponse?.items?.length ?? 0;
  const displayed = suggestionsResponse?.summary?.displayed ?? suggestionsResponse?.items?.length ?? 0;
  const warningTotal = (suggestionsResponse?.items || []).reduce((sum, item) => sum + Number(item.warningCount || 0), 0);

  return (
    <section className="match-summary-panel" aria-label="Saved match suggestion summary">
      <div className="match-summary-primary">
        <div>
          <span>Saved suggestions</span>
          <strong>{safeCountLabel(savedTotal)}</strong>
          <small>{safeCountLabel(displayed)} displayed</small>
        </div>
        <div>
          <span>Review queue</span>
          <strong>{safeCountLabel(queueTotal)}</strong>
          <small>needs review, suggested, or warnings</small>
        </div>
        <div>
          <span>Warning load</span>
          <strong>{safeCountLabel(warningTotal)}</strong>
          <small>current saved page only</small>
        </div>
        <div>
          <span>Mode</span>
          <strong>Read-only</strong>
          <small>no save or review mutation controls</small>
        </div>
      </div>
    </section>
  );
}

function SavedSuggestionEmptyState({ isFiltered = false, queue = false } = {}) {
  return (
    <div className="import-review-empty" role="status">
      <h2>{isFiltered ? "No saved suggestions match current filters" : queue ? "Review queue is empty" : "No saved match suggestions yet"}</h2>
      <p>{isFiltered ? "Clear filters or widen the score range." : "Saved suggestions will appear after a future supervised save flow runs."}</p>
    </div>
  );
}

function SavedSuggestionMigrationRequired({ endpoint }) {
  return (
    <div className="match-state-panel match-state-error" role="status">
      <div>
        <h2>Saved suggestion tables unavailable</h2>
        <p>{endpoint || "Saved match suggestion"} review needs the match suggestion persistence migration in this environment.</p>
      </div>
    </div>
  );
}

function SavedSuggestionTable({ onPageChange, onSelectSuggestion, queue = false, response, selectedSuggestionId }) {
  const suggestions = response?.items || [];
  const title = queue ? "Review queue" : "Saved suggestions";
  if (response?.migrationRequired) return <SavedSuggestionMigrationRequired endpoint={title} />;

  return (
    <section className="import-review-section" aria-labelledby={queue ? "saved-review-queue-title" : "saved-suggestions-title"}>
      <div className="import-review-section-heading">
        <h2 id={queue ? "saved-review-queue-title" : "saved-suggestions-title"}>{title}</h2>
        <span>{safeCountLabel(response?.total)} total</span>
      </div>
      {suggestions.length ? (
        <div className="import-table-wrap">
          <table className="import-review-table saved-suggestion-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Match</th>
                <th>Score</th>
                <th>Band</th>
                <th>Attention</th>
                <th>Warnings</th>
                <th>Review</th>
                <th>Reasons</th>
                <th>Compatibility</th>
                <th>Skills</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {suggestions.map((suggestion) => {
                const status = savedSuggestionStatus(suggestion);
                return (
                  <tr
                    className={`match-row ${status.className} ${selectedSuggestionId === suggestion.id ? "selected" : ""}`}
                    key={suggestion.id || `${suggestion.projectShortId}-${suggestion.personShortId}`}
                    onClick={() => onSelectSuggestion(suggestion)}
                  >
                    <td><span className={`match-status-pill ${status.className}`}>{status.label}</span></td>
                    <td>
                      <span className="match-saved-ref">{suggestion.projectShortId || "-"} / {suggestion.personShortId || "-"}</span>
                    </td>
                    <td>
                      <div className="match-score-cell">
                        <strong>{safeCountLabel(suggestion.score)}</strong>
                        <span><i style={{ width: `${Math.max(0, Math.min(100, Number(suggestion.score || 0)))}%` }} /></span>
                      </div>
                    </td>
                    <td><span className={badgeClass(suggestion.scoreBand)}>{suggestion.scoreBand || "-"}</span></td>
                    <td>{suggestion.attentionState || "-"}</td>
                    <td>{safeCountLabel(suggestion.warningCount)}</td>
                    <td>{safeCountLabel(suggestion.reviewReasonCount)}</td>
                    <td>{safeCountLabel(suggestion.reasonCodes?.length)}</td>
                    <td><InlineSummary value={suggestion.compatibilitySummary} /></td>
                    <td><InlineSummary value={suggestion.skillOverlapSummary} /></td>
                    <td>{safeShortDate(suggestion.updatedAt || suggestion.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <SavedSuggestionEmptyState isFiltered={Boolean(response?.filters && Object.keys(response.filters).some((key) => response.filters[key]))} queue={queue} />
      )}
      <Pager onPageChange={onPageChange} response={response || defaultSavedResponse} />
    </section>
  );
}

function SavedSuggestionFilterStatus({ activeView, filters, response }) {
  const chips = savedActiveFilterChips(filters);
  const total = response?.total ?? 0;
  const displayed = response?.summary?.displayed ?? response?.items?.length ?? 0;
  const sort = activeView === "queue" ? "needs-review first" : filters.sort;

  return (
    <section className="match-filter-status" aria-label="Active saved suggestion filters">
      <div>
        <strong>Sort: {sort || "newest"}</strong>
        <span>Showing {safeCountLabel(displayed)} of {safeCountLabel(total)} saved suggestions</span>
      </div>
      <div className="match-filter-chips">
        {chips.length ? chips.map(([label, value]) => <span key={`${label}-${value}`}>{label}: {value}</span>) : <span>No filters applied</span>}
      </div>
    </section>
  );
}

function ReviewEvents({ events }) {
  return (
    <div className="import-detail-block">
      <h3>Review events</h3>
      {(events || []).length ? (
        <ul className="match-safe-list">
          {events.map((event) => (
            <li key={`${event.shortId}-${event.createdAt}`}>
              <span className="import-badge">{event.action}</span>
              <span>{event.fromStatus || "-"} to {event.toStatus || "-"}</span>
              <span>actor {event.actorUserShortId || "-"}</span>
              <span>note {event.notePresent ? "present" : "none"}</span>
              <span>{safeShortDate(event.createdAt)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p>none</p>
      )}
    </div>
  );
}

function SourceEvidence({ evidence }) {
  return (
    <div className="import-detail-block">
      <h3>Source evidence</h3>
      {(evidence || []).length ? (
        <ul className="match-safe-list">
          {evidence.map((item) => {
            const record = item.sourceRecord || {};
            const rowRef = record.rawRef?.rowNumber ?? record.rawRef?.rowIndex ?? "-";
            return (
              <li key={`${item.shortId}-${record.shortId}`}>
                <span className="import-badge">{item.role}</span>
                <span>{record.sourceType || "UNKNOWN"}</span>
                <span>{record.recordType || "UNKNOWN"} / {record.status || "UNKNOWN"}</span>
                <span>hash {record.recordHashShort || "-"}</span>
                <span>row {rowRef}</span>
                <span>{safeCountLabel(record.warningCount)} warnings</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p>none</p>
      )}
    </div>
  );
}

function SavedSuggestionDetail({
  detail,
  isLoading,
  isUpdatingReview,
  onOpenReviewConfirm,
  onToggleReviewReason,
  reviewState,
  reviewUiEnabled,
  selectedReviewReasons,
  selectedSuggestion,
}) {
  if (isLoading) {
    return (
      <aside className="import-review-detail">
        <h2>Saved detail</h2>
        <p>Loading safe saved suggestion metadata.</p>
      </aside>
    );
  }

  if (detail?.migrationRequired) {
    return (
      <aside className="import-review-detail">
        <h2>Saved detail</h2>
        <p>Saved suggestion tables are unavailable in this environment.</p>
      </aside>
    );
  }

  const suggestion = detail?.item || selectedSuggestion;
  if (!suggestion) {
    return (
      <aside className="import-review-detail">
        <h2>Saved detail</h2>
        <p>Select a saved match suggestion to inspect safe metadata.</p>
      </aside>
    );
  }

  const status = savedSuggestionStatus(suggestion);

  return (
    <aside className="import-review-detail" aria-label="Saved match suggestion safe detail">
      <h2>Saved detail</h2>
      <div className="match-reference-grid">
        <div>
          <span>Project ref</span>
          <strong>{suggestion.projectShortId || "-"}</strong>
        </div>
        <div>
          <span>Person ref</span>
          <strong>{suggestion.personShortId || "-"}</strong>
        </div>
      </div>
      <div className={`match-detail-status ${status.className}`}>
        <strong>{status.label}</strong>
        <span>{status.hint}</span>
      </div>
      <DetailList
        items={[
          ["Suggestion", suggestion.shortId],
          ["Status", suggestion.status],
          ["Score", suggestion.score],
          ["Band", suggestion.scoreBand],
          ["Scoring version", suggestion.scoringVersion],
          ["Attention", suggestion.attentionState],
          ["Warnings", safeCountLabel(suggestion.warningCount)],
          ["Review reasons", safeCountLabel(suggestion.reviewReasonCount)],
          ["Review events", safeCountLabel(suggestion.reviewEventCount || suggestion.reviewEvents?.length)],
          ["Source evidence", safeCountLabel(suggestion.sourceEvidenceCount || suggestion.sourceEvidence?.length)],
          ["Created", safeShortDate(suggestion.createdAt)],
          ["Updated", safeShortDate(suggestion.updatedAt)],
          ["Reviewed", safeShortDate(suggestion.reviewedAt)],
          ["Archived", safeShortDate(suggestion.archivedAt)],
        ]}
      />
      <div className="import-detail-block">
        <h3>Reason codes</h3>
        <CodeFlow codes={suggestion.reasonCodes} describe />
      </div>
      <div className="import-detail-block">
        <h3>Warning codes</h3>
        <CodeFlow codes={suggestion.warningCodes} describe />
      </div>
      <div className="import-detail-block">
        <h3>Review flags</h3>
        <CodeFlow codes={suggestion.reviewFlags} describe />
      </div>
      <div className="import-detail-block">
        <h3>Compatibility summary</h3>
        <pre>{safeJsonText(suggestion.compatibilitySummary)}</pre>
      </div>
      <div className="import-detail-block">
        <h3>Skill overlap summary</h3>
        <pre>{safeJsonText(suggestion.skillOverlapSummary)}</pre>
      </div>
      <div className="import-detail-block">
        <h3>Redacted preview</h3>
        <pre>{safeJsonText(suggestion.redactedPreview)}</pre>
      </div>
      <MatchSuggestionReviewControls
        isUpdating={isUpdatingReview}
        onOpenConfirm={onOpenReviewConfirm}
        onToggleReason={onToggleReviewReason}
        reviewState={reviewState}
        selectedReasons={selectedReviewReasons}
        suggestion={suggestion}
        uiEnabled={reviewUiEnabled}
      />
      <ReviewEvents events={suggestion.reviewEvents} />
      <SourceEvidence evidence={suggestion.sourceEvidence} />
    </aside>
  );
}

function FilterStatusBar({ filters, response }) {
  const chips = activeFilterChips(filters);
  const summary = response?.summary || defaultResponse.summary;

  return (
    <section className="match-filter-status" aria-label="Active match filters">
      <div>
        <strong>Sort: {sortLabels[filters.sort] || filters.sort}</strong>
        <span>Showing {countLabel(summary.displayed)} of {countLabel(summary.totalCandidates)} filtered candidates</span>
      </div>
      <div className="match-filter-chips">
        {chips.length ? chips.map(([label, value]) => <span key={`${label}-${value}`}>{label}: {value}</span>) : <span>No filters applied</span>}
      </div>
    </section>
  );
}

export default function MatchingReviewPage({
  initialResponse = null,
  initialSession = null,
}) {
  const [authStatus, setAuthStatus] = useState(initialSession?.authenticated ? "authenticated" : "checking");
  const [currentUser, setCurrentUser] = useState(initialSession?.user || null);
  const [activeView, setActiveView] = useState("dry-run");
  const [response, setResponse] = useState(initialResponse || defaultResponse);
  const [selectedCandidate, setSelectedCandidate] = useState(initialResponse?.items?.[0] || null);
  const [filters, setFilters] = useState({
    scoreBand: "",
    minScore: "0",
    hasReviewFlag: "",
    rateCompatibility: "",
    dateCompatibility: "",
    locationCompatibility: "",
    skillOverlapPresent: "",
    projectId: "",
    personId: "",
    sort: "score-desc",
  });
  const [page, setPage] = useState(1);
  const [refreshToken, setRefreshToken] = useState(0);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [savedSuggestions, setSavedSuggestions] = useState(defaultSavedResponse);
  const [reviewQueue, setReviewQueue] = useState(defaultSavedResponse);
  const [selectedSavedSuggestion, setSelectedSavedSuggestion] = useState(null);
  const [savedSuggestionDetail, setSavedSuggestionDetail] = useState(null);
  const [savedFilters, setSavedFilters] = useState({
    status: "",
    scoreBand: "",
    attentionState: "",
    minScore: "",
    maxScore: "",
    projectId: "",
    personId: "",
    sort: "newest",
    limit: "20",
  });
  const [savedPage, setSavedPage] = useState(1);
  const [queuePage, setQueuePage] = useState(1);
  const [savedError, setSavedError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [isSavedLoading, setIsSavedLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSavingSuggestion, setIsSavingSuggestion] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveState, setSaveState] = useState({ state: "idle", message: "", shortId: null });
  const [isUpdatingReview, setIsUpdatingReview] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedReviewAction, setSelectedReviewAction] = useState("REQUEST_REVIEW");
  const [selectedReviewReasons, setSelectedReviewReasons] = useState([]);
  const [reviewState, setReviewState] = useState({ state: "idle", message: "", shortId: null });

  useEffect(() => {
    if (initialSession) return;

    let cancelled = false;
    fetchJson("/api/auth/session")
      .then((session) => {
        if (cancelled) return;
        if (!session?.authenticated || !session?.user) {
          setAuthStatus("unauthenticated");
          return;
        }
        setCurrentUser(session.user);
        setAuthStatus("authenticated");
      })
      .catch(() => {
        if (!cancelled) setAuthStatus("unauthenticated");
      });

    return () => {
      cancelled = true;
    };
  }, [initialSession]);

  const query = useMemo(() => {
    const params = new URLSearchParams({ limit: "20", page: String(page), sort: filters.sort || "score-desc" });
    for (const [key, value] of Object.entries(filters)) {
      if (key !== "sort" && value) params.set(key, value);
    }
    return params.toString();
  }, [filters, page]);

  const savedQuery = useMemo(() => buildSavedSuggestionQuery(savedFilters, savedPage), [savedFilters, savedPage]);
  const queueQuery = useMemo(() => buildSavedSuggestionQuery(savedFilters, queuePage, { reviewQueue: true }), [savedFilters, queuePage]);
  const saveDraft = useMemo(() => buildMatchSuggestionSaveBody(selectedCandidate, filters), [filters, selectedCandidate]);
  const activeReviewSuggestion = savedSuggestionDetail?.item || selectedSavedSuggestion;
  const reviewDraft = useMemo(
    () => buildMatchSuggestionReviewUpdateBody(activeReviewSuggestion, selectedReviewAction, selectedReviewReasons),
    [activeReviewSuggestion, selectedReviewAction, selectedReviewReasons],
  );

  useEffect(() => {
    if (authStatus !== "authenticated" || !isReviewer(currentUser)) return;
    if (initialResponse) return;
    if (activeView !== "dry-run") return;

    let cancelled = false;
    setIsLoading(true);
    setError("");
    fetchJson(`/api/matches/dry-run?${query}`)
      .then((result) => {
        if (cancelled) return;
        setResponse(result);
        setSelectedCandidate(result.items?.[0] || null);
      })
      .catch((fetchError) => {
        if (!cancelled) setError(fetchError instanceof Error ? fetchError.message : "Matching review fetch failed");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeView, authStatus, currentUser, initialResponse, query, refreshToken]);

  useEffect(() => {
    if (authStatus !== "authenticated" || !isReviewer(currentUser)) return;
    if (activeView !== "saved" && activeView !== "queue") return;

    let cancelled = false;
    setIsSavedLoading(true);
    setSavedError("");
    Promise.all([
      fetchSavedJson(`/api/matches/suggestions?${savedQuery}`),
      fetchSavedJson(`/api/matches/suggestions/review-queue?${queueQuery}`),
    ])
      .then(([savedResult, queueResult]) => {
        if (cancelled) return;
        setSavedSuggestions(savedResult);
        setReviewQueue(queueResult);
        const activeResult = activeView === "queue" ? queueResult : savedResult;
        const nextSuggestion = activeResult.items?.[0] || null;
        setSelectedSavedSuggestion(nextSuggestion);
        setSavedSuggestionDetail(null);
      })
      .catch((fetchError) => {
        if (!cancelled) setSavedError(fetchError instanceof Error ? fetchError.message : "Saved match suggestion fetch failed");
      })
      .finally(() => {
        if (!cancelled) setIsSavedLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeView, authStatus, currentUser, queueQuery, refreshToken, savedQuery]);

  useEffect(() => {
    if (authStatus !== "authenticated" || !isReviewer(currentUser)) return;
    if (activeView !== "saved" && activeView !== "queue") return;
    if (!selectedSavedSuggestion?.id || !isSafeUuid(selectedSavedSuggestion.id)) {
      setSavedSuggestionDetail(null);
      return;
    }

    let cancelled = false;
    setIsDetailLoading(true);
    setDetailError("");
    fetchSavedJson(`/api/matches/suggestions/${selectedSavedSuggestion.id}`)
      .then((result) => {
        if (!cancelled) setSavedSuggestionDetail(result);
      })
      .catch((fetchError) => {
        if (!cancelled) setDetailError(fetchError instanceof Error ? fetchError.message : "Saved match suggestion detail fetch failed");
      })
      .finally(() => {
        if (!cancelled) setIsDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeView, authStatus, currentUser, refreshToken, selectedSavedSuggestion]);

  useEffect(() => {
    setReviewDialogOpen(false);
    setSelectedReviewAction("REQUEST_REVIEW");
    setSelectedReviewReasons([]);
    setReviewState({ state: "idle", message: "", shortId: null });
  }, [selectedSavedSuggestion?.id]);

  function handleAuthenticated(user) {
    setCurrentUser(user);
    setAuthStatus("authenticated");
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    setCurrentUser(null);
    setAuthStatus("unauthenticated");
  }

  function updateFilter(key, value) {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function clearFilters() {
    setPage(1);
    setFilters({
      scoreBand: "",
      minScore: "0",
      hasReviewFlag: "",
      rateCompatibility: "",
      dateCompatibility: "",
      locationCompatibility: "",
      skillOverlapPresent: "",
      projectId: "",
      personId: "",
      sort: "score-desc",
    });
  }

  function updateSavedFilter(key, value) {
    setSavedPage(1);
    setQueuePage(1);
    setSavedFilters((current) => ({ ...current, [key]: value }));
  }

  function clearSavedFilters() {
    setSavedPage(1);
    setQueuePage(1);
    setSavedFilters({
      status: "",
      scoreBand: "",
      attentionState: "",
      minScore: "",
      maxScore: "",
      projectId: "",
      personId: "",
      sort: "newest",
      limit: "20",
    });
  }

  function changeView(nextView) {
    setActiveView(nextView);
    setError("");
    setSavedError("");
    setDetailError("");
    setSaveDialogOpen(false);
    setReviewDialogOpen(false);
  }

  function openSaveConfirm() {
    if (!saveUiEnabled || !saveDraft.canSave || isSavingSuggestion) return;
    setSaveState({ state: "confirming", message: "Confirm before saving.", shortId: null });
    setSaveDialogOpen(true);
  }

  async function confirmSaveSuggestion() {
    if (!saveUiEnabled || !saveDraft.canSave || !saveDraft.body || isSavingSuggestion) return;
    setIsSavingSuggestion(true);
    setSaveState({ state: "saving", message: "Saving through guarded endpoint.", shortId: null });
    try {
      const nextState = await postSavedSuggestion(saveDraft.body);
      setSaveState(nextState);
      if (["success", "skippedExisting"].includes(nextState.state)) {
        setSavedPage(1);
        setQueuePage(1);
        setRefreshToken((current) => current + 1);
      }
    } catch {
      setSaveState({ state: "error", message: "Supervised save failed.", shortId: null });
    } finally {
      setIsSavingSuggestion(false);
      setSaveDialogOpen(false);
    }
  }

  function toggleReviewReason(code) {
    setSelectedReviewReasons((current) => (
      current.includes(code)
        ? current.filter((item) => item !== code)
        : [...current, code]
    ));
  }

  function openReviewConfirm(action) {
    if (!reviewUiEnabled || isUpdatingReview) return;
    const nextDraft = buildMatchSuggestionReviewUpdateBody(activeReviewSuggestion, action, selectedReviewReasons);
    if (!nextDraft.canSubmit) {
      setReviewState({ state: "validation", message: nextDraft.disabledReason, shortId: null });
      return;
    }
    setSelectedReviewAction(action);
    setReviewState({ state: "confirming", message: "Confirm before updating review status.", shortId: null });
    setReviewDialogOpen(true);
  }

  async function confirmReviewUpdate() {
    if (!reviewUiEnabled || !reviewDraft.canSubmit || !reviewDraft.body || !activeReviewSuggestion?.id || isUpdatingReview) return;
    setIsUpdatingReview(true);
    setReviewState({ state: "saving", message: "Updating through guarded endpoint.", shortId: null });
    try {
      const nextState = await patchSavedSuggestionReview(activeReviewSuggestion.id, reviewDraft.body);
      setReviewState(nextState);
      if (["success", "skippedNoop"].includes(nextState.state)) {
        setRefreshToken((current) => current + 1);
      }
    } catch {
      setReviewState({ state: "error", message: "Review update failed.", shortId: null });
    } finally {
      setIsUpdatingReview(false);
      setReviewDialogOpen(false);
    }
  }

  if (authStatus === "checking") {
    return (
      <main className="auth-page">
        <section className="auth-panel auth-panel-compact" aria-live="polite">
          <div className="auth-brand">
            <span className="brand-logo">SKV</span>
            <span className="brand-badge">Match review</span>
          </div>
          <p className="auth-message">Checking session</p>
        </section>
      </main>
    );
  }

  if (authStatus !== "authenticated") return <LoginPanel onAuthenticated={handleAuthenticated} />;

  if (!isReviewer(currentUser)) {
    return (
      <main className="auth-page">
        <section className="auth-panel auth-panel-compact">
          <div className="auth-brand">
            <span className="brand-logo">SKV</span>
            <span className="brand-badge">Match review</span>
          </div>
          <h1>Access denied</h1>
          <p className="auth-message">Matching review requires ADMIN or MANAGER role.</p>
          <button className="primary-button auth-submit" onClick={handleLogout} type="button">Logout</button>
        </section>
      </main>
    );
  }

  const activeSavedResponse = activeView === "queue" ? reviewQueue : savedSuggestions;
  const activeSavedPageChange = activeView === "queue" ? setQueuePage : setSavedPage;
  const activeLoading = activeView === "dry-run" ? isLoading : isSavedLoading || isDetailLoading;

  return (
    <main className="console-app import-review-page matching-review-page">
      <header className="global-header">
        <div className="brand">
          <span className="brand-logo">SKV</span>
          <span className="brand-badge">Match review</span>
        </div>
        <nav className="main-nav" aria-label="Matching review navigation">
          <a className="nav-item" href="/">Console</a>
          <a className="nav-item" href="/imports">Imports</a>
          <span className="nav-item active">Matches</span>
        </nav>
        <div className="header-actions">
          <button className="user-menu" onClick={handleLogout} type="button" title="Logout">
            {currentUser?.name || "User"} <span>{currentUser?.role || ""}</span>
          </button>
        </div>
      </header>

      <div className="import-review-toolbar">
        <div>
          <h1>Matching review</h1>
          <p>Read-only deterministic Project/Person match inspection.</p>
        </div>
        <button className="outline-button" disabled={activeLoading} onClick={() => setRefreshToken((current) => current + 1)} type="button">
          {activeLoading ? "Loading" : "Refresh"}
        </button>
      </div>

      <section className="match-view-tabs" aria-label="Matching review views">
        <button className={activeView === "dry-run" ? "active" : ""} onClick={() => changeView("dry-run")} type="button">Dry-run review</button>
        <button className={activeView === "saved" ? "active" : ""} onClick={() => changeView("saved")} type="button">Saved suggestions</button>
        <button className={activeView === "queue" ? "active" : ""} onClick={() => changeView("queue")} type="button">Review queue</button>
      </section>

      {activeView === "dry-run" ? (
        <>
          <SummaryStrip response={response} />
          <MatchExplanationPanel />

          <section className="import-filter-bar match-filter-bar" aria-label="Match candidate filters">
            <SelectField label="Band" onChange={(value) => updateFilter("scoreBand", value)} options={scoreBandOptions} value={filters.scoreBand} />
            <InputField label="Min score" onChange={(value) => updateFilter("minScore", value)} type="number" value={filters.minScore} />
            <SelectField label="Review" onChange={(value) => updateFilter("hasReviewFlag", value)} options={booleanOptions} value={filters.hasReviewFlag} />
            <SelectField label="Rate" onChange={(value) => updateFilter("rateCompatibility", value)} options={compatibilityOptions} value={filters.rateCompatibility} />
            <SelectField label="Date" onChange={(value) => updateFilter("dateCompatibility", value)} options={compatibilityOptions} value={filters.dateCompatibility} />
            <SelectField label="Location" onChange={(value) => updateFilter("locationCompatibility", value)} options={compatibilityOptions} value={filters.locationCompatibility} />
            <SelectField label="Skills" onChange={(value) => updateFilter("skillOverlapPresent", value)} options={booleanOptions} value={filters.skillOverlapPresent} />
            <SelectField label="Sort" onChange={(value) => updateFilter("sort", value)} options={sortOptions} value={filters.sort} />
            <InputField label="Project id" onChange={(value) => updateFilter("projectId", value)} placeholder="uuid" value={filters.projectId} />
            <InputField label="Person id" onChange={(value) => updateFilter("personId", value)} placeholder="uuid" value={filters.personId} />
            <button className="ghost-button" onClick={clearFilters} type="button">Clear</button>
          </section>

          <FilterStatusBar filters={filters} response={response} />

          {error ? <MatchingReviewErrorState message={error} onRetry={() => setRefreshToken((current) => current + 1)} /> : null}
          {isLoading ? <MatchingReviewLoadingState /> : null}

          <div className="import-review-grid">
            <div className="import-review-main">
              {!isLoading && !error ? (
                <CandidateTable candidates={response.items || []} onSelectCandidate={setSelectedCandidate} selectedCandidate={selectedCandidate} />
              ) : null}
              <Pager onPageChange={setPage} response={response} />
            </div>
            <CandidateDetail
              candidate={selectedCandidate}
              isSaving={isSavingSuggestion}
              onOpenSaveConfirm={openSaveConfirm}
              response={response}
              saveDraft={saveDraft}
              saveState={saveState}
              saveUiEnabled={saveUiEnabled}
            />
          </div>
          {saveDialogOpen ? (
            <SaveConfirmationDialog
              isSaving={isSavingSuggestion}
              onCancel={() => setSaveDialogOpen(false)}
              onConfirm={confirmSaveSuggestion}
              saveDraft={saveDraft}
            />
          ) : null}
        </>
      ) : (
        <>
          <SavedSuggestionSummary queueResponse={reviewQueue} suggestionsResponse={savedSuggestions} />
          <section className="import-filter-bar match-filter-bar match-saved-filter-bar" aria-label="Saved match suggestion filters">
            <SelectField label="Status" onChange={(value) => updateSavedFilter("status", value)} options={savedStatusOptions} value={savedFilters.status} />
            <SelectField label="Band" onChange={(value) => updateSavedFilter("scoreBand", value)} options={savedScoreBandOptions} value={savedFilters.scoreBand} />
            <SelectField label="Attention" onChange={(value) => updateSavedFilter("attentionState", value)} options={attentionStateOptions} value={savedFilters.attentionState} />
            <InputField label="Min score" onChange={(value) => updateSavedFilter("minScore", value)} type="number" value={savedFilters.minScore} />
            <InputField label="Max score" onChange={(value) => updateSavedFilter("maxScore", value)} type="number" value={savedFilters.maxScore} />
            <SelectField label="Limit" onChange={(value) => updateSavedFilter("limit", value)} options={savedLimitOptions} value={savedFilters.limit} />
            {activeView === "saved" ? <SelectField label="Sort" onChange={(value) => updateSavedFilter("sort", value)} options={savedSortOptions} value={savedFilters.sort} /> : null}
            <InputField label="Project id" onChange={(value) => updateSavedFilter("projectId", value)} placeholder="uuid" value={savedFilters.projectId} />
            <InputField label="Person id" onChange={(value) => updateSavedFilter("personId", value)} placeholder="uuid" value={savedFilters.personId} />
            <button className="ghost-button" onClick={clearSavedFilters} type="button">Clear</button>
          </section>

          <SavedSuggestionFilterStatus activeView={activeView} filters={savedFilters} response={activeSavedResponse} />

          {savedError ? <MatchingReviewErrorState message={savedError} onRetry={() => setRefreshToken((current) => current + 1)} /> : null}
          {detailError ? <MatchingReviewErrorState message={detailError} onRetry={() => setRefreshToken((current) => current + 1)} /> : null}
          {isSavedLoading ? <MatchingReviewLoadingState /> : null}

          <div className="import-review-grid saved-suggestion-grid">
            <div className="import-review-main">
              {!isSavedLoading && !savedError ? (
                <SavedSuggestionTable
                  onPageChange={activeSavedPageChange}
                  onSelectSuggestion={setSelectedSavedSuggestion}
                  queue={activeView === "queue"}
                  response={activeSavedResponse}
                  selectedSuggestionId={selectedSavedSuggestion?.id}
                />
              ) : null}
            </div>
            <SavedSuggestionDetail
              detail={savedSuggestionDetail}
              isLoading={isDetailLoading}
              isUpdatingReview={isUpdatingReview}
              onOpenReviewConfirm={openReviewConfirm}
              onToggleReviewReason={toggleReviewReason}
              reviewState={reviewState}
              reviewUiEnabled={reviewUiEnabled}
              selectedReviewReasons={selectedReviewReasons}
              selectedSuggestion={selectedSavedSuggestion}
            />
          </div>
          {reviewDialogOpen ? (
            <ReviewUpdateConfirmationDialog
              isUpdating={isUpdatingReview}
              onCancel={() => setReviewDialogOpen(false)}
              onConfirm={confirmReviewUpdate}
              reviewDraft={reviewDraft}
              selectedAction={selectedReviewAction}
            />
          ) : null}
        </>
      )}
    </main>
  );
}
