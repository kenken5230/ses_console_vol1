import { searchHistories } from "../data/mockProjects";

export default function SearchHistoryModal({ onApply, onClose }) {
  return (
    <div className="modal-backdrop">
      <section className="history-modal" role="dialog" aria-modal="true" aria-label="検索履歴">
        <div className="modal-heading">
          <h2>検索履歴</h2>
          <button className="modal-close" onClick={onClose} type="button" aria-label="閉じる">
            ×
          </button>
        </div>
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
                この条件で検索
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
