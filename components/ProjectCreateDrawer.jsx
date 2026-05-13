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
    title: "上位会社",
    fields: [
      { name: "upperCompanyName", label: "会社名", type: "text" },
      { name: "tradeStatus", label: "取引可否", type: "select", options: ["未確認", "取引OK", "取引NG", "要確認"] },
      { name: "tdbScore", label: "帝国データバンク点数", type: "number" }
    ]
  },
  {
    title: "作業内容",
    fields: [
      { name: "workDescription", label: "業務内容", type: "textarea" },
      { name: "usedTechnologies", label: "使用技術", type: "textarea" },
      { name: "requiredSkills", label: "必須スキル", type: "textarea" },
      { name: "preferredSkills", label: "尚良スキル", type: "textarea" }
    ]
  },
  {
    title: "案件条件",
    fields: [
      { name: "company", label: "企業", type: "text" },
      { name: "unitPrice", label: "単価", type: "number", suffix: "万円" },
      { name: "recruitingCount", label: "募集人数", type: "number", suffix: "名" },
      { name: "workload", label: "工数", type: "text" },
      { name: "startMonth", label: "開始月", type: "month" },
      { name: "workEnvironment", label: "就業環境", type: "text" },
      { name: "prefecture", label: "都道府県", type: "select", options: prefectures },
      { name: "workLocation", label: "作業場所", type: "text" },
      { name: "skills", label: "スキル", type: "textarea" },
      { name: "upperAmount", label: "上位金額", type: "number", suffix: "万円" },
      { name: "settlementTimeRange", label: "精算時間幅", type: "text", placeholder: "例: 140〜180h" },
      { name: "projectStartMonth", label: "案件開始月", type: "month" },
      { name: "expectedWorkDaysPerWeek", label: "想定稼働日数", type: "number", suffix: "日/週" },
      { name: "fixedWorkTime", label: "現場の定時", type: "text", placeholder: "例: 10:00〜19:00" },
      { name: "coreTime", label: "コアタイム", type: "text", placeholder: "例: 11:00〜15:00" }
    ]
  },
  {
    title: "営業・契約条件",
    fields: [
      { name: "isFocus", label: "注力案件", type: "select", options: ["未選択", "該当", "非該当"] },
      { name: "salesInterviewAttendanceRequired", label: "営業の面談同席の要否", type: "select", options: ["未確認", "必要", "不要"] },
      { name: "contractType", label: "契約形態", type: "select", options: ["未確認", "準委任", "派遣", "請負", "その他"] },
      { name: "foreignNationalityPolicy", label: "外国籍の受け入れ", type: "select", options: ["未確認", "要確認", "可", "不可"] },
      { name: "ageCondition", label: "年齢条件", type: "text" },
      { name: "siteAtmosphere", label: "現場の雰囲気", type: "textarea" },
      { name: "dressCode", label: "作業時の服装", type: "text" },
      { name: "hairNailRule", label: "髪型、爪等の規定", type: "textarea" },
      { name: "interviewCount", label: "面談回数", type: "number", suffix: "回" }
    ]
  },
  {
    title: "商流",
    fields: [
      { name: "commerceFlow", label: "商流", type: "textarea" },
      { name: "endUser", label: "エンドユーザー", type: "text" },
      { name: "primeContractor", label: "元請", type: "text" },
      { name: "secondaryContractor", label: "二次請け", type: "text" },
      { name: "tertiaryContractor", label: "三次請け", type: "text" }
    ]
  },
  {
    title: "担当者",
    fields: [
      { name: "upperContactName", label: "上位担当者", type: "text" },
      { name: "contact", label: "連絡先", type: "text" },
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
    placeholder: field.placeholder || field.label
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
              <span className="drawer-eyebrow">案件名</span>
              <input defaultValue={initialValues.title || ""} disabled={isSaving} name="title" placeholder="案件名を入力" required type="text" />
            </label>
            {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
          </section>

          <div className="detail-groups">
            {createGroups.map((group) => (
              <section className="detail-group" key={group.title}>
                <h3>{group.title}</h3>
                <div className="create-group-body">
                  {group.fields.map((field) => (
                    <label className={`create-field ${field.type === "textarea" ? "wide" : ""}`} key={field.name}>
                      <span>{field.label}</span>
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
