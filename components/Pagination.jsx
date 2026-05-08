export default function Pagination({ currentPage, onPageChange, compact = false }) {
  const pages = [1, 2, 3, 4, 5];

  return (
    <div className={`pagination ${compact ? "pagination-compact" : ""}`}>
      <button className="page-button disabled" type="button" aria-disabled="true">
        前へ
      </button>
      {pages.map((page) => (
        <button
          className={`page-button ${currentPage === page ? "active" : ""}`}
          key={page}
          onClick={() => onPageChange(page)}
          type="button"
        >
          {page}
        </button>
      ))}
      <span className="page-ellipsis">…</span>
      <button className="page-button" type="button" onClick={() => onPageChange(2875)}>
        2875
      </button>
      <button className="page-button" type="button" onClick={() => onPageChange(currentPage + 1)}>
        次へ
      </button>
    </div>
  );
}
