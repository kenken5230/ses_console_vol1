"use client";

import { useEffect, useMemo, useState } from "react";

export const SEARCH_HISTORY_CONTEXT_KEY = "ses-console:search-history-context";

const searchHistoryTargetsByScope = {
  PROJECTS: { targetLabel: "案件", targetScope: "PROJECTS" },
  PERSONS: { targetLabel: "要員", targetScope: "PERSONS" },
  MAILS: { targetLabel: "未分類メール", targetScope: "MAILS" }
};

const defaultContext = {
  ...searchHistoryTargetsByScope.PROJECTS,
  queryText: "",
  filters: {},
  sortKey: "おすすめ順",
  resultCount: 0
};

function isPlainObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function normalizeSearchHistoryContext(value) {
  if (!isPlainObject(value)) return defaultContext;

  const target = searchHistoryTargetsByScope[value.targetScope] || searchHistoryTargetsByScope.PROJECTS;

  return {
    ...defaultContext,
    ...target,
    activeTab: typeof value.activeTab === "string" ? value.activeTab : undefined,
    filters: isPlainObject(value.filters) ? value.filters : {},
    queryText: typeof value.queryText === "string" ? value.queryText : "",
    sortKey: typeof value.sortKey === "string" ? value.sortKey : "おすすめ順",
    resultCount: Number.isInteger(value.resultCount) ? value.resultCount : 0
  };
}

export function readSearchHistoryContextFromStorage(storage) {
  try {
    const raw = storage?.getItem(SEARCH_HISTORY_CONTEXT_KEY);
    if (!raw) return defaultContext;
    const parsed = JSON.parse(raw);
    return normalizeSearchHistoryContext(parsed);
  } catch {
    return defaultContext;
  }
}

function readCurrentContext() {
  if (typeof window === "undefined") return defaultContext;
  return readSearchHistoryContextFromStorage(window.sessionStorage);
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "保存日時不明";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function buildChips(item) {
  const chips = [];
  if (item.queryText) chips.push(`キーワード ${item.queryText}`);
  if (item.sortKey) chips.push(`並び ${item.sortKey}`);
  if (Number.isInteger(item.resultCount)) chips.push(`保存時 ${item.resultCount.toLocaleString()}件`);

  const filters = isPlainObject(item.filters) ? item.filters : {};
  const activeConditions = Array.isArray(filters.activeConditions) ? filters.activeConditions : [];
  for (const condition of activeConditions.slice(0, 4)) {
    if (condition?.label && condition?.value) chips.push(`${condition.label} ${condition.value}`);
  }

  if (!chips.length) chips.push("条件なし");
  return chips;
}

async function readErrorMessage(response, fallback) {
  const payload = await response.json().catch(() => ({}));
  if (response.status === 401) return "未認証またはセッション期限切れです";
  return payload?.message || fallback;
}

export default function SearchHistoryModal({ onApply, onClose }) {
  const [currentContext] = useState(() => readCurrentContext());
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const targetLabel = currentContext.targetLabel || "案件";
  const targetScope = currentContext.targetScope || "PROJECTS";
  const currentSummary = useMemo(() => buildChips({ ...currentContext, createdAt: new Date().toISOString() }), [currentContext]);

  const loadHistories = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const params = new URLSearchParams({ targetScope, limit: "20" });
      const response = await fetch(`/api/search-histories?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(await readErrorMessage(response, "検索履歴を取得できませんでした"));
      const payload = await response.json();
      setItems(Array.isArray(payload.items) ? payload.items : []);
    } catch (error) {
      setItems([]);
      setErrorMessage(error instanceof Error ? error.message : "検索履歴を取得できませんでした");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    loadHistories();
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage("");
    setErrorMessage("");
    try {
      const response = await fetch("/api/search-histories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetScope,
          queryText: currentContext.queryText || null,
          filters: currentContext.filters || {},
          sortKey: currentContext.sortKey || null,
          resultCount: Number.isInteger(currentContext.resultCount) ? currentContext.resultCount : null
        })
      });
      if (!response.ok) throw new Error(await readErrorMessage(response, "検索履歴を保存できませんでした"));
      const payload = await response.json();
      setItems((current) => [payload.item, ...current.filter((item) => item?.id !== payload.item?.id)].filter(Boolean).slice(0, 20));
      setMessage("現在の検索条件を保存しました");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "検索履歴を保存できませんでした");
    } finally {
      setIsSaving(false);
    }
  };

  const handleApply = (item) => {
    onApply({
      ...item,
      keyword: item.queryText || ""
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="history-modal" role="dialog" aria-modal="true" aria-label="保存した検索履歴" onClick={(event) => event.stopPropagation()}>
        <div className="modal-heading">
          <h2>保存した検索履歴</h2>
          <button className="modal-close" onClick={onClose} type="button" aria-label="閉じる">
            ×
          </button>
        </div>
        <div className="history-safety-note">
          <p>{targetLabel}の検索履歴をDBから取得します。表示されるのはログイン中ユーザー自身の履歴のみです。</p>
          <div className="history-chips" aria-label="保存対象の現在条件">
            {currentSummary.map((chip, index) => (
              <span className="condition-chip" key={`current-${index}-${chip}`}>
                {chip}
              </span>
            ))}
          </div>
          <button className="primary-button" disabled={isSaving} onClick={handleSave} type="button">
            {isSaving ? "保存中" : "現在の検索条件を保存"}
          </button>
          {message ? <p role="status">{message}</p> : null}
        </div>
        {errorMessage ? <div className="empty-state" role="alert">{errorMessage}</div> : null}
        {isLoading ? <div className="empty-state" role="status">検索履歴を読み込んでいます</div> : null}
        {!isLoading && !errorMessage && !items.length ? <div className="empty-state">保存された検索履歴はありません</div> : null}
        <div className="history-list">
          {items.map((history) => (
            <article className="history-item" key={history.id}>
              <div>
                <div className="history-chips">
                  {buildChips(history).map((chip, index) => (
                    <span className="condition-chip" key={`${history.id}-chip-${index}-${chip}`}>
                      {chip}
                    </span>
                  ))}
                </div>
                <time>{formatDateTime(history.createdAt)}</time>
              </div>
              <button className="outline-button" onClick={() => handleApply(history)} type="button">
                検索語を適用
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
