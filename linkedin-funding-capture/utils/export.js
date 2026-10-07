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

  function generateRokctaiFilename(opp) {
    const titlePart = (opp.title || 'Grant Opportunity')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .substring(0, 60);

    const datePrefix = opp.deadline && opp.deadline.toLowerCase() !== 'ongoing' ? 'Call' : 'Ongoing';
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
  exports.generateRokctaiFilename = generateRokctaiFilename;
  exports.exportToRokctaiMarkdown = exportToRokctaiMarkdown;
  exports.downloadFile = downloadFile;
}));
