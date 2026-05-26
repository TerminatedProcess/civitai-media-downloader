/**
 * In-memory cache: numeric mediaId (as string) → creator username.
 *
 * Populated whenever the page calls image.getInfinite (intercepted via
 * webRequest in the background script, or via a page-context fetch patch).
 * resolveCreator() checks here first so we never make a separate API call
 * for items already in the feed.
 */
export const creatorCache = new Map<string, string>();

export interface InfiniteItem {
  id?: number;
  user?: { username?: string; name?: string };
}

/** Extract items array from an image.getInfinite tRPC response body. */
export function parseInfiniteResponse(data: unknown): InfiniteItem[] {
  const items = (data as { result?: { data?: { json?: { items?: unknown } } } })
    ?.result?.data?.json?.items;
  return Array.isArray(items) ? items : [];
}

/** Merge items from an image.getInfinite response into the cache. */
export function cacheInfiniteItems(items: InfiniteItem[]): void {
  for (const item of items) {
    if (!item.id) continue;
    const username = item.user?.username ?? item.user?.name;
    if (username) creatorCache.set(String(item.id), username);
  }
}
