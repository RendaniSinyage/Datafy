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
  exports.downloadFile = downloadFile;
}));
