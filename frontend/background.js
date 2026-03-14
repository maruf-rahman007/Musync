// Service worker for background tasks (e.g., periodic checks if needed)
// Currently minimal; expand for scalability (e.g., token refresh if backend needs)

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});

// Listen for messages if needed (e.g., from content to background)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Example: if content needs background to handle something
});