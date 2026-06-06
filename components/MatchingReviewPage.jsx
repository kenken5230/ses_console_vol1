"use client";

import React, { useEffect, useMemo, useState } from "react";
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

const scoreBandOptions = ["", "HIGH", "MEDIUM", "LOW", "REVIEW"];
const compatibilityOptions = ["", "match", "mismatch", "unknown"];
const booleanOptions = ["", "true", "false"];
const sortOptions = ["score-desc", "score-asc", "review-first", "newest"];

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

function CandidateDetail({ candidate, response }) {
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
      <CountBlock counts={response?.summary?.warningCounts} title="Warning counts" />
      <CountBlock counts={response?.summary?.reviewReasonCounts} title="Reason counts" />
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

  useEffect(() => {
    if (authStatus !== "authenticated" || !isReviewer(currentUser)) return;
    if (initialResponse) return;

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
  }, [authStatus, currentUser, initialResponse, query, refreshToken]);

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
        <button className="outline-button" disabled={isLoading} onClick={() => setRefreshToken((current) => current + 1)} type="button">
          {isLoading ? "Loading" : "Refresh"}
        </button>
      </div>

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
        <CandidateDetail candidate={selectedCandidate} response={response} />
      </div>
    </main>
  );
}
