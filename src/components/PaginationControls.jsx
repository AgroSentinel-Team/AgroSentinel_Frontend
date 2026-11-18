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
            className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between"
        >
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
                <span aria-live="polite">
                    Mostrando {start}–{end} de {totalItems}
                </span>
                <label className="flex items-center gap-2">
                    <span>Tamaño</span>
                    <select
                        value={pageSize}
                        onChange={(event) => onPageSizeChange(event.target.value)}
                        aria-label="Registros por página"
                        className="min-h-9 rounded-lg border border-[#1e3256] bg-surface-hover px-2.5 text-xs text-white outline-none focus:border-blue-400"
                    >
                        {[10, 20, 50].map((size) => (
                            <option key={size} value={size}>{size}</option>
                        ))}
                    </select>
                </label>
            </div>

            <div className="flex items-center justify-center gap-1">
                <button
                    type="button"
                    onClick={() => onPageChange(page - 1)}
                    disabled={page <= 1}
                    className="min-h-9 rounded-lg border border-[#1e3256] bg-[#0d172a] px-3 text-xs font-semibold text-slate-200 transition hover:bg-[#13223d] disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Anterior
                </button>
                {pageNumbers.map((value) => (
                    typeof value === 'string' ? (
                        <span key={value} className="px-1 text-xs text-slate-400" aria-hidden="true">…</span>
                    ) : (
                        <button
                            key={value}
                            type="button"
                            onClick={() => onPageChange(value)}
                            aria-label={`Página ${value}`}
                            aria-current={page === value ? 'page' : undefined}
                            className={`min-h-9 min-w-9 rounded-lg border px-2 text-xs font-semibold transition ${
                                page === value
                                    ? 'border-blue-400/40 bg-blue-600 text-white'
                                    : 'border-[#1e3256] bg-[#0d172a] text-slate-200 hover:bg-[#13223d]'
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
                    className="min-h-9 rounded-lg border border-[#1e3256] bg-[#0d172a] px-3 text-xs font-semibold text-slate-200 transition hover:bg-[#13223d] disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Siguiente
                </button>
            </div>
        </nav>
    );
}
