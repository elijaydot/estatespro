export function isAbortLikeError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') return true;

  const candidate = error as {
    name?: unknown;
    message?: unknown;
    details?: unknown;
  } | null;
  const text = [candidate?.name, candidate?.message, candidate?.details, String(error || '')]
    .filter(Boolean)
    .join(' ');

  return /abort|aborted|AbortError|signal is aborted/i.test(text);
}