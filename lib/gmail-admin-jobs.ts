import { createHash } from "node:crypto";

import { prisma } from "./prisma";
import {
  createPersonFromExtraction,
  createProjectFromExtraction,
} from "./gmail-extract-entities";
import {
  getGmailScriptConfig,
  getValidAccessToken,
  requestJson,
} from "../scripts/gmail-common";
import { classifyMailByRules } from "../scripts/gmail-classification-rules";
import {
  extractFromMail,
  type MailExtractionSource,
} from "../scripts/gmail-extraction";

export const GMAIL_SYNC_JOB_NAME = "gmail_sync_pipeline";

export type GmailAdminMode = "pipeline" | "sync" | "classify" | "extract";

export type GmailAdminSummary = {
  mode: GmailAdminMode;
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  projectCreated: number;
  personCreated: number;
};

type GmailMessageListResponse = {
  messages?: Array<{
    id: string;
    threadId: string;
  }>;
  nextPageToken?: string;
};

type GmailMessagePartBody = {
  data?: string;
  attachmentId?: string;
  size?: number;
};

type GmailMessagePart = {
  mimeType?: string;
  filename?: string;
  headers?: Array<{
    name: string;
    value: string;
  }>;
  body?: GmailMessagePartBody;
  parts?: GmailMessagePart[];
};

type GmailMessageFullResponse = {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  historyId?: string;
  internalDate?: string;
  payload?: GmailMessagePart;
};

type ExtractedMessage = {
  gmailId: string;
  threadId: string;
  snippet: string | null;
  historyId: string | null;
  labelIds: string[];
  subject: string | null;
  fromEmail: string | null;
  fromName: string | null;
  toEmails: string[];
  ccEmails: string[];
  bccEmails: string[];
  messageIdHeader: string | null;
  inReplyTo: string | null;
  referencesHeader: string | null;
  messageDate: Date | null;
  receivedAt: Date;
  bodyText: string | null;
  bodyHtml: string | null;
  bodyHash: string | null;
  normalizedSubject: string | null;
  normalizedBody: string | null;
  isReply: boolean;
  headers: Array<{
    name: string;
    value: string;
  }>;
};

type SyncOptions = {
  query: string;
  pageSize: number;
  maxResults: number;
  refreshExisting: boolean;
};

function emptySummary(mode: GmailAdminMode): GmailAdminSummary {
  return {
    mode,
    fetched: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    projectCreated: 0,
    personCreated: 0,
  };
}

export function normalizeGmailAdminMode(value: unknown): GmailAdminMode {
  if (value === "sync" || value === "classify" || value === "extract" || value === "pipeline") {
    return value;
  }

  return "pipeline";
}

export function sanitizeOperationalError(error: unknown): { message: string; stack: string | null } {
  const rawMessage = error instanceof Error ? error.message : String(error);
  const rawStack = error instanceof Error ? error.stack ?? "" : "";
  const secretValues = [
    process.env.AUTH_SECRET,
    process.env.CRON_SECRET,
    process.env.ADMIN_SECRET,
    process.env.SMTP_PASSWORD,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REFRESH_TOKEN,
  ].filter((value): value is string => Boolean(value && value.length >= 8));

  const sanitize = (value: string) => {
    let next = value;
    for (const secret of secretValues) {
      next = next.split(secret).join("[redacted]");
    }

    return next
      .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
      .replace(/(client_secret|refresh_token|access_token|reset_token|resetToken|password)=([^&\s]+)/gi, "$1=[redacted]")
      .replace(/ya29\.[A-Za-z0-9._-]+/g, "ya29.[redacted]")
      .replace(/GOCSPX-[A-Za-z0-9_-]+/g, "GOCSPX-[redacted]");
  };

  return {
    message: sanitize(rawMessage).slice(0, 1000),
    stack: rawStack ? sanitize(rawStack).slice(0, 4000) : null,
  };
}

export function buildGmailAdminSummary(
  mode: GmailAdminMode,
  summaries: Array<Partial<GmailAdminSummary>>,
): GmailAdminSummary {
  const result = emptySummary(mode);
  for (const summary of summaries) {
    result.fetched += summary.fetched ?? 0;
    result.created += summary.created ?? 0;
    result.updated += summary.updated ?? 0;
    result.skipped += summary.skipped ?? 0;
    result.failed += summary.failed ?? 0;
    result.projectCreated += summary.projectCreated ?? 0;
    result.personCreated += summary.personCreated ?? 0;
  }
  return result;
}

export function parsePositiveLimit(value: unknown, fallback: number): number {
  const parsed = typeof value === "string" || typeof value === "number" ? Number(value) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.min(Math.trunc(parsed), 500);
  }
  return fallback;
}

function formatGmailDate(value: string): string {
  const normalized = value.trim().replace(/-/g, "/");
  if (!/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(normalized)) {
    throw new Error("Gmail sync date options must be YYYY-MM-DD or YYYY/MM/DD");
  }

  const [year, month, day] = normalized.split("/").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - 1);

  return `${date.getUTCFullYear()}/${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
}

function formatGmailBeforeDate(value: string): string {
  const normalized = value.trim().replace(/-/g, "/");
  if (!/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(normalized)) {
    throw new Error("Gmail sync date options must be YYYY-MM-DD or YYYY/MM/DD");
  }

  const [year, month, day] = normalized.split("/").map(Number);
  return `${year}/${month}/${day}`;
}

function hasDateOperator(query: string): boolean {
  return /\b(after|newer|before|older):/i.test(query);
}

export function buildSyncOptions(input?: {
  query?: string | null;
  maxResults?: number | null;
  refreshExisting?: boolean;
}): SyncOptions {
  const config = getGmailScriptConfig();
  const maxResults = parsePositiveLimit(
    input?.maxResults ?? config.syncMaxResults ?? process.env.GMAIL_SYNC_MAX_RESULTS,
    config.syncMaxResults ?? config.initialSyncLimit ?? 50,
  );
  const pageSize = Math.min(config.syncPageSize, 500);
  const baseQuery = input?.query?.trim() || config.query;
  const dateQuery = [
    config.syncFrom ? `after:${formatGmailDate(config.syncFrom)}` : "",
    config.syncTo ? `before:${formatGmailBeforeDate(config.syncTo)}` : "",
  ].filter(Boolean).join(" ");
  const query = dateQuery && !hasDateOperator(baseQuery) ? `${baseQuery} ${dateQuery}` : baseQuery;

  return {
    query,
    pageSize,
    maxResults,
    refreshExisting: Boolean(input?.refreshExisting),
  };
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Buffer.from(padded, "base64").toString("utf8");
}

function collectHeaders(part?: GmailMessagePart): Array<{ name: string; value: string }> {
  return part?.headers ?? [];
}

function getHeader(headers: Array<{ name: string; value: string }>, name: string): string | null {
  const header = headers.find((item) => item.name.toLowerCase() === name.toLowerCase());
  return header?.value?.trim() || null;
}

function splitAddressList(value: string | null): string[] {
  if (!value) return [];

  const items: string[] = [];
  let current = "";
  let insideQuotes = false;
  let insideAngle = false;

  for (const char of value) {
    if (char === "\"") insideQuotes = !insideQuotes;
    if (char === "<") insideAngle = true;
    if (char === ">") insideAngle = false;
    if (char === "," && !insideQuotes && !insideAngle) {
      if (current.trim()) items.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  if (current.trim()) items.push(current.trim());
  return items;
}

function parseEmailAddress(value: string): string | null {
  const angleMatch = value.match(/<([^<>@\s]+@[^<>\s]+)>/);
  if (angleMatch?.[1]) return angleMatch[1].trim();

  const plainMatch = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return plainMatch?.[0]?.trim() ?? null;
}

function parseNameEmail(value: string | null): { email: string | null; name: string | null } {
  if (!value) return { email: null, name: null };

  const first = splitAddressList(value)[0] ?? value;
  const email = parseEmailAddress(first);
  const namePart = first.replace(/<[^<>]+>/g, "").replace(/^"|"$/g, "").trim();

  return {
    email,
    name: namePart && namePart !== email ? namePart : null,
  };
}

function parseEmailList(value: string | null): string[] {
  return splitAddressList(value)
    .map(parseEmailAddress)
    .filter((email): email is string => Boolean(email));
}

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toInternalDate(value: string | undefined): Date {
  if (!value) return new Date();

  const millis = Number(value);
  return Number.isFinite(millis) ? new Date(millis) : new Date();
}

function normalizeText(value: string | null): string | null {
  if (!value) return null;

  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized || null;
}

function sha256(value: string | null): string | null {
  if (!value) return null;

  return createHash("sha256").update(value).digest("hex");
}

function collectBody(part: GmailMessagePart | undefined): { text: string[]; html: string[] } {
  const result = { text: [] as string[], html: [] as string[] };

  function walk(current?: GmailMessagePart): void {
    if (!current) return;

    const hasAttachment = Boolean(current.body?.attachmentId || current.filename);
    const data = current.body?.data;
    if (data && !hasAttachment) {
      const decoded = decodeBase64Url(data);
      if (current.mimeType === "text/plain") {
        result.text.push(decoded);
      } else if (current.mimeType === "text/html") {
        result.html.push(decoded);
      }
    }

    for (const child of current.parts ?? []) {
      walk(child);
    }
  }

  walk(part);
  return result;
}

function extractMessage(message: GmailMessageFullResponse): ExtractedMessage {
  const headers = collectHeaders(message.payload);
  const from = parseNameEmail(getHeader(headers, "From"));
  const body = collectBody(message.payload);
  const bodyText = body.text.join("\n\n").trim() || null;
  const bodyHtml = body.html.join("\n\n").trim() || null;
  const subject = getHeader(headers, "Subject");
  const inReplyTo = getHeader(headers, "In-Reply-To");
  const referencesHeader = getHeader(headers, "References");
  const messageDate = toDate(getHeader(headers, "Date"));
  const receivedAt = toInternalDate(message.internalDate);
  const normalizedBody = normalizeText(bodyText);
  const normalizedSubject = normalizeText(subject);

  return {
    gmailId: message.id,
    threadId: message.threadId,
    snippet: message.snippet ?? null,
    historyId: message.historyId ?? null,
    labelIds: message.labelIds ?? [],
    subject,
    fromEmail: from.email,
    fromName: from.name,
    toEmails: parseEmailList(getHeader(headers, "To")),
    ccEmails: parseEmailList(getHeader(headers, "Cc")),
    bccEmails: parseEmailList(getHeader(headers, "Bcc")),
    messageIdHeader: getHeader(headers, "Message-ID"),
    inReplyTo,
    referencesHeader,
    messageDate,
    receivedAt,
    bodyText,
    bodyHtml,
    bodyHash: sha256(bodyText ?? bodyHtml),
    normalizedSubject,
    normalizedBody,
    isReply: Boolean(inReplyTo || referencesHeader || subject?.trim().toLowerCase().startsWith("re:")),
    headers,
  };
}

async function fetchMessageIds(accessToken: string, options: SyncOptions): Promise<Array<{ id: string; threadId: string }>> {
  const config = getGmailScriptConfig();
  const messages: Array<{ id: string; threadId: string }> = [];
  let pageToken: string | undefined;

  do {
    const listUrl = new URL(
      `https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(config.userId)}/messages`,
    );
    const remaining = options.maxResults - messages.length;
    const maxResults = Math.min(options.pageSize, remaining);
    if (maxResults <= 0) break;

    listUrl.searchParams.set("q", options.query);
    listUrl.searchParams.set("maxResults", String(maxResults));
    if (pageToken) listUrl.searchParams.set("pageToken", pageToken);

    const list = await requestJson<GmailMessageListResponse>(listUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    messages.push(...(list.messages ?? []));
    pageToken = list.nextPageToken;
  } while (pageToken && messages.length < options.maxResults);

  return messages;
}

async function fetchFullMessage(accessToken: string, userId: string, messageId: string): Promise<GmailMessageFullResponse> {
  const url = new URL(
    `https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(userId)}/messages/${encodeURIComponent(messageId)}`,
  );
  url.searchParams.set("format", "full");

  return requestJson<GmailMessageFullResponse>(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

async function getOrCreateSourceAccount(authUser: string): Promise<{ id: string }> {
  return prisma.mailAccount.upsert({
    where: { email: authUser },
    update: {
      provider: "GMAIL",
      displayName: "Gmail ingest account",
      purpose: "INBOUND_SHARED",
      isActive: true,
    },
    create: {
      email: authUser,
      provider: "GMAIL",
      displayName: "Gmail ingest account",
      purpose: "INBOUND_SHARED",
      isPrimaryIngest: true,
      isActive: true,
    },
    select: { id: true },
  });
}

async function hasExistingMailNotification(sourceAccountId: string, gmailId: string): Promise<boolean> {
  const existing = await prisma.mailNotification.findUnique({
    where: {
      sourceAccountId_externalMessageId: {
        sourceAccountId,
        externalMessageId: gmailId,
      },
    },
    select: { id: true },
  });

  return Boolean(existing);
}

async function saveMailNotification(params: {
  sourceAccountId: string;
  extracted: ExtractedMessage;
  query: string;
  authUser: string;
}): Promise<"created" | "updated"> {
  const existing = await prisma.mailNotification.findUnique({
    where: {
      sourceAccountId_externalMessageId: {
        sourceAccountId: params.sourceAccountId,
        externalMessageId: params.extracted.gmailId,
      },
    },
    select: { id: true },
  });

  const rawSource = {
    gmail: {
      id: params.extracted.gmailId,
      threadId: params.extracted.threadId,
      historyId: params.extracted.historyId,
      labelIds: params.extracted.labelIds,
      snippet: params.extracted.snippet,
      query: params.query,
      authUser: params.authUser,
    },
    headers: params.extracted.headers,
    parsedHeaders: {
      messageId: params.extracted.messageIdHeader,
      inReplyTo: params.extracted.inReplyTo,
      references: params.extracted.referencesHeader,
    },
  };

  const updateData = {
    externalThreadId: params.extracted.threadId,
    inReplyTo: params.extracted.inReplyTo,
    referencesHeader: params.extracted.referencesHeader,
    messageDate: params.extracted.messageDate,
    receivedAt: params.extracted.receivedAt,
    fromEmail: params.extracted.fromEmail,
    fromName: params.extracted.fromName,
    toEmails: params.extracted.toEmails,
    ccEmails: params.extracted.ccEmails,
    bccEmails: params.extracted.bccEmails,
    subject: params.extracted.subject,
    bodyText: params.extracted.bodyText,
    bodyHtml: params.extracted.bodyHtml,
    bodyHash: params.extracted.bodyHash,
    normalizedSubject: params.extracted.normalizedSubject,
    normalizedBody: params.extracted.normalizedBody,
    isReply: params.extracted.isReply,
    sourceRawHeaders: rawSource,
  };

  if (existing) {
    await prisma.mailNotification.update({
      where: { id: existing.id },
      data: updateData,
    });
    return "updated";
  }

  await prisma.mailNotification.create({
    data: {
      sourceAccountId: params.sourceAccountId,
      externalMessageId: params.extracted.gmailId,
      ...updateData,
      category: "NEEDS_REVIEW",
      isExcluded: false,
      needsReview: true,
      classifiedBy: "SYSTEM",
      classificationVersion: "gmail-ingest-v0.1",
    },
  });

  return "created";
}

export async function syncMailNotifications(input?: {
  query?: string | null;
  maxResults?: number | null;
  refreshExisting?: boolean;
}): Promise<{ summary: GmailAdminSummary; query: string; maxResults: number }> {
  const summary = emptySummary("sync");
  const config = getGmailScriptConfig();
  const syncOptions = buildSyncOptions(input);
  const accessToken = await getValidAccessToken();
  const sourceAccount = await getOrCreateSourceAccount(config.authUser);
  const messageIds = await fetchMessageIds(accessToken, syncOptions);
  summary.fetched = messageIds.length;

  for (const message of messageIds) {
    try {
      if (!syncOptions.refreshExisting && await hasExistingMailNotification(sourceAccount.id, message.id)) {
        summary.skipped += 1;
        continue;
      }

      const fullMessage = await fetchFullMessage(accessToken, config.userId, message.id);
      const extracted = extractMessage(fullMessage);
      const status = await saveMailNotification({
        sourceAccountId: sourceAccount.id,
        extracted,
        query: syncOptions.query,
        authUser: config.authUser,
      });

      summary[status] += 1;
    } catch {
      summary.failed += 1;
    }
  }

  return { summary, query: syncOptions.query, maxResults: syncOptions.maxResults };
}

export async function classifyMailNotifications(input?: { maxResults?: number | null }): Promise<GmailAdminSummary> {
  const summary = emptySummary("classify");
  const maxResults = parsePositiveLimit(input?.maxResults ?? process.env.GMAIL_CLASSIFY_LIMIT, 50);
  const mails = await prisma.mailNotification.findMany({
    where: { NOT: { classifiedBy: "MANUAL" } },
    orderBy: { receivedAt: "desc" },
    take: maxResults,
    select: {
      id: true,
      subject: true,
      bodyText: true,
      normalizedBody: true,
      fromEmail: true,
      fromName: true,
      toEmails: true,
      ccEmails: true,
      inReplyTo: true,
      referencesHeader: true,
      isReply: true,
    },
  });
  summary.fetched = mails.length;

  for (const mail of mails) {
    try {
      const result = classifyMailByRules(mail);
      await prisma.mailNotification.update({
        where: { id: mail.id },
        data: {
          category: result.category,
          categoryConfidence: result.confidence,
          isExcluded: result.isExcluded,
          excludeReason: result.excludeReason,
          needsReview: result.needsReview,
          classifiedBy: result.classifiedBy,
          classificationVersion: result.classificationVersion,
          isReply: result.label === "reply" ? true : mail.isReply,
        },
      });
      summary.updated += 1;
    } catch {
      summary.failed += 1;
    }
  }

  return summary;
}

export async function extractEntitiesFromClassifiedMails(input?: { maxResults?: number | null }): Promise<GmailAdminSummary> {
  const summary = emptySummary("extract");
  const maxResults = parsePositiveLimit(input?.maxResults ?? process.env.GMAIL_EXTRACT_LIMIT, 50);
  const mails = await prisma.mailNotification.findMany({
    where: {
      category: { in: ["PROJECT_INTRO", "PERSON_INTRO"] },
      isExcluded: false,
    },
    orderBy: { receivedAt: "desc" },
    take: maxResults,
    select: {
      id: true,
      category: true,
      externalMessageId: true,
      subject: true,
      normalizedSubject: true,
      bodyText: true,
      normalizedBody: true,
      fromEmail: true,
      fromName: true,
      receivedAt: true,
    },
  });
  summary.fetched = mails.length;

  for (const mail of mails) {
    try {
      const extraction = extractFromMail(mail as MailExtractionSource);
      const result = await prisma.$transaction(async (tx) => {
        if (extraction.target === "project") {
          return createProjectFromExtraction(tx, mail as MailExtractionSource, extraction);
        }
        return createPersonFromExtraction(tx, mail as MailExtractionSource, extraction);
      });

      if (result.entity === "project" && result.action === "created") {
        summary.projectCreated += 1;
        summary.created += 1;
      } else if (result.entity === "person" && result.action === "created") {
        summary.personCreated += 1;
        summary.created += 1;
      } else if (result.action === "updated") {
        summary.updated += 1;
      } else {
        summary.skipped += 1;
      }
    } catch {
      summary.failed += 1;
    }
  }

  return summary;
}

export async function runGmailAdminJob(input: {
  mode: GmailAdminMode;
  maxResults?: number | null;
  query?: string | null;
  refreshExisting?: boolean;
}): Promise<{ summary: GmailAdminSummary; query: string; maxResults: number }> {
  const mode = input.mode;
  const syncOptions = buildSyncOptions({
    query: input.query,
    maxResults: input.maxResults,
    refreshExisting: input.refreshExisting,
  });

  if (mode === "sync") {
    return syncMailNotifications(input);
  }

  if (mode === "classify") {
    const summary = await classifyMailNotifications({ maxResults: syncOptions.maxResults });
    return { summary, query: syncOptions.query, maxResults: syncOptions.maxResults };
  }

  if (mode === "extract") {
    const summary = await extractEntitiesFromClassifiedMails({ maxResults: syncOptions.maxResults });
    return { summary, query: syncOptions.query, maxResults: syncOptions.maxResults };
  }

  const sync = await syncMailNotifications(input);
  const classify = await classifyMailNotifications({ maxResults: syncOptions.maxResults });
  const extract = await extractEntitiesFromClassifiedMails({ maxResults: syncOptions.maxResults });
  const summary: GmailAdminSummary = {
    mode: "pipeline",
    fetched: sync.summary.fetched,
    created: sync.summary.created,
    updated: sync.summary.updated + classify.updated,
    skipped: sync.summary.skipped + extract.skipped,
    failed: sync.summary.failed + classify.failed + extract.failed,
    projectCreated: extract.projectCreated,
    personCreated: extract.personCreated,
  };
  return {
    summary,
    query: sync.query,
    maxResults: sync.maxResults,
  };
}

export async function acquireJobLock(input: {
  jobName: string;
  lockedBy: string;
  leaseMs?: number;
}): Promise<boolean> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + (input.leaseMs ?? 10 * 60 * 1000));

  try {
    await prisma.jobLock.create({
      data: {
        jobName: input.jobName,
        lockedBy: input.lockedBy,
        lockedAt: now,
        expiresAt,
      },
    });
    return true;
  } catch {
    const updated = await prisma.jobLock.updateMany({
      where: {
        jobName: input.jobName,
        expiresAt: { lte: now },
      },
      data: {
        lockedBy: input.lockedBy,
        lockedAt: now,
        expiresAt,
      },
    });
    return updated.count === 1;
  }
}

export async function releaseJobLock(input: { jobName: string; lockedBy: string }): Promise<void> {
  const now = new Date();
  await prisma.jobLock.updateMany({
    where: {
      jobName: input.jobName,
      lockedBy: input.lockedBy,
    },
    data: {
      expiresAt: now,
    },
  });
}
