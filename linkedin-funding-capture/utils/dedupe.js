(function (root, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    factory(exports);
  } else {
    factory((root.Dedupe = root.Dedupe || {}));
  }
}(typeof self !== 'undefined' ? self : this, function (exports) {
  'use strict';

  function normalizeUrl(url) {
    if (!url || typeof url !== 'string') return '';
    try {
      const parsed = new URL(url, 'https://www.linkedin.com');
      const match = parsed.pathname.match(/urn:li:activity:(\d+)/i) || parsed.pathname.match(/activity-(\d+)/i);
      if (match) {
        return 'urn:li:activity:' + match[1];
      }
      return parsed.origin + parsed.pathname.replace(/\/$/, '');
    } catch (e) {
      return url.trim().toLowerCase();
    }
  }

  function generateFingerprint(author, postText) {
    const cleanAuthor = (author || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const cleanText = (postText || '').trim().toLowerCase().replace(/\s+/g, ' ').substring(0, 200);
    return 'fp:' + cleanAuthor + '::' + cleanText;
  }

  function getPostIdentifier(postUrl, author, postText) {
    const normUrl = normalizeUrl(postUrl);
    if (normUrl && normUrl !== 'https://www.linkedin.com' && normUrl !== 'https://www.linkedin.com/feed') {
      return normUrl;
    }
    return generateFingerprint(author, postText);
  }

  function isAlreadyCaptured(postUrl, author, postText, capturedKeys) {
    if (!capturedKeys) return false;
    const key = getPostIdentifier(postUrl, author, postText);
    if (capturedKeys instanceof Set) {
      return capturedKeys.has(key);
    } else if (Array.isArray(capturedKeys)) {
      return capturedKeys.includes(key);
    } else if (typeof capturedKeys === 'object') {
      return Boolean(capturedKeys[key]);
    }
    return false;
  }

  exports.normalizeUrl = normalizeUrl;
  exports.generateFingerprint = generateFingerprint;
  exports.getPostIdentifier = getPostIdentifier;
  exports.isAlreadyCaptured = isAlreadyCaptured;
}));
