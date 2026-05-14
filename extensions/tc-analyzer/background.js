// Minimal service worker for Manifest V3
// Handles extension lifecycle and message relay

const DEFAULT_API = "http://localhost:4000";

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["apiUrl"], (data) => {
    if (!data.apiUrl) {
      chrome.storage.local.set({ apiUrl: DEFAULT_API });
    }
  });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "getApiUrl") {
    chrome.storage.local.get("apiUrl", (data) => {
      sendResponse({ apiUrl: data.apiUrl || DEFAULT_API });
    });
    return true;
  }
  if (msg.action === "setApiUrl") {
    chrome.storage.local.set({ apiUrl: msg.apiUrl }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});
