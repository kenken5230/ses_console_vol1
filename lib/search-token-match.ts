function normalizeSearchValue(value) {
  return String(value ?? "").trim().toLowerCase();
}

function isAsciiWordChar(character) {
  return /^[a-z0-9]$/i.test(character || "");
}

function hasAsciiTokenBoundary(text, startIndex, tokenLength) {
  const before = startIndex > 0 ? text[startIndex - 1] : "";
  const after = text[startIndex + tokenLength] || "";
  return !isAsciiWordChar(before) && !isAsciiWordChar(after);
}

function isShortAsciiToken(term) {
  return /^[a-z0-9]{1,3}$/.test(term);
}

export function textIncludesSearchTerm(text, term) {
  const haystack = normalizeSearchValue(text);
  const needle = normalizeSearchValue(term);
  if (!needle) return true;

  if (!isShortAsciiToken(needle)) {
    return haystack.includes(needle);
  }

  let index = haystack.indexOf(needle);
  while (index !== -1) {
    if (hasAsciiTokenBoundary(haystack, index, needle.length)) return true;
    index = haystack.indexOf(needle, index + 1);
  }

  return false;
}

export function textMatchesSearchQuery(text, query) {
  return textIncludesSearchTerm(text, query);
}
