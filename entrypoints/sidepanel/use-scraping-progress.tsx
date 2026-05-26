import { useState } from 'react';

export const useScrapingProgress = () => {
  const [scrapingStatus, setScrapingStatus] = useState({
    isScraping: false,
    downloadedCount: 0,
    totalFound: 0,
    currentItem: null as { index: number; type: string; creator: string } | null,
  });

  const startScraping = () =>
    setScrapingStatus({ isScraping: true, downloadedCount: 0, totalFound: 0, currentItem: null });

  const stopScraping = () =>
    setScrapingStatus((prev) => ({ ...prev, isScraping: false, currentItem: null }));

  const incrementDownloadCount = () =>
    setScrapingStatus((prev) => ({ ...prev, downloadedCount: prev.downloadedCount + 1 }));

  const addToTotalFound = (count: number) =>
    setScrapingStatus((prev) => ({ ...prev, totalFound: prev.totalFound + count }));

  const setCurrentItem = (item: { index: number; type: string; creator: string } | null) =>
    setScrapingStatus((prev) => ({ ...prev, currentItem: item }));

  return {
    scrapingStatus,
    startScraping,
    stopScraping,
    incrementDownloadCount,
    addToTotalFound,
    setCurrentItem,
  };
};
