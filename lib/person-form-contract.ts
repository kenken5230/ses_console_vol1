export type PersonFormFieldName =
  | "name"
  | "initials"
  | "ownerCompanyName"
  | "status"
  | "skills"
  | "availableFrom"
  | "desiredUnitPrice"
  | "preferredLocation"
  | "remotePreference"
  | "age"
  | "nationality"
  | "careerSummary"
  | "summary"
  | "ownerContactName"
  | "ownerContactEmail"
  | "createdBy"
  | "createdAt";

export type PersonFormFieldType = "text" | "email" | "number" | "date" | "textarea" | "select";
export type PersonFormFieldPriority = "必須" | "推奨" | "任意";

export type PersonFormField = {
  name: PersonFormFieldName;
  label: string;
  type: PersonFormFieldType;
  placeholder?: string;
  required?: boolean;
  suffix?: string;
  options?: readonly string[];
};

export type PersonFormFieldGroup = {
  title: string;
  priority: PersonFormFieldPriority;
  fields: readonly PersonFormField[];
};

export const PERSON_STATUS_OPTIONS = ["提案可", "提案中", "参画中", "停止"] as const;

export const PERSON_FORM_FIELD_GROUPS = [
  {
    title: "必須項目",
    priority: "必須",
    fields: [
      { name: "name", label: "要員名", type: "text", placeholder: "例: 山田 太郎 / Y.T", required: true },
      { name: "initials", label: "イニシャル", type: "text", placeholder: "例: T.K" },
      { name: "ownerCompanyName", label: "所属会社", type: "text", placeholder: "例: 株式会社○○" },
      { name: "status", label: "状態", type: "select", options: PERSON_STATUS_OPTIONS },
      { name: "skills", label: "使用技術", type: "textarea", placeholder: "例: Java、Spring Boot、AWS" },
      { name: "availableFrom", label: "稼働開始日", type: "date" }
    ]
  },
  {
    title: "推奨項目",
    priority: "推奨",
    fields: [
      { name: "desiredUnitPrice", label: "希望単価", type: "number", placeholder: "例: 75", suffix: "万円" },
      { name: "preferredLocation", label: "希望勤務地", type: "text", placeholder: "例: 東京、神奈川、フルリモート" },
      { name: "remotePreference", label: "リモート可否", type: "text", placeholder: "例: 常駐可 / リモート希望 / フルリモート" },
      { name: "age", label: "年齢", type: "number", placeholder: "例: 32", suffix: "歳" },
      { name: "nationality", label: "国籍", type: "text", placeholder: "例: 日本" },
      { name: "careerSummary", label: "経験職種", type: "textarea", placeholder: "例: バックエンドエンジニア、PL" },
      { name: "summary", label: "得意領域", type: "textarea", placeholder: "例: API設計、性能改善" },
      { name: "ownerContactName", label: "担当者", type: "text", placeholder: "例: 山田 太郎" },
      { name: "ownerContactEmail", label: "担当者メール", type: "email", placeholder: "例: sales@example.com" }
    ]
  },
  {
    title: "任意項目",
    priority: "任意",
    fields: [
      { name: "createdBy", label: "作成者", type: "text" },
      { name: "createdAt", label: "作成日", type: "date" }
    ]
  }
] as const satisfies readonly PersonFormFieldGroup[];

export const PERSON_FORM_FIELD_NAMES = PERSON_FORM_FIELD_GROUPS.flatMap((group) =>
  group.fields.map((field) => field.name)
) as PersonFormFieldName[];

export const PERSON_FORM_INITIAL_VALUES: Record<PersonFormFieldName, string> = {
  name: "",
  initials: "",
  ownerCompanyName: "",
  status: "",
  skills: "",
  availableFrom: "",
  desiredUnitPrice: "",
  preferredLocation: "",
  remotePreference: "",
  age: "",
  nationality: "",
  careerSummary: "",
  summary: "",
  ownerContactName: "",
  ownerContactEmail: "",
  createdBy: "",
  createdAt: ""
};

export const PERSON_UNSAVED_FUTURE_FIELD_NAMES = ["processes"] as const;

export function mergePersonFormInitialValues(
  initialValues: Partial<Record<PersonFormFieldName, string | number | null | undefined>> = {}
) {
  const merged: Record<PersonFormFieldName, string> = { ...PERSON_FORM_INITIAL_VALUES };
  for (const name of PERSON_FORM_FIELD_NAMES) {
    const value = initialValues[name];
    if (value === null || value === undefined) continue;
    merged[name] = String(value);
  }
  return merged;
}
