import DropdownMenu from "./DropdownMenu";
import { focusOptions, pageSizeOptions, quickFilters, sortOptions, tabs } from "../data/mockProjects";

export default function SearchToolbar({
  activeTab,
  activeConditions,
  checkedFilters,
  focusMenuOpen,
  onConditionRemove,
  onFocusToggle,
  onOpenCreate,
  onOpenFilter,
  onOpenHistory,
  onOpenKeyword,
  onQuickFilterChange,
  onSearchChange,
  onSortOpen,
  onSortSelect,
  onTabChange,
  pageSize,
  pageSizeMenuOpen,
  search,
  sortMenuOpen,
  selectedFocus,
  selectedSort,
  setPageSize,
  setPageSizeMenuOpen
}) {
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

        <div className="relative">
          <button className={`toolbar-button focus-button ${focusMenuOpen ? "active" : ""}`} onClick={onFocusToggle} type="button">
            注力案件 <span className="count-pill">75</span> <span>⌄</span>
          </button>
          {focusMenuOpen ? (
            <div className="focus-menu">
              {focusOptions.map((option) => (
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

        <button className="toolbar-button" onClick={onOpenFilter} type="button">
          フィルター
        </button>
        <button className="toolbar-button" onClick={onOpenHistory} type="button">
          検索履歴
        </button>
        <button className="toolbar-button refresh" type="button">
          ↻ 案件情報を更新
        </button>

        <div className="toolbar-spacer" />

        <div className="relative">
          <button className={`toolbar-button sort-button ${sortMenuOpen ? "active" : ""}`} onClick={onSortOpen} type="button">
            {selectedSort} <span className="info-dot">i</span> <span>⌄</span>
          </button>
          {sortMenuOpen ? (
            <DropdownMenu options={sortOptions} selected={selectedSort} onSelect={onSortSelect} align="right" wide />
          ) : null}
        </div>

        <button className="primary-button" onClick={onOpenCreate} type="button">
          ▣ 案件登録
        </button>
      </div>

      <p className="search-help">キーワード検索で検索可能な項目：作業内容、上位担当者、スキル、上位金額、作業場所</p>

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
        {quickFilters.map((filter) => (
          <label className="checkbox-row" key={filter.id}>
            <input
              checked={Boolean(checkedFilters[filter.id])}
              onChange={() => onQuickFilterChange(filter.id, "quick")}
              type="checkbox"
            />
            <span>{filter.label}</span>
            {filter.help ? <span className="help-dot">?</span> : null}
          </label>
        ))}
      </div>

      <div className="tabs-and-count">
        <div className="tabs" role="tablist" aria-label="案件カテゴリ">
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
          <span>143,742件中 1~{pageSize}件を表示</span>
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
