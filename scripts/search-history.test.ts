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

function readSource(path: string) {
  return readFileSync(path, "utf8");
}

function extractExportedFunctionBody(source: string, functionName: string) {
  const declaration = new RegExp(`export\\s+(?:async\\s+)?function\\s+${functionName}\\s*\\(`);
  const match = declaration.exec(source);
  assert(match, `${functionName} must be exported`);

  const signatureStart = source.indexOf("(", match.index);
  assert(signatureStart !== -1, `${functionName} must have a parameter list`);

  let signatureDepth = 0;
  let signatureEnd = -1;
  for (let index = signatureStart; index < source.length; index += 1) {
    const character = source[index];
    if (character === "(") signatureDepth += 1;
    if (character === ")") {
      signatureDepth -= 1;
      if (signatureDepth === 0) {
        signatureEnd = index;
        break;
      }
    }
  }

  assert(signatureEnd !== -1, `${functionName} must have a balanced parameter list`);

  const bodyStart = source.indexOf("{", signatureEnd);
  assert(bodyStart !== -1, `${functionName} must have a function body`);

  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    const character = source[index];
    if (character === "{") depth += 1;
    if (character === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(bodyStart + 1, index);
    }
  }

  assert.fail(`${functionName} must have a balanced function body`);
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

async function testSaveSanitizesFilterUserIdentifiers() {
  const calls: unknown[] = [];
  const db = {
    searchHistory: {
      async findMany() {
        throw new Error("not used");
      },
      async create(args: unknown) {
        calls.push(args);
        const createArgs = args as { data: Record<string, unknown> };
        return {
          id: "history-4",
          ...createArgs.data,
          createdAt: new Date("2026-06-15T03:00:00.000Z")
        };
      }
    }
  };

  const row = await saveSearchHistory(db, user, {
    targetScope: "PROJECTS",
    queryText: "React",
    filters: {
      userId: "filter-spoof",
      user_id: "legacy-filter-spoof",
      user: { id: "nested-user-object" },
      ownerId: "owner-spoof",
      owner_id: "legacy-owner-spoof",
      createdBy: "creator-spoof",
      created_by: "legacy-creator-spoof",
      activeConditions: [
        { field: "skill", value: "React", userId: "condition-user", user: "condition-user" },
        { field: "location", value: "Tokyo", meta: { owner_id: "nested-owner", created_by: "nested-creator", keep: "visible" } }
      ],
      nested: {
        createdBy: "nested-creator",
        child: { userId: "nested-user", keep: "safe" }
      }
    },
    sortKey: "新着順",
    resultCount: 3
  });

  const expectedFilters = {
    activeConditions: [
      { field: "skill", value: "React" },
      { field: "location", value: "Tokyo", meta: { keep: "visible" } }
    ],
    nested: {
      child: { keep: "safe" }
    }
  };

  assert.deepEqual((calls[0] as { data: { filters: unknown } }).data.filters, expectedFilters);
  assert.deepEqual(row.filters, expectedFilters);
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
    filters: {
      keep: "visible",
      userId: "filter-user-must-not-leak",
      nested: { ownerId: "filter-owner-must-not-leak", keep: true }
    },
    sortKey: "名前順",
    resultCount: 8,
    createdAt: new Date("2026-06-15T02:00:00.000Z")
  });

  assert.deepEqual(Object.keys(row), ["id", "targetScope", "queryText", "filters", "sortKey", "resultCount", "createdAt"]);
  assert.deepEqual(row.filters, { keep: "visible", nested: { keep: true } });
  assertNoSensitiveSearchHistoryOutput(row);
}

function testRouteBoundaryWiring() {
  const route = readSource("app/api/search-histories/route.ts");
  assert.match(route, /export\s+async\s+function\s+GET\s*\(/);
  assert.match(route, /export\s+async\s+function\s+POST\s*\(/);
  assert.match(route, /requireAnyRole/);

  const getBody = extractExportedFunctionBody(route, "GET");
  assert.match(getBody, /requireAnyRole\s*\(\s*request\s*,\s*\[\.\.\.SEARCH_HISTORY_ROLES\]\s*\)/);
  assert.match(getBody, /parseSearchHistoryListParams\s*\(\s*new URL\s*\(\s*request\.url\s*\)\s*\)/);
  assert.match(getBody, /listSearchHistories\s*\(\s*prisma\s*,\s*user\s*,\s*params\s*\)/);
  assert.match(getBody, /NextResponse\.json\s*\(\s*\{\s*items\s*\}\s*\)/);
  assert.doesNotMatch(getBody, /request\.json\s*\(/);

  const postBody = extractExportedFunctionBody(route, "POST");
  assert.match(postBody, /requireAnyRole\s*\(\s*request\s*,\s*\[\.\.\.SEARCH_HISTORY_ROLES\]\s*\)/);
  assert.match(postBody, /request\.json\s*\(\s*\)\.catch\s*\(/);
  assert.match(postBody, /new SearchHistoryRequestError\s*\(\s*400\s*,\s*"request body must be valid JSON"\s*\)/);
  assert.match(postBody, /saveSearchHistory\s*\(\s*prisma\s*,\s*user\s*,\s*body\s*\)/);
  assert.match(postBody, /NextResponse\.json\s*\(\s*\{\s*item\s*\}\s*,\s*\{\s*status:\s*201\s*\}\s*\)/);
  assert.doesNotMatch(postBody, /\bbody\s*(?:\.\s*userId|\[\s*["']userId["']\s*\])/);
  assert.doesNotMatch(postBody, /\buserId\s*:\s*body\b/);
}

function testSearchHistoryServiceBoundaryWiring() {
  const service = readSource("lib/search-history.ts");

  const listBody = extractExportedFunctionBody(service, "listSearchHistories");
  assert.match(listBody, /userId:\s*user\.id/);
  assert.match(listBody, /rows\.map\s*\(\s*\(row\)\s*=>\s*publicSearchHistory\s*\(\s*row\s+as\s+RawSearchHistory\s*\)\s*\)/);

  const saveBody = extractExportedFunctionBody(service, "saveSearchHistory");
  assert.match(saveBody, /validateSearchHistoryBody\s*\(\s*input\s*\)/);
  assert.match(saveBody, /db\.searchHistory\.create\s*\(\s*\{[\s\S]*data:\s*\{[\s\S]*userId:\s*user\.id[\s\S]*targetScope:\s*data\.targetScope/);
  assert.match(saveBody, /return\s+publicSearchHistory\s*\(\s*row\s+as\s+RawSearchHistory\s*\)/);
  assert.doesNotMatch(saveBody, /\binput\s*(?:\.\s*userId|\[\s*["']userId["']\s*\])/);
  assert.doesNotMatch(saveBody, /\bdata\s*(?:\.\s*userId|\[\s*["']userId["']\s*\])/);
}

function testSourceWiring() {
  const modal = readSource("components/SearchHistoryModal.jsx");
  assert.match(modal, /\/api\/search-histories/);
  assert.match(modal, /保存した検索履歴/);
  assert.match(modal, /保存された検索履歴はありません/);
  assert.match(modal, /検索履歴を読み込んでいます/);
  assert.match(modal, /未認証またはセッション期限切れです/);
  assert.match(modal, /保存中/);
  assert.doesNotMatch(modal, /searchHistories/);
  assert.doesNotMatch(modal, /サンプル検索履歴/);

  const toolbar = readSource("components/SearchToolbar.jsx");
  assert.match(toolbar, /ses-console:search-history-context/);
  assert.match(toolbar, /sessionStorage\.setItem/);
  assert.match(toolbar, /onOpenHistory/);

  const data = readSource("data/mockProjects.js");
  assert.doesNotMatch(data, /export const searchHistories/);
}

async function main() {
  await testListUsesCurrentUserOnly();
  await testSaveIgnoresSpoofedUserId();
  await testSaveSanitizesFilterUserIdentifiers();
  testValidationCaps();
  testPublicResponseShape();
  testRouteBoundaryWiring();
  testSearchHistoryServiceBoundaryWiring();
  testSourceWiring();

  console.log("search-history tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
