import filenamify from 'filenamify/browser';

import type { MediaContentType } from '@/types';

export interface PatternData {
  creator: string;
  timestamp: string;
  mediaId: string;
}

export interface FilenameData extends PatternData {
  extension: string;
}

export function sanitizeForFilename(raw: string | undefined | null, maxLength = 80): string {
  if (!raw) return '';
  return filenamify(raw, { maxLength, replacement: '_' })
    .replace(/\s+/g, '_')
    .trim();
}

export function expandPattern(pattern: string, data: PatternData): string {
  return pattern
    .replace(/{creator}/g, sanitizeForFilename(data.creator) || 'unknown')
    .replace(/{timestamp}/g, data.timestamp)
    .replace(/{id}/g, data.mediaId);
}

export function generateFilename(pattern: string, data: FilenameData): string {
  return expandPattern(pattern, data) + '.' + data.extension;
}

export function buildDownloadPath(options: {
  folderPattern: string;
  filenamePattern: string;
  url: string;
  type: MediaContentType;
  creator: string;
  mediaId: string;
  timestamp?: string;
}): string {
  const pathData = {
    creator: options.creator,
    timestamp: options.timestamp ?? getCurrentTimestamp(),
    mediaId: options.mediaId,
  };
  const folder = expandPattern(options.folderPattern, pathData);
  const filename = generateFilename(options.filenamePattern, {
    ...pathData,
    extension: guessExtension(options.url, options.type),
  });
  return `${folder}/${filename}`;
}

export function getCurrentTimestamp(): string {
  return new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
}

/** Guess file extension from a URL or content-type. Defaults to 'mp4' for video. */
export function guessExtension(url: string, type: 'video' | 'image'): string {
  try {
    const path = new URL(url).pathname;
    const match = path.match(/\.(mp4|webm|gif|jpg|jpeg|png|webp)(\?|$)/i);
    if (match) return match[1].toLowerCase();
  } catch {}
  return type === 'video' ? 'mp4' : 'jpg';
}
