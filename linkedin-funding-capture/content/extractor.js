(function (root, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    factory(exports);
  } else {
    factory((root.Extractor = root.Extractor || {}));
  }
}(typeof self !== 'undefined' ? self : this, function (exports) {
  'use strict';

  const SELECTORS = {
    post: [
      'article',
      '.feed-shared-update-v2',
      'div[data-urn*="activity"]',
      'div.occludable-update'
    ],
    text: [
      '.feed-shared-update-v2__description',
      '.feed-shared-inline-show-more-text',
      '.feed-shared-text-view',
      'span.break-words',
      '.update-components-text',
      'div.feed-shared-update-v2__text'
    ],
    seeMoreButtons: [
      'button.feed-shared-inline-show-more-text__see-more-less-toggle',
      'button[aria-label*="see more" i]',
      'button[aria-label*="show more" i]',
      'button.see-more',
      '.feed-shared-inline-show-more-text button'
    ],
    author: [
      '.feed-shared-actor__name',
      '.update-components-actor__name',
      'span.update-components-actor__title',
      '.feed-shared-actor__title',
      '.feed-shared-actor__name span[aria-hidden="true"]',
      '.update-components-actor__title span[aria-hidden="true"]'
    ],
    authorLink: [
      'a.feed-shared-actor__container-link',
      'a.update-components-actor__meta-link',
      'a.feed-shared-actor__image-link',
      'a.feed-shared-actor__title-link',
      '.feed-shared-actor__title a'
    ],
    postLink: [
      'a[href*="/feed/update/"]',
      'a[href*="urn:li:activity"]',
      'a.feed-shared-actor__sub-description-link',
      'a[href*="linkedin.com/posts/"]'
    ]
  };

  function expandCollapsedPost(article) {
    if (!article || typeof article.querySelectorAll !== 'function') return;

    try {
      for (const selector of SELECTORS.seeMoreButtons) {
        const btns = article.querySelectorAll(selector);
        btns.forEach(btn => {
          if (btn && typeof btn.click === 'function' && btn.offsetWidth > 0) {
            btn.click();
          }
        });
      }
    } catch (e) {
      // Ignore click errors in restricted DOMs
    }
  }

  function extractPostText(article) {
    if (!article || typeof article.querySelector !== 'function') return '';

    // Auto-expand "...see more" if present
    expandCollapsedPost(article);

    let mainText = '';
    for (const selector of SELECTORS.text) {
      const el = article.querySelector(selector);
      if (el && el.innerText && el.innerText.trim().length > 0) {
        mainText = el.innerText.trim();
        break;
      }
    }

    if (!mainText) {
      mainText = (article.innerText || article.textContent || '').trim();
    }

    // Extract text from image alt attributes (LinkedIn image descriptions / OCR)
    const imageAltTexts = [];
    try {
      const imgs = article.querySelectorAll('img[alt]');
      imgs.forEach(img => {
        const alt = (img.getAttribute('alt') || '').trim();
        if (alt && alt.length > 10) {
          const lower = alt.toLowerCase();
          const isGeneric = lower.includes('profile photo') ||
                            lower.includes('profile picture') ||
                            lower.includes('no photo description available') ||
                            lower.includes('image icon') ||
                            lower.includes('company logo');
          if (!isGeneric && !mainText.includes(alt)) {
            imageAltTexts.push(alt);
          }
        }
      });
    } catch (e) {
      // Ignore DOM selector errors
    }

    if (imageAltTexts.length > 0) {
      mainText += '\n\n[Image Description: ' + imageAltTexts.join(' | ') + ']';
    }

    return mainText.trim();
  }

  function extractAuthor(article) {
    if (!article || typeof article.querySelector !== 'function') return '';

    for (const selector of SELECTORS.author) {
      const el = article.querySelector(selector);
      if (el && el.innerText && el.innerText.trim().length > 0) {
        const name = el.innerText.split('\n')[0].trim();
        if (name) return name;
      }
    }
    return '';
  }

  function extractAuthorProfile(article) {
    if (!article || typeof article.querySelector !== 'function') return '';

    for (const selector of SELECTORS.authorLink) {
      const el = article.querySelector(selector);
      if (el && el.href) {
        try {
          const url = new URL(el.href, 'https://www.linkedin.com');
          return url.origin + url.pathname;
        } catch (e) {
          return el.href;
        }
      }
    }
    return '';
  }

  function extractPostUrl(article) {
    if (!article || typeof article.querySelector !== 'function') return '';

    for (const selector of SELECTORS.postLink) {
      const el = article.querySelector(selector);
      if (el && el.href) {
        try {
          const url = new URL(el.href, 'https://www.linkedin.com');
          return url.origin + url.pathname;
        } catch (e) {
          return el.href;
        }
      }
    }

    const urn = article.getAttribute('data-urn') || article.getAttribute('data-activity-id');
    if (urn) {
      const match = urn.match(/urn:li:activity:(\d+)/) || urn.match(/(\d+)/);
      if (match) {
        return `https://www.linkedin.com/feed/update/urn:li:activity:${match[1]}`;
      }
    }

    return '';
  }

  function extractMedia(article) {
    if (!article || typeof article.querySelector !== 'function') return [];

    const mediaList = [];
    const images = article.querySelectorAll('img.ivm-view-attr__img--centered, .feed-shared-image__image, .update-components-image__image');
    images.forEach(img => {
      if (img.src && !img.src.includes('profile-displayphoto')) {
        mediaList.push({ type: 'image', url: img.src });
      }
    });
    return mediaList;
  }

  function classifyOpportunityType(text) {
    if (!text || typeof text !== 'string') return 'Other';

    const lower = text.toLowerCase();

    if (/\bgrants?\b/i.test(lower) || /non[- ]dilutive/i.test(lower)) {
      return 'Grant';
    }
    if (/\baccelerators?\b/i.test(lower)) {
      return 'Accelerator';
    }
    if (/\bincubators?\b/i.test(lower)) {
      return 'Incubator';
    }
    if (/venture\s+capital/i.test(lower) || /\bVC\b/.test(text) || /\bseed\s+funding\b/i.test(lower)) {
      return 'Venture Capital';
    }
    if (/angel\s+invest/i.test(lower) || /angel\s+syndicate/i.test(lower)) {
      return 'Angel Investment';
    }
    if (/pitch\s+competition/i.test(lower) || /\bcompetitions?\b/i.test(lower)) {
      return 'Competition';
    }
    if (/\bprizes?\b/i.test(lower) || /\bawards?\b/i.test(lower)) {
      return 'Prize';
    }
    if (/government|ministry|public\s+sector|national\s+grant/i.test(lower)) {
      return 'Government Funding';
    }
    if (/corporate\s+venture|corporate\s+grant|enterprise\s+fund/i.test(lower)) {
      return 'Corporate Funding';
    }
    if (/\bloans?\b/i.test(lower) || /debt\s+financing/i.test(lower)) {
      return 'Loan';
    }
    if (/\bscholarships?\b/i.test(lower) || /fellowships?\b/i.test(lower)) {
      return 'Scholarship';
    }
    if (/\bprogrammes?\b/i.test(lower) || /\bprograms?\b/i.test(lower)) {
      return 'Programme';
    }

    return 'Other';
  }

  function extractAmountAndCurrency(text) {
    if (!text || typeof text !== 'string') return { amount: '', currency: '' };

    const regex = /(R|\$|€|£|USD|EUR|GBP|ZAR|AUD|CAD)\s*([\d,]+(?:\.\d+)?\s*(?:k|m|million|thousand|billion)?)|([\d,]+(?:\.\d+)?\s*(?:k|m|million|thousand|billion)?)\s*(USD|EUR|GBP|ZAR|AUD|CAD|dollars|rands|euros|pounds)/i;
    const match = text.match(regex);

    if (match) {
      let rawCurrency = match[1] || match[4] || '';
      let rawAmount = match[2] || match[3] || '';

      let currency = rawCurrency.toUpperCase().trim();
      if (currency === '$') currency = 'USD';
      if (currency === '€') currency = 'EUR';
      if (currency === '£') currency = 'GBP';
      if (currency === 'R') currency = 'ZAR';

      return {
        amount: (rawCurrency.length === 1 ? rawCurrency : '') + rawAmount.trim(),
        currency: currency
      };
    }

    return { amount: '', currency: '' };
  }

  function extractDeadline(text) {
    if (!text || typeof text !== 'string') return '';

    const regex = /(?:deadline|due\s+date|apply\s+by|closing\s+date|applications\s+close)\s*:?\s*([0-9]{1,2}\s+[A-Za-z]+(?:\s+[0-9]{4})?|[A-Za-z]+\s+[0-9]{1,2}(?:,?\s+[0-9]{4})?|[0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/i;
    const match = text.match(regex);
    if (match && match[1]) {
      return match[1].trim();
    }
    return '';
  }

  function extractApplicationUrl(text, article) {
    if (article && typeof article.querySelectorAll === 'function') {
      const links = article.querySelectorAll('a[href]');
      for (const link of links) {
        const href = link.href;
        if (href && !href.includes('linkedin.com/feed') && !href.includes('linkedin.com/in/') && !href.includes('linkedin.com/company/')) {
          return href;
        }
      }
    }

    if (text) {
      const match = text.match(/https?:\/\/[^\s>]+/i);
      if (match) {
        const url = match[0].replace(/[.,);]+$/, '');
        if (!url.includes('linkedin.com/in/') && !url.includes('linkedin.com/company/')) {
          return url;
        }
      }
    }

    return '';
  }

  function extractTitle(text) {
    if (!text || typeof text !== 'string') return '';

    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('[Image Description:'));
    if (lines.length > 0) {
      let firstLine = lines[0];
      if (firstLine.length > 90) {
        firstLine = firstLine.substring(0, 87) + '...';
      }
      return firstLine;
    }
    return '';
  }

  function extractGeography(text) {
    if (!text) return '';
    const regions = [
      { pattern: /\b(Africa|African)\b/i, name: 'Africa' },
      { pattern: /\b(Europe|European)\b/i, name: 'Europe' },
      { pattern: /\b(USA|US|United States|America|American)\b/i, name: 'US' },
      { pattern: /\b(Global|Worldwide)\b/i, name: 'Global' },
      { pattern: /\bLatin America\b/i, name: 'Latin America' },
      { pattern: /\bSoutheast Asia\b/i, name: 'Southeast Asia' },
      { pattern: /\b(UK|United Kingdom|Britain|British)\b/i, name: 'UK' },
      { pattern: /\b(Asia|Asian)\b/i, name: 'Asia' }
    ];
    for (const reg of regions) {
      if (reg.pattern.test(text)) {
        return reg.name;
      }
    }
    return '';
  }

  function extractIndustry(text) {
    if (!text) return '';
    const sectors = ['Education', 'Edtech', 'Fintech', 'Health', 'Healthtech', 'Climate', 'Agtech', 'AI', 'Artificial Intelligence', 'SaaS', 'Energy', 'Biotech', 'E-commerce', 'Cybersecurity'];
    for (const sector of sectors) {
      const reg = new RegExp(`\\b${sector}\\b`, 'i');
      if (reg.test(text)) {
        return sector;
      }
    }
    return '';
  }

  function extractEligibility(text) {
    if (!text) return '';
    const match = text.match(/(?:eligible|eligibility|open\s+to|for|targeting)\s*:?\s*([^.\n]+)/i);
    if (match && match[1] && match[1].trim().length > 3) {
      return match[1].trim().substring(0, 100);
    }
    return '';
  }

  function extractOrganization(author, text) {
    if (text) {
      const orgMatch = text.match(/(?:by|from|organized\s+by|offered\s+by|foundation|capital|partners|ventures|incubator|accelerator|ministry)\s*:?\s*([A-Z][A-Za-z0-9\s]+(?:Foundation|Capital|Ventures|Partners|Group|Fund|Incubator|Accelerator|Hub)?)/);
      if (orgMatch && orgMatch[1] && orgMatch[1].trim().length > 2) {
        return orgMatch[1].trim().substring(0, 50);
      }
    }
    return author || '';
  }

  function extractOpportunityDetails(text, author = '', authorProfileUrl = '', postUrl = '') {
    const { amount, currency } = extractAmountAndCurrency(text);
    const opportunityType = classifyOpportunityType(text);
    const deadline = extractDeadline(text);
    const title = extractTitle(text);
    const geography = extractGeography(text);
    const industry = extractIndustry(text);
    const eligibility = extractEligibility(text);
    const organization = extractOrganization(author, text);
    const applicationUrl = extractApplicationUrl(text, null);

    return {
      title,
      organization,
      opportunityType,
      amount,
      currency,
      deadline,
      eligibility,
      geography,
      industry,
      applicationUrl,
      notes: '',
      rawText: text || ''
    };
  }

  exports.SELECTORS = SELECTORS;
  exports.expandCollapsedPost = expandCollapsedPost;
  exports.extractPostText = extractPostText;
  exports.extractAuthor = extractAuthor;
  exports.extractAuthorProfile = extractAuthorProfile;
  exports.extractPostUrl = extractPostUrl;
  exports.extractMedia = extractMedia;
  exports.classifyOpportunityType = classifyOpportunityType;
  exports.extractAmountAndCurrency = extractAmountAndCurrency;
  exports.extractDeadline = extractDeadline;
  exports.extractApplicationUrl = extractApplicationUrl;
  exports.extractTitle = extractTitle;
  exports.extractOpportunityDetails = extractOpportunityDetails;
}));
