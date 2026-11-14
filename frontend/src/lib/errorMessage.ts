/** Convert API failures into displayable text without rendering validation objects. */
export function getErrorMessage(error: unknown, fallback: string): string {
  const detail = (error as { response?: { data?: { detail?: unknown } } } | null)?.response?.data?.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const messages = detail.flatMap(item => {
      if (typeof item === 'string') return [item];
      if (item && typeof item === 'object' && typeof item.msg === 'string') return [item.msg];
      return [];
    });
    return messages.join(' ') || fallback;
  }
  return fallback;
}

/** Download requests return error bodies as blobs too. Decode only JSON errors. */
export async function getDownloadErrorMessage(error: unknown, fallback: string): Promise<string> {
  const body = (error as { response?: { data?: unknown } } | null)?.response?.data;
  if (typeof Blob !== 'undefined' && body instanceof Blob && body.type.includes('json')) {
    try { return getErrorMessage({ response: { data: JSON.parse(await body.text()) } }, fallback); }
    catch { return fallback; }
  }
  return getErrorMessage(error, fallback);
}
