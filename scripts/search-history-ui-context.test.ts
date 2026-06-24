import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

type ToolbarHelpers = {
  SEARCH_HISTORY_CONTEXT_KEY: string;
  buildSearchHistoryContext(input: Record<string, unknown>): Record<string, any>;
  getSearchHistoryTarget(activeTab: string): Record<string, string>;
};

type ModalHelpers = {
  SEARCH_HISTORY_CONTEXT_KEY: string;
  normalizeSearchHistoryContext(value: unknown): Record<string, any>;
  readSearchHistoryContextFromStorage(storage: { getItem(key: string): string | null }): Record<string, any>;
};

function evaluateHelperBlock<T>(sourcePath: string, startPattern: string, endPattern: string, exports: string[]): T {
  const source = readFileSync(sourcePath, "utf8");
  const start = source.indexOf(startPattern);
  assert.notEqual(start, -1, `${sourcePath} must contain ${startPattern}`);
  const end = source.indexOf(endPattern, start);
  assert.notEqual(end, -1, `${sourcePath} must contain ${endPattern}`);
  const helperSource = source
    .slice(start, end)
    .replace(/\bexport\s+(?=(?:const|function)\b)/g, "");

  const context = { result: {} as Record<string, unknown> };
  vm.runInNewContext(
    `${helperSource}\n${exports.map((name) => `result.${name} = ${name};`).join("\n")}`,
    context,
    { filename: sourcePath }
  );

  return context.result as T;
}

const toolbarHelpers = evaluateHelperBlock<ToolbarHelpers>(
  "components/SearchToolbar.jsx",
  "export const SEARCH_HISTORY_CONTEXT_KEY",
  "function saveSearchHistoryContext",
  ["SEARCH_HISTORY_CONTEXT_KEY", "buildSearchHistoryContext", "getSearchHistoryTarget"]
);

const modalHelpers = evaluateHelperBlock<ModalHelpers>(
  "components/SearchHistoryModal.jsx",
  "export const SEARCH_HISTORY_CONTEXT_KEY",
  "function readCurrentContext",
  ["SEARCH_HISTORY_CONTEXT_KEY", "normalizeSearchHistoryContext", "readSearchHistoryContextFromStorage"]
);

const {
  SEARCH_HISTORY_CONTEXT_KEY: toolbarContextKey,
  buildSearchHistoryContext,
  getSearchHistoryTarget
} = toolbarHelpers;
const {
  SEARCH_HISTORY_CONTEXT_KEY: modalContextKey,
  normalizeSearchHistoryContext,
  readSearchHistoryContextFromStorage
} = modalHelpers;

function toPlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createStorage(raw: string | null) {
  return {
    getItem(key: string) {
      assert.equal(key, toolbarContextKey);
      return raw;
    }
  };
}

function testSharedStorageKey() {
  assert.equal(toolbarContextKey, "ses-console:search-history-context");
  assert.equal(modalContextKey, toolbarContextKey);
}

function testToolbarTargetScopes() {
  assert.deepEqual(toPlain(getSearchHistoryTarget("案件")), { targetLabel: "案件", targetScope: "PROJECTS" });
  assert.deepEqual(toPlain(getSearchHistoryTarget("要員")), { targetLabel: "要員", targetScope: "PERSONS" });
  assert.deepEqual(toPlain(getSearchHistoryTarget("未分類")), { targetLabel: "未分類メール", targetScope: "MAILS" });
  assert.deepEqual(toPlain(getSearchHistoryTarget("unknown")), { targetLabel: "案件", targetScope: "PROJECTS" });
}

function testToolbarContextPayloadByTab() {
  const tabs = [
    ["案件", "案件", "PROJECTS"],
    ["要員", "要員", "PERSONS"],
    ["未分類", "未分類メール", "MAILS"]
  ] as const;

  for (const [activeTab, targetLabel, targetScope] of tabs) {
    const context = toPlain(buildSearchHistoryContext({
      activeTab,
      activeConditions: [{ label: "スキル", value: "React" }],
      checkedFilters: { hasResult: true },
      filterValues: { skill: "React" },
      pageSize: 50,
      resultCount: 12,
      search: "React",
      selectedFocus: ["direct"],
      selectedSort: "新着順"
    }));

    assert.equal(context.targetLabel, targetLabel);
    assert.equal(context.targetScope, targetScope);
    assert.equal(context.activeTab, activeTab);
    assert.equal(context.queryText, "React");
    assert.deepEqual(context.filters, {
      activeConditions: [{ label: "スキル", value: "React" }],
      checkedFilters: { hasResult: true },
      filterValues: { skill: "React" },
      pageSize: 50,
      selectedFocus: ["direct"]
    });
    assert.equal(context.sortKey, "新着順");
    assert.equal(context.resultCount, 12);
  }
}

function testToolbarContextPayloadDefaults() {
  const context = toPlain(buildSearchHistoryContext({
    activeTab: "案件",
    activeConditions: null,
    checkedFilters: null,
    filterValues: null,
    pageSize: undefined,
    resultCount: 1.5,
    search: null,
    selectedFocus: null,
    selectedSort: null
  }));

  assert.equal(context.queryText, "");
  assert.deepEqual(context.filters.activeConditions, []);
  assert.deepEqual(context.filters.checkedFilters, {});
  assert.deepEqual(context.filters.filterValues, {});
  assert.deepEqual(context.filters.selectedFocus, []);
  assert.equal(context.sortKey, null);
  assert.equal(context.resultCount, 0);
}

function testModalContextNormalizesBrokenValues() {
  assert.deepEqual(toPlain(normalizeSearchHistoryContext(null)), {
    targetLabel: "案件",
    targetScope: "PROJECTS",
    queryText: "",
    filters: {},
    sortKey: "おすすめ順",
    resultCount: 0
  });

  const invalidScope = toPlain(normalizeSearchHistoryContext({
    targetLabel: "要員",
    targetScope: "BROKEN",
    queryText: 123,
    filters: [],
    sortKey: null,
    resultCount: "9"
  }));

  assert.equal(invalidScope.targetLabel, "案件");
  assert.equal(invalidScope.targetScope, "PROJECTS");
  assert.equal(invalidScope.queryText, "");
  assert.deepEqual(invalidScope.filters, {});
  assert.equal(invalidScope.sortKey, "おすすめ順");
  assert.equal(invalidScope.resultCount, 0);
}

function testModalContextDerivesLabelFromScope() {
  const persons = toPlain(normalizeSearchHistoryContext({
    targetLabel: "案件",
    targetScope: "PERSONS",
    queryText: "React",
    filters: { selectedFocus: ["direct"] },
    sortKey: "新着順",
    resultCount: 7
  }));

  assert.equal(persons.targetLabel, "要員");
  assert.equal(persons.targetScope, "PERSONS");
  assert.equal(persons.queryText, "React");
  assert.deepEqual(persons.filters, { selectedFocus: ["direct"] });
  assert.equal(persons.sortKey, "新着順");
  assert.equal(persons.resultCount, 7);

  const mails = toPlain(normalizeSearchHistoryContext({ targetScope: "MAILS" }));
  assert.equal(mails.targetLabel, "未分類メール");
  assert.equal(mails.targetScope, "MAILS");
}

function testModalStorageReaderFallsBackSafely() {
  assert.equal(readSearchHistoryContextFromStorage(createStorage("{broken json")).targetScope, "PROJECTS");
  assert.equal(readSearchHistoryContextFromStorage(createStorage(null)).targetScope, "PROJECTS");

  const context = buildSearchHistoryContext({
    activeTab: "未分類",
    activeConditions: [],
    checkedFilters: {},
    filterValues: { exclude: "spam" },
    pageSize: 20,
    resultCount: 3,
    search: "invoice",
    selectedFocus: [],
    selectedSort: "新着順"
  });

  const stored = toPlain(readSearchHistoryContextFromStorage(createStorage(JSON.stringify(context))));
  assert.equal(stored.targetLabel, "未分類メール");
  assert.equal(stored.targetScope, "MAILS");
  assert.equal(stored.queryText, "invoice");
  assert.deepEqual(stored.filters, {
    activeConditions: [],
    checkedFilters: {},
    filterValues: { exclude: "spam" },
    pageSize: 20,
    selectedFocus: []
  });
}

testSharedStorageKey();
testToolbarTargetScopes();
testToolbarContextPayloadByTab();
testToolbarContextPayloadDefaults();
testModalContextNormalizesBrokenValues();
testModalContextDerivesLabelFromScope();
testModalStorageReaderFallsBackSafely();

console.log("search-history UI context tests passed");
