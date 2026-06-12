import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { describe, it } from "node:test";

import { MATCH_SUGGESTION_FORBIDDEN_PII_FIELDS } from "../../lib/matching/match-suggestion-schema";
import {
  matchSuggestionListFixture,
  reviewQueueFixture,
} from "../../lib/matching/match-suggestion-fixtures";

const require = createRequire(import.meta.url);
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { ReviewQueuePanel, SavedSuggestionsPanel } = require("./MatchSuggestionPanels.jsx");

describe("match suggestion panel components", () => {
  it("renders saved suggestions without PII/raw field names", () => {
    const html = renderToStaticMarkup(
      React.createElement(SavedSuggestionsPanel, {
        items: matchSuggestionListFixture,
        pageInfo: {
          page: 1,
          pageSize: 20,
          totalCount: 2,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      }),
    );

    assert.match(html, /Saved suggestions/);
    assert.match(html, /APPROVED/);
    assert.doesNotMatch(html, /companyName|personName|mailBody|rawCsvRow|localPath|secret/);
    for (const field of MATCH_SUGGESTION_FORBIDDEN_PII_FIELDS) {
      assert.equal(html.includes(field), false, `${field} must not render`);
    }
  });

  it("renders review queue priority and reasons", () => {
    const html = renderToStaticMarkup(
      React.createElement(ReviewQueuePanel, {
        items: reviewQueueFixture,
      }),
    );

    assert.match(html, /Review queue/);
    assert.match(html, /105/);
    assert.match(html, /STATUS_NEEDS_REVIEW/);
    assert.doesNotMatch(html, /companyName|personName|mailBody|rawCsvRow|localPath|secret/);
  });
});

