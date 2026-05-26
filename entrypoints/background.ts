import { onMessage, sendMessage } from "webext-bridge/background";
import type { DownloadRequestMessage } from "@/types";
import { parseInfiniteResponse } from "@/utils/creator-cache";
import { buildDownloadPath } from "@/utils/filename-utils";
import { logger } from "@/utils/logger";
import {
  folderDestination,
  filenamePattern,
} from "@/utils/storage";

export default defineBackground(() => {
  // ── Icon click: open sidebar ──────────────────────────────────────────────

  const handleIconClick = async (tab: Browser.tabs.Tab) => {
    try {
      if (browser.sidePanel?.open) {
        // Chrome MV3
        await browser.sidePanel.open({ tabId: tab.id, windowId: tab.windowId });
      } else if ((browser as any).sidebarAction?.toggle) {
        // Firefox MV2
        await (browser as any).sidebarAction.toggle();
      }
    } catch (err) {
      console.error("[civitai-dl] Failed to open sidebar:", err);
    }
  };

  if (import.meta.env.MANIFEST_VERSION === 2) {
    (browser as any).browserAction.onClicked.addListener(handleIconClick);
  } else {
    browser.action.onClicked.addListener(handleIconClick);
  }

  // ── Download handler ──────────────────────────────────────────────────────

  onMessage("DOWNLOAD_REQUEST", async ({ data }) => {
    const { url, mediaId, creator, type } =
      data as unknown as DownloadRequestMessage;

    try {
      const [folderPattern, filePattern] = await Promise.all([
        folderDestination.getValue(),
        filenamePattern.getValue(),
      ]);

      const filename = buildDownloadPath({
        folderPattern,
        filenamePattern: filePattern,
        url,
        type,
        creator,
        mediaId,
      });

      await browser.downloads.download({
        url,
        filename,
        saveAs: false,
      });
      return { success: true };
    } catch (err) {
      console.error("[civitai-dl] Download failed:", err);
      return { success: false, message: (err as Error).message };
    }
  });

  browser.webRequest.onBeforeRequest.addListener(
    (details) => {
      const filter = browser.webRequest.filterResponseData(details.requestId);
      const chunks: Uint8Array[] = [];

      filter.ondata = (event) => {
        chunks.push(new Uint8Array(event.data));
        filter.write(event.data);
      };

      filter.onstop = () => {
        try {
          const totalLength = chunks.reduce((n, c) => n + c.length, 0);
          const combined = new Uint8Array(totalLength);
          let offset = 0;
          for (const chunk of chunks) {
            combined.set(chunk, offset);
            offset += chunk.length;
          }

          const items = parseInfiniteResponse(
            JSON.parse(new TextDecoder().decode(combined)),
          );

          if (items.length > 0 && details.tabId >= 0) {
            sendMessage(
              "CACHE_INFINITE_ITEMS",
              { items },
              `content-script@${details.tabId}`,
            ).catch(() => {});
            logger.log(
              `Cached ${items.length} creator entries from getInfinite (tab ${details.tabId})`,
            );
          }
        } catch {
          // Malformed or non-JSON response — pass through without caching
        }

        filter.close();
      };

      return {};
    },
    {
      urls: ["https://civitai.red/api/trpc/image.getInfinite*"],
      types: ["xmlhttprequest"],
    },
    ["blocking"],
  );
});
