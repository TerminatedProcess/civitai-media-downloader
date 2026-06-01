import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";
import { CIVITAI_B2_HOST } from "./utils/constants";

export default defineConfig({
  modules: ["@wxt-dev/module-react", "@wxt-dev/auto-icons"],
  manifest: ({ browser }) => ({
    name: "CivitAI Media Downloader",
    description: "Bulk-download images and videos from CivitAI",
    permissions: [
      ...(browser === "firefox"
        ? (["webRequest", "webRequestBlocking"] as const)
        : ([] as const)),
      "downloads",
      "activeTab",
      "storage",
      "tabs",
    ],
    host_permissions: ["*://*.civitai.com/*", "*://*.civitai.red/*"],
    homepage_url: "https://github.com/sebastianwd/civitai-media-downloader",
    ...(browser === "firefox"
      ? {
          browser_specific_settings: {
            gecko: {
              // Explicit Gecko ID avoids Firefox reporting a signed XPI as corrupt when
              // Guid from AMO API: https://addons.mozilla.org/api/v5/addons/addon/civitai-media-downloader/
              id: "{5f5cbecf-a02c-4504-ac24-27138ca812db}",
              // "none" = this extension collects no user data (AMO requirement).
              data_collection_permissions: {
                required: ["none"],
                optional: [],
              },
            },
          },
        }
      : {}),
    action: { default_title: "CivitAI Media Downloader" },
    browser_action: { default_title: "CivitAI Media Downloader" },
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
  webExt: {
    binaries: {
      chrome:
        ".wxt/browsers/chrome/win64-149.0.7827.22/chrome-win64/chrome.exe",
    },
  },
});
