import { useEffect, useState } from "react";
import DownloadButton from "@/components/download-button";
import DownloadedBadge from "@/components/downloaded-badge";
import { hideDownloadButton as hideDownloadButtonStorage } from "@/utils/storage";

export function CardUi({ card, mediaId }: { card: Element; mediaId: string }) {
  const [hideButton, setHideButton] = useState(false);

  useEffect(() => {
    hideDownloadButtonStorage.getValue().then(setHideButton);
    return hideDownloadButtonStorage.watch(setHideButton);
  }, []);

  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          pointerEvents: "auto",
        }}
      >
        <DownloadedBadge mediaId={mediaId} />
      </div>
      {!hideButton && (
        <div
          style={{
            position: "absolute",
            bottom: 8,
            left: 8,
            pointerEvents: "auto",
          }}
        >
          <DownloadButton card={card} />
        </div>
      )}
    </>
  );
}
