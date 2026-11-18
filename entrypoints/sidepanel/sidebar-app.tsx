import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { debounce } from "es-toolkit";
import { sendMessage } from "webext-bridge/popup";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  folderDestination as folderDestinationStorage,
  filenamePattern as filenamePatternStorage,
  processedImageIds,
  markMediaAsProcessed,
  darkMode as darkModeStorage,
  hideDownloadButton as hideDownloadButtonStorage,
} from "@/utils/storage";
import { useScrapingProgress } from "./use-scraping-progress";
import { DOWNLOAD_DELAY_MS } from "@/utils/constants";
import { FAQ } from "@/components/faq";
import { SidebarFooter } from "@/components/sidebar-footer";

type SettingsFormData = {
  folderDestination: string;
  filenamePattern: string;
  hideDownloadButton: boolean;
};

const debouncedSaveFolder = debounce(async (value: string) => {
  await folderDestinationStorage.setValue(value);
}, 500);

const debouncedSaveFilename = debounce(async (value: string) => {
  await filenamePatternStorage.setValue(value);
}, 500);

const debouncedSaveHideDownloadButton = debounce(async (value: boolean) => {
  await hideDownloadButtonStorage.setValue(value);
}, 500);

function SidebarApp() {
  const form = useForm<SettingsFormData>({
    defaultValues: {
      folderDestination: "CivitAI Downloads",
      filenamePattern: "{creator}_{timestamp}_{id}",
      hideDownloadButton: false,
    },
  });

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isCivitaiPage, setIsCivitaiPage] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");
  const [isClearingHistory, setIsClearingHistory] = useState(false);

  const {
    scrapingStatus,
    startScraping,
    stopScraping,
    incrementDownloadCount,
    addToTotalFound,
    setCurrentItem,
  } = useScrapingProgress();

  const shouldContinueRef = useRef(false);

  useEffect(() => {
    const load = async () => {
      const [folder, pattern, dark, hideButton] = await Promise.all([
        folderDestinationStorage.getValue(),
        filenamePatternStorage.getValue(),
        darkModeStorage.getValue(),
        hideDownloadButtonStorage.getValue(),
      ]);

      form.reset({
        folderDestination: folder,
        filenamePattern: pattern,
        hideDownloadButton: hideButton,
      });
      setIsDarkMode(dark);
      document.documentElement.classList.toggle("dark", dark);
    };
    load();
  }, [form]);

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (!name) return;

      switch (name) {
        case "folderDestination":
          debouncedSaveFolder(value.folderDestination ?? "");
          break;
        case "filenamePattern":
          debouncedSaveFilename(value.filenamePattern ?? "");
          break;
        case "hideDownloadButton":
          debouncedSaveHideDownloadButton(value.hideDownloadButton ?? false);
          break;
      }
    });

    return () => subscription.unsubscribe();
  }, [form]);

  useEffect(() => {
    const checkTab = async () => {
      try {
        const [tab] = await browser.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (tab?.url) {
          setCurrentUrl(tab.url);
          setIsCivitaiPage(
            tab.url.includes("civitai.com") || tab.url.includes("civitai.red"),
          );
        }
      } catch {}
    };

    checkTab();

    const onUpdated = (
      _: number,
      info: Browser.tabs.OnUpdatedInfo,
      tab: Browser.tabs.Tab,
    ) => {
      if (info.url && tab.active) {
        setCurrentUrl(tab.url ?? "");
        setIsCivitaiPage(
          (tab.url ?? "").includes("civitai.com") ||
            (tab.url ?? "").includes("civitai.red"),
        );
      }
    };

    const onActivated = async (info: Browser.tabs.OnActivatedInfo) => {
      try {
        const tab = await browser.tabs.get(info.tabId);
        if (tab?.url) {
          setCurrentUrl(tab.url);
          setIsCivitaiPage(
            tab.url.includes("civitai.com") || tab.url.includes("civitai.red"),
          );
        }
      } catch {}
    };

    browser.tabs.onUpdated.addListener(onUpdated);
    browser.tabs.onActivated.addListener(onActivated);
    return () => {
      browser.tabs.onUpdated.removeListener(onUpdated);
      browser.tabs.onActivated.removeListener(onActivated);
    };
  }, []);

  const handleToggleDark = async () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    await darkModeStorage.setValue(next);
  };

  const handleMassScrape = async () => {
    try {
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.id) return;

      startScraping();
      shouldContinueRef.current = true;

      const processPage = async () => {
        const response = await sendMessage(
          "SCAN_PAGE_MEDIA",
          {},
          `content-script@${tab.id}`,
        );

        if (!response?.success || !response.data) {
          console.error("[civitai-dl] SCAN_PAGE_MEDIA failed");
          stopScraping();
          return;
        }

        const { mediaItems } = response.data;
        addToTotalFound(mediaItems.length);

        for (let i = 0; i < mediaItems.length; i++) {
          if (!shouldContinueRef.current) break;

          const item = mediaItems[i];
          setCurrentItem({
            index: i + 1,
            type: item.type,
            creator: item.creator,
          });

          try {
            await sendMessage(
              "HIGHLIGHT_CARD",
              { mediaId: item.mediaId },
              `content-script@${tab.id}`,
            );
          } catch {}

          try {
            const downloadResponse = await sendMessage(
              "DOWNLOAD_REQUEST",
              {
                url: item.originalUrl,
                mediaId: item.mediaId,
                creator: item.creator,
                type: item.type,
              },
              "background",
            );

            if (downloadResponse?.success) {
              incrementDownloadCount();
              await markMediaAsProcessed(item.mediaId);
            }
          } catch (err) {
            console.error(
              "[civitai-dl] Download failed for",
              item.mediaId,
              err,
            );
          }

          if (i < mediaItems.length - 1) {
            await new Promise((r) => setTimeout(r, DOWNLOAD_DELAY_MS));
          }
        }

        setCurrentItem(null);

        if (!shouldContinueRef.current) {
          stopScraping();
          return;
        }

        if (mediaItems.length > 0) {
          setTimeout(() => {
            if (shouldContinueRef.current) processPage();
          }, 2000);
        } else {
          await sendMessage(
            "SCROLL_TO_LOAD_MORE",
            {},
            `content-script@${tab.id}`,
          );
          setTimeout(() => {
            if (shouldContinueRef.current) processPage();
            else stopScraping();
          }, 3500);
        }
      };

      processPage();
    } catch (err) {
      console.error("[civitai-dl] Mass scrape error:", err);
      shouldContinueRef.current = false;
      stopScraping();
    }
  };

  const handleStop = () => {
    shouldContinueRef.current = false;
    setCurrentItem(null);
    stopScraping();
  };

  const handleClearHistory = async () => {
    setIsClearingHistory(true);
    await processedImageIds.setValue([]);
    await new Promise((r) => setTimeout(r, 400));
    setIsClearingHistory(false);
  };

  if (!isCivitaiPage) {
    return (
      <div
        className="w-full min-h-screen p-4 bg-linear-to-br from-gray-200 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex flex-col items-center justify-center"
        style={{ minWidth: 300 }}
      >
        <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center mb-4">
          <Icon icon="lucide:download" className="text-white w-7 h-7" />
        </div>
        <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">
          CivitAI Downloader
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
          Navigate to civitai.com or civitai.red to use this extension.
        </p>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 w-full text-xs text-yellow-800 dark:text-yellow-200 break-all">
          {currentUrl || "No page detected"}
        </div>
      </div>
    );
  }

  const pct =
    scrapingStatus.totalFound > 0
      ? Math.round(
          (scrapingStatus.downloadedCount / scrapingStatus.totalFound) * 100,
        )
      : 0;

  return (
    <div
      className="w-full min-h-screen p-4 bg-linear-to-br from-gray-200 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex flex-col"
      style={{ minWidth: 300 }}
    >
      <div className="text-center mb-6">
        <div className="flex justify-center items-center mb-2 relative">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
            <Icon icon="lucide:download" className="text-white w-5 h-5" />
          </div>
          <Button
            onClick={handleToggleDark}
            variant="ghost"
            size="sm"
            className="p-2 absolute right-0"
          >
            <Icon
              icon={isDarkMode ? "lucide:sun" : "lucide:moon"}
              className="w-4 h-4 text-gray-600 dark:text-gray-300"
            />
          </Button>
        </div>
        <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">
          CivitAI Downloader
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Bulk video + image downloader
        </p>
      </div>

      <Form {...form}>
        <div className="space-y-4 mb-6">
          <FormField
            control={form.control}
            name="folderDestination"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Download Folder</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="CivitAI Downloads" />
                </FormControl>
                <FormDescription>
                  Variables: {"{creator}"}, {"{timestamp}"}, {"{id}"}
                </FormDescription>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="filenamePattern"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Filename Pattern</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="{creator}_{timestamp}_{id}" />
                </FormControl>
                <FormDescription>
                  Variables: {"{creator}"}, {"{timestamp}"}, {"{id}"}
                </FormDescription>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="hideDownloadButton"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) =>
                      field.onChange(checked === true)
                    }
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Hide download buttons on cards</FormLabel>
                </div>
              </FormItem>
            )}
          />
        </div>
      </Form>

      <div className="space-y-2 mb-4">
        {!scrapingStatus.isScraping ? (
          <Button onClick={handleMassScrape} className="w-full">
            <Icon icon="lucide:play" className="w-4 h-4" />
            Start Mass Download
          </Button>
        ) : (
          <Button onClick={handleStop} variant="destructive" className="w-full">
            <Icon icon="lucide:square" className="w-4 h-4" />
            Stop
          </Button>
        )}
        <p className="text-center text-xs text-gray-500 dark:text-gray-400">
          {scrapingStatus.isScraping
            ? "Auto-scrolling and downloading..."
            : "Scrolls the page and downloads everything"}
        </p>
      </div>

      {scrapingStatus.isScraping && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-medium text-blue-800 dark:text-blue-200">
              {scrapingStatus.downloadedCount} / {scrapingStatus.totalFound}{" "}
              downloaded
            </span>
            <span className="text-xs text-blue-600 dark:text-blue-300">
              {pct}%
            </span>
          </div>
          <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-1.5 mb-2">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          {scrapingStatus.currentItem && (
            <div className="flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-300">
              <Icon
                icon="lucide:loader-2"
                className="animate-spin size-3 shrink-0"
              />
              <span>
                #{scrapingStatus.currentItem.index} —{" "}
                {scrapingStatus.currentItem.type} by{" "}
                {scrapingStatus.currentItem.creator}
              </span>
            </div>
          )}
        </div>
      )}

      {!scrapingStatus.isScraping && (
        <div className="text-center">
          <Button
            onClick={handleClearHistory}
            variant="link"
            size="sm"
            disabled={isClearingHistory}
            className="text-xs"
          >
            {isClearingHistory ? (
              <>
                <Icon
                  icon="lucide:loader-2"
                  className="animate-spin -ml-1 mr-1 size-4"
                />
                Clearing...
              </>
            ) : (
              "Clear download history"
            )}
          </Button>
        </div>
      )}

      <FAQ />

      <SidebarFooter />
    </div>
  );
}

export default SidebarApp;
