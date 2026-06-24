import "dotenv/config";

import { createHash } from "node:crypto";
import { statSync } from "node:fs";
import { readFile } from "node:fs/promises";

import { assertNotProductionMutation } from "../lib/production-guard";

type CsvImportType = "project" | "person" | "auto";
type ResolvedCsvImportType = "project" | "person";
type DetectedCsvType = ResolvedCsvImportType | "review";
type RowAction = "would_create" | "would_need_review" | "would_skip";
type DuplicateStrength = "none" | "weak" | "strong";
type DbDuplicateMode = "auto" | "off" | "on";

const MAX_LIMIT = 5000;
const MAX_APPLY_LIMIT = 50;
const MAX_SAMPLE_ROWS = 20;
const MAX_DB_DUPLICATE_SCAN = 1000;
const SKILL_REVIEW_THRESHOLD = 15;
const CSV_SOURCE_APPLY_CONFIRM = "APPLY_CSV_SOURCE_RECORDS";
const CSV_DRY_RUN_FORBIDDEN_APPLY_OPTIONS = new Set([
  "apply",
  "commit",
  "confirm",
  "db-write",
  "execute",
  "no-dry-run",
  "run-apply",
  "write",
]);

const WARNING_CODES = {
  missingRequiredField: "CSV_MISSING_REQUIRED_FIELD",
  unmappedColumns: "CSV_UNMAPPED_COLUMNS",
  lowFieldCoverage: "CSV_LOW_FIELD_COVERAGE",
  duplicateCandidate: "CSV_DUPLICATE_CANDIDATE",
  duplicateBySourceRow: "CSV_DUPLICATE_BY_SOURCE_ROW",
  duplicateByProjectTitleCompany: "CSV_DUPLICATE_BY_PROJECT_TITLE_COMPANY",
  duplicateByProjectSkillLocationPrice: "CSV_DUPLICATE_BY_PROJECT_SKILL_LOCATION_PRICE",
  duplicateByPersonNameOwner: "CSV_DUPLICATE_BY_PERSON_NAME_OWNER",
  duplicateByPersonSkillRateAvailability: "CSV_DUPLICATE_BY_PERSON_SKILL_RATE_AVAILABILITY",
  duplicateWeakMatch: "CSV_DUPLICATE_WEAK_MATCH",
  duplicateStrongMatch: "CSV_DUPLICATE_STRONG_MATCH",
  invalidPrice: "CSV_INVALID_PRICE",
  invalidDate: "CSV_INVALID_DATE",
  skillOverExtraction: "CSV_SKILL_OVER_EXTRACTION",
  personNameLowConfidence: "CSV_PERSON_NAME_LOW_CONFIDENCE",
  projectTitleLowConfidence: "CSV_PROJECT_TITLE_LOW_CONFIDENCE",
  typeConflict: "CSV_TYPE_CONFLICT",
  emptyRow: "CSV_EMPTY_ROW",
  piiRedacted: "CSV_PII_REDACTED_IN_OUTPUT",
} as const;

type WarningCode = typeof WARNING_CODES[keyof typeof WARNING_CODES];

type FieldDefinition = {
  field: string;
  synonyms: string[];
};

type CsvDryRunArgs = {
  file: string;
  type: CsvImportType;
  limit: number;
  dbDuplicates: DbDuplicateMode;
  sourcePreview: boolean;
};

export type CsvSourceApplyArgs = {
  file: string;
  type: CsvImportType;
  limit: number;
  confirm: typeof CSV_SOURCE_APPLY_CONFIRM;
  sourcePreview: true;
};

type CsvTable = {
  headers: string[];
  rows: string[][];
  fileRows: number;
};

type HeaderMapping = {
  fieldByIndex: Map<number, string>;
  mappedColumns: Array<{ field: string; headerHash: string }>;
  unmappedColumns: Array<{ headerHash: string }>;
};

export type ExistingProjectCandidate = {
  title?: string | null;
  companyName?: string | null;
  workContent?: string | null;
  skills?: string[];
  unitPrice?: string | number | null;
  workLocation?: string | null;
  startMonth?: string | Date | null;
};

export type ExistingPersonCandidate = {
  name?: string | null;
  initials?: string | null;
  roleHeadline?: string | null;
  skills?: string[];
  nearestStation?: string | null;
  desiredUnitPrice?: string | number | null;
  availableFrom?: string | Date | null;
  ownerCompany?: string | null;
};

type DuplicateInputs = {
  existingProjects?: ExistingProjectCandidate[];
  existingPersons?: ExistingPersonCandidate[];
  dbReadOnlyEnabled?: boolean;
  dbReadOnlyScannedProjects?: number;
  dbReadOnlyScannedPersons?: number;
};

type TypeDetection = {
  detectedType: DetectedCsvType;
  effectiveType: ResolvedCsvImportType;
  typeConfidence: number;
  projectScore: number;
  personScore: number;
  conflictMargin: number;
  typeReasons: string[];
};

export type RowAssessment = {
  rowNumber: number;
  rowHash: string;
  type: ResolvedCsvImportType;
  detectedType: DetectedCsvType;
  typeConfidence: number;
  projectScore: number;
  personScore: number;
  conflictMargin: number;
  typeReasons: string[];
  action: RowAction;
  mappedFieldCount: number;
  fieldCoverageRatio: number;
  fieldCoverageScore: number;
  weakFieldCount: number;
  requiredFieldCoverage: Record<string, boolean>;
  missingRequiredFields: string[];
  missingFields: string[];
  warningCodes: WarningCode[];
  reviewReasonCodes: WarningCode[];
  duplicateCandidate: boolean;
  duplicateStrength: DuplicateStrength;
  duplicateGroupHash: string | null;
  duplicateReasons: WarningCode[];
  skillCount: number;
  piiRedactedInOutput: true;
};

type InternalRowAssessment = RowAssessment & {
  duplicateKey: string | null;
  values: Record<string, string>;
};

export type CsvDryRunReport = {
  summary: {
    mode: "csv-import-dry-run";
    readOnly: true;
    applySupported: false;
    fileHash: string;
    fileBytes: number;
    fileRows: number;
    parsedRows: number;
    type: CsvImportType;
    requestedType: CsvImportType;
    effectiveTypes: Record<ResolvedCsvImportType, number>;
    detectedTypes: Record<DetectedCsvType, number>;
    limit: number;
    maxSampleRows: number;
    piiSafe: true;
    secretsRedacted: true;
  };
  mappedColumns: Array<{ field: string; headerHash: string }>;
  unmappedColumns: {
    count: number;
    headerHashes: string[];
  };
  requiredFieldCoverage: Record<string, { presentRows: number; missingRows: number; coverage: number }>;
  fieldCoverage: {
    averageScore: number;
    lowCoverageCount: number;
    missingFieldCounts: Record<string, number>;
  };
  typeDetection: {
    requestedType: CsvImportType;
    detectedTypes: Record<DetectedCsvType, number>;
    typeReasonCounts: Record<string, number>;
    typeConflictCount: number;
  };
  duplicateMatching: {
    dbReadOnlyEnabled: boolean;
    dbReadOnlyScannedProjects: number;
    dbReadOnlyScannedPersons: number;
    sourceRowDuplicateCount: number;
    strongDuplicateCandidateCount: number;
    weakDuplicateCandidateCount: number;
    duplicateReasonCounts: Record<string, number>;
  };
  outcomes: {
    wouldCreate: number;
    wouldNeedReview: number;
    wouldSkip: number;
    duplicateCandidateCount: number;
    strongDuplicateCandidateCount: number;
    weakDuplicateCandidateCount: number;
    typeConflictCount: number;
    lowCoverageCount: number;
    invalidRowCount: number;
  };
  warningCounts: Record<string, number>;
  reviewReasonCounts: Record<string, number>;
  sampleRows: RowAssessment[];
  sourcePreview?: CsvSourceTrackingPreview;
  sourcePreviewInternal?: CsvSourceTrackingPreviewInternal;
  notes: string[];
};

type PreviewImportSource = {
  type: "CSV";
  nameRedacted: string;
  status: "ACTIVE";
  configSummary: {
    fileHash: string;
    fileBytes: number;
    fileRows: number;
    requestedType: CsvImportType;
    dbReadOnlyEnabled: boolean;
    piiSafe: true;
    pathRedacted: true;
  };
};

type PreviewImportRun = {
  mode: "DRY_RUN";
  status: "SUCCEEDED" | "PARTIAL";
  summary: {
    fileRows: number;
    parsedRows: number;
    wouldCreate: number;
    wouldNeedReview: number;
    wouldSkip: number;
    duplicateCandidateCount: number;
    typeConflictCount: number;
    invalidRowCount: number;
  };
};

type PreviewSourceRecord = {
  recordType: "PROJECT" | "PERSON" | "OTHER" | "EXCLUDED" | "UNKNOWN";
  recordHash: string;
  rawRef: {
    rowIndex: number;
    rowNumber: number;
  };
  normalizedPayload: {
    fieldNames: string[];
    mappedFieldCount: number;
    requiredFieldCoverage: Record<string, boolean>;
    missingFields: string[];
    fieldCoverageScore: number;
    skillCount: number;
    piiRedacted: true;
  };
  redactedPreview: {
    action: RowAction;
    detectedType: DetectedCsvType;
    effectiveType: ResolvedCsvImportType;
    typeConfidence: number;
    warningCount: number;
    reviewReasonCount: number;
    duplicateCandidate: boolean;
    duplicateStrength: DuplicateStrength;
    piiSafe: true;
  };
  status: "NEW" | "NEEDS_REVIEW" | "SKIPPED";
  reviewReasons: WarningCode[];
  warnings: WarningCode[];
};

type PreviewEntitySourceLink = {
  sourceRecordHash: string;
  entityType: "PROJECT" | "PERSON";
  linkType: "CREATED_FROM" | "DUPLICATE_OF" | "REVIEW_CANDIDATE";
  confidence: number;
  reasons: string[];
};

export type CsvSourceTrackingPreview = {
  previewImportSource: PreviewImportSource;
  previewImportRun: PreviewImportRun;
  sourceRecordPreviewCount: number;
  sourceRecordsByStatus: Record<string, number>;
  sourceRecordsByType: Record<string, number>;
  entitySourceLinkPreviewCount: number;
  entityLinksByType: Record<string, number>;
  entityLinksByLinkType: Record<string, number>;
  warningCounts: Record<string, number>;
  reviewReasonCounts: Record<string, number>;
  sourceRecordSamples: PreviewSourceRecord[];
  entitySourceLinkSamples: PreviewEntitySourceLink[];
};

type CsvSourceTrackingPreviewInternal = {
  sourceRecords: PreviewSourceRecord[];
  entityLinks: PreviewEntitySourceLink[];
};

export type CsvSourceApplySummary = {
  mode: "apply";
  limit: number;
  fileRows: number;
  parsedRows: number;
  sourceRecordsCreated: number;
  sourceRecordsSkippedExisting: number;
  entityLinksCreated: number;
  entityLinksSkippedExisting: number;
  importRunStatus: "SUCCEEDED" | "PARTIAL" | "FAILED";
  failed: boolean;
  warningCounts: Record<string, number>;
  reviewReasonCounts: Record<string, number>;
  sampleRedactedRecords: PreviewSourceRecord[];
  errorSummary?: {
    code: "CSV_SOURCE_APPLY_FAILED";
    message: "A sanitized CSV source apply error occurred.";
    errorHash: string;
  };
};

type CsvApplyModel<TRecord extends { id: string }> = {
  findFirst(args: { where: Record<string, unknown> }): Promise<TRecord | null>;
  create(args: { data: Record<string, unknown> }): Promise<TRecord>;
};

export type CsvSourceApplyDb = {
  importSource: CsvApplyModel<{ id: string }>;
  importRun: {
    create(args: { data: Record<string, unknown> }): Promise<{ id: string }>;
    update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<{ id: string }>;
  };
  sourceRecord: CsvApplyModel<{ id: string }>;
  entitySourceLink: CsvApplyModel<{ id: string }>;
  $transaction?<T>(fn: (tx: CsvSourceApplyDb) => Promise<T>): Promise<T>;
};

const projectFieldDefinitions: FieldDefinition[] = [
  { field: "companyName", synonyms: ["companyname", "company", "client", "clientcompany", "customer", "会社名", "企業名", "顧客", "クライアント"] },
  { field: "clientCompany", synonyms: ["clientcompany", "client", "customercompany", "顧客会社", "クライアント会社"] },
  { field: "upperCompany", synonyms: ["uppercompany", "vendor", "上位会社", "上位", "商流会社"] },
  { field: "title", synonyms: ["title", "project", "projectname", "案件名", "件名", "案件", "プロジェクト名"] },
  { field: "workContent", synonyms: ["workcontent", "content", "description", "jobdescription", "作業内容", "業務内容", "仕事内容"] },
  { field: "businessContent", synonyms: ["businesscontent", "businessdescription", "業務内容", "業務概要", "案件概要"] },
  { field: "requiredSkills", synonyms: ["requiredskills", "mustskills", "skills", "skill", "technology", "technologies", "使用技術", "スキル", "必須スキル", "必要スキル"] },
  { field: "niceToHaveSkills", synonyms: ["nicetohaveskills", "wantskills", "preferredskills", "尚可スキル", "尚良スキル", "歓迎スキル"] },
  { field: "technologies", synonyms: ["technologies", "technology", "techstack", "技術", "開発環境"] },
  { field: "unitPrice", synonyms: ["unitprice", "price", "rate", "amount", "単価", "金額", "月額", "予算"] },
  { field: "startMonth", synonyms: ["startmonth", "start", "startdate", "開始月", "開始", "開始時期", "稼働開始"] },
  { field: "workLocation", synonyms: ["worklocation", "location", "place", "作業場所", "勤務地", "場所"] },
  { field: "remotePreference", synonyms: ["remote", "remotepreference", "remotetype", "リモート", "勤務形態"] },
  { field: "settlementRange", synonyms: ["settlement", "settlementrange", "精算", "精算幅"] },
  { field: "interviewCount", synonyms: ["interview", "interviewcount", "面談", "面談回数"] },
  { field: "contractType", synonyms: ["contract", "contracttype", "契約形態", "契約"] },
  { field: "commercialFlow", synonyms: ["commercialflow", "flow", "商流"] },
  { field: "endClient", synonyms: ["endclient", "end", "エンド", "エンドユーザー", "エンド企業"] },
  { field: "prime", synonyms: ["prime", "primecontractor", "元請", "元請け"] },
  { field: "accountManager", synonyms: ["accountmanager", "am", "salesowner", "営業担当", "am担当", "担当"] },
  { field: "upperContactName", synonyms: ["uppercontact", "uppercontactname", "contactname", "上位担当", "上位担当者"] },
  { field: "contact", synonyms: ["contact", "contactinfo", "連絡先", "担当者連絡先"] },
  { field: "recruitmentCount", synonyms: ["recruitmentcount", "count", "募集人数", "人数"] },
  { field: "foreignNationalityAccepted", synonyms: ["foreignnationality", "foreignnationalityaccepted", "外国籍", "外国籍可否"] },
  { field: "ageLimit", synonyms: ["agelimit", "age", "年齢", "年齢制限", "年齢条件"] },
  { field: "dressCode", synonyms: ["dresscode", "dress", "服装", "ドレスコード"] },
  { field: "focusProject", synonyms: ["focus", "focusproject", "注力", "注力案件"] },
];

const personFieldDefinitions: FieldDefinition[] = [
  { field: "name", synonyms: ["name", "personname", "engineername", "氏名", "名前", "要員名"] },
  { field: "initials", synonyms: ["initials", "initial", "イニシャル"] },
  { field: "nearestStation", synonyms: ["neareststation", "station", "最寄", "最寄駅", "最寄り駅"] },
  { field: "age", synonyms: ["age", "年齢"] },
  { field: "gender", synonyms: ["gender", "性別"] },
  { field: "nationality", synonyms: ["nationality", "国籍"] },
  { field: "availableFrom", synonyms: ["availablefrom", "available", "start", "稼働", "稼働開始", "稼働開始日"] },
  { field: "desiredUnitPrice", synonyms: ["desiredunitprice", "unitprice", "price", "rate", "希望単価", "単価", "金額"] },
  { field: "skills", synonyms: ["skills", "skill", "technologies", "technology", "スキル", "使用技術", "スキルシート", "経験スキル"] },
  { field: "roleHeadline", synonyms: ["role", "roleheadline", "position", "jobtype", "職種", "ポジション", "役割"] },
  { field: "careerSummary", synonyms: ["careersummary", "career", "summary", "profile", "経歴", "職務経歴", "経験", "得意領域"] },
  { field: "remotePreference", synonyms: ["remote", "remotepreference", "リモート", "希望リモート"] },
  { field: "workLocationPreference", synonyms: ["worklocation", "worklocationpreference", "location", "希望勤務地", "勤務地"] },
  { field: "ownerCompany", synonyms: ["ownercompany", "company", "所属会社", "会社名", "所属"] },
  { field: "contact", synonyms: ["contact", "contactinfo", "連絡先"] },
  { field: "salesOwner", synonyms: ["salesowner", "sales", "営業担当", "担当"] },
];

const requiredProjectFields = ["title", "workContent", "requiredSkills"];
const requiredPersonFields = ["identity", "skills", "roleHeadline"];

function shortHash(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function fullHash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function deterministicUuid(value: string): string {
  const hash = fullHash(value);
  const chars = hash.split("");
  chars[12] = "5";
  chars[16] = (8 + (Number.parseInt(chars[16], 16) % 4)).toString(16);
  return [
    chars.slice(0, 8).join(""),
    chars.slice(8, 12).join(""),
    chars.slice(12, 16).join(""),
    chars.slice(16, 20).join(""),
    chars.slice(20, 32).join(""),
  ].join("-");
}

function parseArgValue(argv: string[], name: string): string | null {
  const prefix = `--${name}=`;
  const inline = argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
  if (inline) return inline;
  const index = argv.findIndex((arg) => arg === `--${name}`);
  if (index >= 0) return argv[index + 1] ?? null;
  return null;
}

function parseBooleanFlag(argv: string[], name: string): boolean {
  const exact = argv.includes(`--${name}`);
  const prefix = `--${name}=`;
  const inline = argv.find((arg) => arg.startsWith(prefix));
  if (exact) return true;
  if (!inline) return false;

  const value = inline.slice(prefix.length);
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`--${name} must be a boolean flag when provided.`);
}

function parseOptionName(arg: string): string | null {
  if (!arg.startsWith("--")) return null;
  return arg.slice(2).split("=")[0];
}

export function parseCsvDryRunArgs(argv = process.argv): CsvDryRunArgs {
  const forbiddenApplyOption = argv.slice(2)
    .map(parseOptionName)
    .find((name): name is string => Boolean(name) && CSV_DRY_RUN_FORBIDDEN_APPLY_OPTIONS.has(name));
  if (forbiddenApplyOption) {
    throw new Error(`csv:import:dry-run is read-only and does not accept --${forbiddenApplyOption}.`);
  }

  const file = parseArgValue(argv, "file");
  if (!file) throw new Error("Missing required --file=<path>.");

  const type = parseArgValue(argv, "type");
  if (type !== "project" && type !== "person" && type !== "auto") {
    throw new Error("--type must be project, person, or auto.");
  }

  const rawLimit = parseArgValue(argv, "limit");
  const limit = rawLimit ? Number(rawLimit) : MAX_LIMIT;
  if (!Number.isFinite(limit) || limit <= 0 || !Number.isInteger(limit)) {
    throw new Error("--limit must be a positive integer when provided.");
  }
  if (limit > MAX_LIMIT) throw new Error(`--limit must be <= ${MAX_LIMIT}.`);

  const duplicateMode = parseArgValue(argv, "db-duplicates") ?? "off";
  if (duplicateMode !== "auto" && duplicateMode !== "off" && duplicateMode !== "on") {
    throw new Error("--db-duplicates must be auto, off, or on.");
  }

  return { file, type, limit, dbDuplicates: duplicateMode, sourcePreview: parseBooleanFlag(argv, "source-preview") };
}

export function parseCsvSourceApplyArgs(argv = process.argv): CsvSourceApplyArgs {
  const file = parseArgValue(argv, "file");
  if (!file) throw new Error("Missing required --file=<path>.");

  const type = parseArgValue(argv, "type");
  if (type !== "project" && type !== "person" && type !== "auto") {
    throw new Error("--type must be project, person, or auto.");
  }

  if (!parseBooleanFlag(argv, "source-preview")) {
    throw new Error("csv:import:apply requires --source-preview.");
  }

  const rawLimit = parseArgValue(argv, "limit");
  if (!rawLimit) throw new Error("csv:import:apply requires --limit.");
  const limit = Number(rawLimit);
  if (!Number.isFinite(limit) || limit <= 0 || !Number.isInteger(limit)) {
    throw new Error("--limit must be a positive integer when provided.");
  }
  if (limit > MAX_APPLY_LIMIT) throw new Error(`--limit must be <= ${MAX_APPLY_LIMIT} for csv:import:apply.`);

  const confirm = parseArgValue(argv, "confirm");
  if (confirm !== CSV_SOURCE_APPLY_CONFIRM) {
    throw new Error(`csv:import:apply requires --confirm=${CSV_SOURCE_APPLY_CONFIRM}.`);
  }

  return { file, type, limit, confirm, sourcePreview: true };
}

export function csvSourceApplyHelpText(): string {
  return [
    "CSV source-record apply writes source tracking tables only.",
    "",
    "Required:",
    "  --file=<path>",
    "  --type=project|person|auto",
    "  --source-preview",
    `  --limit=<1-${MAX_APPLY_LIMIT}>`,
    `  --confirm=${CSV_SOURCE_APPLY_CONFIRM}`,
    "",
    "Example:",
    `  npm.cmd run csv:import:apply -- --file tests\\fixtures\\csv-import\\synthetic-projects.csv --type=project --source-preview --limit=50 --confirm=${CSV_SOURCE_APPLY_CONFIRM}`,
    "",
    "Safety:",
    "  Writes ImportSource, ImportRun, SourceRecord, and EntitySourceLink only.",
    "  Does not create, update, or delete Project or Person records.",
    "  Output is anonymized and does not include raw CSV values or local file paths.",
  ].join("\n");
}

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[\s_\-ー・･/／|:：()（）［］\[\]【】「」『』,，.．]/g, "");
}

function normalizeText(value: string | number | Date | null | undefined): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value ?? "").trim();
}

function normalizedToken(value: string | number | Date | null | undefined): string {
  return normalizeText(value)
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[\s_\-ー・･/／|:：()（）［］\[\]【】「」『』,，.．]/g, "");
}

function isBlank(value: string | undefined): boolean {
  return normalizeText(value).length === 0;
}

function pushUnique<T>(items: T[], item: T): void {
  if (!items.includes(item)) items.push(item);
}

function increment(map: Record<string, number>, key: string): void {
  map[key] = (map[key] ?? 0) + 1;
}

function numericPriceToken(value: string | number | null | undefined): number | null {
  const raw = normalizeText(value).normalize("NFKC").replace(/[,，\s]/g, "");
  const match = raw.match(/\d+(?:\.\d+)?/);
  if (!match) return null;
  return Number(match[0]);
}

export function parseCsv(text: string): CsvTable {
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

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  const nonEmptyRows = rows.filter((candidate) => candidate.some((cell) => normalizeText(cell).length > 0));
  const [headers = [], ...bodyRows] = nonEmptyRows;
  return {
    headers: headers.map((header) => header.trim()),
    rows: bodyRows,
    fileRows: bodyRows.length,
  };
}

function buildSynonymMap(definitions: FieldDefinition[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const definition of definitions) {
    map.set(normalizeHeader(definition.field), definition.field);
    for (const synonym of definition.synonyms) map.set(normalizeHeader(synonym), definition.field);
  }
  return map;
}

function mapHeaders(headers: string[], type: ResolvedCsvImportType): HeaderMapping {
  const synonymMap = buildSynonymMap(type === "project" ? projectFieldDefinitions : personFieldDefinitions);
  const fieldByIndex = new Map<number, string>();
  const mappedColumns: Array<{ field: string; headerHash: string }> = [];
  const unmappedColumns: Array<{ headerHash: string }> = [];

  headers.forEach((header, index) => {
    const field = synonymMap.get(normalizeHeader(header));
    if (field) {
      fieldByIndex.set(index, field);
      mappedColumns.push({ field, headerHash: shortHash(header) });
    } else if (!isBlank(header)) {
      unmappedColumns.push({ headerHash: shortHash(header) });
    }
  });

  return { fieldByIndex, mappedColumns, unmappedColumns };
}

function rowToObject(row: string[], mapping: HeaderMapping): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [index, field] of mapping.fieldByIndex.entries()) {
    const value = normalizeText(row[index]);
    if (!isBlank(value) && !values[field]) values[field] = value;
  }
  return values;
}

function splitSkills(value: string | string[] | undefined): string[] {
  const text = Array.isArray(value) ? value.join(",") : normalizeText(value);
  return text
    .split(/[,\n;、，／/・|]+/)
    .map((skill) => skill.trim())
    .filter(Boolean);
}

function combinedSkills(values: Record<string, string>, type: ResolvedCsvImportType): string[] {
  if (type === "project") {
    return [
      ...splitSkills(values.requiredSkills),
      ...splitSkills(values.niceToHaveSkills),
      ...splitSkills(values.technologies),
    ];
  }
  return splitSkills(values.skills);
}

function skillTokenSet(skills: string[]): Set<string> {
  return new Set(skills.map(normalizedToken).filter((token) => token.length >= 2));
}

function skillOverlap(left: string[], right: string[]): number {
  const leftSet = skillTokenSet(left);
  const rightSet = skillTokenSet(right);
  let overlap = 0;
  for (const skill of leftSet) {
    if (rightSet.has(skill)) overlap += 1;
  }
  return overlap;
}

function hasValidPrice(value: string | undefined): boolean {
  const text = normalizeText(value);
  if (!text) return true;
  if (/応相談|相談|スキル見合|要相談|asap/i.test(text)) return true;
  const normalized = text.normalize("NFKC").replace(/[,，\s]/g, "");
  if (!/\d/.test(normalized)) return false;
  return /^[0-9.万万円円kK~〜\-－から以上以下前後税込税別月/]+$/.test(normalized);
}

function hasValidDate(value: string | undefined): boolean {
  const text = normalizeText(value);
  if (!text) return true;
  if (/即日|随時|調整|未定|応相談|asap/i.test(text)) return true;
  const normalized = text.normalize("NFKC").trim();
  if (/^\d{4}[-/]\d{1,2}(?:[-/]\d{1,2})?$/.test(normalized)) return true;
  if (/^\d{4}年\d{1,2}月(?:\d{1,2}日)?$/.test(normalized)) return true;
  if (/^\d{1,2}月(?:\d{1,2}日)?$/.test(normalized)) return true;
  return false;
}

function lowConfidenceTitle(value: string | undefined): boolean {
  const text = normalizeText(value);
  if (!text) return true;
  return text.length < 4 || /未定|不明|確認|unknown|tbd/i.test(text);
}

function lowConfidencePersonName(values: Record<string, string>): boolean {
  const name = normalizeText(values.name);
  const initials = normalizeText(values.initials);
  if (!name && /^[A-Za-z]{1,3}(?:[.\s][A-Za-z]{1,3})?$/.test(initials)) return false;
  if (!name) return true;
  if (name.length < 2) return true;
  return /@|案件|要員|エンジニア|未定|不明|調整|unknown|tbd|^\d+$/i.test(name);
}

function isEmptyRow(row: string[]): boolean {
  return row.every((cell) => isBlank(cell));
}

function mappingFieldCount(mapping: HeaderMapping): number {
  return new Set(mapping.mappedColumns.map((column) => column.field)).size;
}

function typeDetectionFor(
  requestedType: CsvImportType,
  projectValues: Record<string, string>,
  personValues: Record<string, string>,
  projectMapping: HeaderMapping,
  personMapping: HeaderMapping,
): TypeDetection {
  const projectHeaderScore = mappingFieldCount(projectMapping);
  const personHeaderScore = mappingFieldCount(personMapping);
  const projectRowScore = [
    "title",
    "workContent",
    "businessContent",
    "requiredSkills",
    "niceToHaveSkills",
    "unitPrice",
    "startMonth",
    "workLocation",
    "companyName",
    "clientCompany",
    "upperCompany",
  ].filter((field) => !isBlank(projectValues[field])).length;
  const personRowScore = [
    "name",
    "initials",
    "skills",
    "roleHeadline",
    "careerSummary",
    "desiredUnitPrice",
    "availableFrom",
    "nearestStation",
    "ownerCompany",
  ].filter((field) => !isBlank(personValues[field])).length;
  const projectScore = projectHeaderScore + projectRowScore;
  const personScore = personHeaderScore + personRowScore;
  const conflictMargin = Math.abs(projectScore - personScore);
  const effectiveType = projectScore >= personScore ? "project" : "person";
  const reasons = [
    `PROJECT_HEADER_SIGNAL:${projectHeaderScore}`,
    `PERSON_HEADER_SIGNAL:${personHeaderScore}`,
    `PROJECT_ROW_SIGNAL:${projectRowScore}`,
    `PERSON_ROW_SIGNAL:${personRowScore}`,
  ];

  if (requestedType !== "auto") {
    return {
      detectedType: requestedType,
      effectiveType: requestedType,
      typeConfidence: 1,
      projectScore,
      personScore,
      conflictMargin,
      typeReasons: [`REQUESTED_TYPE:${requestedType}`, ...reasons],
    };
  }

  const total = projectScore + personScore;
  const typeConfidence = total === 0 ? 0 : Number((Math.max(projectScore, personScore) / total).toFixed(4));
  const conflict = projectScore > 0 && personScore > 0 && conflictMargin <= 2;
  return {
    detectedType: conflict ? "review" : effectiveType,
    effectiveType,
    typeConfidence,
    projectScore,
    personScore,
    conflictMargin,
    typeReasons: [conflict ? "AUTO_TYPE_CONFLICT" : `AUTO_TYPE:${effectiveType}`, ...reasons],
  };
}

function projectCoverage(values: Record<string, string>): Record<string, boolean> {
  return {
    title: !isBlank(values.title),
    workContent: !isBlank(values.workContent) || !isBlank(values.businessContent),
    skills: combinedSkills(values, "project").length > 0,
    unitPrice: !isBlank(values.unitPrice),
    startMonth: !isBlank(values.startMonth),
    workLocation: !isBlank(values.workLocation),
    company: !isBlank(values.companyName) || !isBlank(values.clientCompany) || !isBlank(values.upperCompany),
  };
}

function personCoverage(values: Record<string, string>): Record<string, boolean> {
  return {
    identity: !isBlank(values.name) || !isBlank(values.initials),
    skills: combinedSkills(values, "person").length > 0,
    roleHeadline: !isBlank(values.roleHeadline),
    availableFrom: !isBlank(values.availableFrom),
    desiredUnitPrice: !isBlank(values.desiredUnitPrice),
    nearestStation: !isBlank(values.nearestStation),
    ownerCompany: !isBlank(values.ownerCompany),
  };
}

function coverageDetails(values: Record<string, string>, type: ResolvedCsvImportType): {
  fieldCoverageScore: number;
  weakFieldCount: number;
  missingFields: string[];
} {
  const coverage = type === "project" ? projectCoverage(values) : personCoverage(values);
  const missingFields = Object.entries(coverage)
    .filter(([, present]) => !present)
    .map(([field]) => field);
  const present = Object.keys(coverage).length - missingFields.length;
  return {
    fieldCoverageScore: Number((present / Object.keys(coverage).length).toFixed(4)),
    weakFieldCount: missingFields.length,
    missingFields,
  };
}

function duplicateKey(values: Record<string, string>, type: ResolvedCsvImportType): string | null {
  const skills = combinedSkills(values, type).slice(0, 8).map(normalizedToken).join("|");
  if (type === "project") {
    const title = normalizedToken(values.title);
    const start = normalizedToken(values.startMonth);
    const company = normalizedToken(projectCompany(values));
    if (!title && !skills) return null;
    return shortHash(["project", title, start, company, skills].join("\n"));
  }
  const identity = normalizedToken(personIdentity(values));
  const available = normalizedToken(values.availableFrom);
  if (!identity && !skills) return null;
  return shortHash(["person", identity, available, skills].join("\n"));
}

function fieldCoverage(values: Record<string, string>, mapping: HeaderMapping): number {
  const mappedFields = new Set(mapping.mappedColumns.map((column) => column.field));
  if (mappedFields.size === 0) return 0;
  const present = [...mappedFields].filter((field) => !isBlank(values[field])).length;
  return Number((present / mappedFields.size).toFixed(4));
}

function addDuplicate(row: InternalRowAssessment, strength: "weak" | "strong", reason: WarningCode, groupHash: string): void {
  row.duplicateCandidate = true;
  row.duplicateStrength = row.duplicateStrength === "strong" || strength === "strong" ? "strong" : "weak";
  row.duplicateGroupHash = row.duplicateGroupHash ?? groupHash;
  pushUnique(row.duplicateReasons, reason);
  pushUnique(row.warningCodes, WARNING_CODES.duplicateCandidate);
  pushUnique(row.warningCodes, reason);
  pushUnique(row.reviewReasonCodes, reason);
  pushUnique(row.warningCodes, strength === "strong" ? WARNING_CODES.duplicateStrongMatch : WARNING_CODES.duplicateWeakMatch);
  pushUnique(row.reviewReasonCodes, strength === "strong" ? WARNING_CODES.duplicateStrongMatch : WARNING_CODES.duplicateWeakMatch);
}

function projectCompany(values: Record<string, string>): string {
  return values.companyName || values.clientCompany || values.upperCompany || "";
}

function personIdentity(values: Record<string, string>): string {
  return values.name || values.initials || "";
}

function assessRow(params: {
  row: string[];
  rowNumber: number;
  requestedType: CsvImportType;
  projectMapping: HeaderMapping;
  personMapping: HeaderMapping;
}): InternalRowAssessment {
  const { row, rowNumber, requestedType, projectMapping, personMapping } = params;
  const warningCodes: WarningCode[] = [];
  const reviewReasonCodes: WarningCode[] = [];

  if (isEmptyRow(row)) {
    warningCodes.push(WARNING_CODES.emptyRow);
    reviewReasonCodes.push(WARNING_CODES.emptyRow);
  }

  const projectValues = rowToObject(row, projectMapping);
  const personValues = rowToObject(row, personMapping);
  const detection = typeDetectionFor(requestedType, projectValues, personValues, projectMapping, personMapping);
  const type = detection.effectiveType;
  const mapping = type === "project" ? projectMapping : personMapping;
  const values = type === "project" ? projectValues : personValues;
  const skills = combinedSkills(values, type);
  const coverage = coverageDetails(values, type);
  const missingRequiredFields: string[] = [];
  const requiredFieldCoverage: Record<string, boolean> = {};

  if (mapping.unmappedColumns.length > 0) warningCodes.push(WARNING_CODES.unmappedColumns);
  if (detection.detectedType === "review") {
    warningCodes.push(WARNING_CODES.typeConflict);
    reviewReasonCodes.push(WARNING_CODES.typeConflict);
  }

  const requiredFields = type === "project" ? requiredProjectFields : requiredPersonFields;
  for (const field of requiredFields) {
    const present = field === "identity"
      ? !isBlank(values.name) || !isBlank(values.initials)
      : !isBlank(values[field]);
    requiredFieldCoverage[field] = present;
    if (!present) missingRequiredFields.push(field);
  }

  if (missingRequiredFields.length > 0) {
    warningCodes.push(WARNING_CODES.missingRequiredField);
    reviewReasonCodes.push(WARNING_CODES.missingRequiredField);
  }

  const mappedCoverageRatio = fieldCoverage(values, mapping);
  if (coverage.fieldCoverageScore < 0.5) {
    warningCodes.push(WARNING_CODES.lowFieldCoverage);
    reviewReasonCodes.push(WARNING_CODES.lowFieldCoverage);
  }

  if (type === "project") {
    if (!hasValidPrice(values.unitPrice)) {
      warningCodes.push(WARNING_CODES.invalidPrice);
      reviewReasonCodes.push(WARNING_CODES.invalidPrice);
    }
    if (!hasValidDate(values.startMonth)) {
      warningCodes.push(WARNING_CODES.invalidDate);
      reviewReasonCodes.push(WARNING_CODES.invalidDate);
    }
    if (lowConfidenceTitle(values.title)) {
      warningCodes.push(WARNING_CODES.projectTitleLowConfidence);
      reviewReasonCodes.push(WARNING_CODES.projectTitleLowConfidence);
    }
  } else {
    if (!hasValidPrice(values.desiredUnitPrice)) {
      warningCodes.push(WARNING_CODES.invalidPrice);
      reviewReasonCodes.push(WARNING_CODES.invalidPrice);
    }
    if (!hasValidDate(values.availableFrom)) {
      warningCodes.push(WARNING_CODES.invalidDate);
      reviewReasonCodes.push(WARNING_CODES.invalidDate);
    }
    if (lowConfidencePersonName(values)) {
      warningCodes.push(WARNING_CODES.personNameLowConfidence);
      reviewReasonCodes.push(WARNING_CODES.personNameLowConfidence);
    }
  }

  if (skills.length > SKILL_REVIEW_THRESHOLD) {
    warningCodes.push(WARNING_CODES.skillOverExtraction);
    reviewReasonCodes.push(WARNING_CODES.skillOverExtraction);
  }

  warningCodes.push(WARNING_CODES.piiRedacted);

  const empty = warningCodes.includes(WARNING_CODES.emptyRow);
  const action = empty
    ? "would_skip"
    : reviewReasonCodes.length > 0
      ? "would_need_review"
      : "would_create";

  return {
    rowNumber,
    rowHash: shortHash(row.join("\u001f")),
    type,
    detectedType: detection.detectedType,
    typeConfidence: detection.typeConfidence,
    projectScore: detection.projectScore,
    personScore: detection.personScore,
    conflictMargin: detection.conflictMargin,
    typeReasons: detection.typeReasons,
    action,
    mappedFieldCount: Object.keys(values).length,
    fieldCoverageRatio: mappedCoverageRatio,
    fieldCoverageScore: coverage.fieldCoverageScore,
    weakFieldCount: coverage.weakFieldCount,
    requiredFieldCoverage,
    missingRequiredFields,
    missingFields: coverage.missingFields,
    warningCodes: [...new Set(warningCodes)],
    reviewReasonCodes: [...new Set(reviewReasonCodes)],
    duplicateCandidate: false,
    duplicateStrength: "none",
    duplicateGroupHash: null,
    duplicateReasons: [],
    duplicateKey: duplicateKey(values, type),
    skillCount: skills.length,
    piiRedactedInOutput: true,
    values,
  };
}

function applySourceRowDuplicates(rows: InternalRowAssessment[]): void {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!row.duplicateKey || row.action === "would_skip") continue;
    counts.set(row.duplicateKey, (counts.get(row.duplicateKey) ?? 0) + 1);
  }

  for (const row of rows) {
    if (row.duplicateKey && (counts.get(row.duplicateKey) ?? 0) > 1) {
      addDuplicate(row, "strong", WARNING_CODES.duplicateBySourceRow, row.duplicateKey);
    }
  }
}

function applyProjectDbDuplicates(row: InternalRowAssessment, existingProjects: ExistingProjectCandidate[]): void {
  if (row.type !== "project") return;
  const title = normalizedToken(row.values.title);
  const company = normalizedToken(projectCompany(row.values));
  const skills = combinedSkills(row.values, "project");
  const location = normalizedToken(row.values.workLocation);
  const price = numericPriceToken(row.values.unitPrice);

  for (const existing of existingProjects) {
    const existingTitle = normalizedToken(existing.title);
    const existingCompany = normalizedToken(existing.companyName);
    if (title && company && existingTitle === title && existingCompany === company) {
      addDuplicate(row, "strong", WARNING_CODES.duplicateByProjectTitleCompany, shortHash(`project-title-company:${title}:${company}`));
      continue;
    }

    const overlap = skillOverlap(skills, existing.skills ?? []);
    const locationMatch = Boolean(location && normalizedToken(existing.workLocation) === location);
    const existingPrice = numericPriceToken(existing.unitPrice);
    const priceMatch = price !== null && existingPrice !== null && Math.abs(price - existingPrice) <= 5;
    if (overlap >= 2 && (locationMatch || priceMatch)) {
      addDuplicate(
        row,
        locationMatch && priceMatch ? "strong" : "weak",
        WARNING_CODES.duplicateByProjectSkillLocationPrice,
        shortHash(`project-skill-location-price:${overlap}:${location}:${price ?? ""}`),
      );
    }
  }
}

function applyPersonDbDuplicates(row: InternalRowAssessment, existingPersons: ExistingPersonCandidate[]): void {
  if (row.type !== "person") return;
  const identity = normalizedToken(personIdentity(row.values));
  const owner = normalizedToken(row.values.ownerCompany);
  const skills = combinedSkills(row.values, "person");
  const price = numericPriceToken(row.values.desiredUnitPrice);
  const available = normalizedToken(row.values.availableFrom);

  for (const existing of existingPersons) {
    const existingIdentity = normalizedToken(existing.name || existing.initials);
    const existingOwner = normalizedToken(existing.ownerCompany);
    if (identity && owner && existingIdentity === identity && existingOwner === owner) {
      addDuplicate(row, "strong", WARNING_CODES.duplicateByPersonNameOwner, shortHash(`person-name-owner:${identity}:${owner}`));
      continue;
    }

    const overlap = skillOverlap(skills, existing.skills ?? []);
    const existingPrice = numericPriceToken(existing.desiredUnitPrice);
    const priceMatch = price !== null && existingPrice !== null && Math.abs(price - existingPrice) <= 5;
    const availableMatch = Boolean(available && normalizedToken(existing.availableFrom) === available);
    if (overlap >= 2 && (priceMatch || availableMatch)) {
      addDuplicate(
        row,
        priceMatch && availableMatch ? "strong" : "weak",
        WARNING_CODES.duplicateByPersonSkillRateAvailability,
        shortHash(`person-skill-rate-availability:${overlap}:${price ?? ""}:${available}`),
      );
    }
  }
}

function finalizeRows(rows: InternalRowAssessment[], duplicates: DuplicateInputs): RowAssessment[] {
  applySourceRowDuplicates(rows);
  for (const row of rows) {
    applyProjectDbDuplicates(row, duplicates.existingProjects ?? []);
    applyPersonDbDuplicates(row, duplicates.existingPersons ?? []);
  }

  return rows.map(({ duplicateKey: _duplicateKey, values: _values, ...row }) => {
    if (row.duplicateCandidate && row.action === "would_create") row.action = "would_need_review";
    row.warningCodes = [...new Set(row.warningCodes)];
    row.reviewReasonCodes = [...new Set(row.reviewReasonCodes)];
    row.duplicateReasons = [...new Set(row.duplicateReasons)];
    return row;
  });
}

function coverageSummary(rows: RowAssessment[]): CsvDryRunReport["requiredFieldCoverage"] {
  const fields = new Set<string>();
  for (const row of rows) Object.keys(row.requiredFieldCoverage).forEach((field) => fields.add(field));

  const summary: CsvDryRunReport["requiredFieldCoverage"] = {};
  for (const field of [...fields].sort()) {
    const presentRows = rows.filter((row) => row.requiredFieldCoverage[field]).length;
    const missingRows = rows.length - presentRows;
    summary[field] = {
      presentRows,
      missingRows,
      coverage: rows.length === 0 ? 0 : Number((presentRows / rows.length).toFixed(4)),
    };
  }
  return summary;
}

function countCodes(rows: RowAssessment[], key: "warningCodes" | "reviewReasonCodes" | "duplicateReasons"): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    for (const code of row[key]) increment(counts, code);
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function countBy<T>(items: T[], keyFor: (item: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) increment(counts, keyFor(item));
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function safeCsvFileLabel(fileIdentity: string | undefined, fileHash: string): string {
  if (!fileIdentity) return `csv-file-${fileHash}`;
  const fileName = fileIdentity.split(/[\\/]/).filter(Boolean).pop() ?? "";
  return /^synthetic-[a-z0-9-]+\.csv$/i.test(fileName) ? fileName : `csv-file-${fileHash}`;
}

function previewRecordType(row: RowAssessment): PreviewSourceRecord["recordType"] {
  if (row.action === "would_skip") return "EXCLUDED";
  if (row.detectedType === "review") return "UNKNOWN";
  if (row.type === "project") return "PROJECT";
  if (row.type === "person") return "PERSON";
  return "OTHER";
}

function previewRecordStatus(row: RowAssessment): PreviewSourceRecord["status"] {
  if (row.action === "would_create") return "NEW";
  if (row.action === "would_skip") return "SKIPPED";
  return "NEEDS_REVIEW";
}

function previewConfidence(row: RowAssessment): number {
  if (row.duplicateStrength === "strong") return 0.95;
  if (row.duplicateStrength === "weak") return 0.65;
  return Number(Math.max(0.1, row.typeConfidence || 0.5).toFixed(4));
}

function buildPreviewSourceRecord(row: RowAssessment): PreviewSourceRecord {
  const fieldNames = [...new Set([
    ...Object.keys(row.requiredFieldCoverage),
    ...row.missingFields,
  ])].sort();

  return {
    recordType: previewRecordType(row),
    recordHash: fullHash(`csv-source-record:${row.rowHash}`),
    rawRef: {
      rowIndex: Math.max(1, row.rowNumber - 1),
      rowNumber: row.rowNumber,
    },
    normalizedPayload: {
      fieldNames,
      mappedFieldCount: row.mappedFieldCount,
      requiredFieldCoverage: row.requiredFieldCoverage,
      missingFields: row.missingFields,
      fieldCoverageScore: row.fieldCoverageScore,
      skillCount: row.skillCount,
      piiRedacted: true,
    },
    redactedPreview: {
      action: row.action,
      detectedType: row.detectedType,
      effectiveType: row.type,
      typeConfidence: row.typeConfidence,
      warningCount: row.warningCodes.length,
      reviewReasonCount: row.reviewReasonCodes.length,
      duplicateCandidate: row.duplicateCandidate,
      duplicateStrength: row.duplicateStrength,
      piiSafe: true,
    },
    status: previewRecordStatus(row),
    reviewReasons: row.reviewReasonCodes,
    warnings: row.warningCodes,
  };
}

function buildPreviewEntitySourceLink(row: RowAssessment, sourceRecordHash: string): PreviewEntitySourceLink | null {
  if (row.action === "would_skip" || row.detectedType === "review") return null;

  const entityType = row.type === "project" ? "PROJECT" : "PERSON";
  if (row.action === "would_create") {
    return {
      sourceRecordHash,
      entityType,
      linkType: "CREATED_FROM",
      confidence: previewConfidence(row),
      reasons: ["CSV_WOULD_CREATE", ...row.typeReasons],
    };
  }

  if (row.duplicateCandidate) {
    return {
      sourceRecordHash,
      entityType,
      linkType: "DUPLICATE_OF",
      confidence: previewConfidence(row),
      reasons: row.duplicateReasons.length > 0 ? row.duplicateReasons : row.reviewReasonCodes,
    };
  }

  return {
    sourceRecordHash,
    entityType,
    linkType: "REVIEW_CANDIDATE",
    confidence: previewConfidence(row),
    reasons: row.reviewReasonCodes,
  };
}

function buildCsvSourceTrackingPreview(params: {
  report: Omit<CsvDryRunReport, "sourcePreview">;
  rows: RowAssessment[];
  fileIdentity?: string;
  sourceRecords?: PreviewSourceRecord[];
  entityLinks?: PreviewEntitySourceLink[];
}): CsvSourceTrackingPreview {
  const { report, rows } = params;
  const sourceRecords = params.sourceRecords ?? rows.map(buildPreviewSourceRecord);
  const entityLinks = params.entityLinks ?? rows
    .map((row, index) => buildPreviewEntitySourceLink(row, sourceRecords[index].recordHash))
    .filter((link): link is PreviewEntitySourceLink => Boolean(link));
  const runSummary = {
    fileRows: report.summary.fileRows,
    parsedRows: report.summary.parsedRows,
    wouldCreate: report.outcomes.wouldCreate,
    wouldNeedReview: report.outcomes.wouldNeedReview,
    wouldSkip: report.outcomes.wouldSkip,
    duplicateCandidateCount: report.outcomes.duplicateCandidateCount,
    typeConflictCount: report.outcomes.typeConflictCount,
    invalidRowCount: report.outcomes.invalidRowCount,
  };

  return {
    previewImportSource: {
      type: "CSV",
      nameRedacted: safeCsvFileLabel(params.fileIdentity, report.summary.fileHash),
      status: "ACTIVE",
      configSummary: {
        fileHash: report.summary.fileHash,
        fileBytes: report.summary.fileBytes,
        fileRows: report.summary.fileRows,
        requestedType: report.summary.requestedType,
        dbReadOnlyEnabled: report.duplicateMatching.dbReadOnlyEnabled,
        piiSafe: true,
        pathRedacted: true,
      },
    },
    previewImportRun: {
      mode: "DRY_RUN",
      status: report.outcomes.wouldNeedReview > 0 || report.outcomes.wouldSkip > 0 || report.outcomes.invalidRowCount > 0
        ? "PARTIAL"
        : "SUCCEEDED",
      summary: runSummary,
    },
    sourceRecordPreviewCount: sourceRecords.length,
    sourceRecordsByStatus: countBy(sourceRecords, (record) => record.status),
    sourceRecordsByType: countBy(sourceRecords, (record) => record.recordType),
    entitySourceLinkPreviewCount: entityLinks.length,
    entityLinksByType: countBy(entityLinks, (link) => link.entityType),
    entityLinksByLinkType: countBy(entityLinks, (link) => link.linkType),
    warningCounts: report.warningCounts,
    reviewReasonCounts: report.reviewReasonCounts,
    sourceRecordSamples: sourceRecords.slice(0, MAX_SAMPLE_ROWS),
    entitySourceLinkSamples: entityLinks.slice(0, MAX_SAMPLE_ROWS),
  };
}

function fieldCoverageSummary(rows: RowAssessment[]): CsvDryRunReport["fieldCoverage"] {
  const missingFieldCounts: Record<string, number> = {};
  for (const row of rows) {
    for (const field of row.missingFields) increment(missingFieldCounts, field);
  }
  const averageScore = rows.length === 0
    ? 0
    : Number((rows.reduce((sum, row) => sum + row.fieldCoverageScore, 0) / rows.length).toFixed(4));
  return {
    averageScore,
    lowCoverageCount: rows.filter((row) => row.reviewReasonCodes.includes(WARNING_CODES.lowFieldCoverage)).length,
    missingFieldCounts: Object.fromEntries(Object.entries(missingFieldCounts).sort(([left], [right]) => left.localeCompare(right))),
  };
}

function typeDetectionSummary(rows: RowAssessment[], requestedType: CsvImportType): CsvDryRunReport["typeDetection"] {
  const detectedTypes: Record<DetectedCsvType, number> = { project: 0, person: 0, review: 0 };
  const typeReasonCounts: Record<string, number> = {};
  for (const row of rows) {
    detectedTypes[row.detectedType] += 1;
    for (const reason of row.typeReasons) increment(typeReasonCounts, reason);
  }
  return {
    requestedType,
    detectedTypes,
    typeReasonCounts: Object.fromEntries(Object.entries(typeReasonCounts).sort(([left], [right]) => left.localeCompare(right))),
    typeConflictCount: rows.filter((row) => row.reviewReasonCodes.includes(WARNING_CODES.typeConflict)).length,
  };
}

function mergeMappedColumns(type: CsvImportType, projectMapping: HeaderMapping, personMapping: HeaderMapping): Array<{ field: string; headerHash: string }> {
  const columns = type === "person"
    ? personMapping.mappedColumns
    : type === "project"
      ? projectMapping.mappedColumns
      : [...projectMapping.mappedColumns, ...personMapping.mappedColumns];
  return columns
    .filter((column, index, all) => all.findIndex((item) => item.field === column.field && item.headerHash === column.headerHash) === index)
    .sort((left, right) => left.field.localeCompare(right.field));
}

function mergeUnmappedColumns(type: CsvImportType, projectMapping: HeaderMapping, personMapping: HeaderMapping): Array<{ headerHash: string }> {
  if (type === "person") return personMapping.unmappedColumns;
  if (type === "project") return projectMapping.unmappedColumns;

  const personUnmappedHashes = new Set(personMapping.unmappedColumns.map((column) => column.headerHash));
  return projectMapping.unmappedColumns.filter((column) => personUnmappedHashes.has(column.headerHash));
}

export function assertNoSensitiveCsvOutput(text: string): void {
  const forbiddenPatterns = [
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
    /\b(?:postgres(?:ql)?|mysql|sqlserver):\/\//i,
    /\b(?:DATABASE_URL|DIRECT_URL|SMTP_PASSWORD|GMAIL_REFRESH_TOKEN|API[_-]?KEY|CLIENT[_-]?SECRET|TOKEN|PASSWORD|SECRET)\s*[:=]\s*["']?[^"',\s}]+/i,
    /\bBearer\s+[A-Za-z0-9._-]+/i,
    /\b(?:sk|pk)_(?:live|test)_[A-Za-z0-9_-]{8,}\b/i,
    /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/i,
    /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/i,
    /-----BEGIN [A-Z ]+KEY-----/,
    /"rawRow"\s*:/i,
    /"rawValue"\s*:/i,
    /"subject"\s*:/i,
    /"body(?:Text|Html|Raw|Normalized)?"\s*:/i,
    /"email"\s*:/i,
    /"values"\s*:/i,
    /[A-Z]:\\{1,2}/i,
    /\\{1,2}Users\\{1,2}/i,
  ];
  const matched = forbiddenPatterns.find((pattern) => pattern.test(text));
  if (matched) throw new Error(`Sensitive CSV dry-run output matched ${matched}`);
}

export function buildCsvDryRunReport(params: {
  csvText: string;
  type: CsvImportType;
  limit?: number;
  fileIdentity?: string;
  fileBytes?: number;
  existingProjects?: ExistingProjectCandidate[];
  existingPersons?: ExistingPersonCandidate[];
  dbReadOnlyScannedProjects?: number;
  dbReadOnlyScannedPersons?: number;
  dbReadOnlyEnabled?: boolean;
  sourcePreview?: boolean;
}): CsvDryRunReport {
  const limit = params.limit ?? MAX_LIMIT;
  const table = parseCsv(params.csvText);
  const projectMapping = mapHeaders(table.headers, "project");
  const personMapping = mapHeaders(table.headers, "person");
  const rowsToAssess = table.rows.slice(0, limit);
  const assessedRows = finalizeRows(rowsToAssess.map((row, index) => assessRow({
    row,
    rowNumber: index + 2,
    requestedType: params.type,
    projectMapping,
    personMapping,
  })), params);

  const effectiveTypes: Record<ResolvedCsvImportType, number> = { project: 0, person: 0 };
  const detectedTypes: Record<DetectedCsvType, number> = { project: 0, person: 0, review: 0 };
  for (const row of assessedRows) {
    effectiveTypes[row.type] += 1;
    detectedTypes[row.detectedType] += 1;
  }

  const mappedColumns = mergeMappedColumns(params.type, projectMapping, personMapping);
  const unmappedColumns = mergeUnmappedColumns(params.type, projectMapping, personMapping);
  const duplicateReasonCounts = countCodes(assessedRows, "duplicateReasons");
  const strongDuplicateCandidateCount = assessedRows.filter((row) => row.duplicateStrength === "strong").length;
  const weakDuplicateCandidateCount = assessedRows.filter((row) => row.duplicateStrength === "weak").length;
  const lowCoverageCount = assessedRows.filter((row) => row.reviewReasonCodes.includes(WARNING_CODES.lowFieldCoverage)).length;
  const typeConflictCount = assessedRows.filter((row) => row.reviewReasonCodes.includes(WARNING_CODES.typeConflict)).length;

  const report: CsvDryRunReport = {
    summary: {
      mode: "csv-import-dry-run",
      readOnly: true,
      applySupported: false,
      fileHash: shortHash(params.fileIdentity ?? params.csvText),
      fileBytes: params.fileBytes ?? Buffer.byteLength(params.csvText, "utf8"),
      fileRows: table.fileRows,
      parsedRows: assessedRows.length,
      type: params.type,
      requestedType: params.type,
      effectiveTypes,
      detectedTypes,
      limit,
      maxSampleRows: MAX_SAMPLE_ROWS,
      piiSafe: true,
      secretsRedacted: true,
    },
    mappedColumns,
    unmappedColumns: {
      count: unmappedColumns.length,
      headerHashes: [...new Set(unmappedColumns.map((column) => column.headerHash))].sort(),
    },
    requiredFieldCoverage: coverageSummary(assessedRows),
    fieldCoverage: fieldCoverageSummary(assessedRows),
    typeDetection: typeDetectionSummary(assessedRows, params.type),
    duplicateMatching: {
      dbReadOnlyEnabled: params.dbReadOnlyEnabled ?? false,
      dbReadOnlyScannedProjects: params.dbReadOnlyScannedProjects ?? 0,
      dbReadOnlyScannedPersons: params.dbReadOnlyScannedPersons ?? 0,
      sourceRowDuplicateCount: assessedRows.filter((row) => row.duplicateReasons.includes(WARNING_CODES.duplicateBySourceRow)).length,
      strongDuplicateCandidateCount,
      weakDuplicateCandidateCount,
      duplicateReasonCounts,
    },
    outcomes: {
      wouldCreate: assessedRows.filter((row) => row.action === "would_create").length,
      wouldNeedReview: assessedRows.filter((row) => row.action === "would_need_review").length,
      wouldSkip: assessedRows.filter((row) => row.action === "would_skip").length,
      duplicateCandidateCount: assessedRows.filter((row) => row.duplicateCandidate).length,
      strongDuplicateCandidateCount,
      weakDuplicateCandidateCount,
      typeConflictCount,
      lowCoverageCount,
      invalidRowCount: assessedRows.filter((row) => row.warningCodes.includes(WARNING_CODES.emptyRow)).length,
    },
    warningCounts: countCodes(assessedRows, "warningCodes"),
    reviewReasonCounts: countCodes(assessedRows, "reviewReasonCodes"),
    sampleRows: assessedRows.slice(0, MAX_SAMPLE_ROWS),
    notes: [
      "dry-run only; no DB writes",
      "CSV values are mapped and validated locally",
      "raw CSV rows and raw values are not printed",
      "subjects, bodies, emails, customer names, company names, person names, and secrets are not printed",
      "duplicate candidates include source-row duplicates and optional read-only DB duplicate matches",
    ],
  };

  if (params.sourcePreview) {
    const sourceRecords = assessedRows.map(buildPreviewSourceRecord);
    const entityLinks = assessedRows
      .map((row, index) => buildPreviewEntitySourceLink(row, sourceRecords[index].recordHash))
      .filter((link): link is PreviewEntitySourceLink => Boolean(link));
    report.sourcePreview = buildCsvSourceTrackingPreview({
      report,
      rows: assessedRows,
      fileIdentity: params.fileIdentity,
      sourceRecords,
      entityLinks,
    });
    Object.defineProperty(report, "sourcePreviewInternal", {
      value: { sourceRecords, entityLinks },
      enumerable: false,
    });
  }

  assertNoSensitiveCsvOutput(JSON.stringify(report));
  return report;
}

function buildBaseApplySummary(report: CsvDryRunReport, limit: number): CsvSourceApplySummary {
  return {
    mode: "apply",
    limit,
    fileRows: report.summary.fileRows,
    parsedRows: report.summary.parsedRows,
    sourceRecordsCreated: 0,
    sourceRecordsSkippedExisting: 0,
    entityLinksCreated: 0,
    entityLinksSkippedExisting: 0,
    importRunStatus: "FAILED",
    failed: true,
    warningCounts: report.warningCounts,
    reviewReasonCounts: report.reviewReasonCounts,
    sampleRedactedRecords: report.sourcePreview?.sourceRecordSamples.slice(0, MAX_SAMPLE_ROWS) ?? [],
  };
}

function sanitizedApplyError(error: unknown): CsvSourceApplySummary["errorSummary"] {
  const detail = error instanceof Error ? `${error.name}:${error.message}` : String(error);
  return {
    code: "CSV_SOURCE_APPLY_FAILED",
    message: "A sanitized CSV source apply error occurred.",
    errorHash: shortHash(detail),
  };
}

function applyRunStatusFromPreview(preview: CsvSourceTrackingPreview): "SUCCEEDED" | "PARTIAL" {
  return preview.previewImportRun.status === "SUCCEEDED" ? "SUCCEEDED" : "PARTIAL";
}

function sourceRecordCreateData(params: {
  sourceId: string;
  importRunId: string;
  record: PreviewSourceRecord;
}): Record<string, unknown> {
  const { sourceId, importRunId, record } = params;
  return {
    sourceId,
    importRunId,
    providerRecordId: `csv:${record.recordHash.slice(0, 16)}:${record.rawRef.rowIndex}`,
    recordType: record.recordType,
    recordHash: record.recordHash,
    rawRef: record.rawRef,
    normalizedPayload: record.normalizedPayload,
    redactedPreview: record.redactedPreview,
    status: record.status,
    reviewReasons: record.reviewReasons,
    warnings: record.warnings,
  };
}

function entitySourceLinkCreateData(params: {
  sourceRecordId: string;
  link: PreviewEntitySourceLink;
}): Record<string, unknown> {
  const { sourceRecordId, link } = params;
  return {
    sourceRecordId,
    entityType: link.entityType,
    entityId: deterministicUuid(`csv-source-link:${link.sourceRecordHash}:${link.entityType}:${link.linkType}:${link.reasons.join("|")}`),
    linkType: link.linkType,
    confidence: link.confidence.toFixed(4),
    reasons: [
      ...link.reasons,
      "CSV_SOURCE_RECORD_ONLY_NO_PROJECT_OR_PERSON_WRITTEN",
    ],
  };
}

async function writeCsvSourceApplyRecords(params: {
  db: CsvSourceApplyDb;
  sourceId: string;
  importRunId: string;
  sourceRecords: PreviewSourceRecord[];
  entityLinks: PreviewEntitySourceLink[];
}): Promise<Pick<CsvSourceApplySummary,
  "sourceRecordsCreated"
  | "sourceRecordsSkippedExisting"
  | "entityLinksCreated"
  | "entityLinksSkippedExisting"
>> {
  const { db, sourceId, importRunId, sourceRecords, entityLinks } = params;
  const sourceRecordIdsByHash = new Map<string, string>();
  const entityLinkKeys = new Set<string>();
  const counts = {
    sourceRecordsCreated: 0,
    sourceRecordsSkippedExisting: 0,
    entityLinksCreated: 0,
    entityLinksSkippedExisting: 0,
  };

  for (const record of sourceRecords) {
    const existingInRun = sourceRecordIdsByHash.get(record.recordHash);
    if (existingInRun) {
      counts.sourceRecordsSkippedExisting += 1;
      continue;
    }

    const existing = await db.sourceRecord.findFirst({
      where: {
        sourceId,
        recordHash: record.recordHash,
        recordType: record.recordType,
      },
    });
    if (existing) {
      sourceRecordIdsByHash.set(record.recordHash, existing.id);
      counts.sourceRecordsSkippedExisting += 1;
      continue;
    }

    const created = await db.sourceRecord.create({
      data: sourceRecordCreateData({ sourceId, importRunId, record }),
    });
    sourceRecordIdsByHash.set(record.recordHash, created.id);
    counts.sourceRecordsCreated += 1;
  }

  for (const link of entityLinks) {
    const sourceRecordId = sourceRecordIdsByHash.get(link.sourceRecordHash);
    if (!sourceRecordId) continue;

    const data = entitySourceLinkCreateData({ sourceRecordId, link });
    const key = [sourceRecordId, data.entityType, data.entityId, data.linkType].join(":");
    if (entityLinkKeys.has(key)) {
      counts.entityLinksSkippedExisting += 1;
      continue;
    }
    entityLinkKeys.add(key);

    const existing = await db.entitySourceLink.findFirst({
      where: {
        sourceRecordId,
        entityType: data.entityType,
        entityId: data.entityId,
        linkType: data.linkType,
      },
    });
    if (existing) {
      counts.entityLinksSkippedExisting += 1;
      continue;
    }

    await db.entitySourceLink.create({ data });
    counts.entityLinksCreated += 1;
  }

  return counts;
}

function getSourcePreviewInternal(report: CsvDryRunReport): CsvSourceTrackingPreviewInternal {
  return report.sourcePreviewInternal ?? {
    sourceRecords: report.sourcePreview?.sourceRecordSamples ?? [],
    entityLinks: report.sourcePreview?.entitySourceLinkSamples ?? [],
  };
}

export async function applyCsvSourcePreviewReport(params: {
  report: CsvDryRunReport;
  db: CsvSourceApplyDb;
  limit: number;
  now?: Date;
}): Promise<CsvSourceApplySummary> {
  const { report, db, limit } = params;
  if (!report.sourcePreview) throw new Error("csv:import:apply requires a source-preview report.");
  if (limit <= 0 || limit > MAX_APPLY_LIMIT || !Number.isInteger(limit)) {
    throw new Error(`--limit must be <= ${MAX_APPLY_LIMIT} for csv:import:apply.`);
  }
  if (report.summary.parsedRows > limit) {
    throw new Error("csv:import:apply report parsed rows exceed --limit.");
  }

  const preview = report.sourcePreview;
  const now = params.now ?? new Date();
  const summary = buildBaseApplySummary(report, limit);
  let importRunId: string | null = null;

  try {
    const existingSource = await db.importSource.findFirst({
      where: {
        type: "CSV",
        name: preview.previewImportSource.nameRedacted,
        status: "ACTIVE",
      },
    });
    const importSource = existingSource ?? await db.importSource.create({
      data: {
        type: "CSV",
        name: preview.previewImportSource.nameRedacted,
        status: "ACTIVE",
        configSummary: preview.previewImportSource.configSummary,
      },
    });

    const importRun = await db.importRun.create({
      data: {
        sourceId: importSource.id,
        mode: "APPLY",
        status: "RUNNING",
        startedAt: now,
        summary: {
          mode: "apply",
          limit,
          fileRows: report.summary.fileRows,
          parsedRows: report.summary.parsedRows,
          warningCounts: report.warningCounts,
          reviewReasonCounts: report.reviewReasonCounts,
        },
      },
    });
    importRunId = importRun.id;

    const writeCounts = db.$transaction
      ? await db.$transaction((tx) => writeCsvSourceApplyRecords({
          db: tx,
          sourceId: importSource.id,
          importRunId: importRun.id,
          ...getSourcePreviewInternal(report),
        }))
      : await writeCsvSourceApplyRecords({
          db,
          sourceId: importSource.id,
          importRunId: importRun.id,
          ...getSourcePreviewInternal(report),
        });

    Object.assign(summary, writeCounts, {
      importRunStatus: applyRunStatusFromPreview(preview),
      failed: false,
    });

    await db.importRun.update({
      where: { id: importRun.id },
      data: {
        status: summary.importRunStatus,
        finishedAt: now,
        summary,
        errorSummary: null,
      },
    });
  } catch (error) {
    summary.importRunStatus = "FAILED";
    summary.failed = true;
    summary.errorSummary = sanitizedApplyError(error);
    if (importRunId) {
      await db.importRun.update({
        where: { id: importRunId },
        data: {
          status: "FAILED",
          finishedAt: now,
          summary,
          errorSummary: summary.errorSummary,
        },
      });
    }
  }

  assertNoSensitiveCsvOutput(JSON.stringify(summary));
  return summary;
}

export async function runCsvSourceApply(argv = process.argv): Promise<CsvSourceApplySummary> {
  const args = parseCsvSourceApplyArgs(argv);
  const csvText = await readFile(args.file, "utf8");
  const fileStats = statSync(args.file);
  const report = buildCsvDryRunReport({
    csvText,
    type: args.type,
    limit: args.limit,
    fileIdentity: args.file,
    fileBytes: fileStats.size,
    sourcePreview: true,
  });
  assertNotProductionMutation("csv:import:apply");
  const { prisma } = await import("../lib/prisma");
  return applyCsvSourcePreviewReport({
    report,
    db: prisma as unknown as CsvSourceApplyDb,
    limit: args.limit,
  });
}

async function loadDbDuplicateInputs(args: CsvDryRunArgs): Promise<DuplicateInputs> {
  if (args.dbDuplicates !== "on") return { dbReadOnlyEnabled: false };
  if (process.env.CSV_DRY_RUN_DUPLICATE_FIXTURE === "synthetic") {
    return syntheticDuplicateInputs(args);
  }
  if (!process.env.DATABASE_URL) {
    if (args.dbDuplicates === "on") throw new Error("--db-duplicates=on requires DATABASE_URL, but its value will never be printed.");
    return { dbReadOnlyEnabled: false };
  }

  const { prisma } = await import("../lib/prisma");
  const take = Math.min(args.limit, MAX_DB_DUPLICATE_SCAN);
  const includeProject = args.type === "project" || args.type === "auto";
  const includePerson = args.type === "person" || args.type === "auto";
  const [projects, persons] = await Promise.all([
    includeProject
      ? prisma.project.findMany({
          where: { status: { not: "ARCHIVED" } },
          take,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          select: {
            title: true,
            workDescription: true,
            summary: true,
            companyRoles: {
              take: 2,
              select: { company: { select: { name: true } } },
            },
            condition: {
              select: {
                unitPriceMin: true,
                unitPriceMax: true,
                workLocationText: true,
                startMonth: true,
              },
            },
            skills: {
              take: 20,
              select: { skillName: true },
            },
          },
        })
      : Promise.resolve([]),
    includePerson
      ? prisma.person.findMany({
          where: { status: { not: "ARCHIVED" } },
          take,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          select: {
            name: true,
            initials: true,
            summary: true,
            desiredUnitPrice: true,
            availableFrom: true,
            preferredLocation: true,
            ownerCompany: { select: { name: true } },
            skills: {
              take: 20,
              select: { skillName: true },
            },
          },
        })
      : Promise.resolve([]),
  ]);

  return {
    dbReadOnlyEnabled: true,
    dbReadOnlyScannedProjects: projects.length,
    dbReadOnlyScannedPersons: persons.length,
    existingProjects: projects.map((project) => ({
      title: project.title,
      companyName: project.companyRoles?.[0]?.company?.name ?? null,
      workContent: project.workDescription ?? project.summary ?? null,
      skills: project.skills?.map((skill) => skill.skillName) ?? [],
      unitPrice: project.condition?.unitPriceMin ?? project.condition?.unitPriceMax ?? null,
      workLocation: project.condition?.workLocationText ?? null,
      startMonth: project.condition?.startMonth ?? null,
    })),
    existingPersons: persons.map((person) => ({
      name: person.name,
      initials: person.initials,
      roleHeadline: person.summary,
      skills: person.skills?.map((skill) => skill.skillName) ?? [],
      nearestStation: person.preferredLocation,
      desiredUnitPrice: person.desiredUnitPrice,
      availableFrom: person.availableFrom,
      ownerCompany: person.ownerCompany?.name ?? null,
    })),
  };
}

function syntheticDuplicateInputs(args: CsvDryRunArgs): DuplicateInputs {
  const includeProject = args.type === "project" || args.type === "auto";
  const includePerson = args.type === "person" || args.type === "auto";
  const existingProjects: ExistingProjectCandidate[] = includeProject
    ? [{
        title: "Synthetic Clean Project",
        companyName: "Synthetic Client Delta",
        workContent: "Existing synthetic reporting workflow",
        skills: ["TypeScript", "PostgreSQL"],
        unitPrice: 90,
        workLocation: "Hybrid",
        startMonth: "2026-07",
      }]
    : [];
  const existingPersons: ExistingPersonCandidate[] = includePerson
    ? [{
        name: "Synthetic Person Clean",
        initials: "S.C",
        roleHeadline: "Fullstack Engineer",
        skills: ["TypeScript", "PostgreSQL"],
        desiredUnitPrice: 80,
        availableFrom: "2026-07",
        ownerCompany: "Synthetic Partner Delta",
      }]
    : [];

  return {
    dbReadOnlyEnabled: true,
    dbReadOnlyScannedProjects: existingProjects.length,
    dbReadOnlyScannedPersons: existingPersons.length,
    existingProjects,
    existingPersons,
  };
}

export async function runCsvDryRun(argv = process.argv): Promise<CsvDryRunReport> {
  const args = parseCsvDryRunArgs(argv);
  const csvText = await readFile(args.file, "utf8");
  const fileStats = statSync(args.file);
  const duplicateInputs = await loadDbDuplicateInputs(args);
  return buildCsvDryRunReport({
    csvText,
    type: args.type,
    limit: args.limit,
    fileIdentity: args.file,
    fileBytes: fileStats.size,
    sourcePreview: args.sourcePreview,
    ...duplicateInputs,
  });
}

if (require.main === module) {
  runCsvDryRun()
    .then((report) => {
      console.log(JSON.stringify(report, null, 2));
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
