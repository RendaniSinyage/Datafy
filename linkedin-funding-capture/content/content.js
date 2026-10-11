(function () {
  'use strict';

  let capturedKeysSet = new Set();
  let currentSettings = { threshold: 5, autoCapture: true };
  let isProcessing = false;
  let processTimeout = null;

  async function init() {
    if (typeof StorageManager !== 'undefined') {
      try {
        const [keys, settings] = await Promise.all([
          StorageManager.getCapturedKeys(),
          StorageManager.getSettings()
        ]);
        capturedKeysSet = new Set(keys || []);
        currentSettings = settings || currentSettings;
      } catch (err) {
        console.warn('LFC: Storage initialization error:', err);
      }
    }

    startObserver();
    scheduleScan();
  }

  function startObserver() {
    const observer = new MutationObserver((mutations) => {
      let shouldScan = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes && mutation.addedNodes.length > 0) {
          shouldScan = true;
          break;
        }
      }
      if (shouldScan) {
        scheduleScan();
      }
    });

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function scheduleScan() {
    if (processTimeout) clearTimeout(processTimeout);
    processTimeout = setTimeout(() => {
      scanPosts();
    }, 250);
  }

  function findPostElements() {
    if (typeof Extractor === 'undefined' || !Extractor.SELECTORS) {
      return Array.from(document.querySelectorAll('article, .feed-shared-update-v2, div[data-urn*="activity"]'));
    }

    const elements = new Set();
    for (const selector of Extractor.SELECTORS.post) {
      const found = document.querySelectorAll(selector);
      found.forEach(el => elements.add(el));
    }
    return Array.from(elements);
  }

  async function scanPosts() {
    if (isProcessing) return;
    if (!currentSettings.autoCapture) return;

    isProcessing = true;

    try {
      const posts = findPostElements();

      for (const postEl of posts) {
        if (postEl.dataset.lfcProcessed === 'true') continue;

        postEl.dataset.lfcProcessed = 'true';

        const postText = Extractor.extractPostText(postEl);
        if (!postText || postText.length < 20) continue;

        const author = Extractor.extractAuthor(postEl);
        const authorProfileUrl = Extractor.extractAuthorProfile(postEl);
        const postUrl = Extractor.extractPostUrl(postEl);
        const applicationUrl = Extractor.extractApplicationUrl(postText, postEl);

        const candidateOpp = {
          postUrl,
          author,
          postText,
          applicationUrl
        };

        // Check deduplication (including cross-user duplicates)
        if (Dedupe.isAlreadyCaptured(candidateOpp, capturedKeysSet)) {
          injectBadge(postEl, 'saved', '✓ Saved as funding opportunity');
          continue;
        }

        // Check relevance
        const detection = Detector.detectOpportunity(postText, currentSettings.threshold);
        if (detection.isOpportunity) {
          await captureOpportunity(postEl, postText, author, authorProfileUrl, postUrl, candidateOpp, detection);
        }
      }
    } catch (err) {
      console.error('LFC: Error scanning posts:', err);
    } finally {
      isProcessing = false;
    }
  }

  async function captureOpportunity(postEl, postText, author, authorProfileUrl, postUrl, candidateOpp, detection) {
    const details = Extractor.extractOpportunityDetails(postText, author, authorProfileUrl, postUrl);

    let screenshotUrl = '';
    try {
      const rect = postEl.getBoundingClientRect();
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'capturePostScreenshot',
          rect: {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
            dpr: window.devicePixelRatio || 1
          }
        }, (res) => resolve(res));
      });

      if (response && response.success) {
        screenshotUrl = response.dataUrl;
      }
    } catch (err) {
      console.warn('LFC: Screenshot capture warning:', err);
    }

    const opportunityRecord = {
      id: 'opp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 7),
      capturedAt: new Date().toISOString(),
      author: author || 'Unknown Author',
      authorProfileUrl: authorProfileUrl || '',
      postText: postText,
      postUrl: postUrl || '',
      source: 'linkedin',
      type: 'funding',
      title: details.title,
      organization: details.organization,
      opportunityType: details.opportunityType,
      amount: details.amount,
      currency: details.currency,
      deadline: details.deadline,
      eligibility: details.eligibility,
      geography: details.geography,
      industry: details.industry,
      applicationUrl: details.applicationUrl || candidateOpp.applicationUrl || '',
      notes: '',
      rawText: details.rawText,
      relevanceScore: detection.score,
      matches: detection.matches,
      screenshot: screenshotUrl
    };

    const dedupeKeys = Dedupe.getAllDedupeKeys(opportunityRecord);
    dedupeKeys.forEach(k => capturedKeysSet.add(k));

    if (typeof StorageManager !== 'undefined') {
      await StorageManager.saveOpportunity(opportunityRecord, dedupeKeys);
    }

    injectBadge(postEl, 'captured', `✓ Funding opportunity captured`, detection.score);
  }

  function injectBadge(postEl, type, label, score) {
    if (postEl.querySelector('.lfc-badge')) return;

    const badge = document.createElement('div');
    badge.className = `lfc-badge lfc-badge-${type}`;

    const iconSpan = document.createElement('span');
    iconSpan.className = 'lfc-badge-icon';
    iconSpan.textContent = type === 'captured' ? '💾' : '✓';

    const textSpan = document.createElement('span');
    textSpan.textContent = label;

    badge.appendChild(iconSpan);
    badge.appendChild(textSpan);

    if (score !== undefined) {
      const scoreSpan = document.createElement('span');
      scoreSpan.className = 'lfc-badge-score';
      scoreSpan.textContent = `Score: ${score}`;
      badge.appendChild(scoreSpan);
    }

    const header = postEl.querySelector('.feed-shared-actor, .update-components-actor') || postEl.firstChild;
    if (header && header.parentNode) {
      header.parentNode.insertBefore(badge, header.nextSibling);
    } else {
      postEl.insertBefore(badge, postEl.firstChild);
    }
  }

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local') {
        if (changes.capture_settings) {
          currentSettings = { ...currentSettings, ...(changes.capture_settings.newValue || {}) };
        }
        if (changes.captured_keys) {
          capturedKeysSet = new Set(changes.captured_keys.newValue || []);
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
