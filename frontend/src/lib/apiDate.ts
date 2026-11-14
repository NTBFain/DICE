/** Backend timestamps without an offset are UTC (see backend/core/time.py). */
export function parseApiDate(value: string): Date {
  const text = value.trim();
  const naiveTimestamp = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(text);
  return new Date(naiveTimestamp ? `${text.replace(' ', 'T')}Z` : text);
}
