import type { ProtocolWithReturn } from "webext-bridge";
import type { InfiniteItem } from "../utils/creator-cache";
import type { MediaContentType, MediaItem } from "../types";

declare module "webext-bridge" {
  export interface ProtocolMap {
    /** Sidebar → content script: scan visible cards and return unprocessed media items */
    SCAN_PAGE_MEDIA: ProtocolWithReturn<
      Record<string, never>,
      { success: boolean; data: { mediaItems: MediaItem[] } }
    >;

    /** Sidebar → content script: highlight the card currently being downloaded */
    HIGHLIGHT_CARD: ProtocolWithReturn<
      { mediaId: string },
      { success: boolean }
    >;

    /** Sidebar → content script: scroll to the bottom to trigger infinite-scroll load */
    SCROLL_TO_LOAD_MORE: ProtocolWithReturn<
      Record<string, never>,
      { success: boolean }
    >;

    /** Content script / sidebar → background: trigger a browser download */
    DOWNLOAD_REQUEST: ProtocolWithReturn<
      {
        url: string;
        mediaId: string;
        creator: string;
        type: MediaContentType;
      },
      { success: boolean; message?: string }
    >;

    /** Background → content script: cache image.getInfinite response items */
    CACHE_INFINITE_ITEMS: ProtocolWithReturn<
      { items: InfiniteItem[] },
      { success: boolean }
    >;
  }
}
