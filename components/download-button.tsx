import { useState } from "react";
import { sendMessage } from "webext-bridge/content-script";
import { Button } from "@/components/ui/button";
import { DoneIcon } from "@/components/icons/done-icon";
import { DownloadIcon } from "@/components/icons/download-icon";
import { LoadingIcon } from "@/components/icons/loading-icon";
import {
  resolveOriginalUrl,
  getMediaType,
  resolveCreator,
  getMediaIdFromCard,
} from "@/utils/site-utils";
import { markMediaAsProcessed } from "@/utils/storage";
import { logger } from "@/utils/logger";
import { cn } from "@/utils/cn";

const DownloadButton = ({ card }: { card: Element }) => {
  const [state, setState] = useState<
    "idle" | "resolving" | "downloading" | "done" | "error"
  >("idle");

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (state !== "idle" && state !== "error") return;

    setState("resolving");

    try {
      const originalUrl = resolveOriginalUrl(card);
      if (!originalUrl) {
        logger.warn("Could not resolve original URL for card", card);
        setState("error");
        setTimeout(() => setState("idle"), 3000);
        return;
      }

      setState("downloading");

      const mediaId = getMediaIdFromCard(card) ?? Date.now().toString();
      const type = getMediaType(card);
      const creator = await resolveCreator(card, mediaId);

      const response = await sendMessage(
        "DOWNLOAD_REQUEST",
        { url: originalUrl, mediaId, creator, type },
        "background",
      );

      if (response?.success) {
        await markMediaAsProcessed(mediaId);
        setState("done");
        setTimeout(() => setState("idle"), 2500);
      } else {
        logger.error("Download failed:", response);
        setState("error");
        setTimeout(() => setState("idle"), 3000);
      }
    } catch (err) {
      logger.error("Download error:", err);
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
  };

  const label = {
    idle: "Download",
    resolving: "Resolving...",
    downloading: "Downloading...",
    done: "Done!",
    error: "Failed",
  }[state];

  const variant =
    state === "done"
      ? "outline"
      : state === "error"
        ? "destructive"
        : "default";
  const loading = state === "resolving" || state === "downloading";

  return (
    <Button
      onClick={handleDownload}
      size="icon"
      variant={variant}
      disabled={loading}
      aria-label={label}
      title={label}
      className={cn(
        "cursor-pointer size-8 rounded-full shadow-md",
        state === "done" && "text-green-600 border-green-600/40",
      )}
    >
      {loading ? (
        <LoadingIcon />
      ) : state === "done" ? (
        <DoneIcon />
      ) : (
        <DownloadIcon />
      )}
    </Button>
  );
};

export default DownloadButton;
