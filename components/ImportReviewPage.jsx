"use client";

import React, { useEffect, useMemo, useState } from "react";
import LoginPanel from "./LoginPanel";

const defaultPage = { items: [], page: 1, limit: 20, total: 0, totalPages: 1, maxLimit: 100 };
const sourceTypeOptions = ["", "CSV", "GMAIL", "NOTION", "MANUAL", "OTHER_EMAIL", "API", "UNKNOWN"];
const recordTypeOptions = ["", "PROJECT", "PERSON", "OTHER", "EXCLUDED", "UNKNOWN"];
const statusOptions = ["", "NEW", "NEEDS_REVIEW", "SKIPPED", "LINKED", "APPLIED", "ARCHIVED"];
const linkTypeOptions = ["", "CREATED_FROM", "DUPLICATE_OF", "REVIEW_CANDIDATE", "LINKED_TO", "RELATED_TO"];

function isReviewer(user) {
  return ["ADMIN", "MANAGER"].includes(user?.role);
}

function shortDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toISOString().replace("T", " ").slice(0, 16);
}

function countLabel(value) {
  return Number.isFinite(Number(value)) ? Number(value).toLocaleString() : "0";
}

function badgeClass(value) {
  if (value === "SUCCEEDED" || value === "NEW" || value === "CREATED_FROM") return "import-badge import-badge-good";
  if (value === "PARTIAL" || value === "NEEDS_REVIEW" || value === "REVIEW_CANDIDATE") return "import-badge import-badge-warn";
  if (value === "FAILED" || value === "DUPLICATE_OF") return "import-badge import-badge-danger";
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

function Pager({ label, onPageChange, page }) {
  const currentPage = page?.page || 1;
  const totalPages = page?.totalPages || 1;
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return (
    <div className="import-pager" aria-label={`${label} pagination`}>
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

export function ImportReviewEmptyState() {
  return (
    <div className="import-review-empty" role="status">
      <h2>No import records yet</h2>
      <p>Run CSV source-preview, then the supervised source-record apply flow when approved.</p>
    </div>
  );
}

function SummaryStrip({ records, runs }) {
  const runCount = runs?.total ?? runs?.items?.length ?? 0;
  const recordCount = records?.total ?? records?.items?.length ?? 0;
  const reviewCount = (records?.items || []).filter((item) => item.reviewNeeded).length;
  const linkCount = (records?.items || []).reduce((sum, item) => sum + Number(item.linkCount || 0), 0);

  return (
    <section className="import-summary-strip" aria-label="Import review summary">
      <div>
        <span>ImportRuns</span>
        <strong>{countLabel(runCount)}</strong>
      </div>
      <div>
        <span>SourceRecords</span>
        <strong>{countLabel(recordCount)}</strong>
      </div>
      <div>
        <span>Review needed</span>
        <strong>{countLabel(reviewCount)}</strong>
      </div>
      <div>
        <span>Entity links</span>
        <strong>{countLabel(linkCount)}</strong>
      </div>
    </section>
  );
}

function ImportRunTable({ onPageChange, onSelectRun, runs, selectedRunId }) {
  return (
    <section className="import-review-section" aria-labelledby="import-runs-title">
      <div className="import-review-section-heading">
        <h2 id="import-runs-title">ImportRun review</h2>
        <span>{countLabel(runs.total)} total</span>
      </div>
      {runs.items?.length ? (
        <div className="import-table-wrap">
          <table className="import-review-table">
            <thead>
              <tr>
                <th>Run</th>
                <th>Source</th>
                <th>Mode</th>
                <th>Status</th>
                <th>Created</th>
                <th>Started</th>
                <th>Finished</th>
                <th>Records</th>
                <th>Links</th>
              </tr>
            </thead>
            <tbody>
              {runs.items.map((run) => (
                <tr className={selectedRunId === run.id ? "selected" : ""} key={run.id} onClick={() => onSelectRun(run.id)}>
                  <td>{run.shortId}</td>
                  <td>{run.source?.type || "UNKNOWN"}</td>
                  <td>{run.mode}</td>
                  <td><span className={badgeClass(run.status)}>{run.status}</span></td>
                  <td>{shortDate(run.createdAt)}</td>
                  <td>{shortDate(run.startedAt)}</td>
                  <td>{shortDate(run.finishedAt)}</td>
                  <td>{countLabel(run.sourceRecordCount)}</td>
                  <td>{countLabel(run.entityLinkCount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ImportReviewEmptyState />
      )}
      <Pager label="ImportRun" onPageChange={onPageChange} page={runs} />
    </section>
  );
}

function SourceRecordTable({ onPageChange, onSelectRecord, records, selectedRecordId }) {
  return (
    <section className="import-review-section" aria-labelledby="source-records-title">
      <div className="import-review-section-heading">
        <h2 id="source-records-title">SourceRecord review</h2>
        <span>{countLabel(records.total)} total</span>
      </div>
      {records.items?.length ? (
        <div className="import-table-wrap">
          <table className="import-review-table import-record-table">
            <thead>
              <tr>
                <th>Record</th>
                <th>Source</th>
                <th>Type</th>
                <th>Status</th>
                <th>Hash</th>
                <th>Row</th>
                <th>Warnings</th>
                <th>Review</th>
                <th>Links</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {records.items.map((record) => (
                <tr className={selectedRecordId === record.id ? "selected" : ""} key={record.id} onClick={() => onSelectRecord(record)}>
                  <td>{record.shortId}</td>
                  <td>{record.source?.type || "UNKNOWN"}</td>
                  <td>{record.recordType}</td>
                  <td><span className={badgeClass(record.status)}>{record.status}</span></td>
                  <td>{record.recordHashShort}</td>
                  <td>{record.rawRef?.rowNumber ?? record.rawRef?.rowIndex ?? "-"}</td>
                  <td>{countLabel(record.warningCount)}</td>
                  <td>{countLabel(record.reviewReasonCount)}</td>
                  <td>{countLabel(record.linkCount)}</td>
                  <td>{shortDate(record.updatedAt || record.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ImportReviewEmptyState />
      )}
      <Pager label="SourceRecord" onPageChange={onPageChange} page={records} />
    </section>
  );
}

function DetailList({ items }) {
  return (
    <dl className="import-detail-list">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value || "-"}</dd>
        </div>
      ))}
    </dl>
  );
}

function SourceRecordDetail({ record }) {
  if (!record) {
    return (
      <aside className="import-review-detail">
        <h2>Redacted detail</h2>
        <p>Select a SourceRecord to inspect safe metadata.</p>
      </aside>
    );
  }

  return (
    <aside className="import-review-detail" aria-label="Redacted SourceRecord detail">
      <h2>Redacted detail</h2>
      <DetailList
        items={[
          ["Record", record.shortId],
          ["Source", record.source?.type],
          ["Record type", record.recordType],
          ["Status", record.status],
          ["Hash", record.recordHashShort],
          ["Row number", record.rawRef?.rowNumber],
          ["Row index", record.rawRef?.rowIndex],
          ["Warnings", countLabel(record.warningCount)],
          ["Review reasons", countLabel(record.reviewReasonCount)],
          ["Links", countLabel(record.linkCount)],
        ]}
      />
      <div className="import-detail-block">
        <h3>Redacted preview</h3>
        <pre>{JSON.stringify(record.redactedPreview || {}, null, 2)}</pre>
      </div>
      <div className="import-detail-block">
        <h3>Review reason codes</h3>
        <div className="import-code-flow">
          {(record.reviewReasons || []).length ? record.reviewReasons.map((reason) => <span key={reason}>{reason}</span>) : <span>none</span>}
        </div>
      </div>
      <div className="import-detail-block">
        <h3>Warning codes</h3>
        <div className="import-code-flow">
          {(record.warnings || []).length ? record.warnings.map((warning) => <span key={warning}>{warning}</span>) : <span>none</span>}
        </div>
      </div>
      <div className="import-detail-block">
        <h3>EntitySourceLinks</h3>
        {(record.entitySourceLinks || []).length ? (
          <ul className="import-link-list">
            {record.entitySourceLinks.map((link) => (
              <li key={link.id || `${link.entityType}-${link.linkType}`}>
                <span className={badgeClass(link.linkType)}>{link.linkType}</span>
                <span>{link.entityType}</span>
                <span>{link.entityIdShort}</span>
                <span>{link.confidence ?? "-"}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p>none</p>
        )}
      </div>
    </aside>
  );
}

export default function ImportReviewPage({
  initialRecordsResponse = null,
  initialRunsResponse = null,
  initialSession = null,
}) {
  const [authStatus, setAuthStatus] = useState(initialSession?.authenticated ? "authenticated" : "checking");
  const [currentUser, setCurrentUser] = useState(initialSession?.user || null);
  const [runs, setRuns] = useState(initialRunsResponse || defaultPage);
  const [records, setRecords] = useState(initialRecordsResponse || defaultPage);
  const [filters, setFilters] = useState({
    sourceType: "",
    recordType: "",
    status: "",
    linkType: "",
    reviewNeeded: "",
    warningsPresent: "",
    importRunId: "",
  });
  const [selectedRecord, setSelectedRecord] = useState(initialRecordsResponse?.items?.[0] || null);
  const [selectedRunId, setSelectedRunId] = useState("");
  const [runPage, setRunPage] = useState(1);
  const [recordPage, setRecordPage] = useState(1);
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
    const params = new URLSearchParams({ limit: "20", page: String(recordPage) });
    for (const [key, value] of Object.entries(filters)) {
      if (value) params.set(key, value);
    }
    return params.toString();
  }, [filters, recordPage]);

  useEffect(() => {
    if (authStatus !== "authenticated" || !isReviewer(currentUser)) return;
    if (initialRunsResponse && initialRecordsResponse) return;

    let cancelled = false;
    setIsLoading(true);
    setError("");
    Promise.all([
      fetchJson(`/api/imports?limit=20&page=${runPage}`),
      fetchJson(`/api/imports/source-records?${query}`),
    ])
      .then(([runResult, recordResult]) => {
        if (cancelled) return;
        setRuns(runResult);
        setRecords(recordResult);
        setSelectedRecord((current) => current || recordResult.items?.[0] || null);
      })
      .catch((fetchError) => {
        if (!cancelled) setError(fetchError instanceof Error ? fetchError.message : "Import review fetch failed");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authStatus, currentUser, initialRecordsResponse, initialRunsResponse, query, refreshToken, runPage]);

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
    setRecordPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function clearFilters() {
    setSelectedRunId("");
    setRunPage(1);
    setRecordPage(1);
    setFilters({
      sourceType: "",
      recordType: "",
      status: "",
      linkType: "",
      reviewNeeded: "",
      warningsPresent: "",
      importRunId: "",
    });
  }

  function selectRun(runId) {
    setSelectedRunId(runId);
    setRecordPage(1);
    updateFilter("importRunId", runId);
  }

  if (authStatus === "checking") {
    return (
      <main className="auth-page">
        <section className="auth-panel auth-panel-compact" aria-live="polite">
          <div className="auth-brand">
            <span className="brand-logo">SKV</span>
            <span className="brand-badge">Import review</span>
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
            <span className="brand-badge">Import review</span>
          </div>
          <h1>Access denied</h1>
          <p className="auth-message">Import review requires ADMIN or MANAGER role.</p>
          <button className="primary-button auth-submit" onClick={handleLogout} type="button">Logout</button>
        </section>
      </main>
    );
  }

  return (
    <main className="console-app import-review-page">
      <header className="global-header">
        <div className="brand">
          <span className="brand-logo">SKV</span>
          <span className="brand-badge">Import review</span>
        </div>
        <nav className="main-nav" aria-label="Import review navigation">
          <a className="nav-item" href="/">Console</a>
          <span className="nav-item active">Imports</span>
        </nav>
        <div className="header-actions">
          <button className="user-menu" onClick={handleLogout} type="button" title="Logout">
            {currentUser?.name || "User"} <span>{currentUser?.role || ""}</span>
          </button>
        </div>
      </header>

      <div className="import-review-toolbar">
        <div>
          <h1>Import source review</h1>
          <p>Read-only ImportRun, SourceRecord, and EntitySourceLink inspection.</p>
        </div>
        <button className="outline-button" disabled={isLoading} onClick={() => setRefreshToken((current) => current + 1)} type="button">
          {isLoading ? "Loading" : "Refresh"}
        </button>
      </div>

      <SummaryStrip records={records} runs={runs} />

      <section className="import-filter-bar" aria-label="SourceRecord filters">
        <SelectField label="Source" onChange={(value) => updateFilter("sourceType", value)} options={sourceTypeOptions} value={filters.sourceType} />
        <SelectField label="Record type" onChange={(value) => updateFilter("recordType", value)} options={recordTypeOptions} value={filters.recordType} />
        <SelectField label="Status" onChange={(value) => updateFilter("status", value)} options={statusOptions} value={filters.status} />
        <SelectField label="Link type" onChange={(value) => updateFilter("linkType", value)} options={linkTypeOptions} value={filters.linkType} />
        <SelectField label="Review" onChange={(value) => updateFilter("reviewNeeded", value)} options={["", "true", "false"]} value={filters.reviewNeeded} />
        <SelectField label="Warnings" onChange={(value) => updateFilter("warningsPresent", value)} options={["", "true", "false"]} value={filters.warningsPresent} />
        <button className="ghost-button" onClick={clearFilters} type="button">Clear</button>
      </section>

      {error ? <div className="db-loading" role="alert">{error}</div> : null}

      <div className="import-review-grid">
        <div className="import-review-main">
          <ImportRunTable onPageChange={setRunPage} onSelectRun={selectRun} runs={runs} selectedRunId={selectedRunId || filters.importRunId} />
          <SourceRecordTable onPageChange={setRecordPage} onSelectRecord={setSelectedRecord} records={records} selectedRecordId={selectedRecord?.id} />
        </div>
        <SourceRecordDetail record={selectedRecord} />
      </div>
    </main>
  );
}
