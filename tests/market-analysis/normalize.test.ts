import assert from "node:assert/strict";

import {
  normalizeRegion,
  normalizeSkillName,
  normalizeWorkStyle,
  pickProjectPrice,
  toPriceBand,
} from "../../lib/market-analysis/normalize";

assert.equal(normalizeSkillName("Java"), "Java");
assert.equal(normalizeSkillName("JAVA"), "Java");
assert.equal(normalizeSkillName("JS"), "JavaScript");
assert.equal(normalizeSkillName("JavaScript"), "JavaScript");
assert.equal(normalizeSkillName("AWS"), "AWS");
assert.equal(normalizeSkillName("Amazon Web Services"), "AWS");
assert.equal(normalizeSkillName("React"), "React");
assert.equal(normalizeSkillName("React.js"), "React");
assert.equal(normalizeSkillName("PYTHON"), "Python");
assert.equal(normalizeSkillName("php"), "PHP");
assert.equal(normalizeSkillName(null), "unknown");
assert.equal(normalizeSkillName(""), "unknown");

assert.equal(normalizeRegion({ prefecture: "東京都", workLocationText: null }), "東京");
assert.equal(normalizeRegion({ prefecture: null, workLocationText: "渋谷駅近辺" }), "東京");
assert.equal(normalizeRegion({ preferredLocation: "新宿希望" }), "東京");
assert.equal(normalizeRegion({ prefecture: "大阪府", workLocationText: null }), "大阪");
assert.equal(normalizeRegion({ preferredLocation: "梅田または淀屋橋" }), "大阪");
assert.equal(normalizeRegion({ preferredLocation: "名古屋" }), "愛知");
assert.equal(normalizeRegion({ preferredLocation: "博多" }), "福岡");
assert.equal(normalizeRegion({ preferredLocation: "横浜" }), "神奈川");
assert.equal(normalizeRegion({ preferredLocation: "" }), "unknown");

assert.equal(normalizeWorkStyle(null, "フルリモート案件"), "FULL_REMOTE");
assert.equal(normalizeWorkStyle(null, "完全リモート"), "FULL_REMOTE");
assert.equal(normalizeWorkStyle(null, "リモート可"), "REMOTE");
assert.equal(normalizeWorkStyle(null, "一部リモート 週2出社"), "HYBRID");
assert.equal(normalizeWorkStyle(null, "常駐"), "ONSITE");
assert.equal(normalizeWorkStyle(null, "オンサイト"), "ONSITE");
assert.equal(normalizeWorkStyle("REMOTE", "常駐"), "REMOTE");
assert.equal(normalizeWorkStyle(null, null), "UNKNOWN");

assert.equal(toPriceBand(null), "unknown");
assert.equal(toPriceBand(undefined), "unknown");
assert.equal(toPriceBand(0), "unknown");
assert.equal(toPriceBand(49.999), "under_50");
assert.equal(toPriceBand(50), "50_60");
assert.equal(toPriceBand(59.999), "50_60");
assert.equal(toPriceBand(60), "60_70");
assert.equal(toPriceBand(70), "70_80");
assert.equal(toPriceBand(80), "80_over");

assert.equal(pickProjectPrice({ upperAmountMax: 90, upperAmountMin: 80, unitPriceMax: 70, unitPriceMin: 60 }), 90);
assert.equal(pickProjectPrice({ upperAmountMax: null, upperAmountMin: 80, unitPriceMax: 70, unitPriceMin: 60 }), 80);
assert.equal(pickProjectPrice({ upperAmountMax: null, upperAmountMin: null, unitPriceMax: 70, unitPriceMin: 60 }), 70);
assert.equal(pickProjectPrice({ upperAmountMax: null, upperAmountMin: null, unitPriceMax: null, unitPriceMin: 60 }), 60);
assert.equal(pickProjectPrice({ upperAmountMax: null, upperAmountMin: null, unitPriceMax: null, unitPriceMin: null }), null);

console.log("normalize market-analysis tests passed");
