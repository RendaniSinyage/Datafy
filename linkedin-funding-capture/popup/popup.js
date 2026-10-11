document.addEventListener('DOMContentLoaded', async () => {
  let allOpportunities = [];
  let currentFilterType = 'ALL';
  let currentSearchQuery = '';
  let currentSort = 'date-desc';

  // DOM Elements
  const countBadge = document.getElementById('opp-count');
  const searchInput = document.getElementById('search-input');
  const filterTabsContainer = document.getElementById('type-filter-tabs');
  const sortSelect = document.getElementById('sort-select');
  const listContainer = document.getElementById('opportunities-list');
  const exportJsonBtn = document.getElementById('export-json-btn');
  const exportCsvBtn = document.getElementById('export-csv-btn');
  const exportMdBtn = document.getElementById('export-md-btn');
  const prRokctaiBtn = document.getElementById('pr-rokctai-btn');
  const clearAllBtn = document.getElementById('clear-all-btn');

  // Settings DOM
  const settingsToggleBtn = document.getElementById('settings-toggle-btn');
  const settingsPanel = document.getElementById('settings-panel');
  const thresholdInput = document.getElementById('threshold-input');
  const thresholdValSpan = document.getElementById('threshold-value');
  const autocaptureToggle = document.getElementById('autocapture-toggle');

  // Modal DOM
  const screenshotModal = document.getElementById('screenshot-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalImg = document.getElementById('modal-img');
  const modalTitle = document.getElementById('modal-title');

  // Initial Load
  await loadSettings();
  await refreshOpportunities();

  // Settings Panel Toggle
  settingsToggleBtn.addEventListener('click', () => {
    settingsPanel.classList.toggle('hidden');
  });

  thresholdInput.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    thresholdValSpan.textContent = val;
    StorageManager.saveSettings({ threshold: val });
  });

  autocaptureToggle.addEventListener('change', (e) => {
    StorageManager.saveSettings({ autoCapture: e.target.checked });
  });

  async function loadSettings() {
    const settings = await StorageManager.getSettings();
    thresholdInput.value = settings.threshold || 5;
    thresholdValSpan.textContent = settings.threshold || 5;
    autocaptureToggle.checked = settings.autoCapture !== false;
  }

  async function refreshOpportunities() {
    allOpportunities = await StorageManager.getOpportunities();
    updateStats();
    renderList();
  }

  function updateStats() {
    const total = allOpportunities.length;
    countBadge.textContent = `${total} ${total === 1 ? 'saved' : 'saved'}`;
  }

  // Search & Filter
  searchInput.addEventListener('input', (e) => {
    currentSearchQuery = e.target.value.toLowerCase().trim();
    renderList();
  });

  filterTabsContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-tab')) {
      document.querySelectorAll('.filter-tab').forEach(tab => tab.classList.remove('active'));
      e.target.classList.add('active');
      currentFilterType = e.target.getAttribute('data-type');
      renderList();
    }
  });

  sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    renderList();
  });

  function getFilteredOpportunities() {
    let result = [...allOpportunities];

    if (currentFilterType !== 'ALL') {
      result = result.filter(item => {
        const type = item.opportunityType || 'Other';
        if (currentFilterType === 'Investment') {
          return type === 'Venture Capital' || type === 'Angel Investment' || type === 'Investment';
        }
        return type.toLowerCase() === currentFilterType.toLowerCase();
      });
    }

    if (currentSearchQuery) {
      result = result.filter(item => {
        const text = [
          item.organization,
          item.author,
          item.title,
          item.postText,
          item.notes,
          item.opportunityType,
          item.geography,
          item.industry,
          item.applicationUrl
        ].map(s => (s || '').toLowerCase()).join(' ');
        return text.includes(currentSearchQuery);
      });
    }

    result.sort((a, b) => {
      if (currentSort === 'date-desc') {
        return new Date(b.capturedAt) - new Date(a.capturedAt);
      } else if (currentSort === 'date-asc') {
        return new Date(a.capturedAt) - new Date(b.capturedAt);
      } else if (currentSort === 'deadline-asc') {
        return (a.deadline || 'ZZZ').localeCompare(b.deadline || 'ZZZ');
      } else if (currentSort === 'score-desc') {
        return (b.relevanceScore || 0) - (a.relevanceScore || 0);
      }
      return 0;
    });

    return result;
  }

  function renderList() {
    const items = getFilteredOpportunities();
    listContainer.innerHTML = '';

    if (items.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state">
          <p>No funding opportunities match your filter.</p>
          <small>Browse LinkedIn or clear your search to see saved opportunities.</small>
        </div>
      `;
      return;
    }

    items.forEach(opp => {
      const card = createCardElement(opp);
      listContainer.appendChild(card);
    });
  }

  function getTypeBadgeClass(type) {
    if (!type) return 'type-other';
    const lower = type.toLowerCase();
    if (lower.includes('grant')) return 'type-grant';
    if (lower.includes('accelerator') || lower.includes('incubator')) return 'type-accelerator';
    if (lower.includes('venture') || lower.includes('angel') || lower.includes('investment')) return 'type-vc';
    return 'type-other';
  }

  function createCardElement(opp) {
    const card = document.createElement('div');
    card.className = 'opp-card';

    const authorDisplay = opp.organization || opp.author || 'Unknown Author';
    const typeClass = getTypeBadgeClass(opp.opportunityType);

    const amountDisplay = opp.amount ? `<strong>${opp.amount}</strong>` : '';
    const deadlineDisplay = opp.deadline ? `Deadline: <strong>${opp.deadline}</strong>` : '';

    let metaHtml = '';
    if (amountDisplay || deadlineDisplay) {
      metaHtml = `
        <div class="opp-meta">
          ${amountDisplay ? `<span class="opp-meta-item">${amountDisplay}</span>` : ''}
          ${deadlineDisplay ? `<span class="opp-meta-item">${deadlineDisplay}</span>` : ''}
        </div>
      `;
    }

    let linksHtml = '';
    if (opp.applicationUrl) {
      linksHtml += `<a href="${opp.applicationUrl}" target="_blank" class="action-link" style="font-weight: 700;">[Apply / Visit Link 🔗]</a> `;
    }
    if (opp.postUrl) {
      linksHtml += `<a href="${opp.postUrl}" target="_blank" class="action-link" style="color: #666;">[LinkedIn Post]</a>`;
    }

    card.innerHTML = `
      <div class="opp-card-header">
        <a href="${opp.applicationUrl || opp.authorProfileUrl || opp.postUrl || '#'}" target="_blank" class="opp-author">${escapeHtml(authorDisplay)}</a>
        <span class="opp-type-badge ${typeClass}">${escapeHtml(opp.opportunityType || 'Other')}</span>
      </div>
      <div class="opp-title">${escapeHtml(opp.title || 'Funding Opportunity')}</div>
      ${metaHtml}
      <div class="opp-text-snippet">${escapeHtml(opp.postText || '')}</div>
      <div class="opp-card-actions">
        ${linksHtml}
        ${opp.screenshot ? `<button class="action-btn-sm view-screenshot-btn">[View screenshot]</button>` : ''}
        <button class="action-btn-sm delete-btn" style="margin-left:auto; color: #d93025;">Delete</button>
      </div>
    `;

    const viewScreenshotBtn = card.querySelector('.view-screenshot-btn');
    if (viewScreenshotBtn) {
      viewScreenshotBtn.addEventListener('click', () => {
        openModal(opp.screenshot, `${opp.organization || opp.author || 'Opportunity'} Screenshot`);
      });
    }

    const deleteBtn = card.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', async () => {
      if (confirm('Delete this saved opportunity?')) {
        await StorageManager.deleteOpportunity(opp.id);
        await refreshOpportunities();
      }
    });

    return card;
  }

  function openModal(imageSrc, title) {
    modalImg.src = imageSrc;
    modalTitle.textContent = title || 'Screenshot';
    screenshotModal.classList.remove('hidden');
  }

  modalCloseBtn.addEventListener('click', () => {
    screenshotModal.classList.add('hidden');
  });

  screenshotModal.addEventListener('click', (e) => {
    if (e.target === screenshotModal) {
      screenshotModal.classList.add('hidden');
    }
  });

  // Export handlers
  exportJsonBtn.addEventListener('click', () => {
    const jsonStr = ExportUtils.exportToJSON(allOpportunities);
    ExportUtils.downloadFile(jsonStr, 'linkedin_funding_opportunities.json', 'application/json');
  });

  exportCsvBtn.addEventListener('click', () => {
    const csvStr = ExportUtils.exportToCSV(allOpportunities);
    ExportUtils.downloadFile(csvStr, 'linkedin_funding_opportunities.csv', 'text/csv');
  });

  if (exportMdBtn) {
    exportMdBtn.addEventListener('click', () => {
      const filtered = getFilteredOpportunities();
      if (filtered.length === 0) {
        alert('No opportunities to export.');
        return;
      }
      filtered.forEach((opp, idx) => {
        setTimeout(() => {
          const mdStr = ExportUtils.exportToRokctaiMarkdown(opp);
          const filename = ExportUtils.generateRokctaiFilename(opp);
          ExportUtils.downloadFile(mdStr, filename, 'text/markdown');
        }, idx * 150);
      });
    });
  }

  if (prRokctaiBtn) {
    prRokctaiBtn.addEventListener('click', () => {
      const batch = ExportUtils.generateGitHubPRBatch(allOpportunities);
      if (batch.openCount === 0) {
        alert('No active/open opportunities found to submit.');
        return;
      }

      batch.files.forEach((fileObj, idx) => {
        setTimeout(() => {
          ExportUtils.downloadFile(fileObj.content, fileObj.filename, 'text/markdown');
        }, idx * 150);
      });

      window.open(batch.uploadUrl, '_blank');

      alert(`Exported ${batch.openCount} open grant Markdown card(s)!\n\n1. Drag and drop the downloaded .md file(s) into the opened GitHub upload window.\n2. Click 'Propose changes'.\n3. Click 'Create pull request' to submit your PR to rokctai/opportunities!`);
    });
  }

  clearAllBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to clear ALL saved opportunities? This action cannot be undone.')) {
      await StorageManager.clearOpportunities();
      await refreshOpportunities();
    }
  });

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
});
