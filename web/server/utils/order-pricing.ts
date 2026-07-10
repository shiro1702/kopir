export const ORDER_COPIES_MIN = 1
export const ORDER_COPIES_MAX = 10

export function clampCopies(copies: number): number {
  if (!Number.isFinite(copies)) {
    return ORDER_COPIES_MIN
  }
  const rounded = Math.round(copies)
  return Math.min(ORDER_COPIES_MAX, Math.max(ORDER_COPIES_MIN, rounded))
}

export function billablePages(pageCount: number, copies: number): number {
  const safePages = Number.isFinite(pageCount) && pageCount > 0 ? Math.round(pageCount) : 1
  return safePages * clampCopies(copies)
}

export function computeOrderAmountKopeks(
  pageCount: number,
  copies: number,
  pricePerPageKopeks: number,
): number {
  const safePrice = Number.isFinite(pricePerPageKopeks) && pricePerPageKopeks > 0
    ? Math.round(pricePerPageKopeks)
    : 0
  return billablePages(pageCount, copies) * safePrice
}

export function formatPagesWithCopies(pageCount: number, copies: number): string {
  const safeCopies = clampCopies(copies)
  if (safeCopies <= 1) {
    return `${pageCount}`
  }
  return `${pageCount} × ${safeCopies} копии = ${billablePages(pageCount, safeCopies)}`
}
