import { useEffect, useState } from "react";
import { PERSON_FORM_FIELD_GROUPS, mergePersonFormInitialValues } from "../lib/person-form-contract";

function FormControl({ disabled, field, onChange, value }) {
  const commonProps = {
    "aria-label": field.label,
    disabled,
    name: field.name,
    onChange,
    placeholder: field.placeholder || field.label,
    required: field.required,
    value
  };

  if (field.type === "textarea") return <textarea {...commonProps} />;

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

export default function PersonCreateDrawer({ initialValues, onClose, onSaved }) {
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [formValues, setFormValues] = useState(() => mergePersonFormInitialValues(initialValues));

  useEffect(() => {
    setFormValues(mergePersonFormInitialValues(initialValues));
  }, [initialValues]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isSaving) onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSaving, onClose]);

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setFormValues((current) => ({ ...current, [name]: value }));
  };

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
            {PERSON_FORM_FIELD_GROUPS.map((group) => (
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
                        <FormControl disabled={isSaving} field={field} onChange={handleFieldChange} value={formValues[field.name]} />
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
