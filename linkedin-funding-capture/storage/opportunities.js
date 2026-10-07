(function (root, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    factory(exports);
  } else {
    factory((root.StorageManager = root.StorageManager || {}));
  }
}(typeof self !== 'undefined' ? self : this, function (exports) {
  'use strict';

  const STORAGE_KEYS = {
    OPPORTUNITIES: 'funding_opportunities',
    CAPTURED_KEYS: 'captured_keys',
    SETTINGS: 'capture_settings'
  };

  const DEFAULT_SETTINGS = {
    threshold: 5,
    autoCapture: true
  };

  function hasChromeStorage() {
    return typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
  }

  function getOpportunities() {
    return new Promise((resolve) => {
      if (!hasChromeStorage()) {
        resolve([]);
        return;
      }
      chrome.storage.local.get([STORAGE_KEYS.OPPORTUNITIES], (result) => {
        resolve(result[STORAGE_KEYS.OPPORTUNITIES] || []);
      });
    });
  }

  function getCapturedKeys() {
    return new Promise((resolve) => {
      if (!hasChromeStorage()) {
        resolve([]);
        return;
      }
      chrome.storage.local.get([STORAGE_KEYS.CAPTURED_KEYS], (result) => {
        resolve(result[STORAGE_KEYS.CAPTURED_KEYS] || []);
      });
    });
  }

  function getSettings() {
    return new Promise((resolve) => {
      if (!hasChromeStorage()) {
        resolve(DEFAULT_SETTINGS);
        return;
      }
      chrome.storage.local.get([STORAGE_KEYS.SETTINGS], (result) => {
        resolve({ ...DEFAULT_SETTINGS, ...(result[STORAGE_KEYS.SETTINGS] || {}) });
      });
    });
  }

  function saveSettings(newSettings) {
    return new Promise((resolve) => {
      if (!hasChromeStorage()) {
        resolve(newSettings);
        return;
      }
      getSettings().then(current => {
        const updated = { ...current, ...newSettings };
        chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: updated }, () => {
          resolve(updated);
        });
      });
    });
  }

  function saveOpportunity(opp, dedupeKeysArray) {
    return new Promise((resolve) => {
      if (!hasChromeStorage()) {
        resolve(opp);
        return;
      }

      Promise.all([getOpportunities(), getCapturedKeys()]).then(([opps, keys]) => {
        const newKeys = Array.isArray(dedupeKeysArray) ? dedupeKeysArray : [dedupeKeysArray || opp.postUrl || opp.id];
        const existingIdx = opps.findIndex(o => o.id === opp.id || (o.postUrl && o.postUrl === opp.postUrl));

        let updatedOpps;
        if (existingIdx >= 0) {
          updatedOpps = [...opps];
          updatedOpps[existingIdx] = { ...updatedOpps[existingIdx], ...opp, dedupeKeys: newKeys };
        } else {
          updatedOpps = [{ ...opp, dedupeKeys: newKeys }, ...opps];
        }

        const updatedKeys = Array.from(new Set([...keys, ...newKeys]));

        chrome.storage.local.set({
          [STORAGE_KEYS.OPPORTUNITIES]: updatedOpps,
          [STORAGE_KEYS.CAPTURED_KEYS]: updatedKeys
        }, () => {
          if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({ action: 'updateBadge', count: updatedOpps.length });
          }
          resolve(opp);
        });
      });
    });
  }

  function deleteOpportunity(id) {
    return new Promise((resolve) => {
      if (!hasChromeStorage()) {
        resolve([]);
        return;
      }

      getOpportunities().then(opps => {
        const oppToDelete = opps.find(o => o.id === id);
        const updatedOpps = opps.filter(o => o.id !== id);

        getCapturedKeys().then(keys => {
          let updatedKeys = keys;
          if (oppToDelete && oppToDelete.dedupeKeys) {
            const keysToRemove = new Set(oppToDelete.dedupeKeys);
            updatedKeys = keys.filter(k => !keysToRemove.has(k));
          }

          chrome.storage.local.set({
            [STORAGE_KEYS.OPPORTUNITIES]: updatedOpps,
            [STORAGE_KEYS.CAPTURED_KEYS]: updatedKeys
          }, () => {
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
              chrome.runtime.sendMessage({ action: 'updateBadge', count: updatedOpps.length });
            }
            resolve(updatedOpps);
          });
        });
      });
    });
  }

  function clearOpportunities() {
    return new Promise((resolve) => {
      if (!hasChromeStorage()) {
        resolve();
        return;
      }

      chrome.storage.local.set({
        [STORAGE_KEYS.OPPORTUNITIES]: [],
        [STORAGE_KEYS.CAPTURED_KEYS]: []
      }, () => {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({ action: 'updateBadge', count: 0 });
        }
        resolve();
      });
    });
  }

  exports.STORAGE_KEYS = STORAGE_KEYS;
  exports.DEFAULT_SETTINGS = DEFAULT_SETTINGS;
  exports.getOpportunities = getOpportunities;
  exports.getCapturedKeys = getCapturedKeys;
  exports.getSettings = getSettings;
  exports.saveSettings = saveSettings;
  exports.saveOpportunity = saveOpportunity;
  exports.deleteOpportunity = deleteOpportunity;
  exports.clearOpportunities = clearOpportunities;
}));
