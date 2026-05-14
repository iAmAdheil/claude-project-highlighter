(function () {
  const STORAGE_KEY = "projectChatIndex";
  const API = globalThis.browser ?? globalThis.chrome;
  const countNode = document.getElementById("chat-count");
  const clearButton = document.getElementById("clear-cache");
  const statusNode = document.getElementById("status");

  if (!API?.storage?.local) {
    countNode.textContent = "0";
    clearButton.disabled = true;
    statusNode.textContent = "Extension storage is unavailable in this browser.";
    return;
  }

  init().catch((error) => {
    statusNode.textContent = error.message;
  });

  async function init() {
    await refreshCount();
    clearButton.addEventListener("click", clearCache);
    API.storage.onChanged?.addListener((changes, areaName) => {
      if (areaName === "local" && changes[STORAGE_KEY]) {
        void refreshCount();
      }
    });
  }

  async function clearCache() {
    clearButton.disabled = true;
    statusNode.textContent = "Clearing learned markers…";
    await storageSet({
      [STORAGE_KEY]: {}
    });
    await refreshCount();
    statusNode.textContent = "Learned markers cleared.";
    clearButton.disabled = false;
  }

  async function refreshCount() {
    const result = await storageGet(STORAGE_KEY);
    const count = Object.keys(result[STORAGE_KEY] ?? {}).length;
    countNode.textContent = String(count);
    if (!statusNode.textContent) {
      statusNode.textContent = "";
    }
  }

  function storageGet(key) {
    return new Promise((resolve, reject) => {
      try {
        const maybePromise = API.storage.local.get(key, (result) => {
          const lastError = API.runtime?.lastError;
          if (lastError) {
            reject(new Error(lastError.message));
            return;
          }

          resolve(result);
        });

        if (maybePromise && typeof maybePromise.then === "function") {
          maybePromise.then(resolve, reject);
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  function storageSet(value) {
    return new Promise((resolve, reject) => {
      try {
        const maybePromise = API.storage.local.set(value, () => {
          const lastError = API.runtime?.lastError;
          if (lastError) {
            reject(new Error(lastError.message));
            return;
          }

          resolve();
        });

        if (maybePromise && typeof maybePromise.then === "function") {
          maybePromise.then(resolve, reject);
        }
      } catch (error) {
        reject(error);
      }
    });
  }
})();
