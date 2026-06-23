export type GmailBodyParts = {
  text: string[];
  html: string[];
};

export type MailBodyContent = {
  bodyText: string | null;
  bodyHtml: string | null;
  normalizedBody: string | null;
  bodyTextSource: "text/plain" | "text/html" | "none";
};

const htmlEntityMap: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: "\"",
};

function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    const key = entity.toLowerCase();
    if (key.startsWith("#x")) {
      const codePoint = Number.parseInt(key.slice(2), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    if (key.startsWith("#")) {
      const codePoint = Number.parseInt(key.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    return htmlEntityMap[key] ?? match;
  });
}

export function normalizeBodyText(value: string | null | undefined): string | null {
  if (!value) return null;

  const normalized = value
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return normalized || null;
}

export function normalizeSearchText(value: string | null | undefined): string | null {
  if (!value) return null;

  const normalized = value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  return normalized || null;
}

export function htmlToText(html: string | null | undefined): string | null {
  if (!html) return null;

  const text = decodeHtmlEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|tr|h[1-6]|section|article|table)>/gi, "\n")
      .replace(/<li[^>]*>/gi, "\n- ")
      .replace(/<[^>]+>/g, " "),
  );

  return normalizeBodyText(text);
}

function joinBodyParts(parts: string[]): string | null {
  return normalizeBodyText(parts.join("\n\n"));
}

function looksLikeDisplayLinkOnly(value: string | null): boolean {
  const text = normalizeSearchText(value);
  if (!text || text.length > 300) return false;

  const urlCount = (text.match(/https?:\/\/\S+/gi) ?? []).length;
  const displayLinkHint = /表示されない|表示できない|こちら|ブラウザ|browser|view online|view this email/i.test(text);
  const withoutUrls = text.replace(/https?:\/\/\S+/gi, "").replace(/\s+/g, " ").trim();

  return urlCount > 0 && (displayLinkHint || withoutUrls.length <= 80);
}

function stripLowInformationBodyText(value: string): string {
  return value
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/陦ｨ遉ｺ縺輔ｌ縺ｪ縺л陦ｨ遉ｺ縺ｧ縺阪↑縺л縺薙■繧榎繝悶Λ繧ｦ繧ｶ/gi, " ")
    .replace(/表示されない場合はこちら|表示できない場合はこちら|ブラウザで表示/g, " ")
    .replace(/表示されない|表示できない|こちら|ブラウザ/g, " ")
    .replace(/\b(?:view(?: this)? email(?: in your browser)?|view online|open in (?:a )?browser|browser)\b/gi, " ")
    .replace(/[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~\s]+/g, "");
}

function looksLikeLowInformationBodyText(value: string | null): boolean {
  const text = normalizeSearchText(value);
  if (!text) return true;
  const meaningfulText = stripLowInformationBodyText(text);
  if (!meaningfulText) return true;
  if (meaningfulText.length > 80) return false;

  return !/[\p{L}\p{N}]/u.test(meaningfulText);
}

function firstMeaningfulBodyText(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const normalized = normalizeBodyText(value);
    if (normalized && !looksLikeLowInformationBodyText(normalized)) return normalized;
  }
  return null;
}

function pickBestBodyText(plainText: string | null, htmlText: string | null): {
  bodyText: string | null;
  bodyTextSource: "text/plain" | "text/html" | "none";
} {
  const plainTextIsLowInformation = looksLikeLowInformationBodyText(plainText);
  const htmlTextIsMeaningful = htmlText && !looksLikeLowInformationBodyText(htmlText);

  if ((!plainText || plainTextIsLowInformation) && htmlTextIsMeaningful) return { bodyText: htmlText, bodyTextSource: "text/html" };
  if (plainText && htmlTextIsMeaningful && looksLikeDisplayLinkOnly(plainText) && htmlText.length >= Math.max(200, plainText.length + 100)) {
    return { bodyText: htmlText, bodyTextSource: "text/html" };
  }
  if (plainText && !plainTextIsLowInformation) return { bodyText: plainText, bodyTextSource: "text/plain" };
  return { bodyText: null, bodyTextSource: "none" };
}

export function buildMailBodyContent(parts: GmailBodyParts): MailBodyContent {
  const bodyHtml = joinBodyParts(parts.html);
  const plainText = joinBodyParts(parts.text);
  const htmlText = htmlToText(bodyHtml);
  const bestBody = pickBestBodyText(plainText, htmlText);

  return {
    bodyText: bestBody.bodyText,
    bodyHtml,
    normalizedBody: normalizeSearchText(bestBody.bodyText),
    bodyTextSource: bestBody.bodyTextSource,
  };
}

export function buildExtractionBodyText(input: {
  bodyText?: string | null;
  bodyHtml?: string | null;
  normalizedBody?: string | null;
  snippet?: string | null;
  subject?: string | null;
}): string | null {
  const bestBody = pickBestBodyText(normalizeBodyText(input.bodyText), htmlToText(input.bodyHtml));
  return bestBody.bodyText ?? firstMeaningfulBodyText(input.normalizedBody, input.snippet, input.subject);
}
