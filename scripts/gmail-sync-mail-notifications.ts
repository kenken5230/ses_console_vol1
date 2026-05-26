import "dotenv/config";

import { createHash } from "node:crypto";

import { prisma } from "../lib/prisma";
import { buildMailBodyContent, normalizeSearchText } from "../lib/gmail-message-body";
import { assertNotProductionMutation } from "../lib/production-guard";
import {
  getGmailScriptConfig,
  getValidAccessToken,
  requestJson,
} from "./gmail-common";

assertNotProductionMutation("gmail:sync");

type GmailMessageListResponse = {
  messages?: Array<{
    id: string;
    threadId: string;
  }>;
  nextPageToken?: string;
  resultSizeEstimate?: number;
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
  maxResults: number | null;
};

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
  if (!value) {
    return [];
  }

  const items: string[] = [];
  let current = "";
  let insideQuotes = false;
  let insideAngle = false;

  for (const char of value) {
    if (char === '"') {
      insideQuotes = !insideQuotes;
    }
    if (char === "<") {
      insideAngle = true;
    }
    if (char === ">") {
      insideAngle = false;
    }
    if (char === "," && !insideQuotes && !insideAngle) {
      if (current.trim()) {
        items.push(current.trim());
      }
      current = "";
      continue;
    }
    current += char;
  }

  if (current.trim()) {
    items.push(current.trim());
  }

  return items;
}

function parseEmailAddress(value: string): string | null {
  const angleMatch = value.match(/<([^<>@\s]+@[^<>\s]+)>/);
  if (angleMatch?.[1]) {
    return angleMatch[1].trim();
  }

  const plainMatch = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return plainMatch?.[0]?.trim() ?? null;
}

function parseNameEmail(value: string | null): { email: string | null; name: string | null } {
  if (!value) {
    return { email: null, name: null };
  }

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
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toInternalDate(value: string | undefined): Date {
  if (!value) {
    return new Date();
  }

  const millis = Number(value);
  return Number.isFinite(millis) ? new Date(millis) : new Date();
}

function sha256(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return createHash("sha256").update(value).digest("hex");
}

function collectBody(part: GmailMessagePart | undefined): { text: string[]; html: string[] } {
  const result = { text: [] as string[], html: [] as string[] };

  function walk(current?: GmailMessagePart): void {
    if (!current) {
      return;
    }

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

function parseArgValue(name: string): string | null {
  return process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split("=")[1] ?? null;
}

function parsePositiveInt(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : null;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function formatGmailDate(value: string): string {
  const normalized = value.trim().replace(/-/g, "/");
  if (!/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(normalized)) {
    throw new Error("Date options must be YYYY-MM-DD or YYYY/MM/DD");
  }

  const [year, month, day] = normalized.split("/").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - 1);

  return `${date.getUTCFullYear()}/${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
}

function formatGmailBeforeDate(value: string): string {
  const normalized = value.trim().replace(/-/g, "/");
  if (!/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(normalized)) {
    throw new Error("Date options must be YYYY-MM-DD or YYYY/MM/DD");
  }

  const [year, month, day] = normalized.split("/").map(Number);
  return `${year}/${month}/${day}`;
}

function hasDateOperator(query: string): boolean {
  return /\b(after|newer|before|older):/i.test(query);
}

function buildSyncOptions(): SyncOptions {
  const config = getGmailScriptConfig();
  const baseQuery = parseArgValue("query") ?? config.query;
  const from = parseArgValue("from") ?? config.syncFrom;
  const to = parseArgValue("to") ?? config.syncTo;
  const maxResults = parsePositiveInt(parseArgValue("limit")) ?? config.syncMaxResults;
  const pageSize = Math.min(parsePositiveInt(parseArgValue("page-size")) ?? config.syncPageSize, 500);
  const dateQuery = [
    from ? `after:${formatGmailDate(from)}` : "",
    to ? `before:${formatGmailBeforeDate(to)}` : "",
  ].filter(Boolean).join(" ");
  const query = dateQuery && !hasDateOperator(baseQuery) ? `${baseQuery} ${dateQuery}` : baseQuery;

  return { query, pageSize, maxResults };
}

function extractMessage(message: GmailMessageFullResponse): ExtractedMessage {
  const headers = collectHeaders(message.payload);
  const from = parseNameEmail(getHeader(headers, "From"));
  const body = collectBody(message.payload);
  const bodyContent = buildMailBodyContent(body);
  const subject = getHeader(headers, "Subject");
  const inReplyTo = getHeader(headers, "In-Reply-To");
  const referencesHeader = getHeader(headers, "References");
  const messageDate = toDate(getHeader(headers, "Date"));
  const receivedAt = toInternalDate(message.internalDate);
  const normalizedSubject = normalizeSearchText(subject);

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
    bodyText: bodyContent.bodyText,
    bodyHtml: bodyContent.bodyHtml,
    bodyHash: sha256(bodyContent.bodyText ?? bodyContent.bodyHtml),
    normalizedSubject,
    normalizedBody: bodyContent.normalizedBody,
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

    const remaining = options.maxResults ? options.maxResults - messages.length : options.pageSize;
    const maxResults = options.maxResults ? Math.min(options.pageSize, remaining) : options.pageSize;
    if (maxResults <= 0) break;

    listUrl.searchParams.set("q", options.query);
    listUrl.searchParams.set("maxResults", String(maxResults));
    if (pageToken) listUrl.searchParams.set("pageToken", pageToken);

    const list = await requestJson<GmailMessageListResponse>(listUrl.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    messages.push(...(list.messages ?? []));
    pageToken = list.nextPageToken;
  } while (pageToken && (!options.maxResults || messages.length < options.maxResults));

  return messages;
}

async function fetchFullMessage(
  accessToken: string,
  userId: string,
  messageId: string,
): Promise<GmailMessageFullResponse> {
  const url = new URL(
    `https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(userId)}/messages/${encodeURIComponent(messageId)}`,
  );

  url.searchParams.set("format", "full");

  return requestJson<GmailMessageFullResponse>(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
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

async function main(): Promise<void> {
  const config = getGmailScriptConfig();
  const syncOptions = buildSyncOptions();
  const verbose = hasFlag("verbose");
  const refreshExisting = hasFlag("refresh-existing");
  const accessToken = await getValidAccessToken();
  const sourceAccount = await getOrCreateSourceAccount(config.authUser);
  const messageIds = await fetchMessageIds(accessToken, syncOptions);
  const result = {
    fetched: messageIds.length,
    created: 0,
    updated: 0,
    skippedExisting: 0,
    failed: 0,
  };

  console.log("Starting Gmail mail_notifications sync.");
  console.log(`authUser: ${config.authUser}`);
  console.log(`userId: ${config.userId}`);
  console.log(`query: ${syncOptions.query}`);
  console.log(`pageSize: ${syncOptions.pageSize}`);
  console.log(`maxResults: ${syncOptions.maxResults ?? "unlimited"}`);

  let processed = 0;
  for (const message of messageIds) {
    processed += 1;
    try {
      if (!refreshExisting && await hasExistingMailNotification(sourceAccount.id, message.id)) {
        result.skippedExisting += 1;
        if (verbose) console.log(`[skipped_existing] ${message.id}`);
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

      result[status] += 1;
      if (verbose) {
        console.log(`[${status}] ${extracted.gmailId} ${extracted.subject ?? "(no subject)"}`);
      }
    } catch (error) {
      result.failed += 1;
      console.error(`[failed] ${message.id}: ${error instanceof Error ? error.message : String(error)}`);
    }

    if (!verbose && (processed % 100 === 0 || processed === messageIds.length)) {
      console.log(
        `[progress] ${processed}/${messageIds.length} created=${result.created} updated=${result.updated} skippedExisting=${result.skippedExisting} failed=${result.failed}`,
      );
    }
  }

  console.table([result]);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
