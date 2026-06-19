export class InputValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InputValidationError";
  }
}

export const emptyToNull = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

export function parseNumberInput(value?: string, label = "数値") {
  const trimmed = emptyToNull(value);
  if (!trimmed) return null;

  const normalized = trimmed.replace(/,/g, "");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    throw new InputValidationError(`${label}は数値で入力してください`);
  }

  return Math.trunc(parsed);
}

export function parseMonthInput(value?: string, label = "月項目") {
  const trimmed = emptyToNull(value);
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}$/.test(trimmed)) {
    throw new InputValidationError(`${label}はYYYY-MM形式で入力してください`);
  }

  return new Date(`${trimmed}-01T00:00:00.000Z`);
}

export function parseDateInput(value?: string, label = "日付項目") {
  const trimmed = emptyToNull(value);
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new InputValidationError(`${label}はYYYY-MM-DD形式で入力してください`);
  }

  return new Date(`${trimmed}T00:00:00.000Z`);
}

export function parseEmailInput(value?: string, label = "メール") {
  const trimmed = emptyToNull(value);
  if (!trimmed) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new InputValidationError(`${label}はメールアドレス形式で入力してください`);
  }

  return trimmed;
}

export function parseOptionalContactInput(value?: string, label = "連絡先") {
  const trimmed = emptyToNull(value);
  if (!trimmed || !trimmed.includes("@")) return trimmed;
  return parseEmailInput(trimmed, label);
}

export function splitListInput(value?: string) {
  return Array.from(
    new Set(
      (value || "")
        .split(/[\n,、/／]+/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

export function parseSelectInput<T>(value: string | undefined, label: string, options: Record<string, T>, fallback: T) {
  const trimmed = emptyToNull(value);
  if (!trimmed) return fallback;
  if (Object.prototype.hasOwnProperty.call(options, trimmed)) return options[trimmed];

  throw new InputValidationError(`${label}は次のいずれかを選択してください: ${Object.keys(options).join("、")}`);
}

export type RemoteTypeInputValue = "UNKNOWN" | "ONSITE" | "HYBRID" | "REMOTE" | "FULL_REMOTE";

export const remoteTypeOptions: Record<string, RemoteTypeInputValue> = {
  未確認: "UNKNOWN",
  常駐: "ONSITE",
  リモート併用: "HYBRID",
  一部リモート: "HYBRID",
  リモート: "REMOTE",
  フルリモート: "FULL_REMOTE",
  UNKNOWN: "UNKNOWN",
  ONSITE: "ONSITE",
  HYBRID: "HYBRID",
  REMOTE: "REMOTE",
  FULL_REMOTE: "FULL_REMOTE"
};

export function inferRemoteTypeFromText(text?: string | null): RemoteTypeInputValue {
  const searchable = emptyToNull(text) || "";
  if (/フルリモート|フルリモ|完全リモート/i.test(searchable)) return "FULL_REMOTE";
  if (/リモート併用|一部リモート|ハイブリッド|基本リモート.*出社|出社.*リモート|週[1-5].*出社/i.test(searchable)) return "HYBRID";
  if (/リモート|在宅/i.test(searchable)) return "REMOTE";
  if (/常駐|オンサイト|出社/i.test(searchable)) return "ONSITE";
  return "UNKNOWN";
}

export function parseRemoteTypeInput(value?: string, fallbackText?: string | null): RemoteTypeInputValue {
  const trimmed = emptyToNull(value);
  if (trimmed) return parseSelectInput(trimmed, "リモート条件", remoteTypeOptions, "UNKNOWN");
  return inferRemoteTypeFromText(fallbackText);
}
