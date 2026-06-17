import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  assertNoSensitiveSearchHistoryOutput,
  listSearchHistories,
  parseSearchHistoryListParams,
  publicSearchHistory,
  saveSearchHistory,
  SearchHistoryRequestError,
  validateSearchHistoryBody
} from "../lib/search-history";

const user = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "QA User",
  email: "qa@example.test",
  role: "ADMIN" as const
};

function assertThrowsStatus(fn: () => unknown, status: number) {
  assert.throws(fn, (error) => error instanceof SearchHistoryRequestError && error.status === status);
}

async function testListUsesCurrentUserOnly() {
  const calls: unknown[] = [];
  const db = {
    searchHistory: {
      async findMany(args: unknown) {
        calls.push(args);
        return [
          {
            id: "history-1",
            userId: user.id,
            targetScope: "PROJECTS",
            queryText: "AI",
            filters: { activeConditions: [] },
            sortKey: "おすすめ順",
            resultCount: 12,
            createdAt: new Date("2026-06-15T00:00:00.000Z")
          }
        ];
      },
      async create() {
        throw new Error("not used");
      }
    }
  };

  const rows = await listSearchHistories(db, user, { targetScope: "PROJECTS", limit: 20 });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    where: { userId: user.id, targetScope: "PROJECTS" },
    orderBy: { createdAt: "desc" },
    take: 20
  });
  assert.equal(rows[0].queryText, "AI");
  assertNoSensitiveSearchHistoryOutput(rows);
}

async function testSaveIgnoresSpoofedUserId() {
  const calls: unknown[] = [];
  const db = {
    searchHistory: {
      async findMany() {
        throw new Error("not used");
      },
      async create(args: unknown) {
        calls.push(args);
        return {
          id: "history-2",
          userId: user.id,
          targetScope: "PERSONS",
          queryText: "React",
          filters: { activeConditions: [{ label: "スキル", value: "React" }] },
          sortKey: "新着順",
          resultCount: 3,
          createdAt: new Date("2026-06-15T01:00:00.000Z")
        };
      }
    }
  };

  const row = await saveSearchHistory(db, user, {
    userId: "spoofed-user",
    targetScope: "PERSONS",
    queryText: "React",
    filters: { activeConditions: [{ label: "スキル", value: "React" }] },
    sortKey: "新着順",
    resultCount: 3
  });

  assert.deepEqual(calls[0], {
    data: {
      userId: user.id,
      targetScope: "PERSONS",
      queryText: "React",
      filters: { activeConditions: [{ label: "スキル", value: "React" }] },
      sortKey: "新着順",
      resultCount: 3
    }
  });
  assert.equal(row.queryText, "React");
  assertNoSensitiveSearchHistoryOutput(row);
}

function testValidationCaps() {
  const params = parseSearchHistoryListParams(new URL("http://localhost/api/search-histories?targetScope=MAILS&limit=500"));
  assert.equal(params.targetScope, "MAILS");
  assert.equal(params.limit, 50);

  assert.equal(validateSearchHistoryBody({ targetScope: "PROJECTS", queryText: "  AI  " }).queryText, "AI");
  assertThrowsStatus(() => validateSearchHistoryBody({ targetScope: "INVALID" }), 400);
  assertThrowsStatus(() => validateSearchHistoryBody({ targetScope: "PROJECTS", queryText: "x".repeat(301) }), 400);
  assertThrowsStatus(() => validateSearchHistoryBody({ targetScope: "PROJECTS", sortKey: "x".repeat(121) }), 400);
  assertThrowsStatus(() => validateSearchHistoryBody({ targetScope: "PROJECTS", resultCount: 1_000_001 }), 400);
  assertThrowsStatus(() => validateSearchHistoryBody({ targetScope: "PROJECTS", filters: { blob: "x".repeat(8_100) } }), 400);
}

function testPublicResponseShape() {
  const row = publicSearchHistory({
    id: "history-3",
    userId: "must-not-leak",
    targetScope: "PROJECTS",
    queryText: "Python",
    filters: {},
    sortKey: "名前順",
    resultCount: 8,
    createdAt: new Date("2026-06-15T02:00:00.000Z")
  });

  assert.deepEqual(Object.keys(row), ["id", "targetScope", "queryText", "filters", "sortKey", "resultCount", "createdAt"]);
  assertNoSensitiveSearchHistoryOutput(row);
}

function testSourceWiring() {
  const route = readFileSync("app/api/search-histories/route.ts", "utf8");
  assert.match(route, /export async function GET/);
  assert.match(route, /export async function POST/);
  assert.match(route, /requireAnyRole/);
  assert.match(route, /listSearchHistories/);
  assert.match(route, /saveSearchHistory/);

  const modal = readFileSync("components/SearchHistoryModal.jsx", "utf8");
  assert.match(modal, /\/api\/search-histories/);
  assert.match(modal, /保存した検索履歴/);
  assert.match(modal, /保存された検索履歴はありません/);
  assert.match(modal, /検索履歴を読み込んでいます/);
  assert.match(modal, /保存中/);
  assert.doesNotMatch(modal, /searchHistories/);
  assert.doesNotMatch(modal, /サンプル検索履歴/);

  const toolbar = readFileSync("components/SearchToolbar.jsx", "utf8");
  assert.match(toolbar, /ses-console:search-history-context/);
  assert.match(toolbar, /sessionStorage\.setItem/);
  assert.match(toolbar, /onOpenHistory/);

  const data = readFileSync("data/mockProjects.js", "utf8");
  assert.doesNotMatch(data, /export const searchHistories/);
}

await testListUsesCurrentUserOnly();
await testSaveIgnoresSpoofedUserId();
testValidationCaps();
testPublicResponseShape();
testSourceWiring();

console.log("search-history tests passed");
