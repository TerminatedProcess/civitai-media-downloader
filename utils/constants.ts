/**
 * CivitAI DOM selectors.
 *
 * Card discovery is now done by finding media elements (video/img) and
 * walking up to a stable container, since CivitAI uses CSS modules whose
 * class names include build hashes (e.g. Cards_image__d4f6b) that change.
 *
 * Confirmed from live DOM:
 *   <video playsinline loop disablepictureinpicture ...>
 *     <source src="https://image.civitai.com/{key}/{uuid}/{transforms}/{numericId}.mp4" ...>
 *   </video>
 */
export const CIVITAI_CDN_HOST = "image.civitai.com";
export const CIVITAI_B2_HOST = "image-b2.civitai.com";

export const CIVITAI_B2_URL_REGEX = new RegExp(
  `https://${CIVITAI_B2_HOST.replace(/\./g, "\\.")}/[^\\s"']+`,
);

export const Selectors = {
  // Stable attributes on CivitAI video elements (confirmed from live DOM)
  VIDEO: "video[playsinline][loop]",

  // Source elements inside those videos
  VIDEO_SOURCE: `source[src*="${CIVITAI_CDN_HOST}"]`,
  VIDEO_MP4_SOURCE: `source[src*="${CIVITAI_CDN_HOST}"][type="video/mp4"]`,

  // Images from CivitAI CDN (for image feeds)
  CDN_IMAGE: `img[src*="${CIVITAI_CDN_HOST}"]:not([src*="/_next/"])`,

  // The <a> tag linking to the detail page. Used to extract numeric media ID.
  // Expected href patterns: /videos/77216553 or /images/77216553
  DETAIL_LINK: 'a[href*="/videos/"], a[href*="/images/"], a[href*="/posts/"]',

  // The <video> or <img> element inside the card
  MEDIA_ELEMENT: "video, img",
};

// Extracts the numeric ID from href="/videos/77216553" or "/images/77216553"
export const DETAIL_HREF_ID_REGEX = /\/(videos|images|posts)\/(\d+)/;

// Extracts the numeric ID from a CivitAI CDN URL filename, e.g.:
//   .../transcode=true,width=450,optimized=true/131300973.mp4
//                                               ^^^^^^^^^^^
export const CDN_FILENAME_ID_REGEX =
  /\/(\d+)\.(mp4|webm|gif|jpg|jpeg|png|webp)(?:[/?]|$)/i;

// Delay between downloads in mass-download mode (ms).
// Chrome's downloads API needs breathing room; Firefox handles bursts fine.
export const DOWNLOAD_DELAY_MS =
  import.meta.env.BROWSER === "firefox" ? 1000 : 1500;

// Delay after scroll before re-scanning (ms)
export const SCROLL_WAIT_MS = 3000;

// postMessage type sent by the injected main-world script to the content script
export const MSG_INFINITE_ITEMS = "__civitai_dl_items__";
