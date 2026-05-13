export default function Pagination({ currentPage, onPageChange, compact = false, totalPages = 1 }) {
  const safeTotalPages = Math.max(1, totalPages);
  const startPage = Math.max(1, Math.min(currentPage - 2, safeTotalPages - 4));
  const pages = Array.from({ length: Math.min(5, safeTotalPages) }, (_, index) => startPage + index);
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < safeTotalPages;

  return (
    <div className={`pagination ${compact ? "pagination-compact" : ""}`}>
      <button
        className={`page-button ${canGoPrev ? "" : "disabled"}`}
        type="button"
        aria-disabled={!canGoPrev}
        onClick={() => {
          if (canGoPrev) onPageChange(currentPage - 1);
        }}
      >
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
      {pages[pages.length - 1] < safeTotalPages ? (
        <>
          <span className="page-ellipsis">…</span>
          <button className="page-button" type="button" onClick={() => onPageChange(safeTotalPages)}>
            {safeTotalPages}
          </button>
        </>
      ) : null}
      <button
        className={`page-button ${canGoNext ? "" : "disabled"}`}
        type="button"
        aria-disabled={!canGoNext}
        onClick={() => {
          if (canGoNext) onPageChange(currentPage + 1);
        }}
      >
        次へ
      </button>
    </div>
  );
}
