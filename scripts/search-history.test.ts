import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  assertNoSensitiveSearchHistoryOutput,
  listSearchHistories,
  parseSearchHistoryListParams,
  publicSearchHistory,
  saveSearchHistory,
  validateSearchHistoryBody,
} from "../lib/search-history";

const user = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Sales User",
  email: "sales@example.test",
  role: "SALES",
} as const;

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    targetScope: "PROJECTS",
    queryText: "Java Spring",
    filters: {
      checkedFilters: { hideTradeNg: true, hasResult: false },
      filterValues: { skill: "Java", remote: ["remote"] },
      pageSize: 50,
      selectedFocus: ["direct"],
    },
    sortKey: "新着順",
    resultCount: 12,
    ...overrides,
  };
}

function savedRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    userId: user.id,
    targetScope: "PROJECTS",
    queryText: "Java Spring",
    filters: { filterValues: { skill: "Java" } },
    sortKey: "新着順",
    resultCount: 12,
    createdAt: new Date("2026-06-15T00:00:00.000Z"),
    ...overrides,
  };
}

function createMockDb() {
  const calls: any[] = [];
  return {
    calls,
    db: {
      searchHistory: {
        async findMany(args: any) {
          calls.push(["findMany", args]);
          return [savedRow()];
        },
        async create(args: any) {
          calls.push(["create", args]);
          return savedRow(args.data);
        },
      },
    },
  };
}

const parsed = validateSearchHistoryBody(validBody({ userId: "99999999-9999-4999-8999-999999999999" }));
assert.equal(parsed.targetScope, "PROJECTS");
assert.equal(parsed.queryText, "Java Spring");
assert.equal(parsed.sortKey, "新着順");
assert.equal(parsed.resultCount, 12);
assert.deepEqual(parsed.filters?.filterValues, { skill: "Java", remote: ["remote"] });

assert.deepEqual(validateSearchHistoryBody(validBody({ queryText: "   ", sortKey: "" })).queryText, null);
assert.throws(() => validateSearchHistoryBody(validBody({ targetScope: "ALL" })), /targetScope/);
assert.throws(() => validateSearchHistoryBody(validBody({ queryText: "x".repeat(301) })), /queryText/);
assert.throws(() => validateSearchHistoryBody(validBody({ filters: [] })), /filters/);
assert.throws(() => validateSearchHistoryBody(validBody({ filters: { memo: "x".repeat(8_100) } })), /filters payload/);
assert.throws(() => validateSearchHistoryBody(validBody({ resultCount: -1 })), /resultCount/);

const params = parseSearchHistoryListParams(new URL("https://example.test/api/search-histories?targetScope=PERSONS&limit=999"));
assert.deepEqual(params, { targetScope: "PERSONS", limit: 50 });
assert.throws(() => parseSearchHistoryListParams(new URL("https://example.test/api/search-histories?targetScope=BAD")), /targetScope/);
assert.throws(() => parseSearchHistoryListParams(new URL("https://example.test/api/search-histories?limit=zero")), /limit/);

const publicRow = publicSearchHistory(savedRow({ userId: "33333333-3333-4333-8333-333333333333" }));
assert.equal("userId" in publicRow, false);
assert.equal(publicRow.createdAt, "2026-06-15T00:00:00.000Z");
assertNoSensitiveSearchHistoryOutput(JSON.stringify(publicRow));
assert.throws(() => assertNoSensitiveSearchHistoryOutput(JSON.stringify({ userId: user.id })), /unsafe private data/);

async function main() {
  const listMock = createMockDb();
  const items = await listSearchHistories(listMock.db, user as any, { targetScope: "PROJECTS", limit: 20 });
  assert.equal(items.length, 1);
  const findArgs = listMock.calls.find(([name]) => name === "findMany")[1];
  assert.deepEqual(findArgs.where, { userId: user.id, targetScope: "PROJECTS" });
  assert.deepEqual(findArgs.orderBy, { createdAt: "desc" });
  assert.equal(findArgs.take, 20);

  const saveMock = createMockDb();
  const item = await saveSearchHistory(saveMock.db, user as any, validBody({ userId: "99999999-9999-4999-8999-999999999999" }));
  assert.equal(item.targetScope, "PROJECTS");
  const createArgs = saveMock.calls.find(([name]) => name === "create")[1];
  assert.equal(createArgs.data.userId, user.id);
  assert.equal(createArgs.data.targetScope, "PROJECTS");
  assert.equal(createArgs.data.queryText, "Java Spring");
  assert.equal(createArgs.data.filters.filterValues.skill, "Java");
  assert.equal(createArgs.data.resultCount, 12);

  const route = readFileSync("app/api/search-histories/route.ts", "utf8");
  assert.match(route, /export\s+async\s+function\s+GET\b/);
  assert.match(route, /export\s+async\s+function\s+POST\b/);
  assert.doesNotMatch(route, /export\s+async\s+function\s+(?:PUT|PATCH|DELETE)\b/);
  assert.match(route, /requireAnyRole/);

  const page = readFileSync("app/page.jsx", "utf8");
  assert.match(page, /SearchHistoryModal/);
  assert.match(page, /onOpenHistory/);
  assert.match(page, /applySearchHistory/);

  const modal = readFileSync("components/SearchHistoryModal.jsx", "utf8");
  assert.match(modal, /\/api\/search-histories/);
  assert.match(modal, /method:\s*"POST"/);

  console.log("search history tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
