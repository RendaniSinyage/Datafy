(function (root, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    factory(exports);
  } else {
    factory((root.Detector = root.Detector || {}));
  }
}(typeof self !== 'undefined' ? self : this, function (exports) {
  'use strict';

  const DEFAULT_THRESHOLD = 5;

  const SCORING_RULES = [
    { pattern: /funding\s+opportunity/i, score: 5, label: 'funding opportunity' },
    { pattern: /grant\s+opportunity/i, score: 5, label: 'grant opportunity' },
    { pattern: /applications?\s+open/i, score: 5, label: 'applications open' },
    { pattern: /call\s+for\s+applications?/i, score: 5, label: 'call for applications' },
    { pattern: /open\s+call/i, score: 5, label: 'open call' },
    { pattern: /apply\s+now/i, score: 4, label: 'apply now' },
    { pattern: /accelerator\s+accepting\s+applications?/i, score: 4, label: 'accelerator accepting applications' },
    { pattern: /apply\s+for\s+(funding|grant|program|programme|accelerator)/i, score: 4, label: 'apply for opportunity' },
    { pattern: /seed\s+funding/i, score: 3, label: 'seed funding' },
    { pattern: /non[- ]dilutive/i, score: 3, label: 'non-dilutive' },
    { pattern: /investment\s+opportunity/i, score: 3, label: 'investment opportunity' },
    { pattern: /equity[- ]free/i, score: 3, label: 'equity-free' },
    { pattern: /business\s+support/i, score: 2, label: 'business support' },
    { pattern: /financial\s+support/i, score: 2, label: 'financial support' },
    { pattern: /pitch\s+competition/i, score: 3, label: 'pitch competition' },
    { pattern: /venture\s+capital/i, score: 3, label: 'venture capital' },
    { pattern: /angel\s+invest/i, score: 3, label: 'angel investment' },

    { pattern: /\bgrants?\b/i, score: 3, label: 'grant' },
    { pattern: /\baccelerators?\b/i, score: 3, label: 'accelerator' },
    { pattern: /\bincubators?\b/i, score: 3, label: 'incubator' },
    { pattern: /\bVCs?\b/i, score: 2, label: 'VC' },
    { pattern: /\bfunded\b/i, score: 2, label: 'funded' },
    { pattern: /\binvestment\b/i, score: 2, label: 'investment' },
    { pattern: /\binvestors?\b/i, score: 2, label: 'investor' },
    { pattern: /\bpitch\b/i, score: 2, label: 'pitch' },
    { pattern: /\bapplications?\b/i, score: 2, label: 'application' },
    { pattern: /\bprogrammes?\b/i, score: 2, label: 'programme' },
    { pattern: /\bprograms?\b/i, score: 2, label: 'program' },
    { pattern: /\bcompetitions?\b/i, score: 2, label: 'competition' },
    { pattern: /\bprizes?\b/i, score: 2, label: 'prize' },
    { pattern: /\bawards?\b/i, score: 2, label: 'award' },
    { pattern: /\bfunding\b/i, score: 2, label: 'funding' },
    { pattern: /\bstartups?\b/i, score: 1, label: 'startup' },
    { pattern: /\bentrepreneurs?\b/i, score: 1, label: 'entrepreneur' }
  ];

  const AMOUNT_REGEX = /(\$|€|£|R|USD|EUR|GBP|ZAR|AUD|CAD)\s*\d+([.,]\d+)*\s*(k|m|billion|million|thousand)?/i;
  const DEADLINE_REGEX = /(deadline|due\s+date|apply\s+by|closing\s+date|applications\s+close)\s*:?\s*([0-9]{1,2}\s+[A-Za-z]+|[A-Za-z]+\s+[0-9]{1,2}|[0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/i;
  const APPLICATION_LINK_REGEX = /(https?:\/\/[^\s]+|typeform|bit\.ly|forms\.gle|apply\s+here|link\s+in\s+bio)/i;

  function scoreOpportunity(postText) {
    if (!postText || typeof postText !== 'string') {
      return { score: 0, matches: [] };
    }

    let score = 0;
    const matches = [];

    for (const rule of SCORING_RULES) {
      if (rule.pattern.test(postText)) {
        score += rule.score;
        matches.push(rule.label);
      }
    }

    if (AMOUNT_REGEX.test(postText)) {
      score += 4;
      matches.push('funding amount mentioned');
    }

    if (DEADLINE_REGEX.test(postText)) {
      score += 3;
      matches.push('deadline mentioned');
    }

    if (APPLICATION_LINK_REGEX.test(postText)) {
      score += 1;
      matches.push('application link');
    }

    return { score, matches };
  }

  function detectOpportunity(postText, threshold = DEFAULT_THRESHOLD) {
    const { score, matches } = scoreOpportunity(postText);
    return {
      isOpportunity: score >= threshold,
      score,
      matches,
      threshold
    };
  }

  exports.DEFAULT_THRESHOLD = DEFAULT_THRESHOLD;
  exports.scoreOpportunity = scoreOpportunity;
  exports.detectOpportunity = detectOpportunity;
}));
