"use client";

import { useEffect } from "react";
import { searchHistories } from "../data/mockProjects";

export default function SearchHistoryModal({ onApply, onClose }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="history-modal" role="dialog" aria-modal="true" aria-label="サンプル検索履歴" onClick={(event) => event.stopPropagation()}>
        <div className="modal-heading">
          <h2>サンプル検索履歴</h2>
          <button className="modal-close" onClick={onClose} type="button" aria-label="閉じる">
            ×
          </button>
        </div>
        <p className="history-safety-note">
          この一覧はサンプルです。実履歴の保存・取得は行いません。DB-backed版は別PR #55で対応予定です。
        </p>
        <div className="history-list">
          {searchHistories.map((history) => (
            <article className="history-item" key={history.id}>
              <div>
                <div className="history-chips">
                  {history.chips.map((chip) => (
                    <span className="condition-chip" key={chip}>
                      {chip}
                    </span>
                  ))}
                </div>
                <time>{history.searchedAt}</time>
              </div>
              <button className="outline-button" onClick={() => onApply(history)} type="button">
                サンプル条件を反映
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
