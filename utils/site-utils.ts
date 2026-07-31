import {
  Selectors,
  MEDIA_HREF_ID_REGEX,
  CDN_FILENAME_ID_REGEX,
  CIVITAI_CDN_HOST,
  CIVITAI_B2_HOST,
  CIVITAI_B2_URL_REGEX,
  USER_LINK,
  USER_HREF_NAME_REGEX,
} from "./constants";
import { logger } from "./logger";
import type { MediaContentType } from "@/types";
import { creatorCache } from "./creator-cache";

/**
 * Find all card containers on the page by locating CivitAI media elements
 * and walking up to a stable ancestor.
 *
 * CivitAI uses CSS modules with build-hash suffixes (e.g. Cards_image__d4f6b)
 * so we can't use a fixed class selector. Instead we find media elements by
 * stable attributes and walk up to the card boundary.
 */
export function findAllCards(): Element[] {
  const cards = new Set<Element>();

  const addCard = (mediaEl: Element) => {
    // We use the <a> element (2 levels up from <video>) as the card anchor.
    //
    // Confirmed from live DOM:
    //   <a href="/images/131300973" position:absolute; inset:0>   ← anchor
    //     <div class="EdgeVideo_iosScroll...">
    //       <video playsinline loop>                               ← mediaEl
    //
    // The <a> is position:absolute; inset:0 — it overlays the full card, so:
    //   • The shadow button's position:absolute;bottom:8px;right:8px is relative
    //     to the <a> which fills the card → button appears at card's bottom-right ✓
    //   • data-wxt-civitai-id is stamped on the <a>, so HIGHLIGHT_CARD can find
    //     it and apply an outline that visually wraps the whole card ✓
    //
    // DO NOT use .overflow-hidden.rounded-md (the outer card div) as the anchor:
    // overflow-hidden clips the shadow host's absolutely-positioned button.
    const container =
      mediaEl.closest("article") ??
      mediaEl.closest("li") ??
      mediaEl.closest("[data-testid]") ??
      (() => {
        // Walk up for any element with "Card" in a CSS module class name
        let el: Element | null = mediaEl.parentElement;
        while (el && el !== document.body) {
          if (Array.from(el.classList).some((c) => c.includes("Card")))
            return el;
          el = el.parentElement;
        }
        return null;
      })() ??
      mediaEl.parentElement?.parentElement ??
      mediaEl.parentElement;

    if (
      !container ||
      container === document.body ||
      container === document.documentElement
    )
      return;

    const hasMediaLink =
      container.matches(Selectors.DETAIL_LINK) ||
      !!container.querySelector(Selectors.DETAIL_LINK);
    if (!hasMediaLink) return;

    cards.add(container);
  };

  document.querySelectorAll(Selectors.VIDEO).forEach(addCard);
  document.querySelectorAll(Selectors.CDN_IMAGE).forEach(addCard);

  return Array.from(cards);
}

/**
 * Extract the numeric media ID from a card element.
 * Tries (in order):
 *  1. Detail page link href  — href="/videos/77216553" or "/images/..."
 *  2. Card's own href
 *  3. <source src> filename  — .../131300973.mp4
 *  4. <img src> filename
 *
 * IMPORTANT: only /images/ and /videos/ ids count — never /posts/. A card
 * (especially a logged-in video card with a creator/post overlay) can contain
 * a `/posts/{id}` link that appears *before* the media link in the DOM. A post
 * id is not a valid `image.get` id, so using it makes creator resolution 404
 * and fall back to "unknown". We scan *all* detail links and take the first
 * genuine media id, skipping post links entirely.
 */
export function getMediaIdFromCard(card: Element): string | null {
  // 1. Detail links — scan every match, accept only /images/ or /videos/ ids
  const links = card.querySelectorAll(Selectors.DETAIL_LINK);
  for (const link of Array.from(links)) {
    const href = link.getAttribute("href") ?? "";
    const m = href.match(MEDIA_HREF_ID_REGEX);
    if (m) return m[2];
  }

  // 2. Card itself is an <a>
  const selfHref = card.getAttribute("href") ?? "";
  const selfMatch = selfHref.match(MEDIA_HREF_ID_REGEX);
  if (selfMatch) return selfMatch[2];

  // 3. <source src> filename (confirmed from live DOM)
  const sources = card.querySelectorAll(Selectors.VIDEO_SOURCE);
  for (const source of Array.from(sources)) {
    const src = source.getAttribute("src") ?? "";
    const match = src.match(CDN_FILENAME_ID_REGEX);
    if (match) return match[1];
  }

  // 4. <img src> filename
  const imgs = card.querySelectorAll(`img[src*="${CIVITAI_CDN_HOST}"]`);
  for (const img of Array.from(imgs)) {
    const src = img.getAttribute("src") ?? "";
    const match = src.match(CDN_FILENAME_ID_REGEX);
    if (match) return match[1];
  }

  return null;
}

/**
 * Strategy A: transform the CDN feed URL to get the original full-res version.
 *
 * Confirmed URL patterns (same domain, same UUID — only transforms differ):
 *   Feed:     CIVITAI_CDN_HOST/{key}/{uuid}/transcode=true,width=450,optimized=true/{id}.mp4
 *   Original: CIVITAI_CDN_HOST/{key}/{uuid}/transcode=true,original=true,quality=100/{id}.mp4
 *
 * No API call needed. Works without authentication for non-NSFW content.
 */
export function getOriginalUrlFromCdnTransform(card: Element): string | null {
  // Videos: prefer MP4 over WebM
  const mp4Source = card.querySelector(Selectors.VIDEO_MP4_SOURCE);
  const anyVideoSource = card.querySelector(Selectors.VIDEO_SOURCE);
  const source = mp4Source ?? anyVideoSource;
  if (source) {
    const src = source.getAttribute("src") ?? "";
    const result = applyCdnTransform(src, "video");
    if (result) return result;
  }

  // Images: use the <img> src
  const img = card.querySelector(`img[src*="${CIVITAI_CDN_HOST}"]`);
  if (img) {
    const src = img.getAttribute("src") ?? "";
    const result = applyCdnTransform(src, "image");
    if (result) return result;
  }

  return null;
}

/**
 * Replace the transform-params segment in a CivitAI CDN URL.
 *
 * URL structure: https://CIVITAI_CDN_HOST/{key}/{uuid}/{transforms}/{filename}
 * We replace {transforms} only; {key}, {uuid}, and {filename} stay the same.
 */
function applyCdnTransform(src: string, type: MediaContentType): string | null {
  if (!src.includes(CIVITAI_CDN_HOST)) return null;

  // Transform params for original quality:
  //   video → keep transcode=true so the CDN returns a playable MP4
  //   image → just request original at full quality
  const transforms =
    type === "video"
      ? "transcode=true,original=true,quality=100"
      : "original=true,quality=100";

  // Match: /{uuid}/{current-transforms}/{filename-with-extension}
  // UUID pattern: 8-4-4-4-12 hex chars
  const transformed = src.replace(
    /(\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\/)([^/]+)(\/[^/?#]+)/i,
    `$1${transforms}$3`,
  );

  if (transformed === src) {
    logger.warn("CDN transform regex did not match src:", src);
    return null;
  }

  logger.log("CDN transform:", src, "→", transformed);
  return transformed;
}

/**
 * Strategy B: look for CIVITAI_B2_HOST URL directly in the card's DOM.
 * Kept as a free check in case CivitAI ever embeds these in attributes/scripts.
 */
export function getOriginalUrlFromDom(card: Element): string | null {
  const allEls = [card, ...Array.from(card.querySelectorAll("*"))];
  for (const el of allEls) {
    for (const attr of Array.from(el.attributes)) {
      if (attr.value.includes(CIVITAI_B2_HOST)) {
        logger.log(
          "Found original URL in DOM attribute:",
          attr.name,
          attr.value,
        );
        return attr.value;
      }
    }
    if (el.tagName === "SCRIPT" && el.textContent?.includes(CIVITAI_B2_HOST)) {
      const match = el.textContent.match(CIVITAI_B2_URL_REGEX);
      if (match) {
        logger.log("Found original URL in script tag:", match[0]);
        return match[0];
      }
    }
  }
  return null;
}

/**
 * Resolve the original full-res download URL for a card element.
 *
 * Resolution order:
 *   A. CDN URL transform (zero cost, zero API calls) ← primary strategy
 *   B. B2 URL in DOM attributes (zero cost, almost never present — kept as
 *      a free check in case CivitAI embeds it in future)
 */
export function resolveOriginalUrl(card: Element): string | null {
  // Strategy A: transform feed CDN URL → original CDN URL (confirmed pattern)
  const cdnUrl = getOriginalUrlFromCdnTransform(card);
  if (cdnUrl) return cdnUrl;

  // Strategy B: look for B2/original URL in DOM attributes
  const domUrl = getOriginalUrlFromDom(card);
  if (domUrl) return domUrl;

  logger.warn("Could not resolve original URL for card", card);
  return null;
}

/** Determine if a card element represents a video vs image */
export function getMediaType(card: Element): MediaContentType {
  if (card.querySelector("video")) return "video";
  const sources = card.querySelectorAll("source");
  for (const src of Array.from(sources)) {
    if ((src.getAttribute("type") ?? "").startsWith("video/")) return "video";
  }
  const media = card.querySelector(Selectors.MEDIA_ELEMENT);
  if (media) {
    const src = media.getAttribute("src") ?? "";
    if (
      src.includes(".mp4") ||
      src.includes(".webm") ||
      src.includes("transcode=true")
    )
      return "video";
  }
  return "image";
}

/**
 * Read the creator username straight from a card's creator-profile link.
 *
 * Logged-in feed cards render an overlay with the creator's avatar linked as
 * `<a href="/user/{username}">`. Reading it here is zero-cost, needs no API
 * call, and works even when image.get is unavailable or rate-limited.
 */
export function getCreatorFromDom(card: Element): string | null {
  const link = card.querySelector(USER_LINK);
  const href = link?.getAttribute("href") ?? "";
  const m = href.match(USER_HREF_NAME_REGEX);
  if (m) return decodeURIComponent(m[1]);
  return null;
}

/**
 * Resolve the creator username for a card.
 *
 * Resolution order (cheapest / most reliable first):
 *   1. In-memory cache (populated from image.getInfinite feed responses)
 *   2. The card's own `/user/{username}` overlay link (zero-cost DOM read)
 *   3. tRPC image.get with the numeric media ID
 *
 * `mediaId` MUST be an /images/ or /videos/ id (see getMediaIdFromCard) — a
 * post id here 404s and yields "unknown".
 *
 * Only call from content-script context (same-origin fetch, no CORS issues).
 */
export async function resolveCreator(
  card: Element,
  mediaId: string,
): Promise<string> {
  const cached = creatorCache.get(mediaId);
  if (cached) return cached;

  // Zero-cost: the creator is usually linked right on the card.
  const fromDom = getCreatorFromDom(card);
  if (fromDom) {
    creatorCache.set(mediaId, fromDom);
    return fromDom;
  }

  try {
    const input = encodeURIComponent(
      JSON.stringify({ json: { id: parseInt(mediaId, 10) } }),
    );
    const res = await fetch(`/api/trpc/image.get?input=${input}`);
    if (!res.ok) {
      logger.warn(
        `image.get failed for media ${mediaId} (status ${res.status}) — creator unknown`,
      );
      return "unknown";
    }
    const data = await res.json();
    // tRPC/superjson shape: { result: { data: { json: { user: { username } } } } }
    const imageData = data?.result?.data?.json;
    const username =
      imageData?.user?.username ?? imageData?.user?.name ?? imageData?.username;
    if (username) {
      creatorCache.set(mediaId, String(username));
      return String(username);
    }
  } catch {
    // Network error or API shape change — swallow and fall through
  }
  return "unknown";
}
