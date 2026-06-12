import React from "react";

const EMPTY = "-";

export function MatchSuggestionStatusBadge({ status }) {
  return <span className={`match-suggestion-badge status-${String(status || "").toLowerCase()}`}>{status || EMPTY}</span>;
}

export function DownstreamReadinessBadge({ readiness }) {
  return <span className={`match-suggestion-badge readiness-${String(readiness || "").toLowerCase()}`}>{readiness || EMPTY}</span>;
}

export function SavedSuggestionsPanel({ items = [], pageInfo, onSelect }) {
  return (
    <section className="match-suggestion-panel" aria-label="Saved suggestions">
      <div className="match-suggestion-panel__header">
        <h2>Saved suggestions</h2>
        {pageInfo ? (
          <span className="match-suggestion-panel__meta">
            Page {pageInfo.page} / {Math.max(pageInfo.totalPages, 1)}
          </span>
        ) : null}
      </div>
      {items.length ? (
        <div className="match-suggestion-table-wrap">
          <table className="match-suggestion-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Readiness</th>
                <th>Project ref</th>
                <th>Person ref</th>
                <th>Score</th>
                <th>Warnings</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} onClick={() => onSelect?.(item.id)}>
                  <td><MatchSuggestionStatusBadge status={item.status} /></td>
                  <td><DownstreamReadinessBadge readiness={item.downstreamReadiness} /></td>
                  <td>{shortRef(item.projectRef?.id)}</td>
                  <td>{shortRef(item.personRef?.id)}</td>
                  <td>{item.score || EMPTY}</td>
                  <td>{formatWarnings(item)}</td>
                  <td>{formatDate(item.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="match-suggestion-empty">No saved suggestions</p>
      )}
    </section>
  );
}

export function ReviewQueuePanel({ items = [], onSelect }) {
  return (
    <section className="match-suggestion-panel" aria-label="Review queue">
      <div className="match-suggestion-panel__header">
        <h2>Review queue</h2>
        <span className="match-suggestion-panel__meta">{items.length} items</span>
      </div>
      {items.length ? (
        <div className="match-suggestion-queue">
          {items.map((item) => (
            <button key={item.id} type="button" className="match-suggestion-queue__item" onClick={() => onSelect?.(item.id)}>
              <span className="match-suggestion-queue__priority">{item.queuePriority}</span>
              <span className="match-suggestion-queue__body">
                <span className="match-suggestion-queue__title">
                  {shortRef(item.projectRef?.id)} / {shortRef(item.personRef?.id)}
                </span>
                <span className="match-suggestion-queue__reasons">{item.queueReasons?.join(", ") || EMPTY}</span>
              </span>
              <MatchSuggestionStatusBadge status={item.status} />
            </button>
          ))}
        </div>
      ) : (
        <p className="match-suggestion-empty">No review queue items</p>
      )}
    </section>
  );
}

function shortRef(value) {
  if (!value) return EMPTY;
  return String(value).slice(0, 12);
}

function formatDate(value) {
  if (!value) return EMPTY;
  return String(value).slice(0, 10);
}

function formatWarnings(item) {
  const values = [
    item.warningSeverity !== "NONE" ? item.warningSeverity : "",
    item.stalenessState !== "FRESH" ? item.stalenessState : "",
    item.duplicateState !== "NONE" ? item.duplicateState : "",
    item.sourceEvidenceState,
  ].filter(Boolean);
  return values.length ? values.join(" / ") : EMPTY;
}

