import "~/assets/tailwind.css";
import ReactDOM from "react-dom/client";
import { onMessage } from "webext-bridge/content-script";
import { MSG_INFINITE_ITEMS, SCROLL_WAIT_MS } from "@/utils/constants";
import { processedImageIds } from "@/utils/storage";
import {
  findAllCards,
  resolveOriginalUrl,
  getMediaType,
  resolveCreator,
} from "@/utils/site-utils";
import { setImageIdentifier } from "@/utils/image-identifier";
import { logger } from "@/utils/logger";
import { compact } from "es-toolkit";
import { CardUi } from "@/components/card-ui";
import type { MediaItem } from "@/types";
import { cacheInfiniteItems } from "@/utils/creator-cache";
import { injectScript } from "wxt/utils/inject-script";

const HIGHLIGHT_CLASS = "civitai-dl-highlight";
const HIGHLIGHT_DURATION_MS = 2000;

function ensureHighlightStyles() {
  if (document.getElementById("civitai-dl-highlight-styles")) return;

  const style = document.createElement("style");
  style.id = "civitai-dl-highlight-styles";
  style.textContent = `
    @keyframes civitai-dl-highlight-pulse {
      0%, 100% {
        border-color: #f59e0b;
        box-shadow:
          0 0 0 2px rgba(245, 158, 11, 0.45),
          0 0 26px rgba(245, 158, 11, 0.55),
          inset 0 0 22px rgba(245, 158, 11, 0.14);
      }
      50% {
        border-color: #fde047;
        box-shadow:
          0 0 0 3px rgba(253, 224, 71, 0.55),
          0 0 40px rgba(253, 224, 71, 0.75),
          inset 0 0 32px rgba(253, 224, 71, 0.2);
      }
    }

    .${HIGHLIGHT_CLASS} {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 9998;
      box-sizing: border-box;
      border: 8px solid #f59e0b;
      border-radius: inherit;
      animation: civitai-dl-highlight-pulse 1.4s ease-in-out infinite;
      will-change: box-shadow, border-color;
    }
  `;
  document.head.appendChild(style);
}

function clearHighlights() {
  document.querySelectorAll("[data-civitai-dl-highlight]").forEach((el) => {
    el.remove();
  });
}

/** Prefer the clipped, rounded tile frame so the border hugs the visible card. */
function getHighlightTarget(card: HTMLElement): HTMLElement {
  let el: HTMLElement | null = card;
  while (el && el !== document.body) {
    const { overflow, overflowX, overflowY, borderRadius } =
      getComputedStyle(el);
    const clipped = [overflow, overflowX, overflowY].some(
      (value) => value === "hidden" || value === "clip",
    );
    if (clipped && borderRadius !== "0px") return el;
    el = el.parentElement;
  }
  return card;
}

/** Overlay inside the card so it scrolls with the page — no per-frame sync. */
function highlightCard(card: HTMLElement) {
  ensureHighlightStyles();
  clearHighlights();

  const target = getHighlightTarget(card);
  const overlay = document.createElement("div");
  overlay.className = HIGHLIGHT_CLASS;
  overlay.dataset.civitaiDlHighlight = "";

  if (getComputedStyle(target).position === "static") {
    target.style.position = "relative";
  }

  target.appendChild(overlay);

  window.setTimeout(() => overlay.remove(), HIGHLIGHT_DURATION_MS);
}

/**
 * Walk up from an element to find its nearest scrollable ancestor.
 * Falls back to .scroll-area (CivitAI's custom container) then documentElement.
 */
function getScrollableParent(el: Element): Element {
  let current = el.parentElement;
  while (current && current !== document.body) {
    const { overflow, overflowY } = getComputedStyle(current);
    if (
      overflow === "auto" ||
      overflow === "scroll" ||
      overflowY === "auto" ||
      overflowY === "scroll"
    ) {
      return current;
    }
    current = current.parentElement;
  }
  // Fallback: CivitAI's named scroll container, or the root element
  return document.querySelector(".scroll-area") ?? document.documentElement;
}

/** For operations that need the feed scroll container without a card anchor. */
const getScrollContainer = (): Element =>
  document.querySelector(".scroll-area") ?? document.documentElement;

export default defineContentScript({
  matches: ["*://*.civitai.com/*", "*://*.civitai.red/*"],
  cssInjectionMode: "ui",

  async main(ctx) {
    await injectScript("/injected.js", { keepInDom: true });

    // ── Creator cache — receives postMessage from the injected script ─────────
    window.addEventListener("message", (e) => {
      if (e.data?.type === MSG_INFINITE_ITEMS && Array.isArray(e.data.items)) {
        cacheInfiniteItems(e.data.items);
        logger.log(
          `Cached ${e.data.items.length} creator entries from getInfinite`,
        );
      }
    });

    onMessage("CACHE_INFINITE_ITEMS", async ({ data }) => {
      cacheInfiniteItems(data.items);
      logger.log(
        `Cached ${data.items.length} creator entries from getInfinite (background)`,
      );
      return { success: true };
    });

    // ── Button injection ──────────────────────────────────────────────────────

    const mountedCards = new Set<Element>();

    const attachButtons = async () => {
      const cards = findAllCards();

      logger.log(`Found ${cards} cards to attach buttons to`);

      await Promise.all(
        cards.map(async (card) => {
          if (mountedCards.has(card)) return;

          // Only attach if we can find a media ID (confirms it's a real card)
          const id = setImageIdentifier(card);
          if (!id) return;

          const ui = await createShadowRootUi(ctx, {
            name: "civitai-dl-card-ui",
            position: "inline",
            anchor: card,
            append: "last",
            onMount: (container) => {
              container.style.cssText =
                "position:absolute;inset:0;z-index:9999;pointer-events:none;";
              const app = document.createElement("div");
              app.style.cssText = "position:relative;width:100%;height:100%;";
              container.append(app);
              const root = ReactDOM.createRoot(app);
              root.render(<CardUi card={card} mediaId={id} />);
              return root;
            },
            onRemove: (root) => root?.unmount(),
          });

          ui.mount();
          mountedCards.add(card);
        }),
      );

      logger.log(`Attached buttons to ${mountedCards.size} cards total`);
    };

    // Initial attach (may find 0 cards if Next.js hasn't rendered yet — the
    // MutationObserver below covers the async render case)
    await attachButtons();

    // ── MutationObserver — covers both initial async render AND infinite scroll ──
    //
    // window.scroll doesn't fire for CivitAI because the page scrolls inside a
    // custom .scroll-area div. The MutationObserver fires whenever Next.js adds
    // new card nodes to the DOM, which is the real signal we need.
    let mutationDebounce: ReturnType<typeof setTimeout>;
    const observer = new MutationObserver(() => {
      clearTimeout(mutationDebounce);
      mutationDebounce = setTimeout(() => {
        logger.log("DOM mutation detected, scanning for new cards...");
        attachButtons();
      }, 300);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // ── SPA navigation (Next.js route changes without full reload) ────────────
    const onLocationChange = async () => {
      logger.log("Location changed, re-scanning...");
      mountedCards.clear();
      await attachButtons();
    };
    ctx.addEventListener(window, "wxt:locationchange", onLocationChange);

    // Fallback pushState/replaceState patch for older WXT versions
    const origPush = history.pushState.bind(history);
    const origReplace = history.replaceState.bind(history);
    history.pushState = (...args) => {
      origPush(...args);
      onLocationChange();
    };
    history.replaceState = (...args) => {
      origReplace(...args);
      onLocationChange();
    };

    // ── Message handlers ──────────────────────────────────────────────────────

    onMessage("SCAN_PAGE_MEDIA", async () => {
      const cards = findAllCards();

      const processedIds = await processedImageIds.getValue();
      const processedSet = new Set(processedIds);

      const mediaItems = compact(
        await Promise.all(
          cards.map(async (card): Promise<MediaItem | null> => {
            const mediaId = setImageIdentifier(card);
            if (!mediaId) return null;
            if (processedSet.has(mediaId)) {
              logger.log("Skipping already processed:", mediaId);
              return null;
            }

            logger.log("Processing:", mediaId);

            const originalUrl = resolveOriginalUrl(card);
            if (!originalUrl) {
              logger.warn("Could not resolve URL for card", mediaId);
              return null;
            }

            return {
              mediaId,
              originalUrl,
              type: getMediaType(card),
              creator: await resolveCreator(card, mediaId),
            };
          }),
        ),
      );

      logger.log(`SCAN_PAGE_MEDIA: found ${mediaItems.length} new items`);
      return { success: true, data: { mediaItems } };
    });

    onMessage("HIGHLIGHT_CARD", async ({ data }) => {
      const { mediaId } = data;

      const card = document.querySelector(
        `[data-wxt-civitai-id="${mediaId}"]`,
      ) as HTMLElement | null;

      if (card) {
        // Walk up from the card to find its actual scrollable ancestor —
        // avoids hardcoding .scroll-area which differs across page layouts.
        const container = getScrollableParent(card);
        const cardRect = card.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const scrollTop =
          container.scrollTop +
          cardRect.top -
          containerRect.top -
          container.clientHeight / 2 +
          cardRect.height / 2;
        container.scrollTo({ top: scrollTop, behavior: "smooth" });
        requestAnimationFrame(() => highlightCard(card));
      }

      return { success: true };
    });

    onMessage("SCROLL_TO_LOAD_MORE", async () => {
      // CivitAI scrolls inside .scroll-area, not window
      const container = getScrollContainer();
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
      logger.log("Scrolled .scroll-area to bottom to load more");
      await new Promise((resolve) => setTimeout(resolve, SCROLL_WAIT_MS));
      return { success: true };
    });
  },
});
