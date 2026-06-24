import DropdownMenu from "./DropdownMenu";
import { focusOptions, pageSizeOptions, personFocusOptions, quickFilters, sortOptions, tabs } from "../data/mockProjects";

export const SEARCH_HISTORY_CONTEXT_KEY = "ses-console:search-history-context";

function isPlainObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function getSearchHistoryTarget(activeTab) {
  if (activeTab === "要員") return { targetLabel: "要員", targetScope: "PERSONS" };
  if (activeTab === "未分類") return { targetLabel: "未分類メール", targetScope: "MAILS" };
  return { targetLabel: "案件", targetScope: "PROJECTS" };
}

export function buildSearchHistoryContext({
  activeTab,
  activeConditions,
  checkedFilters,
  filterValues,
  pageSize,
  resultCount,
  search,
  selectedFocus,
  selectedSort
}) {
  const searchHistoryTarget = getSearchHistoryTarget(activeTab);

  return {
    ...searchHistoryTarget,
    activeTab,
    queryText: typeof search === "string" ? search : "",
    filters: {
      activeConditions: Array.isArray(activeConditions) ? activeConditions : [],
      checkedFilters: isPlainObject(checkedFilters) ? checkedFilters : {},
      filterValues: isPlainObject(filterValues) ? filterValues : {},
      pageSize,
      selectedFocus: Array.isArray(selectedFocus) ? selectedFocus : []
    },
    sortKey: typeof selectedSort === "string" ? selectedSort : null,
    resultCount: Number.isInteger(resultCount) ? resultCount : 0
  };
}

function saveSearchHistoryContext(context) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(SEARCH_HISTORY_CONTEXT_KEY, JSON.stringify(context));
  } catch {
    // 履歴保存UIの補助情報なので、sessionStorage不可でもモーダル表示は継続する。
  }
}

export default function SearchToolbar({
  activeTab,
  activeConditions,
  canCreate = true,
  checkedFilters,
  displayEnd = 0,
  displayStart = 0,
  filterValues = {},
  focusCount = 0,
  focusMenuOpen,
  onConditionRemove,
  onFocusToggle,
  onOpenCreate,
  onOpenFilter,
  onOpenHistory,
  onOpenKeyword,
  onQuickFilterChange,
  onRefresh,
  onRunSync,
  onSearchChange,
  onSortOpen,
  onSortSelect,
  onTabChange,
  pageSize,
  pageSizeMenuOpen,
  resultCount = 0,
  search,
  canRunSync = false,
  hasPendingRefresh = false,
  isSyncing = false,
  sortMenuOpen,
  selectedFocus = [],
  selectedSort,
  setPageSize,
  setPageSizeMenuOpen
}) {
  const isPersonTab = activeTab === "要員";
  const isUnclassifiedTab = activeTab === "未分類";
  const entityLabel = isUnclassifiedTab ? "未分類メール" : isPersonTab ? "要員" : "案件";
  const visibleQuickFilters = quickFilters.filter((filter) => !filter.showOn || filter.showOn.includes(activeTab));
  const getQuickFilterLabel = (filter) => (isPersonTab && filter.personLabel ? filter.personLabel : filter.label);
  const activeFocusOptions = isPersonTab ? personFocusOptions : focusOptions;
  const focusLabel = isPersonTab ? "注力要員" : "注力案件";
  const searchHelp =
    isUnclassifiedTab
      ? "Gmailから取り込んだ未分類メールを件名、送信者、本文、分類で検索できます"
      : isPersonTab
      ? "キーワード検索で検索可能な項目：要員名、所属会社、状態、希望単価、稼働開始、スキル"
      : "キーワード検索で検索可能な項目：作業内容、上位担当者、スキル、上位金額、作業場所";
  const handleOpenHistory = () => {
    saveSearchHistoryContext(buildSearchHistoryContext({
      activeTab,
      activeConditions,
      checkedFilters,
      filterValues,
      pageSize,
      search,
      selectedFocus,
      selectedSort,
      resultCount
    }));
    onOpenHistory?.();
  };

  return (
    <section className="search-area">
      <div className="toolbar-row">
        <div className="keyword-box">
          <span className="search-symbol">⌕</span>
          <input
            aria-label="キーワード検索"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="キーワード検索"
            value={search}
          />
          <button className="keyword-filter-button" onClick={onOpenKeyword} type="button" aria-label="キーワードフィルター">
            ⊜
          </button>
        </div>

        {!isUnclassifiedTab ? (
          <div className="relative">
            <button className={`toolbar-button focus-button ${focusMenuOpen ? "active" : ""}`} onClick={onFocusToggle} type="button">
              {focusLabel} <span className="count-pill">{focusCount}</span> <span>⌄</span>
            </button>
            {focusMenuOpen ? (
              <div className="focus-menu">
                {activeFocusOptions.map((option) => (
                  <label className="checkbox-row large" key={option.id}>
                    <input
                      checked={selectedFocus.includes(option.id)}
                      onChange={() => onQuickFilterChange(option.id, "focus")}
                      type="checkbox"
                    />
                    <span>{option.label}</span>
                    {option.marked ? <span className="red-dot" /> : null}
                  </label>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {!isUnclassifiedTab ? (
          <button className="toolbar-button" onClick={onOpenFilter} type="button">
            フィルター
          </button>
        ) : null}
        <button className="toolbar-button" onClick={handleOpenHistory} type="button">
          検索履歴
        </button>
        <button className="toolbar-button refresh" onClick={onRefresh} type="button">
          ↻ {hasPendingRefresh ? "表示を更新" : `${entityLabel}情報を更新`}
        </button>
        {canRunSync ? (
          <button className="toolbar-button refresh" disabled={isSyncing} onClick={onRunSync} type="button">
            {isSyncing ? "同期中" : "Gmail同期"}
          </button>
        ) : null}

        <div className="toolbar-spacer" />

        <div className="relative">
          <button className={`toolbar-button sort-button ${sortMenuOpen ? "active" : ""}`} onClick={onSortOpen} type="button">
            {selectedSort} <span className="info-dot">i</span> <span>⌄</span>
          </button>
          {sortMenuOpen ? (
            <DropdownMenu options={sortOptions} selected={selectedSort} onSelect={onSortSelect} align="right" wide />
          ) : null}
        </div>

        {!isUnclassifiedTab && canCreate ? (
          <button className="primary-button" onClick={onOpenCreate} type="button">
            ▣ {isPersonTab ? "要員作成" : "案件作成"}
          </button>
        ) : null}
      </div>

      <p className="search-help">{searchHelp}</p>

      {activeConditions.length ? (
        <div className="active-conditions" aria-label="適用中の条件">
          {activeConditions.map((condition) => (
            <div className="active-condition" key={condition.id}>
              <span>{condition.label}</span>
              <strong>{condition.value}</strong>
              <button onClick={() => onConditionRemove(condition.id)} type="button" aria-label={`${condition.label} 条件を削除`}>
                ×
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="quick-filter-grid">
        {visibleQuickFilters.map((filter) => (
          <label className="checkbox-row" key={filter.id}>
            <input
              checked={Boolean(checkedFilters[filter.id])}
              onChange={() => onQuickFilterChange(filter.id, "quick")}
              type="checkbox"
            />
            <span>{getQuickFilterLabel(filter)}</span>
            {filter.help ? <span className="help-dot">?</span> : null}
          </label>
        ))}
      </div>

      <div className="tabs-and-count">
        <div className="tabs" role="tablist" aria-label="一覧分類">
          {tabs.map((tab) => (
            <button
              className={`tab-button ${activeTab === tab ? "active" : ""}`}
              key={tab}
              onClick={() => onTabChange(tab)}
              role="tab"
              type="button"
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="result-controls">
          <span>
            {resultCount.toLocaleString()}件中 {displayStart.toLocaleString()}~{displayEnd.toLocaleString()}件を表示
          </span>
          <div className="relative page-size-control">
            <span>表示件数：</span>
            <button className={`select-button ${pageSizeMenuOpen ? "active" : ""}`} onClick={() => setPageSizeMenuOpen(!pageSizeMenuOpen)} type="button">
              {pageSize}件表示 <span>⌄</span>
            </button>
            {pageSizeMenuOpen ? (
              <DropdownMenu
                options={pageSizeOptions.map((value) => `${value}件表示`)}
                selected={`${pageSize}件表示`}
                onSelect={(label) => {
                  setPageSize(Number(label.replace("件表示", "")));
                  setPageSizeMenuOpen(false);
                }}
                align="right"
              />
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
