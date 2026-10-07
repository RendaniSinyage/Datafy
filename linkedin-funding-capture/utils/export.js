(function (root, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    factory(exports);
  } else {
    factory((root.ExportUtils = root.ExportUtils || {}));
  }
}(typeof self !== 'undefined' ? self : this, function (exports) {
  'use strict';

  const CSV_COLUMNS = [
    'capturedAt',
    'author',
    'authorProfileUrl',
    'organization',
    'title',
    'opportunityType',
    'amount',
    'currency',
    'deadline',
    'eligibility',
    'geography',
    'industry',
    'applicationUrl',
    'postUrl',
    'notes',
    'rawText'
  ];

  function escapeCsvCell(cell) {
    if (cell === null || cell === undefined) {
      return '""';
    }
    const str = String(cell);
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  function exportToCSV(opportunities) {
    if (!Array.isArray(opportunities)) {
      opportunities = [];
    }

    const headerRow = CSV_COLUMNS.map(col => escapeCsvCell(col)).join(',');
    const dataRows = opportunities.map(opp => {
      return CSV_COLUMNS.map(col => escapeCsvCell(opp[col] || '')).join(',');
    });

    return [headerRow, ...dataRows].join('\r\n');
  }

  function exportToJSON(opportunities) {
    return JSON.stringify(opportunities || [], null, 2);
  }

  function isOpenOpportunity(opp) {
    if (!opp || typeof opp !== 'object') return false;
    const deadline = (opp.deadline || '').trim();

    if (!deadline || /ongoing|rolling|open|tbd|unspecified/i.test(deadline)) {
      return true;
    }

    try {
      const parsedDate = new Date(deadline);
      if (!isNaN(parsedDate.getTime())) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return parsedDate >= today;
      }
    } catch (e) {
      // Fallback: check year
    }

    // Check if deadline mentions a future year (e.g. 2026, 2027)
    const currentYear = new Date().getFullYear();
    const yearMatch = deadline.match(/\b(20\d{2})\b/);
    if (yearMatch) {
      const year = parseInt(yearMatch[1], 10);
      return year >= currentYear;
    }

    return true; // Default to open if parsing uncertain
  }

  function generateRokctaiFilename(opp) {
    const titlePart = (opp.title || 'Grant Opportunity')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .substring(0, 60);

    const deadline = (opp.deadline || '').toLowerCase();
    const datePrefix = deadline && deadline !== 'ongoing' && deadline !== 'rolling' ? 'Call' : 'Ongoing';
    return `${datePrefix}_${titlePart}.md`;
  }

  function exportToRokctaiMarkdown(opp) {
    if (!opp || typeof opp !== 'object') return '';

    const today = new Date().toISOString().split('T')[0];
    const title = opp.title || 'Funding Opportunity';
    const org = opp.organization || opp.author || 'Unspecified';
    const deadline = opp.deadline || 'Ongoing';
    const amount = opp.amount ? `${opp.amount} ${opp.currency || ''}`.trim() : 'Unspecified';
    const focusArea = opp.industry || opp.opportunityType || 'General';
    const eligibility = opp.eligibility || 'Open to eligible applicants and startups';
    const applyLink = opp.applicationUrl || opp.postUrl || '';
    const sourceLink = opp.postUrl || opp.applicationUrl || '';
    const description = opp.rawText || opp.postText || '';

    return `# Grant Opportunity: ${title}

## Quick Stats
- **Organization**: ${org}
- **Deadline**: ${deadline}
- **Funding Amount**: ${amount}
- **Focus Area**: ${focusArea}

## Eligibility
- ${eligibility}

## Description
${description}

## How to Apply
- **Applying Link**: ${applyLink}
- **Source**: ${sourceLink}

## Audit & Status
- **Verification Status**: UNVERIFIED
- **Last Verified**: ${today}
`;
  }

  function generateGitHubPRBatch(opportunities) {
    const list = Array.isArray(opportunities) ? opportunities : [];
    const openOpps = list.filter(isOpenOpportunity);

    const files = openOpps.map(opp => ({
      filename: generateRokctaiFilename(opp),
      content: exportToRokctaiMarkdown(opp),
      opportunity: opp
    }));

    return {
      openCount: openOpps.length,
      totalCount: list.length,
      files,
      uploadUrl: 'https://github.com/rokctai/opportunities/upload/main/02_grants'
    };
  }

  function downloadFile(content, filename, contentType) {
    if (typeof document === 'undefined') return content;
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  exports.CSV_COLUMNS = CSV_COLUMNS;
  exports.escapeCsvCell = escapeCsvCell;
  exports.exportToCSV = exportToCSV;
  exports.exportToJSON = exportToJSON;
  exports.isOpenOpportunity = isOpenOpportunity;
  exports.generateRokctaiFilename = generateRokctaiFilename;
  exports.exportToRokctaiMarkdown = exportToRokctaiMarkdown;
  exports.generateGitHubPRBatch = generateGitHubPRBatch;
  exports.downloadFile = downloadFile;
}));
