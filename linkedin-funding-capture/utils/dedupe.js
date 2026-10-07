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
      if (parsed.hostname.includes('linkedin.com')) {
        return parsed.origin + parsed.pathname.replace(/\/$/, '');
      }
      // Return normalized external URL
      return parsed.origin + parsed.pathname.replace(/\/$/, '') + parsed.search;
    } catch (e) {
      return url.trim().toLowerCase();
    }
  }

  function generateFingerprint(author, postText) {
    const cleanAuthor = (author || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const cleanText = (postText || '').trim().toLowerCase().replace(/\s+/g, ' ').substring(0, 200);
    return 'fp:' + cleanAuthor + '::' + cleanText;
  }

  function generateOppFingerprint(organization, opportunityType, amount) {
    const cleanOrg = (organization || '').trim().toLowerCase().replace(/\s+/g, '');
    const cleanType = (opportunityType || 'other').trim().toLowerCase();
    const cleanAmt = (amount || '').trim().toLowerCase().replace(/\s+/g, '');

    if (!cleanOrg && !cleanAmt) return '';
    return 'oppfp:' + cleanOrg + '::' + cleanType + '::' + cleanAmt;
  }

  function getPostIdentifier(postUrl, author, postText) {
    const normUrl = normalizeUrl(postUrl);
    if (normUrl && normUrl !== 'https://www.linkedin.com' && normUrl !== 'https://www.linkedin.com/feed') {
      return normUrl;
    }
    return generateFingerprint(author, postText);
  }

  function getAllDedupeKeys(opp) {
    if (!opp || typeof opp !== 'object') return [];

    const keys = new Set();

    // 1. Post URL / Activity URN
    const postKey = getPostIdentifier(opp.postUrl || '', opp.author || '', opp.postText || opp.rawText || '');
    if (postKey) keys.add(postKey);

    // 2. Author + text fingerprint
    if (opp.author || opp.postText) {
      const authorFp = generateFingerprint(opp.author, opp.postText || opp.rawText);
      if (authorFp) keys.add(authorFp);
    }

    // 3. Application URL (Cross-user duplicate detector)
    if (opp.applicationUrl && opp.applicationUrl.length > 8) {
      const appNorm = normalizeUrl(opp.applicationUrl);
      if (appNorm && !appNorm.includes('linkedin.com')) {
        keys.add('appurl:' + appNorm.toLowerCase());
      }
    }

    // 4. Structured Organization + Type + Amount fingerprint
    const oppFp = generateOppFingerprint(opp.organization, opp.opportunityType, opp.amount);
    if (oppFp) {
      keys.add(oppFp);
    }

    return Array.from(keys);
  }

  function isAlreadyCaptured(oppRecord, capturedKeys) {
    if (!capturedKeys || !oppRecord) return false;

    let candidateKeys = [];
    if (typeof oppRecord === 'string') {
      candidateKeys = [oppRecord];
    } else {
      candidateKeys = getAllDedupeKeys(oppRecord);
    }

    for (const key of candidateKeys) {
      if (!key) continue;
      if (capturedKeys instanceof Set) {
        if (capturedKeys.has(key)) return true;
      } else if (Array.isArray(capturedKeys)) {
        if (capturedKeys.includes(key)) return true;
      } else if (typeof capturedKeys === 'object') {
        if (Boolean(capturedKeys[key])) return true;
      }
    }

    return false;
  }

  exports.normalizeUrl = normalizeUrl;
  exports.generateFingerprint = generateFingerprint;
  exports.generateOppFingerprint = generateOppFingerprint;
  exports.getPostIdentifier = getPostIdentifier;
  exports.getAllDedupeKeys = getAllDedupeKeys;
  exports.isAlreadyCaptured = isAlreadyCaptured;
}));
