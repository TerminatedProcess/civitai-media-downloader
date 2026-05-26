import { Icon } from "@iconify/react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function FAQ() {
  return (
    <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
        <Icon icon="lucide:help-circle" className="w-4 h-4 mr-2" />
        Frequently Asked Questions
      </h3>

      <Accordion type="multiple" className="w-full">
        <AccordionItem value="item-1">
          <AccordionTrigger className="text-xs font-medium text-gray-800 dark:text-gray-200 hover:no-underline">
            <div className="flex items-center space-x-2">
              <Icon
                icon="lucide:download"
                className="w-4 h-4 text-blue-500 flex-shrink-0"
              />
              <span>Can I download individual images or videos?</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Yes. Each card on CivitAI gets a{" "}
              <span className="font-medium text-blue-600 dark:text-blue-400">
                Download
              </span>{" "}
              button in the bottom-left corner. Use that for one-off downloads
              while browsing the feed or a creator page.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-2">
          <AccordionTrigger className="text-xs font-medium text-gray-800 dark:text-gray-200 hover:no-underline">
            <div className="flex items-center space-x-2">
              <Icon
                icon="lucide:play"
                className="w-4 h-4 text-orange-500 flex-shrink-0"
              />
              <span>How does mass download work?</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Click{" "}
              <span className="font-medium text-gray-800 dark:text-gray-200">
                Start Mass Download
              </span>{" "}
              in this sidebar. The extension scans visible cards, downloads new
              media, scrolls the feed to load more, and repeats until you stop
              it. Already-downloaded items are skipped automatically.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-3">
          <AccordionTrigger className="text-xs font-medium text-gray-800 dark:text-gray-200 hover:no-underline">
            <div className="flex items-center space-x-2">
              <Icon
                icon="lucide:settings"
                className="w-4 h-4 text-blue-500 flex-shrink-0"
              />
              <span>How do I customize folder and filename patterns?</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Use the settings above to set your download folder and filename
              pattern. Both support{" "}
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {"{creator}"}
              </span>
              ,{" "}
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {"{timestamp}"}
              </span>
              , and{" "}
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {"{id}"}
              </span>
              . For example,{" "}
              <span className="font-mono text-[11px]">
                CivitAI Downloads/{"{creator}"}
              </span>{" "}
              saves files into a subfolder per creator. Changes are saved
              automatically.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-4">
          <AccordionTrigger className="text-xs font-medium text-gray-800 dark:text-gray-200 hover:no-underline">
            <div className="flex items-center space-x-2">
              <Icon
                icon="lucide:folder"
                className="w-4 h-4 text-green-500 flex-shrink-0"
              />
              <span>Where are files downloaded?</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Files are saved to your browser&apos;s default Downloads folder,
                organized by the folder pattern you set above.
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  Tip:
                </span>{" "}
                Browsers usually keep saves under your default Downloads folder.
                For another drive or NAS, point Downloads at that location in
                your browser or OS, or put a symlink inside Downloads that
                targets the folder you want.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-5">
          <AccordionTrigger className="text-xs font-medium text-gray-800 dark:text-gray-200 hover:no-underline">
            <div className="flex items-center space-x-2">
              <Icon
                icon="lucide:check"
                className="w-4 h-4 text-emerald-500 flex-shrink-0"
              />
              <span>What does the green corner badge mean?</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              A green check in the top-right corner means that item is already in
              your download history. Mass download skips those cards. Use{" "}
              <span className="font-medium text-gray-800 dark:text-gray-200">
                Clear download history
              </span>{" "}
              below if you want to download them again.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
