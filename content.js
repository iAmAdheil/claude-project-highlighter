(function () {
  const STORAGE_KEY = "projectChatIndex";
  const ROOT_CLASS = "claude-project-highlight";
  const PROJECT_PATH_RE = /^\/project\/([a-z0-9-]{8,})(?:\/|$)/i;
  const CHAT_PATH_RE = /^\/chat\/([a-z0-9-]{8,})(?:\/|$)/i;
  const API = globalThis.browser ?? globalThis.chrome;

  if (!API?.storage?.local) {
    return;
  }

  let cachedIndex = {};
  let cacheReady = false;
  let persistTimer = null;
  let scanTimer = null;
  let observer = null;
  let lastUrl = location.href;

  init().catch((error) => {
    console.error("Claude Project Highlighter failed to initialize.", error);
  });

  async function init() {
    await loadIndex();
    installNavigationHooks();
    installStorageListener();
    installObserver();
    queueScan();
  }

  function installNavigationHooks() {
    const wrapHistoryMethod = (methodName) => {
      const original = history[methodName];
      if (typeof original !== "function") {
        return;
      }

      history[methodName] = function patchedHistoryMethod(...args) {
        const result = original.apply(this, args);
        handlePossibleNavigation();
        return result;
      };
    };

    wrapHistoryMethod("pushState");
    wrapHistoryMethod("replaceState");
    addEventListener("popstate", handlePossibleNavigation, true);
    addEventListener("hashchange", handlePossibleNavigation, true);
  }

  function installStorageListener() {
    if (!API.storage.onChanged?.addListener) {
      return;
    }

    API.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local" || !changes[STORAGE_KEY]) {
        return;
      }

      cachedIndex = normalizeIndex(changes[STORAGE_KEY].newValue);
      applyHighlights();
    });
  }

  function installObserver() {
    if (!document.body) {
      requestAnimationFrame(installObserver);
      return;
    }

    observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList" || mutation.type === "attributes") {
          queueScan();
          break;
        }
      }
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["href", "class", "aria-current"]
    });
  }

  function handlePossibleNavigation() {
    if (location.href === lastUrl) {
      return;
    }

    lastUrl = location.href;
    queueScan(120);
  }

  function queueScan(delay = 60) {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(() => {
      scanAndDecorate().catch((error) => {
        console.error("Claude Project Highlighter scan failed.", error);
      });
    }, delay);
  }

  async function scanAndDecorate() {
    await ensureCache();

    let didChange = false;
    const currentChatId = getChatIdFromHref(location.href);
    const currentProjectId = findCurrentProjectId();

    if (currentChatId && currentProjectId) {
      didChange = upsertChatProject(currentChatId, currentProjectId, "active-chat") || didChange;
    }

    const projectIdFromPath = getProjectIdFromHref(location.href);
    if (projectIdFromPath) {
      for (const chatId of getProjectPageChatIds()) {
        didChange = upsertChatProject(chatId, projectIdFromPath, "project-page") || didChange;
      }
    }

    if (didChange) {
      schedulePersist();
    }

    applyHighlights();
  }

  function getProjectPageChatIds() {
    const mainRoot = document.querySelector("main, [role='main']");
    if (!mainRoot) {
      return [];
    }

    const chatIds = new Set();
    const anchors = mainRoot.querySelectorAll("a[href]");
    for (const anchor of anchors) {
      const chatId = getChatIdFromHref(anchor.href);
      if (chatId) {
        chatIds.add(chatId);
      }
    }

    return [...chatIds];
  }

  function findCurrentProjectId() {
    const projectIdFromPath = getProjectIdFromHref(location.href);
    if (projectIdFromPath) {
      return projectIdFromPath;
    }

    const projectLinks = [...document.querySelectorAll("a[href]")]
      .map((anchor) => ({
        anchor,
        projectId: getProjectIdFromHref(anchor.href)
      }))
      .filter(({ anchor, projectId }) => projectId && isVisible(anchor))
      .map(({ anchor, projectId }) => ({
        anchor,
        projectId,
        score: scoreProjectAnchor(anchor)
      }))
      .filter(({ score }) => score > 0)
      .sort((left, right) => right.score - left.score);

    if (!projectLinks.length) {
      return null;
    }

    const [best] = projectLinks;
    const competingIds = new Set(
      projectLinks.filter((entry) => entry.score === best.score).map((entry) => entry.projectId)
    );

    return competingIds.size === 1 ? best.projectId : null;
  }

  function scoreProjectAnchor(anchor) {
    const text = anchor.textContent?.trim() ?? "";
    const rect = anchor.getBoundingClientRect();
    let score = 0;

    if (!text || /^projects?$/i.test(text)) {
      return 0;
    }

    if (anchor.closest("header, [role='banner']")) {
      score += 5;
    }

    if (anchor.closest("main, [role='main']")) {
      score += 3;
    }

    if (!anchor.closest("aside, nav, [role='navigation']")) {
      score += 2;
    }

    if (rect.top >= 0 && rect.top < window.innerHeight * 0.45) {
      score += 2;
    }

    if (text.length > 2) {
      score += 1;
    }

    return score;
  }

  function applyHighlights() {
    clearHighlights();

    const chatAnchors = document.querySelectorAll("a[href]");
    for (const anchor of chatAnchors) {
      const chatId = getChatIdFromHref(anchor.href);
      if (!chatId || !cachedIndex[chatId]) {
        continue;
      }

      const target = getHighlightTarget(anchor);
      target.classList.add(ROOT_CLASS);
      target.dataset.claudeProjectId = cachedIndex[chatId].projectId;
      target.dataset.claudeProjectOriginalTitle = target.getAttribute("title") ?? "";
      target.title = buildTitle(cachedIndex[chatId].projectId);
    }
  }

  function clearHighlights() {
    const highlighted = document.querySelectorAll(`.${ROOT_CLASS}`);
    for (const element of highlighted) {
      element.classList.remove(ROOT_CLASS);
      delete element.dataset.claudeProjectId;
      if (element.dataset.claudeProjectOriginalTitle !== undefined) {
        const originalTitle = element.dataset.claudeProjectOriginalTitle;
        if (originalTitle) {
          element.setAttribute("title", originalTitle);
        } else {
          element.removeAttribute("title");
        }
      }
      delete element.dataset.claudeProjectOriginalTitle;
    }
  }

  function getHighlightTarget(anchor) {
    return (
      anchor.closest(
        [
          "[role='listitem']",
          "li",
          "[data-testid*='conversation']",
          "[data-testid*='chat']",
          "[class*='conversation']",
          "[class*='chat-item']"
        ].join(", ")
      ) ?? anchor
    );
  }

  function buildTitle(projectId) {
    return `Part of Claude project ${projectId}`;
  }

  function upsertChatProject(chatId, projectId, source) {
    const existing = cachedIndex[chatId];
    if (existing?.projectId === projectId) {
      return false;
    }

    cachedIndex[chatId] = {
      projectId,
      source,
      updatedAt: new Date().toISOString()
    };
    return true;
  }

  function getProjectIdFromHref(href) {
    const url = toUrl(href);
    if (!url) {
      return null;
    }

    return url.pathname.match(PROJECT_PATH_RE)?.[1] ?? null;
  }

  function getChatIdFromHref(href) {
    const url = toUrl(href);
    if (!url) {
      return null;
    }

    return url.pathname.match(CHAT_PATH_RE)?.[1] ?? null;
  }

  function toUrl(href) {
    try {
      return new URL(href, location.origin);
    } catch {
      return null;
    }
  }

  function isVisible(element) {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.visibility !== "hidden" &&
      style.display !== "none"
    );
  }

  async function ensureCache() {
    if (!cacheReady) {
      await loadIndex();
    }
  }

  async function loadIndex() {
    const result = await storageGet(STORAGE_KEY);
    cachedIndex = normalizeIndex(result[STORAGE_KEY]);
    cacheReady = true;
  }

  function normalizeIndex(rawValue) {
    if (!rawValue || typeof rawValue !== "object") {
      return {};
    }

    const normalized = {};
    for (const [chatId, details] of Object.entries(rawValue)) {
      if (!details || typeof details !== "object" || typeof details.projectId !== "string") {
        continue;
      }

      normalized[chatId] = {
        projectId: details.projectId,
        source: typeof details.source === "string" ? details.source : "unknown",
        updatedAt: typeof details.updatedAt === "string" ? details.updatedAt : ""
      };
    }

    return normalized;
  }

  function schedulePersist() {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(async () => {
      await storageSet({
        [STORAGE_KEY]: cachedIndex
      });
    }, 120);
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
