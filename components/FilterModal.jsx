"use client";

import { useEffect, useState } from "react";
import { filterFormRows, prefectures } from "../data/mockProjects";

const weekLabels = ["日", "月", "火", "水", "木", "金", "土"];

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDate(value) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
}

function getCalendarDays(monthDate) {
  const firstDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: firstDate.getDay() }, () => null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), day));
  }

  while (days.length < 42) days.push(null);

  return days;
}

function CalendarPicker({ label, onChange, onClose, onOpen, open, placeholder, value }) {
  const initialDate = parseDate(value) || new Date();
  const [displayMonth, setDisplayMonth] = useState(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
  const [draftValue, setDraftValue] = useState(value || "");
  const selectedDate = parseDate(draftValue);
  const headingDate = selectedDate || parseDate(value);

  useEffect(() => {
    if (!open) return;
    const nextDate = parseDate(value) || new Date();
    setDraftValue(value || "");
    setDisplayMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
  }, [open, value]);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  const shiftMonth = (amount) => {
    setDisplayMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  };

  return (
    <div className="date-picker-wrap">
      <button className="field-control date-picker-trigger" onClick={open ? onClose : onOpen} type="button" aria-label={`${label}を選択`}>
        <span className={value ? "" : "placeholder"}>{value || placeholder}</span>
        <span className="calendar-icon">□</span>
      </button>
      {open ? (
        <div className="calendar-popover">
          <div className="calendar-hero">
            <span className="calendar-year">{headingDate ? headingDate.getFullYear() : displayMonth.getFullYear()}</span>
            <strong>{headingDate ? `${weekLabels[headingDate.getDay()]}, ${headingDate.getMonth() + 1}月 ${headingDate.getDate()}` : "日付を選択"}</strong>
          </div>
          <div className="calendar-month-row">
            <button onClick={() => shiftMonth(-1)} type="button" aria-label="前の月">
              ‹
            </button>
            <span>
              {displayMonth.getMonth() + 1}月 {displayMonth.getFullYear()}
            </span>
            <button onClick={() => shiftMonth(1)} type="button" aria-label="次の月">
              ›
            </button>
          </div>
          <div className="calendar-weekdays">
            {weekLabels.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="calendar-days">
            {getCalendarDays(displayMonth).map((day, index) =>
              day ? (
                <button
                  className={draftValue === formatDate(day) ? "selected" : ""}
                  key={formatDate(day)}
                  onClick={() => {
                    const nextValue = formatDate(day);
                    setDraftValue(nextValue);
                    onChange(nextValue);
                    onClose();
                  }}
                  type="button"
                >
                  {day.getDate()}
                </button>
              ) : (
                <span key={`empty-${index}`} />
              )
            )}
          </div>
          <div className="calendar-actions">
            <button
              onClick={() => {
                setDraftValue("");
                onChange("");
                onClose();
              }}
              type="button"
            >
              クリア
            </button>
            <div>
              <button onClick={onClose} type="button">
                キャンセル
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DateRangeField({ row, values, onChange }) {
  const [activeKey, setActiveKey] = useState(null);

  return (
    <div className="range-row">
      <CalendarPicker
        label={`${row.label} 下限`}
        onChange={(value) => onChange(row.fromKey, value)}
        onClose={() => setActiveKey(null)}
        onOpen={() => setActiveKey(row.fromKey)}
        open={activeKey === row.fromKey}
        placeholder={row.start}
        value={values[row.fromKey] || ""}
      />
      <span>~</span>
      <CalendarPicker
        label={`${row.label} 上限`}
        onChange={(value) => onChange(row.toKey, value)}
        onClose={() => setActiveKey(null)}
        onOpen={() => setActiveKey(row.toKey)}
        open={activeKey === row.toKey}
        placeholder={row.end}
        value={values[row.toKey] || ""}
      />
    </div>
  );
}

function TextField({ row, values, onChange }) {
  return (
    <input
      aria-label={row.label}
      onChange={(event) => onChange(row.id, event.target.value)}
      placeholder={row.placeholder}
      type="text"
      value={values[row.id] || ""}
    />
  );
}

function PriceRangeField({ row, values, onChange }) {
  return (
    <div className="range-row price-range">
      <input
        aria-label={`${row.label} 下限`}
        inputMode="numeric"
        min="0"
        onChange={(event) => onChange("unitMin", event.target.value)}
        placeholder="下限"
        type="number"
        value={values.unitMin || ""}
      />
      <span>~</span>
      <input
        aria-label={`${row.label} 上限`}
        inputMode="numeric"
        min="0"
        onChange={(event) => onChange("unitMax", event.target.value)}
        placeholder="上限"
        type="number"
        value={values.unitMax || ""}
      />
      <span>万円</span>
      <label className="checkbox-row inline">
        <input checked={Boolean(values.unitUndecidedOnly)} onChange={(event) => onChange("unitUndecidedOnly", event.target.checked)} type="checkbox" />
        <span>未定のみ表示</span>
      </label>
    </div>
  );
}

function PrefectureField({ row, values, onChange }) {
  const datalistId = `${row.id}-options`;

  return (
    <div className="prefecture-field">
      <input
        aria-label={row.label}
        list={datalistId}
        onChange={(event) => onChange(row.id, event.target.value)}
        placeholder={row.placeholder}
        type="text"
        value={values[row.id] || ""}
      />
      <datalist id={datalistId}>
        {prefectures.map((prefecture) => (
          <option key={prefecture} value={prefecture} />
        ))}
      </datalist>
      <select
        aria-label="47都道府県から選択"
        className="prefecture-select"
        onChange={(event) => onChange(row.id, event.target.value)}
        value={prefectures.includes(values[row.id]) ? values[row.id] : ""}
      >
        <option value="">47都道府県から選択</option>
        {prefectures.map((prefecture) => (
          <option key={prefecture} value={prefecture}>
            {prefecture}
          </option>
        ))}
      </select>
    </div>
  );
}

function CheckGroup({ row, values, onToggle }) {
  const selectedValues = values[row.id] || [];

  return (
    <div className="check-group">
      {row.options.map((option) => (
        <label className="checkbox-row large" key={option}>
          <input checked={selectedValues.includes(option)} onChange={() => onToggle(row.id, option)} type="checkbox" />
          <span>{option}</span>
        </label>
      ))}
    </div>
  );
}

function FormControl({ row, values, onChange, onToggle }) {
  if (row.type === "dateRange") return <DateRangeField onChange={onChange} row={row} values={values} />;
  if (row.type === "text" || row.type === "select") return <TextField onChange={onChange} row={row} values={values} />;
  if (row.type === "priceRange") return <PriceRangeField onChange={onChange} row={row} values={values} />;
  if (row.type === "prefecture") return <PrefectureField onChange={onChange} row={row} values={values} />;
  if (row.type === "checks") return <CheckGroup onToggle={onToggle} row={row} values={values} />;

  return null;
}

export default function FilterModal({ onApply, onChange, onClear, onClose, onToggle, rows = filterFormRows, values }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="filter-modal" role="dialog" aria-modal="true" aria-label="フィルター" onClick={(event) => event.stopPropagation()}>
        <div className="modal-heading">
          <h2>フィルター</h2>
          <button className="modal-close" onClick={onClose} type="button" aria-label="閉じる">
            ×
          </button>
        </div>
        <div className="filter-body">
          {rows.map((row) => (
            <div className="form-row" key={row.id}>
              <label>
                {row.label}
                {row.id === "skill" ? <span className="help-dot small">?</span> : null}
              </label>
              <FormControl onChange={onChange} onToggle={onToggle} row={row} values={values} />
            </div>
          ))}
        </div>
        <div className="filter-footer">
          <button className="ghost-button" onClick={onClear} type="button">
            条件をクリア
          </button>
          <button className="primary-button large" onClick={onApply} type="button">
            この条件で絞り込み
          </button>
        </div>
      </section>
    </div>
  );
}
