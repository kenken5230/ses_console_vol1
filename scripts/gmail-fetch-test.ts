import {
  getGmailScriptConfig,
  getValidAccessToken,
  requestJson,
} from "./gmail-common";

type GmailMessageListResponse = {
  messages?: Array<{
    id: string;
    threadId: string;
  }>;
  resultSizeEstimate?: number;
};

type GmailMessageMetadataResponse = {
  id: string;
  threadId: string;
  internalDate?: string;
  payload?: {
    headers?: Array<{
      name: string;
      value: string;
    }>;
  };
};

function getHeader(message: GmailMessageMetadataResponse, name: string): string {
  const header = message.payload?.headers?.find(
    (item) => item.name.toLowerCase() === name.toLowerCase(),
  );

  return header?.value ?? "-";
}

function toReceivedAt(message: GmailMessageMetadataResponse): string {
  if (!message.internalDate) {
    return "-";
  }

  const millis = Number(message.internalDate);
  if (!Number.isFinite(millis)) {
    return "-";
  }

  return new Date(millis).toISOString();
}

async function fetchMessageMetadata(
  accessToken: string,
  userId: string,
  messageId: string,
): Promise<GmailMessageMetadataResponse> {
  const url = new URL(
    `https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(userId)}/messages/${encodeURIComponent(messageId)}`,
  );

  url.searchParams.set("format", "metadata");
  for (const header of ["Subject", "From", "Date", "To"]) {
    url.searchParams.append("metadataHeaders", header);
  }

  return requestJson<GmailMessageMetadataResponse>(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

async function main(): Promise<void> {
  const config = getGmailScriptConfig();
  const accessToken = await getValidAccessToken();
  const listUrl = new URL(
    `https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(config.userId)}/messages`,
  );

  listUrl.searchParams.set("q", config.query);
  listUrl.searchParams.set("maxResults", String(config.initialSyncLimit));

  console.log("Gmail取得テストを開始します。DB保存は行いません。");
  console.log(`userId: ${config.userId}`);
  console.log(`query: ${config.query}`);
  console.log(`maxResults: ${config.initialSyncLimit}`);

  const list = await requestJson<GmailMessageListResponse>(listUrl.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const messages = list.messages ?? [];

  if (messages.length === 0) {
    console.log("該当メールは0件でした。");
    return;
  }

  const rows = [];
  for (const message of messages) {
    const detail = await fetchMessageMetadata(accessToken, config.userId, message.id);
    rows.push({
      subject: getHeader(detail, "Subject"),
      from: getHeader(detail, "From"),
      receivedAt: toReceivedAt(detail),
      messageId: detail.id,
      threadId: detail.threadId,
    });
  }

  console.table(rows);
  console.log(`取得件数: ${rows.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
