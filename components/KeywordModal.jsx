"use client";

import { useEffect } from "react";

export default function KeywordModal({ keywordDraft, onApply, onChange, onClose }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="keyword-modal" role="dialog" aria-modal="true" aria-label="キーワードフィルター" onClick={(event) => event.stopPropagation()}>
        <div className="modal-heading compact">
          <h2>キーワードフィルター</h2>
          <button className="modal-close" onClick={onClose} type="button" aria-label="閉じる">
            ×
          </button>
        </div>
        <div className="keyword-body">
          <label>
            <span>含めるキーワード</span>
            <input
              onChange={(event) => onChange({ ...keywordDraft, include: event.target.value })}
              placeholder="含めるキーワードを入力"
              value={keywordDraft.include}
            />
          </label>
          <label>
            <span>除外するキーワード</span>
            <input
              onChange={(event) => onChange({ ...keywordDraft, exclude: event.target.value })}
              placeholder="除外するキーワードを入力"
              value={keywordDraft.exclude}
            />
          </label>
        </div>
        <div className="filter-footer">
          <span />
          <button className="primary-button large" onClick={onApply} type="button">
            この条件で絞り込み
          </button>
        </div>
      </section>
    </div>
  );
}
