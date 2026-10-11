'use strict';

function updateBadgeCount(count) {
  if (typeof chrome === 'undefined' || !chrome.action) return;

  const text = count && count > 0 ? String(count) : '';
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color: '#0073b1' });
}

function refreshBadge() {
  if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) return;
  chrome.storage.local.get(['funding_opportunities'], (result) => {
    const opps = result.funding_opportunities || [];
    updateBadgeCount(opps.length);
  });
}

// Service worker lifecycle listeners
chrome.runtime.onInstalled.addListener(() => {
  refreshBadge();
});

chrome.runtime.onStartup.addListener(() => {
  refreshBadge();
});

// Storage changes listener
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.funding_opportunities) {
    const newOpps = changes.funding_opportunities.newValue || [];
    updateBadgeCount(newOpps.length);
  }
});

// Message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== 'object') return false;

  if (message.action === 'updateBadge') {
    updateBadgeCount(message.count);
    sendResponse({ success: true });
    return true;
  }

  if (message.action === 'capturePostScreenshot') {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, async (dataUrl) => {
      if (chrome.runtime.lastError || !dataUrl) {
        sendResponse({ success: false, error: chrome.runtime.lastError ? chrome.runtime.lastError.message : 'Failed to capture tab' });
        return;
      }

      const rect = message.rect;
      if (!rect || !rect.width || !rect.height || typeof OffscreenCanvas === 'undefined') {
        // Return full viewport screenshot if cropping unavailable
        sendResponse({ success: true, dataUrl });
        return;
      }

      try {
        const dpr = rect.dpr || 1;
        const cropX = Math.max(0, rect.left * dpr);
        const cropY = Math.max(0, rect.top * dpr);
        const cropWidth = Math.max(1, rect.width * dpr);
        const cropHeight = Math.max(1, rect.height * dpr);

        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const imageBitmap = await createImageBitmap(blob);

        const canvas = new OffscreenCanvas(cropWidth, cropHeight);
        const ctx = canvas.getContext('2d');

        ctx.drawImage(
          imageBitmap,
          cropX, cropY, cropWidth, cropHeight,
          0, 0, cropWidth, cropHeight
        );

        const croppedBlob = await canvas.convertToBlob({ type: 'image/png' });
        const reader = new FileReader();
        reader.onloadend = () => {
          sendResponse({ success: true, dataUrl: reader.result });
        };
        reader.onerror = () => {
          sendResponse({ success: true, dataUrl }); // Fallback to uncropped
        };
        reader.readAsDataURL(croppedBlob);
      } catch (err) {
        console.warn('Screenshot crop failed, returning full viewport:', err);
        sendResponse({ success: true, dataUrl });
      }
    });

    return true; // Keep message channel open for async response
  }
});
