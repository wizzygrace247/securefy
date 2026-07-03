/// <reference types="chrome" />

let lastUrl = '';

function notifyBackground(url: string) {
  chrome.runtime.sendMessage({ type: 'SCAN_URL', url });
}

// Initial load
notifyBackground(window.location.href);

// SPA navigation detection
const observer = new MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    notifyBackground(lastUrl);
  }
});

observer.observe(document.body, { childList: true, subtree: true });