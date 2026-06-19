import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

export type NotionImportType = "project" | "person" | "auto";
type ResolvedNotionImportType = "project" | "person";
type RowAction = "would_create" | "would_need_review" | "would_skip" | "would_fail";
type ParseSignal = "not_provided" | "parsed" | "deferred" | "needs_review";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 1000;
const MAX_SAFE_LABEL_LENGTH = 64;
const LOW_COVERAGE_THRESHOLD = 0.35;

const REVIEW_REASONS = {
  autoTypeAmbiguous: "NOTION_AUTO_TYPE_AMBIGUOUS",
  noMappedColumns: "NOTION_NO_MAPPED_COLUMNS",
  rowWidthMismatch: "NOTION_ROW_WIDTH_MISMATCH",
  emptyRow: "NOTION_EMPTY_ROW",
  missingRequiredField: "NOTION_MISSING_REQUIRED_FIELD",
  lowFieldCoverage: "NOTION_LOW_FIELD_COVERAGE",
  unmappedValuePresent: "NOTION_UNMAPPED_VALUE_PRESENT",
  invalidAmount: "NOTION_INVALID_AMOUNT",
  invalidDate: "NOTION_INVALID_DATE",
  invalidAge: "NOTION_INVALID_AGE",
  sensitiveValueRedacted: "NOTION_SENSITIVE_VALUE_REDACTED",
  longTextRedacted: "NOTION_LONG_TEXT_REDACTED",
  personFocusReviewOnly: "NOTION_PERSON_FOCUS_REVIEW_ONLY",
} as const;

type ReviewReason = typeof REVIEW_REASONS[keyof typeof REVIEW_REASONS];

type TargetField = {
  model: string;
  field: string;
};

type FieldDefinition = {
  key: string;
  target: TargetField;
  synonyms: string[];
  notes: string[];
  headerWeight: number;
  required?: boolean;
  reviewOnly?: boolean;
  valueKind?: "amount" | "date" | "age" | "skills" | "focus";
};

type HeaderMatch = {
  columnIndex: number;
  columnName: string;
  target: TargetField;
  fieldKey: string;
  confidence: number;
  notes: string[];
};

type HeaderMapping = {
  fieldByIndex: Map<number, FieldDefinition>;
  mappedColumns: HeaderMatch[];
  unmappedColumns: Array<{ columnIndex: number; columnName: string; notes: string[] }>;
  score: number;
};

type CsvTable = {
  headers: string[];
  rows: string[][];
  fileRows: number;
};

export type NotionImportDryRunArgs = {
  file: string;
  type: NotionImportType;
  limit: number;
};

type TypeResolution = {
  requestedType: NotionImportType;
  resolvedType: ResolvedNotionImportType;
  detectedType: ResolvedNotionImportType | "review";
  confidence: number;
  projectScore: number;
  personScore: number;
  reviewReasons: ReviewReason[];
  notes: string[];
};

type RowAssessment = {
  rowNumber: number;
  action: RowAction;
  reviewReasons: ReviewReason[];
  targetPreview: {
    targetType: ResolvedNotionImportType | "unknown";
    model: "Project" | "Person" | "Unknown";
    presentTargetFields: string[];
    missingRequiredTargets: string[];
    fieldCoverageScore: number;
    parsedSignals: Record<string, ParseSignal>;
    counts: {
      mappedFields: number;
      mappedValues: number;
      unmappedValues: number;
      skillCount: number;
    };
    piiSafe: true;
  };
};

type InternalRowAssessment = RowAssessment & {
  values: Record<string, string>;
};

export type NotionImportDryRunReport = {
  summary: {
    mode: "notion-import-dry-run";
    readOnly: true;
    dbAccess: false;
    sourceType: "notion_csv";
    applySupported: false;
    requestedType: NotionImportType;
    resolvedType: ResolvedNotionImportType | "review";
    fileHash: string;
    fileBytes: number;
    fileRows: number;
    parsedRows: number;
    limit: number;
    defaultLimit: number;
    maxLimit: number;
    outputRedacted: true;
  };
  typeDetection: TypeResolution;
  mappedColumns: Array<{
    columnIndex: number;
    columnName: string;
    target: TargetField;
    confidence: number;
    notes: string[];
  }>;
  unmappedColumns: Array<{ columnIndex: number; columnName: string; notes: string[] }>;
  targetFieldCoverage: Record<string, {
    target: TargetField;
    mapped: boolean;
    required: boolean;
    presentRows: number;
    missingRows: number;
    coverage: number;
    notes: string[];
  }>;
  outcomes: Record<RowAction, number>;
  reviewReasonCounts: Record<string, number>;
  rows: RowAssessment[];
  notes: string[];
};

const projectFieldDefinitions: FieldDefinition[] = [
  {
    key: "title",
    target: { model: "Project", field: "title" },
    synonyms: ["案件名", "案件タイトル", "プロジェクト名", "title", "project title", "projectName", "name"],
    notes: ["project identity"],
    headerWeight: 3,
    required: true,
  },
  {
    key: "workDescription",
    target: { model: "Project", field: "workDescription" },
    synonyms: ["作業内容", "案件内容", "内容", "workDescription", "workContent", "description", "work"],
    notes: ["safe preview reports presence only"],
    headerWeight: 2,
    required: true,
  },
  {
    key: "businessDescription",
    target: { model: "Project", field: "businessDescription" },
    synonyms: ["業務内容", "業務概要", "businessDescription", "businessContent", "business"],
    notes: ["can satisfy the work description requirement when present"],
    headerWeight: 2,
  },
  {
    key: "unitPrice",
    target: { model: "ProjectCondition", field: "unitPriceText" },
    synonyms: ["単価", "金額", "amount", "unitPrice", "price", "rate", "月額", "予算"],
    notes: ["amount-like value is validated but not printed"],
    headerWeight: 1.5,
    valueKind: "amount",
  },
  {
    key: "upperAmount",
    target: { model: "ProjectCondition", field: "upperAmountMin/upperAmountMax" },
    synonyms: ["上位金額", "上位単価", "上位額", "upperAmount", "upperPrice"],
    notes: ["future importer should split min and max before DB write"],
    headerWeight: 1,
    valueKind: "amount",
  },
  {
    key: "workLocation",
    target: { model: "ProjectCondition", field: "workLocationText" },
    synonyms: ["勤務地", "場所", "location", "workLocation", "site", "最寄", "最寄駅"],
    notes: ["location presence only"],
    headerWeight: 1.5,
  },
  {
    key: "skills",
    target: { model: "ProjectSkill", field: "skillName" },
    synonyms: ["スキル", "必須スキル", "必要スキル", "技術", "skills", "skill", "requiredSkills", "technology", "technologies"],
    notes: ["skill count only in row preview"],
    headerWeight: 1,
    required: true,
    valueKind: "skills",
  },
  {
    key: "startMonth",
    target: { model: "ProjectCondition", field: "startMonth" },
    synonyms: ["開始", "開始月", "稼働開始", "参画時期", "start", "startMonth", "availableFrom"],
    notes: ["date-like value is validated but not printed"],
    headerWeight: 1,
    valueKind: "date",
  },
  {
    key: "commercialFlow",
    target: { model: "ProjectCompanyRole", field: "roleOrder/notes" },
    synonyms: ["商流", "商流制限", "flow", "commercialFlow"],
    notes: ["relationship preview only"],
    headerWeight: 2,
  },
  {
    key: "upperCompany",
    target: { model: "ProjectCompanyRole", field: "company:UPPER_COMPANY" },
    synonyms: ["上位会社", "上位", "会社名", "company", "upperCompany"],
    notes: ["company label is not printed"],
    headerWeight: 2,
  },
  {
    key: "endClient",
    target: { model: "ProjectCompanyRole", field: "company:END_USER" },
    synonyms: ["エンド", "エンドユーザー", "エンド会社", "end", "endClient", "endUser"],
    notes: ["company label is not printed"],
    headerWeight: 2,
  },
  {
    key: "primeCompany",
    target: { model: "ProjectCompanyRole", field: "company:PRIME_CONTRACTOR" },
    synonyms: ["元請", "元請会社", "プライム", "prime", "primeCompany", "primeContractor"],
    notes: ["company label is not printed"],
    headerWeight: 2,
  },
  {
    key: "status",
    target: { model: "Project", field: "status" },
    synonyms: ["ステータス", "状態", "status"],
    notes: ["status value is not printed"],
    headerWeight: 0.5,
  },
  {
    key: "focus",
    target: { model: "Project", field: "isFocus" },
    synonyms: ["注力", "注力案件", "focus", "isFocus"],
    notes: ["boolean-like focus signal"],
    headerWeight: 0.5,
    valueKind: "focus",
  },
];

const personFieldDefinitions: FieldDefinition[] = [
  {
    key: "name",
    target: { model: "Person", field: "name" },
    synonyms: ["氏名", "名前", "要員名", "人材名", "name", "personName"],
    notes: ["person label is not printed"],
    headerWeight: 3,
    required: true,
  },
  {
    key: "initials",
    target: { model: "Person", field: "initials" },
    synonyms: ["イニシャル", "initial", "initials"],
    notes: ["can satisfy identity when name is absent"],
    headerWeight: 2.5,
    required: true,
  },
  {
    key: "skills",
    target: { model: "PersonSkill", field: "skillName" },
    synonyms: ["スキル", "保有スキル", "skill", "skills", "technology", "technologies"],
    notes: ["skill count only in row preview"],
    headerWeight: 1,
    required: true,
    valueKind: "skills",
  },
  {
    key: "desiredUnitPrice",
    target: { model: "Person", field: "desiredUnitPrice" },
    synonyms: ["希望単価", "単価", "金額", "amount", "desiredUnitPrice", "rate", "price"],
    notes: ["amount-like value is validated but not printed"],
    headerWeight: 2,
    valueKind: "amount",
  },
  {
    key: "ownerCompany",
    target: { model: "Person", field: "ownerCompanyId" },
    synonyms: ["所属", "所属会社", "会社", "会社名", "company", "ownerCompany"],
    notes: ["company label is not printed"],
    headerWeight: 1.5,
  },
  {
    key: "availableFrom",
    target: { model: "Person", field: "availableFrom" },
    synonyms: ["稼働開始", "開始", "参画可能", "availableFrom", "availability", "start"],
    notes: ["date-like value is validated but not printed"],
    headerWeight: 1.5,
    valueKind: "date",
  },
  {
    key: "nationality",
    target: { model: "Person", field: "nationality" },
    synonyms: ["国籍", "nationality"],
    notes: ["presence only"],
    headerWeight: 2,
  },
  {
    key: "age",
    target: { model: "Person", field: "age" },
    synonyms: ["年齢", "age"],
    notes: ["age validity only"],
    headerWeight: 2,
    valueKind: "age",
  },
  {
    key: "status",
    target: { model: "Person", field: "status" },
    synonyms: ["ステータス", "状態", "status"],
    notes: ["status value is not printed"],
    headerWeight: 0.5,
  },
  {
    key: "focusNote",
    target: { model: "Person", field: "focusNote" },
    synonyms: ["注力", "注力要員", "focus"],
    notes: ["review-only; Person has no persisted focus field yet"],
    headerWeight: 0.5,
    reviewOnly: true,
    valueKind: "focus",
  },
  {
    key: "roleHeadline",
    target: { model: "Person", field: "summary" },
    synonyms: ["職種", "役割", "ロール", "role", "roleHeadline", "position"],
    notes: ["optional headline presence only"],
    headerWeight: 1,
  },
];

function hashText(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function normalizeText(value: string | undefined): string {
  return String(value ?? "").trim();
}

function isBlank(value: string | undefined): boolean {
  return normalizeText(value).length === 0;
}

function normalizeHeader(value: string): string {
  return value
    .trim()
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s_\-./\\:|()[\]{}"'`、。・･／（）［］【】「」『』:：〜~]+/g, "");
}

function normalizedCell(value: string | undefined): string {
  return normalizeText(value).normalize("NFKC");
}

function splitSkills(value: string | undefined): string[] {
  return normalizedCell(value)
    .split(/[,;\n、，／/・|]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function isSensitiveLike(value: string): boolean {
  const text = value.normalize("NFKC");
  return [
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
    /\b(?:postgres(?:ql)?|mysql|sqlserver):\/\//i,
    /\b(?:DATABASE_URL|DIRECT_URL|SMTP_PASSWORD|GMAIL_REFRESH_TOKEN|API[_-]?KEY|TOKEN|PASSWORD|SECRET)\b/i,
    /\bBearer\s+[A-Za-z0-9._-]+/i,
    /-----BEGIN [A-Z ]+KEY-----/,
    /[A-Z]:[\\/]/i,
    /[\\/](?:Users|home)[\\/]/i,
  ].some((pattern) => pattern.test(text));
}

function safeLabel(value: string, fallback: string): string {
  const normalized = normalizedCell(value).replace(/[\r\n\t]+/g, " ");
  if (!normalized) return fallback;
  if (isSensitiveLike(normalized)) return "[redacted:sensitive]";
  if (normalized.length > MAX_SAFE_LABEL_LENGTH) return `${normalized.slice(0, MAX_SAFE_LABEL_LENGTH)}...`;
  return normalized;
}

function parseCsv(text: string): CsvTable {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        current += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  if (inQuotes) throw new Error("Malformed CSV: unclosed quote.");

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  const headerIndex = rows.findIndex((candidate) => candidate.some((cell) => !isBlank(cell)));
  if (headerIndex < 0) return { headers: [], rows: [], fileRows: 0 };

  const headers = rows[headerIndex];
  const bodyRows = rows.slice(headerIndex + 1);
  while (bodyRows.length > 0 && bodyRows[bodyRows.length - 1].every((cell) => isBlank(cell))) {
    bodyRows.pop();
  }

  return {
    headers: headers.map((header) => normalizedCell(header)),
    rows: bodyRows,
    fileRows: bodyRows.length,
  };
}

function synonymMap(definitions: FieldDefinition[]): Map<string, FieldDefinition> {
  const map = new Map<string, FieldDefinition>();
  for (const definition of definitions) {
    const values = [
      definition.key,
      definition.target.field,
      `${definition.target.model}.${definition.target.field}`,
      ...definition.synonyms,
    ];
    for (const value of values) map.set(normalizeHeader(value), definition);
  }
  return map;
}

function mapHeaders(headers: string[], definitions: FieldDefinition[]): HeaderMapping {
  const lookup = synonymMap(definitions);
  const fieldByIndex = new Map<number, FieldDefinition>();
  const mappedColumns: HeaderMatch[] = [];
  const unmappedColumns: HeaderMapping["unmappedColumns"] = [];
  let score = 0;

  headers.forEach((header, columnIndex) => {
    const normalized = normalizeHeader(header);
    if (!normalized) return;
    const definition = lookup.get(normalized);
    if (!definition) {
      unmappedColumns.push({
        columnIndex,
        columnName: safeLabel(header, `column-${columnIndex + 1}`),
        notes: ["no target field mapping"],
      });
      return;
    }

    fieldByIndex.set(columnIndex, definition);
    mappedColumns.push({
      columnIndex,
      columnName: safeLabel(header, `column-${columnIndex + 1}`),
      target: definition.target,
      fieldKey: definition.key,
      confidence: 0.95,
      notes: definition.notes,
    });
    score += definition.headerWeight;
  });

  return { fieldByIndex, mappedColumns, unmappedColumns, score };
}

function mergeMappedColumns(mappings: HeaderMapping[]): NotionImportDryRunReport["mappedColumns"] {
  const seen = new Set<string>();
  const columns: NotionImportDryRunReport["mappedColumns"] = [];
  for (const mapping of mappings) {
    for (const column of mapping.mappedColumns) {
      const key = `${column.columnIndex}:${column.target.model}:${column.target.field}`;
      if (seen.has(key)) continue;
      seen.add(key);
      columns.push({
        columnIndex: column.columnIndex,
        columnName: column.columnName,
        target: column.target,
        confidence: column.confidence,
        notes: column.notes,
      });
    }
  }
  return columns.sort((left, right) => left.columnIndex - right.columnIndex);
}

function mergeUnmappedColumns(mappings: HeaderMapping[]): HeaderMapping["unmappedColumns"] {
  const seenMappedIndexes = new Set<number>();
  for (const mapping of mappings) {
    for (const column of mapping.mappedColumns) seenMappedIndexes.add(column.columnIndex);
  }

  const seen = new Set<number>();
  const columns: HeaderMapping["unmappedColumns"] = [];
  for (const mapping of mappings) {
    for (const column of mapping.unmappedColumns) {
      if (seen.has(column.columnIndex) || seenMappedIndexes.has(column.columnIndex)) continue;
      seen.add(column.columnIndex);
      columns.push(column);
    }
  }
  return columns.sort((left, right) => left.columnIndex - right.columnIndex);
}

function resolveType(
  requestedType: NotionImportType,
  projectMapping: HeaderMapping,
  personMapping: HeaderMapping,
): TypeResolution {
  if (requestedType === "project" || requestedType === "person") {
    return {
      requestedType,
      resolvedType: requestedType,
      detectedType: requestedType,
      confidence: 1,
      projectScore: projectMapping.score,
      personScore: personMapping.score,
      reviewReasons: [],
      notes: [`requested type: ${requestedType}`],
    };
  }

  const total = projectMapping.score + personMapping.score;
  const confidence = total === 0 ? 0 : Number((Math.max(projectMapping.score, personMapping.score) / total).toFixed(4));
  const scoreGap = Math.abs(projectMapping.score - personMapping.score);
  const resolvedType = projectMapping.score >= personMapping.score ? "project" : "person";
  const ambiguous = total === 0 || (projectMapping.score > 0 && personMapping.score > 0 && scoreGap < 2);

  return {
    requestedType,
    resolvedType,
    detectedType: ambiguous ? "review" : resolvedType,
    confidence,
    projectScore: Number(projectMapping.score.toFixed(2)),
    personScore: Number(personMapping.score.toFixed(2)),
    reviewReasons: ambiguous ? [REVIEW_REASONS.autoTypeAmbiguous] : [],
    notes: ambiguous
      ? ["auto type could not be resolved from headers"]
      : [`auto type resolved from headers: ${resolvedType}`],
  };
}

function rowToValues(row: string[], mapping: HeaderMapping): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [columnIndex, definition] of mapping.fieldByIndex.entries()) {
    const value = normalizedCell(row[columnIndex]);
    if (!isBlank(value) && !values[definition.key]) values[definition.key] = value;
  }
  return values;
}

function requiredTargetLabels(type: ResolvedNotionImportType, values: Record<string, string>): string[] {
  if (type === "project") {
    const missing: string[] = [];
    if (isBlank(values.title)) missing.push("Project.title");
    if (isBlank(values.workDescription) && isBlank(values.businessDescription)) {
      missing.push("Project.workDescription_or_businessDescription");
    }
    if (splitSkills(values.skills).length === 0) missing.push("ProjectSkill.skillName");
    return missing;
  }

  const missing: string[] = [];
  if (isBlank(values.name) && isBlank(values.initials)) missing.push("Person.name_or_initials");
  if (splitSkills(values.skills).length === 0) missing.push("PersonSkill.skillName");
  return missing;
}

function parseAmountSignal(value: string | undefined): ParseSignal {
  const text = normalizedCell(value);
  if (!text) return "not_provided";
  if (/^(応相談|要相談|未定|調整|ASK|TBD)$/i.test(text)) return "deferred";
  const compact = text.replace(/[,\s]/g, "");
  if (/\d/.test(compact) && /^[0-9.万円万kK円〜~\-以上以下前後税込税別]+$/.test(compact)) return "parsed";
  return "needs_review";
}

function parseDateSignal(value: string | undefined): ParseSignal {
  const text = normalizedCell(value);
  if (!text) return "not_provided";
  if (/^(即日|随時|応相談|要相談|未定|調整|ASAP|TBD)$/i.test(text)) return "deferred";
  if (/^\d{4}[-/]\d{1,2}(?:[-/]\d{1,2})?$/.test(text)) return "parsed";
  if (/^\d{4}年\d{1,2}月(?:\d{1,2}日)?$/.test(text)) return "parsed";
  if (/^\d{1,2}月(?:\d{1,2}日)?$/.test(text)) return "parsed";
  return "needs_review";
}

function parseAgeSignal(value: string | undefined): ParseSignal {
  const text = normalizedCell(value);
  if (!text) return "not_provided";
  const compact = text.replace(/[歳才\s]/g, "");
  if (!/^\d{1,3}$/.test(compact)) return "needs_review";
  const age = Number(compact);
  return age >= 16 && age <= 85 ? "parsed" : "needs_review";
}

function parseFocusSignal(value: string | undefined): ParseSignal {
  const text = normalizedCell(value);
  if (!text) return "not_provided";
  if (/^(true|false|yes|no|1|0|該当|非該当|あり|なし|有|無|注力)$/i.test(text)) return "parsed";
  return "deferred";
}

function parsedSignals(definitions: FieldDefinition[], values: Record<string, string>): Record<string, ParseSignal> {
  const signals: Record<string, ParseSignal> = {};
  for (const definition of definitions) {
    if (!definition.valueKind) continue;
    const targetKey = `${definition.target.model}.${definition.target.field}`;
    if (definition.valueKind === "amount") signals[targetKey] = parseAmountSignal(values[definition.key]);
    if (definition.valueKind === "date") signals[targetKey] = parseDateSignal(values[definition.key]);
    if (definition.valueKind === "age") signals[targetKey] = parseAgeSignal(values[definition.key]);
    if (definition.valueKind === "skills") {
      signals[targetKey] = splitSkills(values[definition.key]).length > 0 ? "parsed" : "not_provided";
    }
    if (definition.valueKind === "focus") signals[targetKey] = parseFocusSignal(values[definition.key]);
  }
  return signals;
}

function rowHasSensitiveValue(row: string[]): boolean {
  return row.some((cell) => isSensitiveLike(cell));
}

function rowHasLongValue(row: string[]): boolean {
  return row.some((cell) => normalizedCell(cell).length > 180);
}

function countUnmappedValues(row: string[], unmappedColumns: HeaderMapping["unmappedColumns"]): number {
  return unmappedColumns.filter((column) => !isBlank(row[column.columnIndex])).length;
}

function pushUnique<T>(items: T[], value: T): void {
  if (!items.includes(value)) items.push(value);
}

function assessRow(params: {
  row: string[];
  rowNumber: number;
  headers: string[];
  typeResolution: TypeResolution;
  mapping: HeaderMapping;
  definitions: FieldDefinition[];
  unmappedColumns: HeaderMapping["unmappedColumns"];
}): InternalRowAssessment {
  const { row, rowNumber, headers, typeResolution, mapping, definitions, unmappedColumns } = params;
  const reviewReasons: ReviewReason[] = [...typeResolution.reviewReasons];

  if (row.every((cell) => isBlank(cell))) {
    return {
      rowNumber,
      action: "would_skip",
      reviewReasons: [REVIEW_REASONS.emptyRow],
      values: {},
      targetPreview: {
        targetType: "unknown",
        model: "Unknown",
        presentTargetFields: [],
        missingRequiredTargets: [],
        fieldCoverageScore: 0,
        parsedSignals: {},
        counts: { mappedFields: 0, mappedValues: 0, unmappedValues: 0, skillCount: 0 },
        piiSafe: true,
      },
    };
  }

  if (row.length > headers.length) pushUnique(reviewReasons, REVIEW_REASONS.rowWidthMismatch);
  if (mapping.mappedColumns.length === 0) pushUnique(reviewReasons, REVIEW_REASONS.noMappedColumns);
  if (rowHasSensitiveValue(row)) pushUnique(reviewReasons, REVIEW_REASONS.sensitiveValueRedacted);
  if (rowHasLongValue(row)) pushUnique(reviewReasons, REVIEW_REASONS.longTextRedacted);

  const values = rowToValues(row, mapping);
  const missingRequiredTargets = requiredTargetLabels(typeResolution.resolvedType, values);
  if (missingRequiredTargets.length > 0) pushUnique(reviewReasons, REVIEW_REASONS.missingRequiredField);

  const presentTargetFields = definitions
    .filter((definition) => !isBlank(values[definition.key]))
    .map((definition) => `${definition.target.model}.${definition.target.field}`)
    .filter((value, index, all) => all.indexOf(value) === index)
    .sort();

  const mappedFieldCount = new Set(mapping.mappedColumns.map((column) => column.fieldKey)).size;
  const mappedValueCount = Object.keys(values).length;
  const fieldCoverageScore = mappedFieldCount === 0 ? 0 : Number((mappedValueCount / mappedFieldCount).toFixed(4));
  if (fieldCoverageScore > 0 && fieldCoverageScore < LOW_COVERAGE_THRESHOLD) {
    pushUnique(reviewReasons, REVIEW_REASONS.lowFieldCoverage);
  }

  const unmappedValueCount = countUnmappedValues(row, unmappedColumns);
  if (unmappedValueCount > 0) pushUnique(reviewReasons, REVIEW_REASONS.unmappedValuePresent);

  const signals = parsedSignals(definitions, values);
  for (const [target, signal] of Object.entries(signals)) {
    if (signal !== "needs_review") continue;
    if (/amount|unitPrice|upperAmount|desiredUnitPrice/i.test(target)) pushUnique(reviewReasons, REVIEW_REASONS.invalidAmount);
    if (/startMonth|availableFrom/i.test(target)) pushUnique(reviewReasons, REVIEW_REASONS.invalidDate);
    if (/\.age$/i.test(target)) pushUnique(reviewReasons, REVIEW_REASONS.invalidAge);
  }

  if (typeResolution.resolvedType === "person" && !isBlank(values.focusNote)) {
    pushUnique(reviewReasons, REVIEW_REASONS.personFocusReviewOnly);
  }

  const action: RowAction = reviewReasons.includes(REVIEW_REASONS.rowWidthMismatch)
    ? "would_fail"
    : reviewReasons.length > 0
      ? "would_need_review"
      : "would_create";

  const targetType = typeResolution.detectedType === "review" ? "unknown" : typeResolution.resolvedType;
  const model = targetType === "project" ? "Project" : targetType === "person" ? "Person" : "Unknown";

  return {
    rowNumber,
    action,
    reviewReasons,
    values,
    targetPreview: {
      targetType,
      model,
      presentTargetFields,
      missingRequiredTargets,
      fieldCoverageScore,
      parsedSignals: signals,
      counts: {
        mappedFields: mappedFieldCount,
        mappedValues: mappedValueCount,
        unmappedValues: unmappedValueCount,
        skillCount: splitSkills(values.skills).length,
      },
      piiSafe: true,
    },
  };
}

function coverageKey(definition: FieldDefinition): string {
  return `${definition.target.model}.${definition.target.field}`;
}

function buildTargetFieldCoverage(
  definitions: FieldDefinition[],
  mapping: HeaderMapping,
  rows: InternalRowAssessment[],
): NotionImportDryRunReport["targetFieldCoverage"] {
  const mappedKeys = new Set(mapping.mappedColumns.map((column) => `${column.target.model}.${column.target.field}`));
  const result: NotionImportDryRunReport["targetFieldCoverage"] = {};

  for (const definition of definitions) {
    const key = coverageKey(definition);
    if (result[key]) continue;

    const presentRows = rows.filter((row) => !isBlank(row.values[definition.key])).length;
    const missingRows = rows.length - presentRows;
    result[key] = {
      target: definition.target,
      mapped: mappedKeys.has(key),
      required: Boolean(definition.required),
      presentRows,
      missingRows,
      coverage: rows.length === 0 ? 0 : Number((presentRows / rows.length).toFixed(4)),
      notes: definition.notes,
    };
  }

  return Object.fromEntries(Object.entries(result).sort(([left], [right]) => left.localeCompare(right)));
}

function countByAction(rows: RowAssessment[]): Record<RowAction, number> {
  return {
    would_create: rows.filter((row) => row.action === "would_create").length,
    would_need_review: rows.filter((row) => row.action === "would_need_review").length,
    would_skip: rows.filter((row) => row.action === "would_skip").length,
    would_fail: rows.filter((row) => row.action === "would_fail").length,
  };
}

function countReviewReasons(rows: RowAssessment[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    for (const reason of row.reviewReasons) counts[reason] = (counts[reason] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

export function buildNotionImportDryRunReport(params: {
  csvText: string;
  type: NotionImportType;
  limit?: number;
  fileIdentity?: string;
  fileBytes?: number;
}): NotionImportDryRunReport {
  const limit = params.limit ?? DEFAULT_LIMIT;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new Error(`--limit must be an integer from 1 to ${MAX_LIMIT}.`);
  }

  const table = parseCsv(params.csvText);
  const projectMapping = mapHeaders(table.headers, projectFieldDefinitions);
  const personMapping = mapHeaders(table.headers, personFieldDefinitions);
  const typeResolution = resolveType(params.type, projectMapping, personMapping);
  const mappingsForOutput = params.type === "auto" && typeResolution.detectedType === "review"
    ? [projectMapping, personMapping]
    : [typeResolution.resolvedType === "project" ? projectMapping : personMapping];
  const mapping = typeResolution.resolvedType === "project" ? projectMapping : personMapping;
  const definitions = typeResolution.resolvedType === "project" ? projectFieldDefinitions : personFieldDefinitions;
  const unmappedColumns = mergeUnmappedColumns(mappingsForOutput);

  const rows = table.rows.slice(0, limit).map((row, index) => assessRow({
    row,
    rowNumber: index + 2,
    headers: table.headers,
    typeResolution,
    mapping,
    definitions,
    unmappedColumns,
  }));

  const publicRows = rows.map(({ values: _values, ...row }) => row);
  const report: NotionImportDryRunReport = {
    summary: {
      mode: "notion-import-dry-run",
      readOnly: true,
      dbAccess: false,
      sourceType: "notion_csv",
      applySupported: false,
      requestedType: params.type,
      resolvedType: typeResolution.detectedType === "review" ? "review" : typeResolution.resolvedType,
      fileHash: hashText(params.fileIdentity ?? params.csvText),
      fileBytes: params.fileBytes ?? Buffer.byteLength(params.csvText, "utf8"),
      fileRows: table.fileRows,
      parsedRows: publicRows.length,
      limit,
      defaultLimit: DEFAULT_LIMIT,
      maxLimit: MAX_LIMIT,
      outputRedacted: true,
    },
    typeDetection: typeResolution,
    mappedColumns: mergeMappedColumns(mappingsForOutput),
    unmappedColumns,
    targetFieldCoverage: buildTargetFieldCoverage(definitions, mapping, rows),
    outcomes: countByAction(publicRows),
    reviewReasonCounts: countReviewReasons(publicRows),
    rows: publicRows,
    notes: [
      "read-only dry-run; no DB reads or writes",
      "CSV file is parsed locally; no Notion API access",
      "raw row values are not printed",
      "targetPreview reports presence, counts, and parse signals only",
    ],
  };

  assertNoSensitiveNotionOutput(JSON.stringify(report));
  return report;
}

function parseArgValue(argv: string[], name: string): string | null {
  const prefix = `--${name}=`;
  const inline = argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = argv.findIndex((arg) => arg === `--${name}`);
  if (index < 0) return null;
  const value = argv[index + 1];
  return value && !value.startsWith("--") ? value : null;
}

export function parseNotionImportDryRunArgs(argv = process.argv): NotionImportDryRunArgs {
  if (argv.some((arg) => arg === "--apply" || arg.startsWith("--apply="))) {
    throw new Error("notion:import:dry-run is read-only and rejects --apply; DB writes are unsupported.");
  }

  const allowed = new Set(["file", "type", "limit"]);
  for (const arg of argv.slice(2)) {
    if (!arg.startsWith("--")) continue;
    const name = arg.slice(2).split("=")[0];
    if (!allowed.has(name)) throw new Error(`Unknown option --${name}.`);
  }

  const file = parseArgValue(argv, "file");
  if (!file) throw new Error("Missing required --file=<csv>.");

  const type = parseArgValue(argv, "type");
  if (type !== "project" && type !== "person" && type !== "auto") {
    throw new Error("--type must be project, person, or auto.");
  }

  const rawLimit = parseArgValue(argv, "limit");
  const limit = rawLimit ? Number(rawLimit) : DEFAULT_LIMIT;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new Error(`--limit must be an integer from 1 to ${MAX_LIMIT}.`);
  }

  return { file, type, limit };
}

function sanitizedErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "notion:import:dry-run failed.";
  if (isSensitiveLike(message)) return "notion:import:dry-run failed with redacted details.";
  return safeLabel(message, "notion:import:dry-run failed.");
}

function buildErrorJson(error: unknown) {
  return {
    summary: {
      mode: "notion-import-dry-run",
      readOnly: true,
      dbAccess: false,
      sourceType: "notion_csv",
      applySupported: false,
    },
    error: {
      code: "NOTION_IMPORT_DRY_RUN_ERROR",
      message: sanitizedErrorMessage(error),
    },
  };
}

export function assertNoSensitiveNotionOutput(text: string): void {
  const forbiddenPatterns = [
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
    /\b(?:postgres(?:ql)?|mysql|sqlserver):\/\//i,
    /\b(?:DATABASE_URL|DIRECT_URL|SMTP_PASSWORD|GMAIL_REFRESH_TOKEN|API[_-]?KEY|TOKEN|PASSWORD)\s*[:=]\s*["']?[^"',\s}]+/i,
    /\bBearer\s+[A-Za-z0-9._-]+/i,
    /-----BEGIN [A-Z ]+KEY-----/,
    /"raw(?:Row|Value|Values|Text)?"\s*:/i,
    /"body(?:Text|Html|Raw|Normalized)?"\s*:/i,
    /"email"\s*:/i,
    /[A-Z]:[\\/]/i,
    /[\\/](?:Users|home)[\\/]/i,
  ];
  const matched = forbiddenPatterns.find((pattern) => pattern.test(text));
  if (matched) throw new Error(`Sensitive Notion dry-run output matched ${matched}`);
}

async function main(): Promise<void> {
  try {
    const args = parseNotionImportDryRunArgs();
    let csvText: string;
    try {
      csvText = await readFile(args.file, "utf8");
    } catch {
      throw new Error("Failed to read CSV file.");
    }

    const report = buildNotionImportDryRunReport({
      csvText,
      type: args.type,
      limit: args.limit,
      fileIdentity: args.file,
      fileBytes: Buffer.byteLength(csvText, "utf8"),
    });
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    const errorJson = buildErrorJson(error);
    console.log(JSON.stringify(errorJson, null, 2));
    process.exitCode = 1;
  }
}

if (process.argv[1]?.endsWith("notion-import-dry-run.ts")) {
  void main();
}
