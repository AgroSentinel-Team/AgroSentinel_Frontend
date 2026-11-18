import { useMemo, useState } from 'react';

export default function usePagination(items) {
    const [requestedPage, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
    const page = Math.min(requestedPage, totalPages);

    const pageItems = useMemo(
        () => items.slice((page - 1) * pageSize, page * pageSize),
        [items, page, pageSize],
    );

    const changePageSize = (value) => {
        setPageSize(Number(value));
        setPage(1);
    };

    return {
        page,
        pageItems,
        pageSize,
        setPage,
        changePageSize,
        totalPages,
        start: items.length ? (page - 1) * pageSize + 1 : 0,
        end: Math.min(page * pageSize, items.length),
    };
}
