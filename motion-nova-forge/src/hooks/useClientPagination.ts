import { useEffect, useState } from "react";

const ADMIN_PAGE_SIZE = 10;

export function useClientPagination<T>(items: T[], resetKey = "") {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / ADMIN_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  return {
    items: items.slice((currentPage - 1) * ADMIN_PAGE_SIZE, currentPage * ADMIN_PAGE_SIZE),
    page: currentPage,
    pageCount,
    pageSize: ADMIN_PAGE_SIZE,
    totalItems: items.length,
    setPage: (nextPage: number) => setPage(Math.min(Math.max(nextPage, 1), pageCount)),
  };
}
