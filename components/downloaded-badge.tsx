import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { processedImageIds } from "@/utils/storage";

const DownloadedBadge = ({ mediaId }: { mediaId: string }) => {
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    processedImageIds.getValue().then((ids) => {
      setDownloaded(ids.includes(mediaId));
    });

    return processedImageIds.watch((ids) => {
      setDownloaded(ids.includes(mediaId));
    });
  }, [mediaId]);

  if (!downloaded) return null;

  return (
    <div
      className="relative size-5 cursor-default"
      title="Downloaded"
      aria-label="Downloaded"
    >
      <div
        className="absolute top-0 right-0 size-0 drop-shadow-sm"
        style={{
          borderStyle: "solid",
          borderWidth: "0 20px 20px 0",
          borderColor: "transparent rgb(5 150 105) transparent transparent",
        }}
      />
      <Icon
        icon="lucide:check"
        className="absolute top-px right-px size-2 text-white"
      />
    </div>
  );
};

export default DownloadedBadge;
