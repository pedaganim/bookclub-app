// Simple no-op analytics tracker that can be wired to Segment/Mixpanel later
export function trackBorrowIntent(
  ownerUserId: string,
  bookId: string,
  title: string,
  opts?: { currentUserId?: string; path?: string; source?: string }
) {
  try {
    // In the future, send to analytics provider
    // eslint-disable-next-line no-console
    console.debug('trackBorrowIntent', {
      ownerUserId,
      bookId,
      title,
      currentUserId: opts?.currentUserId,
      path: opts?.path ?? (typeof window !== 'undefined' ? window.location.pathname : undefined),
      source: opts?.source,
    });
  } catch {
    // ignore
  }
}
