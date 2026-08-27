// Standard local storage fallback (replaces legacy Lovable preview broker)
export function brokeredPreviewStorage() {
  if (typeof window === 'undefined') return undefined;
  return window.localStorage;
}
