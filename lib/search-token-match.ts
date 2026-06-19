function normalizeSearchValue(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function isAsciiWordChar(character: string): boolean {
  return /^[a-z0-9]$/i.test(character || "");
}

function hasAsciiTokenBoundary(text: string, startIndex: number, tokenLength: number): boolean {
  const before = startIndex > 0 ? text[startIndex - 1] : "";
  const after = text[startIndex + tokenLength] || "";
  return !isAsciiWordChar(before) && !isAsciiWordChar(after);
}

function isShortAsciiToken(term: string): boolean {
  return /^[a-z0-9]{1,3}$/.test(term);
}

const SQL_COMPATIBLE_TECH_TERMS: ReadonlySet<string> = new Set(["mysql", "postgresql", "mssql", "plsql", "tsql", "sqlserver"]);

function normalizeAsciiTechnologyToken(token: string): string {
  return token.replace(/[^a-z0-9]/g, "");
}

function hasKnownEmbeddedShortAsciiMatch(text: string, term: string): boolean {
  if (term !== "sql") return false;

  const tokens = text.match(/[a-z0-9][a-z0-9.+#-]*/g) ?? [];
  return tokens.some((token) => SQL_COMPATIBLE_TECH_TERMS.has(normalizeAsciiTechnologyToken(token)));
}

export function textIncludesSearchTerm(text: unknown, term: unknown): boolean {
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

  return hasKnownEmbeddedShortAsciiMatch(haystack, needle);
}

export const textMatchesSearchQuery = textIncludesSearchTerm;
