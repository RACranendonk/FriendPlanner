/** Stay costs are in euros. Whole amounts stay whole ("€1,250"); cents only show when entered. */
export function formatEuro(amount: number, locale?: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
