export type MediaContentType = 'image' | 'video';

export interface MediaItem {
  mediaId: string;
  originalUrl: string;
  type: MediaContentType;
  creator: string;
}

export interface DownloadRequestMessage {
  url: string;
  mediaId: string;
  creator: string;
  type: MediaContentType;
}
