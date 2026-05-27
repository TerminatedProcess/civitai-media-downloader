import { storage } from "#imports";

export const folderDestination = storage.defineItem("local:folderDestination", {
  fallback: "CivitAI Downloads/{creator}",
});

export const filenamePattern = storage.defineItem("local:filenamePattern", {
  fallback: "{creator}_{timestamp}_{id}",
});

export const processedImageIds = storage.defineItem("local:processedImageIds", {
  fallback: [] as string[],
});

export async function markMediaAsProcessed(mediaId: string): Promise<void> {
  const current = await processedImageIds.getValue();
  if (current.includes(mediaId)) return;
  await processedImageIds.setValue([...current, mediaId]);
}

export const darkMode = storage.defineItem("local:darkMode", {
  fallback: false,
});

export const hideDownloadButton = storage.defineItem(
  "local:hideDownloadButton",
  {
    fallback: false,
  },
);
