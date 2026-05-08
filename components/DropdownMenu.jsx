export default function DropdownMenu({ options, selected, onSelect, align = "left", wide = false }) {
  return (
    <div className={`dropdown-menu dropdown-${align} ${wide ? "dropdown-wide" : ""}`}>
      {options.map((option) => (
        <button
          className={`dropdown-item ${selected === option ? "is-selected" : ""}`}
          key={option}
          onClick={() => onSelect(option)}
          type="button"
        >
          <span>{option}</span>
          {selected === option ? <span className="checkmark">✓</span> : null}
        </button>
      ))}
    </div>
  );
}
