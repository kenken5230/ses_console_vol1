"use client";

import { useEffect, useMemo, useState } from "react";

function formatHistoryTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function buildChips(item) {
  const filters = item.filters || {};
  const chips = [];
  if (item.queryText) chips.push(`検索: ${item.queryText}`);
  if (item.sortKey) chips.push(`並び替え: ${item.sortKey}`);
  if (item.resultCount !== null && item.resultCount !== undefined) chips.push(`${Number(item.resultCount).toLocaleString()}件`);
  if (Array.isArray(filters.selectedFocus) && filters.selectedFocus.length) chips.push(`注力: ${filters.selectedFocus.length}`);
  if (filters.filterValues && typeof filters.filterValues === "object") {
    const activeFilterCount = Object.values(filters.filterValues).filter((value) => {
      if (Array.isArray(value)) return value.length > 0;
      return Boolean(value);
    }).length;
    if (activeFilterCount) chips.push(`条件: ${activeFilterCount}`);
  }
  return chips.length ? chips.slice(0, 5) : ["条件なし"];
}

export default function SearchHistoryModal({
  currentFilters,
  currentResultCount,
  currentSearch,
  currentSortKey,
  onApply,
  onClose,
  onSaved,
  targetLabel,
  targetScope,
}) {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  const payload = useMemo(
    () => ({
      targetScope,
      queryText: currentSearch,
      filters: currentFilters,
      sortKey: currentSortKey,
      resultCount: currentResultCount,
    }),
    [currentFilters, currentResultCount, currentSearch, currentSortKey, targetScope],
  );

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadHistory() {
      setIsLoading(true);
      setMessage("");
      try {
        const response = await fetch(`/api/search-histories?targetScope=${encodeURIComponent(targetScope)}&limit=20`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.message || "検索履歴の取得に失敗しました");
        setItems(Array.isArray(result.items) ? result.items : []);
      } catch (error) {
        if (error?.name !== "AbortError") {
          setMessage(error instanceof Error ? error.message : "検索履歴の取得に失敗しました");
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    loadHistory();
    return () => controller.abort();
  }, [targetScope]);

  const saveCurrentHistory = async () => {
    setIsSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/search-histories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "検索履歴の保存に失敗しました");
      if (result.item) setItems((current) => [result.item, ...current].slice(0, 20));
      setMessage("現在の検索条件を保存しました");
      onSaved?.("検索履歴を保存しました");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "検索履歴の保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="history-modal" role="dialog" aria-modal="true" aria-label={`${targetLabel}の検索履歴`} onClick={(event) => event.stopPropagation()}>
        <div className="modal-heading compact">
          <h2>検索履歴</h2>
          <button className="modal-close" onClick={onClose} type="button" aria-label="閉じる">
            ×
          </button>
        </div>
        <div className="history-actions">
          <div>
            <strong>{targetLabel}</strong>
            <span>現在の検索条件を保存し、過去の条件を再適用できます</span>
          </div>
          <button className="primary-button" disabled={isSaving} onClick={saveCurrentHistory} type="button">
            {isSaving ? "保存中" : "現在の検索を保存"}
          </button>
        </div>
        {message ? <p className="history-message">{message}</p> : null}
        <div className="history-list">
          {isLoading ? <p className="history-empty">検索履歴を読み込んでいます</p> : null}
          {!isLoading && !items.length ? <p className="history-empty">保存された検索履歴はありません</p> : null}
          {!isLoading
            ? items.map((item) => (
                <article className="history-item" key={item.id}>
                  <div>
                    <div className="history-chips">
                      {buildChips(item).map((chip) => (
                        <span className="condition-chip" key={chip}>
                          {chip}
                        </span>
                      ))}
                    </div>
                    <time dateTime={item.createdAt}>{formatHistoryTime(item.createdAt)}</time>
                  </div>
                  <button className="outline-primary" onClick={() => onApply(item)} type="button">
                    適用
                  </button>
                </article>
              ))
            : null}
        </div>
      </section>
    </div>
  );
}
