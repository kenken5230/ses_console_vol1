import { useEffect, useState } from "react";

const personGroups = [
  {
    title: "基本情報",
    fields: [
      { name: "name", label: "要員名", type: "text", required: true },
      { name: "initials", label: "イニシャル", type: "text" },
      { name: "ownerCompanyName", label: "所属会社", type: "text" },
      { name: "status", label: "状態", type: "select", options: ["提案可", "提案中", "参画中", "停止"] },
      { name: "availableFrom", label: "稼働開始日", type: "date" },
      { name: "desiredUnitPrice", label: "希望単価", type: "number", suffix: "万円" },
      { name: "age", label: "年齢", type: "number", suffix: "歳" },
      { name: "nationality", label: "国籍", type: "text" }
    ]
  },
  {
    title: "スキル",
    fields: [
      { name: "careerSummary", label: "経験職種", type: "textarea" },
      { name: "processes", label: "対応工程", type: "textarea" },
      { name: "skills", label: "使用技術", type: "textarea" },
      { name: "summary", label: "得意領域", type: "textarea" }
    ]
  },
  {
    title: "希望条件",
    fields: [
      { name: "preferredLocation", label: "希望勤務地", type: "text" },
      { name: "remotePreference", label: "リモート可否", type: "text" }
    ]
  },
  {
    title: "営業情報",
    fields: [
      { name: "ownerContactName", label: "担当者", type: "text" },
      { name: "ownerContactEmail", label: "担当者メール", type: "text" },
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
                <h3>{group.title}</h3>
                <div className="create-group-body">
                  {group.fields.map((field) => (
                    <label className={`create-field ${field.type === "textarea" ? "wide" : ""}`} key={field.name}>
                      <span>{field.label}</span>
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
