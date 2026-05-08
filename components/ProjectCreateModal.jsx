import { createFormSections } from "../data/mockProjects";

function InputBox({ placeholder, short = false }) {
  return <input className={short ? "short-input" : ""} placeholder={placeholder || ""} />;
}

function SelectBox({ placeholder, short = false }) {
  return (
    <button className={`field-control select-like ${short ? "short" : ""}`} type="button">
      <span className="placeholder">{placeholder}</span>
      <span>⌄</span>
    </button>
  );
}

function ChoiceGroup({ row }) {
  const checkedValues = Array.isArray(row.value) ? row.value : [row.value];
  const inputType = row.type === "radio" ? "radio" : "checkbox";

  return (
    <div className="choice-group">
      {row.options.map((option) => (
        <label className="choice" key={option}>
          <input defaultChecked={checkedValues.includes(option)} name={row.label} type={inputType} />
          <span>{option}</span>
        </label>
      ))}
    </div>
  );
}

function FormControl({ row }) {
  if (row.type === "input") return <InputBox placeholder={row.placeholder} />;
  if (row.type === "textarea") return <textarea placeholder={row.placeholder} />;
  if (row.type === "radio" || row.type === "checks") return <ChoiceGroup row={row} />;
  if (row.type === "select") return <SelectBox placeholder={row.placeholder} />;
  if (row.type === "selectShort") return <SelectBox placeholder={row.placeholder} short />;
  if (row.type === "number") {
    return (
      <div className="inline-field">
        <InputBox short />
        <span>{row.suffix}</span>
      </div>
    );
  }
  if (row.type === "date") {
    return (
      <div className="field-control date-control">
        <span />
        <span className="calendar-icon">□</span>
      </div>
    );
  }
  if (row.type === "price" || row.type === "timeRange") {
    return (
      <div className="range-row create-range">
        <InputBox placeholder={row.placeholders[0]} short />
        <span>~</span>
        <InputBox placeholder={row.placeholders[1]} short />
        <span>{row.suffix}</span>
      </div>
    );
  }
  if (row.type === "commerce") {
    return (
      <div className="commerce-fields">
        {["エンドユーザー", "元請", "二次請け", "三次請け"].map((label) => (
          <div className="commerce-row" key={label}>
            <span>{label}</span>
            <InputBox placeholder="企業名を入力" />
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export default function ProjectCreateModal({ onClose, onCreate }) {
  return (
    <div className="modal-backdrop create-backdrop">
      <section className="create-modal" role="dialog" aria-modal="true" aria-label="案件作成">
        <div className="create-heading">
          <h2>案件作成</h2>
          <button className="modal-close" onClick={onClose} type="button" aria-label="閉じる">
            ×
          </button>
        </div>
        <div className="create-body">
          {createFormSections.map((section) => (
            <div className="create-section" key={section.id}>
              {section.rows.map((row, index) => (
                <div className={`create-row ${row.type === "textarea" ? "textarea-row" : ""}`} key={`${section.id}-${row.label}-${index}`}>
                  <label>
                    {row.label.split("\n").map((line) => (
                      <span key={line}>{line}</span>
                    ))}
                    {row.required ? <em>必須</em> : null}
                  </label>
                  <FormControl row={row} />
                </div>
              ))}
            </div>
          ))}
          <p className="save-note">△ 保存後の画面への反映には5〜10秒程度時間がかかります。</p>
          <button className="primary-button create-submit" onClick={onCreate} type="button">
            作成する
          </button>
        </div>
      </section>
    </div>
  );
}
