function getPageNumbers(page, totalPages) {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const candidates = [1, page - 1, page, page + 1, totalPages].filter(
        (value) => value >= 1 && value <= totalPages,
    );
    const pages = [...new Set(candidates)].sort((first, second) => first - second);
    const result = [];

    pages.forEach((value, index) => {
        if (index > 0 && value - pages[index - 1] > 1) result.push('ellipsis-' + value);
        result.push(value);
    });

    return result;
}

export default function PaginationControls({
    page,
    pageSize,
    totalPages,
    totalItems,
    start,
    end,
    onPageChange,
    onPageSizeChange,
}) {
    if (totalItems === 0) return null;

    const pageNumbers = getPageNumbers(page, totalPages);

    return (
        <nav
            aria-label="Paginación"
            className="flex min-w-0 flex-col gap-3 border-t border-sand-200 pt-4 sm:flex-row sm:items-center sm:justify-between"
        >
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-ink-600">
                <span aria-live="polite">
                    Mostrando {start}–{end} de {totalItems}
                </span>
                <label className="flex items-center gap-2">
                    <span>Tamaño</span>
                    <select
                        value={pageSize}
                        onChange={(event) => onPageSizeChange(event.target.value)}
                        aria-label="Registros por página"
                        className="min-h-11 rounded-xl border border-sand-200 bg-sand-50 px-3 text-xs text-ink-900 outline-none focus-visible:border-gold-600 focus-visible:ring-2 focus-visible:ring-gold-600/30"
                    >
                        {[10, 20, 50].map((size) => (
                            <option key={size} value={size}>{size}</option>
                        ))}
                    </select>
                </label>
            </div>

            <div className="flex min-w-0 flex-wrap items-center justify-center gap-1">
                <button
                    type="button"
                    onClick={() => onPageChange(page - 1)}
                    disabled={page <= 1}
                    className="min-h-11 rounded-xl border border-sand-200 bg-sand-50 px-3 text-xs font-semibold text-ink-900 hover:bg-sand-100 focus-visible:outline-gold-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Anterior
                </button>
                {pageNumbers.map((value) => (
                    typeof value === 'string' ? (
                        <span key={value} className="px-1 text-xs text-ink-600" aria-hidden="true">…</span>
                    ) : (
                        <button
                            key={value}
                            type="button"
                            onClick={() => onPageChange(value)}
                            aria-label={`Página ${value}`}
                            aria-current={page === value ? 'page' : undefined}
                            className={`min-h-11 min-w-11 rounded-xl border px-2 text-xs font-semibold ${
                                page === value
                                    ? 'border-gold-600 bg-gold-500 text-pine-900 shadow-sm'
                                    : 'border-sand-200 bg-sand-50 text-ink-900 hover:bg-sand-100'
                            }`}
                        >
                            {value}
                        </button>
                    )
                ))}
                <button
                    type="button"
                    onClick={() => onPageChange(page + 1)}
                    disabled={page >= totalPages}
                    className="min-h-11 rounded-xl border border-sand-200 bg-sand-50 px-3 text-xs font-semibold text-ink-900 hover:bg-sand-100 focus-visible:outline-gold-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Siguiente
                </button>
            </div>
        </nav>
    );
}
