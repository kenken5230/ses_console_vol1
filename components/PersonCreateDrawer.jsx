import { useEffect, useState } from "react";

const personGroups = [
  {
    title: "必須項目",
    priority: "必須",
    fields: [
      { name: "name", label: "要員名", type: "text", placeholder: "例: 山田 太郎 / Y.T", required: true },
      { name: "initials", label: "イニシャル", type: "text", placeholder: "例: T.K" },
      { name: "ownerCompanyName", label: "所属会社", type: "text", placeholder: "例: 株式会社○○" },
      { name: "status", label: "状態", type: "select", options: ["提案可", "提案中", "参画中", "停止"] },
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
      { name: "processes", label: "対応工程", type: "textarea", placeholder: "例: 要件定義、基本設計、製造、テスト" },
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
];

function FormControl({ disabled, field }) {
  const commonProps = {
    "aria-label": field.label,
    disabled,
    name: field.name,
    placeholder: field.placeholder || field.label,
    required: field.required
  };

  if (field.type === "textarea") return <textarea {...commonProps} />;

  if (field.type === "select") {
    return (
      <select {...commonProps} defaultValue="">
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

export default function PersonCreateDrawer({ onClose, onSaved }) {
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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
    if (!String(values.name || "").trim()) {
      setErrorMessage("要員名は必須です");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/persons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "要員作成に失敗しました");

      onSaved?.(result);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "要員作成に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="detail-drawer-backdrop" onClick={isSaving ? undefined : onClose}>
      <aside
        aria-labelledby="person-create-title"
        aria-modal="true"
        className="detail-pane create-drawer"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="detail-toolbar">
          <div>
            <span className="detail-subtitle" id="person-create-title">
              要員作成
            </span>
            <span className="readonly-label">DBへ新規登録</span>
          </div>
          <button className="icon-button close-button" disabled={isSaving} onClick={onClose} type="button" aria-label="閉じる">
            ×
          </button>
        </div>

        <form className="detail-scroll create-drawer-form" onSubmit={handleSubmit}>
          <div className="detail-groups">
            {personGroups.map((group) => (
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
                        <FormControl disabled={isSaving} field={field} />
                        {field.suffix ? <em>{field.suffix}</em> : null}
                      </div>
                    </label>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

          <div className="create-drawer-footer">
            <button className="ghost-button" disabled={isSaving} onClick={onClose} type="button">
              キャンセル
            </button>
            <button className="primary-button" disabled={isSaving} type="submit">
              {isSaving ? "保存中..." : "保存"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
