import { getMediaIdFromCard } from './site-utils';

const ATTR = 'data-wxt-civitai-id';

/** Get the identifier we previously stamped on this card, or null */
export function getImageIdentifier(card: Element): string | null {
  return card.getAttribute(ATTR);
}

/** Stamp a stable ID onto the card element. Returns the ID, or null if it can't be determined. */
export function setImageIdentifier(card: Element): string | null {
  const existing = getImageIdentifier(card);
  if (existing) return existing;

  const id = getMediaIdFromCard(card);
  if (id) {
    card.setAttribute(ATTR, id);
    return id;
  }
  return null;
}
