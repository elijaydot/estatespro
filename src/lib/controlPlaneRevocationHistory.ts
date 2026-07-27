export function getRevocationHistoryTotalPages(totalCount?: number, pageSize?: number) {
  const safePageSize = Math.max(1, pageSize || 20);
  const safeTotalCount = Math.max(0, totalCount || 0);
  return Math.max(1, Math.ceil(safeTotalCount / safePageSize));
}

export function getDisplayedRevocationHistoryPage(serverPage: number | undefined, localPage: number) {
  return Math.max(1, serverPage || localPage || 1);
}

export function getPrevRevocationHistoryPage(currentPage: number) {
  return Math.max(1, currentPage - 1);
}

export function getNextRevocationHistoryPage(currentPage: number, totalPages: number) {
  return Math.min(Math.max(1, totalPages), currentPage + 1);
}

export function shouldDisableRevocationPrev(currentPage: number, isFetching: boolean) {
  return isFetching || currentPage <= 1;
}

export function shouldDisableRevocationNext(currentPage: number, totalPages: number, isFetching: boolean) {
  return isFetching || currentPage >= totalPages;
}

export function resetRevocationHistoryPage() {
  return 1;
}
