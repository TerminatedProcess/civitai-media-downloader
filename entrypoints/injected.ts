/**
 * Unlisted script — injected into the page's main world by the content script
 * via injectScript(). Patches window.fetch to intercept image.getInfinite
 * responses and postMessages the items back to the isolated content script.
 *
 * No extension APIs available here — main world only.
 */
export default defineUnlistedScript(() => {
  const origFetch = window.fetch.bind(window);

  window.fetch = async (...args) => {
    const res = await origFetch(...args);
    try {
      const url =
        typeof args[0] === "string" ? args[0] : (args[0] as Request).url;
      console.log("Fetch intercepted:", args[0]);
      if (url?.includes("image.getInfinite")) {
        res
          .clone()
          .json()
          .then((data: unknown) => {
            const items = (data as any)?.result?.data?.json?.items;
            if (Array.isArray(items))
              window.postMessage({ type: "__civitai_dl_items__", items }, "*");
          })
          .catch(() => {});
      }
    } catch {}
    return res;
  };
});
