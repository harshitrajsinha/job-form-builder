console.log("Background: Script loaded");

// Configure side panel to open when clicking the extension action
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "injectContentScript") {
    chrome.scripting
      .executeScript({
        target: { tabId: request.tabId },
        files: ["content.js"],
      })
      .then(() => {
        console.log("Background: Content script injected successfully");
        sendResponse({ status: "success" });
      })
      .catch((error) => {
        console.error("Background: Error injecting content script:", error);
        sendResponse({ status: "error", message: error.message });
      });
    return true; // Keep the message channel open for sendResponse
  }


});
