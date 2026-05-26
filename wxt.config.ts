import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";
import { CIVITAI_B2_HOST } from "./utils/constants";

export default defineConfig({
  modules: ["@wxt-dev/module-react", "@wxt-dev/auto-icons"],
  manifest: ({ browser }) => ({
    name: "CivitAI Media Downloader",
    description: "Bulk-download images and videos from CivitAI",
    permissions: [
      "webRequest",
      "webRequestBlocking",
      "downloads",
      "activeTab",
      "storage",
      "tabs",
    ],
    host_permissions: ["*://*.civitai.com/*", "*://*.civitai.red/*"],
    // Enable icon click without popup
    action: {},
    browser_action: {},
    web_accessible_resources: [
      {
        resources: ["injected.js"],
        matches: ["*://*/*"],
      },
    ],
  }),
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
