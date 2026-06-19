import { useEffect, useState } from "react";

const prefectures = [
  "北海道",
  "青森県",
  "岩手県",
  "宮城県",
  "秋田県",
  "山形県",
  "福島県",
  "茨城県",
  "栃木県",
  "群馬県",
  "埼玉県",
  "千葉県",
  "東京都",
  "神奈川県",
  "新潟県",
  "富山県",
  "石川県",
  "福井県",
  "山梨県",
  "長野県",
  "岐阜県",
  "静岡県",
  "愛知県",
  "三重県",
  "滋賀県",
  "京都府",
  "大阪府",
  "兵庫県",
  "奈良県",
  "和歌山県",
  "鳥取県",
  "島根県",
  "岡山県",
  "広島県",
  "山口県",
  "徳島県",
  "香川県",
  "愛媛県",
  "高知県",
  "福岡県",
  "佐賀県",
  "長崎県",
  "熊本県",
  "大分県",
  "宮崎県",
  "鹿児島県",
  "沖縄県"
];

const createGroups = [
  {
    title: "必須項目",
    priority: "必須",
    fields: [
      { name: "upperCompanyName", label: "上位会社 / 入手元会社", type: "text", placeholder: "例: 株式会社○○" },
      { name: "tradeStatus", label: "取引可否", type: "select", options: ["未確認", "取引OK", "取引NG", "要確認"] },
      { name: "workDescription", label: "業務内容", type: "textarea", placeholder: "例: ECサイトの機能追加、要件定義〜テスト" },
      { name: "requiredSkills", label: "必須スキル", type: "textarea", placeholder: "例: Java、Spring Boot、SQL" },
      { name: "projectStartMonth", label: "開始月", type: "month" },
      { name: "prefecture", label: "勤務地（都道府県）", type: "select", options: prefectures },
      { name: "workLocation", label: "勤務地（詳細）", type: "text", placeholder: "例: 東京都品川 / フルリモート" },
      { name: "remoteType", label: "リモート条件", type: "select", options: ["未確認", "常駐", "リモート併用", "リモート", "フルリモート"] },
      { name: "workEnvironment", label: "就業環境補足", type: "text", placeholder: "例: 週2出社、基本リモート" }
    ]
  },
  {
    title: "推奨項目",
    priority: "推奨",
    fields: [
      { name: "unitPrice", label: "単価", type: "number", placeholder: "例: 80", suffix: "万円" },
      { name: "settlementTimeRange", label: "精算幅", type: "text", placeholder: "例: 140〜180h" },
      { name: "recruitingCount", label: "募集人数", type: "number", placeholder: "例: 2", suffix: "名" },
      { name: "contractType", label: "契約形態", type: "select", options: ["未確認", "準委任", "派遣", "請負", "その他"] },
      { name: "foreignNationalityPolicy", label: "外国籍の受け入れ", type: "select", options: ["未確認", "要確認", "可", "不可"] },
      { name: "ageCondition", label: "年齢条件", type: "text", placeholder: "例: 50代前半まで" },
      { name: "interviewCount", label: "面談回数", type: "number", placeholder: "例: 1", suffix: "回" },
      { name: "preferredSkills", label: "尚良スキル", type: "textarea", placeholder: "例: React経験、AWS設計経験" },
      { name: "usedTechnologies", label: "使用技術", type: "textarea", placeholder: "例: Java、Spring Boot、AWS" },
      { name: "commerceFlow", label: "商流", type: "textarea", placeholder: "例: エンド → 元請 → 自社" },
      { name: "isFocus", label: "注力案件", type: "select", options: ["未選択", "該当", "非該当"] },
      { name: "upperContactName", label: "担当者名", type: "text", placeholder: "例: 山田 太郎" },
      { name: "contact", label: "担当者連絡先", type: "text", placeholder: "メールまたは電話" }
    ]
  },
  {
    title: "任意項目",
    priority: "任意",
    fields: [
      { name: "endUser", label: "エンドユーザー", type: "text", placeholder: "例: 株式会社△△" },
      { name: "primeContractor", label: "元請", type: "text" },
      { name: "secondaryContractor", label: "二次請け", type: "text" },
      { name: "tertiaryContractor", label: "三次請け", type: "text" },
      { name: "upperAmount", label: "上位金額", type: "number", placeholder: "例: 95", suffix: "万円" },
      { name: "workload", label: "工数", type: "text", placeholder: "例: 1人月" },
      { name: "expectedWorkDaysPerWeek", label: "想定稼働日数", type: "number", placeholder: "例: 5", suffix: "日/週" },
      { name: "fixedWorkTime", label: "現場の定時", type: "text", placeholder: "例: 10:00〜19:00" },
      { name: "coreTime", label: "コアタイム", type: "text", placeholder: "例: 11:00〜15:00" },
      { name: "salesInterviewAttendanceRequired", label: "営業の面談同席の要否", type: "select", options: ["未確認", "必要", "不要"] },
      { name: "siteAtmosphere", label: "現場の雰囲気", type: "textarea" },
      { name: "dressCode", label: "作業時の服装", type: "text" },
      { name: "hairNailRule", label: "髪型、爪等の規定", type: "textarea" },
      { name: "tdbScore", label: "帝国データバンク点数", type: "number" },
      { name: "skills", label: "その他スキル / メモ", type: "textarea" },
      { name: "createdBy", label: "案件作成者", type: "text" },
      { name: "createdAt", label: "案件作成日", type: "date" }
    ]
  }
];

function FormControl({ disabled, field, value }) {
  const commonProps = {
    "aria-label": field.label,
    defaultValue: value || "",
    disabled,
    name: field.name,
    placeholder: field.placeholder || field.label,
    required: field.required
  };

  if (field.type === "textarea") {
    return <textarea {...commonProps} />;
  }

  if (field.type === "select") {
    return (
      <select {...commonProps}>
        <option value="" disabled>
          選択してください
        </option>
        {field.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  return <input {...commonProps} type={field.type} />;
}

function PriorityBadge({ value }) {
  if (!value) return null;
  const priorityClass = { 必須: "required", 推奨: "recommended", 任意: "optional" }[value] || "neutral";
  return <span className={`field-priority ${priorityClass}`}>{value}</span>;
}

export default function ProjectCreateDrawer({ initialValues = {}, mode = "create", onClose, onSaved, projectId }) {
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const isEditMode = mode === "edit";

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isSaving) onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSaving, onClose]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    if (!String(values.title || "").trim()) {
      setErrorMessage("案件名は必須です");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/projects", {
        method: isEditMode ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEditMode ? { ...values, id: projectId } : values)
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.message || (isEditMode ? "案件更新に失敗しました" : "案件作成に失敗しました"));
      }

      onSaved?.(result);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : isEditMode ? "案件更新に失敗しました" : "案件作成に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="detail-drawer-backdrop" onClick={isSaving ? undefined : onClose}>
      <aside
        aria-labelledby="project-create-title"
        aria-modal="true"
        className="detail-pane create-drawer"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="detail-toolbar">
          <div>
            <span className="detail-subtitle" id="project-create-title">
              {isEditMode ? "案件編集" : "案件作成"}
            </span>
            <span className="readonly-label">{isEditMode ? "既存案件を更新" : "DBへ新規登録"}</span>
          </div>
          <button className="icon-button close-button" disabled={isSaving} onClick={onClose} type="button" aria-label="閉じる">
            ×
          </button>
        </div>

        <form className="detail-scroll create-drawer-form" onSubmit={handleSubmit}>
          <section className="detail-hero create-hero">
            <label>
              <span className="create-label-row">
                <span className="drawer-eyebrow">案件名</span>
                <PriorityBadge value="必須" />
              </span>
              <input defaultValue={initialValues.title || ""} disabled={isSaving} name="title" placeholder="案件名を入力" required type="text" />
            </label>
            {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
          </section>

          <div className="detail-groups">
            {createGroups.map((group) => (
              <section className="detail-group" key={group.title}>
                <h3>
                  <span>{group.title}</span>
                  <PriorityBadge value={group.priority} />
                </h3>
                <div className="create-group-body">
                  {group.fields.map((field) => (
                    <label className={`create-field ${field.type === "textarea" ? "wide" : ""}`} key={field.name}>
                      <span className="create-label-row">
                        <span>{field.label}</span>
                        <PriorityBadge value={field.priority || group.priority} />
                      </span>
                      <div className="create-control-row">
                        <FormControl disabled={isSaving} field={field} value={initialValues[field.name]} />
                        {field.suffix ? <em>{field.suffix}</em> : null}
                      </div>
                    </label>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="create-drawer-footer">
            <button className="ghost-button" disabled={isSaving} onClick={onClose} type="button">
              キャンセル
            </button>
            <button className="primary-button" disabled={isSaving} type="submit">
              {isSaving ? "保存中..." : isEditMode ? "更新" : "保存"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
