(function () {
  const STORAGE_KEY = "projectChatIndex";
  const API = globalThis.browser ?? globalThis.chrome;
  const countNode = document.getElementById("chat-count");
  const clearButton = document.getElementById("clear-cache");
  const saveButton = document.getElementById("save-mappings");
  const reloadButton = document.getElementById("reload-mappings");
  const editorNode = document.getElementById("mapping-editor");
  const statusNode = document.getElementById("status");

  if (!API?.storage?.local) {
    countNode.textContent = "0";
    clearButton.disabled = true;
    saveButton.disabled = true;
    reloadButton.disabled = true;
    editorNode.disabled = true;
    statusNode.textContent = "Extension storage is unavailable in this browser.";
    return;
  }

  init().catch((error) => {
    statusNode.textContent = error.message;
  });

  async function init() {
    await refreshView();
    clearButton.addEventListener("click", clearCache);
    saveButton.addEventListener("click", saveMappings);
    reloadButton.addEventListener("click", reloadMappings);
    API.storage.onChanged?.addListener((changes, areaName) => {
      if (areaName === "local" && changes[STORAGE_KEY]) {
        void refreshView();
      }
    });
  }

  async function clearCache() {
    setBusy(true);
    statusNode.textContent = "Clearing learned markers…";
    await storageSet({
      [STORAGE_KEY]: {}
    });
    await refreshView();
    statusNode.textContent = "Learned markers cleared.";
    setBusy(false);
  }

  async function saveMappings() {
    setBusy(true);

    try {
      const parsed = JSON.parse(editorNode.value);
      const normalized = validateEditableIndex(parsed);
      await storageSet({
        [STORAGE_KEY]: normalized
      });
      await refreshView();
      statusNode.textContent = "Mappings saved.";
    } catch (error) {
      statusNode.textContent = `Could not save mappings: ${error.message}`;
    } finally {
      setBusy(false);
    }
  }

  async function reloadMappings() {
    setBusy(true);
    statusNode.textContent = "Reloading mappings…";
    await refreshView();
    statusNode.textContent = "Mappings reloaded.";
    setBusy(false);
  }

  async function refreshView() {
    const result = await storageGet(STORAGE_KEY);
    const normalized = sanitizeStoredIndex(result[STORAGE_KEY]);
    const count = Object.keys(normalized).length;
    countNode.textContent = String(count);
    editorNode.value = JSON.stringify(normalized, null, 2);
  }

  function setBusy(isBusy) {
    clearButton.disabled = isBusy;
    saveButton.disabled = isBusy;
    reloadButton.disabled = isBusy;
    editorNode.disabled = isBusy;
  }

  function sanitizeStoredIndex(rawValue) {
    if (!rawValue || typeof rawValue !== "object" || Array.isArray(rawValue)) {
      return {};
    }

    const normalized = {};
    for (const [chatId, details] of Object.entries(rawValue)) {
      if (!details || typeof details !== "object" || Array.isArray(details)) {
        continue;
      }

      if (typeof details.projectId !== "string" || !details.projectId.trim()) {
        continue;
      }

      normalized[chatId] = {
        projectId: details.projectId.trim(),
        source: typeof details.source === "string" && details.source.trim() ? details.source.trim() : "manual",
        updatedAt:
          typeof details.updatedAt === "string" && details.updatedAt.trim()
            ? details.updatedAt.trim()
            : new Date().toISOString()
      };
    }

    return normalized;
  }

  function validateEditableIndex(rawValue) {
    if (!rawValue || typeof rawValue !== "object" || Array.isArray(rawValue)) {
      throw new Error("Mappings must be a JSON object keyed by chat ID.");
    }

    const normalized = {};
    for (const [chatId, details] of Object.entries(rawValue)) {
      if (!details || typeof details !== "object" || Array.isArray(details)) {
        throw new Error(`Entry for ${chatId} must be an object.`);
      }

      if (typeof details.projectId !== "string" || !details.projectId.trim()) {
        throw new Error(`Entry for ${chatId} must include a non-empty projectId string.`);
      }

      normalized[chatId] = {
        projectId: details.projectId.trim(),
        source: typeof details.source === "string" && details.source.trim() ? details.source.trim() : "manual",
        updatedAt:
          typeof details.updatedAt === "string" && details.updatedAt.trim()
            ? details.updatedAt.trim()
            : new Date().toISOString()
      };
    }

    return normalized;
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
