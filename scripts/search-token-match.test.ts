import assert from "node:assert/strict";

import { textIncludesSearchTerm, textMatchesSearchQuery } from "../lib/search-token-match";

assert.equal(textMatchesSearchQuery("ARI platform", "AI"), false);
assert.equal(textMatchesSearchQuery("A R I platform", "AI"), false);
assert.equal(textMatchesSearchQuery("Gmail sync", "AI"), false);
assert.equal(textMatchesSearchQuery("mail notification", "AI"), false);

assert.equal(textMatchesSearchQuery("AI", "AI"), true);
assert.equal(textMatchesSearchQuery("AIエンジニア募集", "AI"), true);
assert.equal(textMatchesSearchQuery("生成AI案件", "AI"), true);
assert.equal(textMatchesSearchQuery("AI/ML platform", "AI"), true);

assert.equal(textMatchesSearchQuery("React TypeScript project", "react"), true);
assert.equal(textMatchesSearchQuery("React TypeScript project", "react project"), false);
assert.equal(textIncludesSearchTerm("JavaScript developer", "script"), true);

assert.equal(textMatchesSearchQuery("MySQL migration", "SQL"), true);
assert.equal(textMatchesSearchQuery("PostgreSQL database", "sql"), true);
assert.equal(textMatchesSearchQuery("SQL Server tuning", "sql"), true);
assert.equal(textMatchesSearchQuery("SQLAlchemy integration", "SQL"), false);

assert.equal(textMatchesSearchQuery("Go API", "go"), true);
assert.equal(textMatchesSearchQuery("Django API", "go"), false);
assert.equal(textMatchesSearchQuery("Vue.js frontend", "vue"), true);

console.log("search token match tests passed");
