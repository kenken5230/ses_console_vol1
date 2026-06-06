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

export function MatchingReviewEmptyState() {
  return (
    <div className="import-review-empty" role="status">
      <h2>No match candidates found</h2>
      <p>Check project/person field coverage and rerun deterministic matching dry-run review.</p>
    </div>
  );
}

function SummaryStrip({ response }) {
  const summary = response?.summary || defaultResponse.summary;
  const distribution = summary.filteredScoreDistribution || summary.scoreDistribution || {};
  const warningTotal = Object.values(summary.warningCounts || {}).reduce((sum, value) => sum + Number(value || 0), 0);
  const reasonTotal = Object.values(summary.reviewReasonCounts || {}).reduce((sum, value) => sum + Number(value || 0), 0);

  return (
    <section className="import-summary-strip match-summary-strip" aria-label="Matching review summary">
      <div>
        <span>Projects</span>
        <strong>{countLabel(summary.scannedProjects)}</strong>
      </div>
      <div>
        <span>Persons</span>
        <strong>{countLabel(summary.scannedPersons)}</strong>
      </div>
      <div>
        <span>Candidate pairs</span>
        <strong>{countLabel(summary.candidatePairs)}</strong>
      </div>
      <div>
        <span>Displayed</span>
        <strong>{countLabel(summary.displayed)}</strong>
      </div>
      <div>
        <span>High / Medium</span>
        <strong>{countLabel(distribution.HIGH)} / {countLabel(distribution.MEDIUM)}</strong>
      </div>
      <div>
        <span>Low / Review</span>
        <strong>{countLabel(distribution.LOW)} / {countLabel(distribution.REVIEW)}</strong>
      </div>
      <div>
        <span>Warnings</span>
        <strong>{countLabel(warningTotal)}</strong>
      </div>
      <div>
        <span>Reasons</span>
        <strong>{countLabel(reasonTotal)}</strong>
      </div>
    </section>
  );
}

function CodeFlow({ codes }) {
  return (
    <div className="import-code-flow">
      {(codes || []).length ? codes.map((code) => <span key={code}>{code}</span>) : <span>none</span>}
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
                <th>Project</th>
                <th>Person</th>
                <th>Score</th>
                <th>Band</th>
                <th>Review</th>
                <th>Skills</th>
                <th>Rate</th>
                <th>Date</th>
                <th>Location</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((candidate) => (
                <tr
                  className={selectedCandidate === candidate ? "selected" : ""}
                  key={`${candidate.projectShortId}-${candidate.personShortId}`}
                  onClick={() => onSelectCandidate(candidate)}
                >
                  <td>{candidate.projectShortId}</td>
                  <td>{candidate.personShortId}</td>
                  <td>{candidate.score}</td>
                  <td><span className={badgeClass(candidate.scoreBand)}>{candidate.scoreBand}</span></td>
                  <td>{candidate.hasReviewFlag ? "yes" : "no"}</td>
                  <td>{countLabel(candidate.skillOverlapCount)}</td>
                  <td><span className={badgeClass(candidate.rateCompatibility)}>{candidate.rateCompatibility}</span></td>
                  <td><span className={badgeClass(candidate.dateCompatibility)}>{candidate.dateCompatibility}</span></td>
                  <td><span className={badgeClass(candidate.locationCompatibility)}>{candidate.locationCompatibility}</span></td>
                  <td>{candidate.roleCompatible ? "match" : "unknown"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <MatchingReviewEmptyState />
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

  return (
    <aside className="import-review-detail" aria-label="Redacted match candidate detail">
      <h2>Redacted detail</h2>
      <DetailList
        items={[
          ["Project", candidate.projectShortId],
          ["Person", candidate.personShortId],
          ["Score", candidate.score],
          ["Band", candidate.scoreBand],
          ["Review flag", candidate.hasReviewFlag ? "yes" : "no"],
          ["Skill overlap", candidate.skillOverlapCount],
          ["Required overlap", candidate.requiredSkillOverlapCount],
          ["Nice overlap", candidate.niceToHaveSkillOverlapCount],
          ["Tech overlap", candidate.technologyOverlapCount],
          ["Rate", candidate.rateCompatibility],
          ["Date", candidate.dateCompatibility],
          ["Location", candidate.locationCompatibility],
          ["Role", candidate.roleCompatible ? "match" : "unknown"],
        ]}
      />
      <div className="import-detail-block">
        <h3>Score breakdown</h3>
        <pre>{JSON.stringify(candidate.scoreBreakdown || {}, null, 2)}</pre>
      </div>
      <div className="import-detail-block">
        <h3>Reason codes</h3>
        <CodeFlow codes={candidate.reasonCodes} />
      </div>
      <div className="import-detail-block">
        <h3>Missing field codes</h3>
        <CodeFlow codes={candidate.missingFieldCodes} />
      </div>
      <div className="import-detail-block">
        <h3>Review flags</h3>
        <CodeFlow codes={candidate.reviewFlags} />
      </div>
      <CountBlock counts={response?.summary?.warningCounts} title="Warning counts" />
      <CountBlock counts={response?.summary?.reviewReasonCounts} title="Reason counts" />
    </aside>
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

      {error ? <div className="db-loading" role="alert">{error}</div> : null}

      <div className="import-review-grid">
        <div className="import-review-main">
          <CandidateTable candidates={response.items || []} onSelectCandidate={setSelectedCandidate} selectedCandidate={selectedCandidate} />
          <Pager onPageChange={setPage} response={response} />
        </div>
        <CandidateDetail candidate={selectedCandidate} response={response} />
      </div>
    </main>
  );
}
