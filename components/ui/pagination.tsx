export default function Pagination({
  page,
  pageCount,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}) {
  if (pageCount <= 1) return null;

  const pages = Array.from({ length: pageCount }, (_, i) => i + 1);

  return (
    <div className="zad-pagination" role="navigation" aria-label="ترقيم الصفحات">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="الصفحة السابقة"
      >
        السابق
      </button>
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          data-active={p === page ? "true" : "false"}
          aria-current={p === page ? "page" : undefined}
          onClick={() => onPageChange(p)}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
        aria-label="الصفحة التالية"
      >
        التالي
      </button>
    </div>
  );
}
