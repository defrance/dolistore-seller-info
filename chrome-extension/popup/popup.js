document.getElementById('dsi-popup-title').textContent = chrome.i18n.getMessage('popup_title');
document.getElementById('dsi-popup-click').textContent = chrome.i18n.getMessage('popup_click');
document.getElementById('dsi-saved-title').textContent = chrome.i18n.getMessage('saved_modules_title');
document.getElementById('dsi-saved-empty').textContent = chrome.i18n.getMessage('saved_modules_empty');

const dsiSaveBtn = document.getElementById('dsi-save-btn');
const dsiSaveStatus = document.getElementById('dsi-save-status');
dsiSaveBtn.textContent = chrome.i18n.getMessage('save_module_button');

function dsiInitSaveButton() {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const tab = tabs[0];
    const isProductPage = !!tab?.url?.startsWith('https://www.dolistore.com/product.php');
    dsiSaveBtn.disabled = !isProductPage;
    dsiSaveBtn.dataset.tabId = isProductPage ? tab.id : '';
    dsiSaveStatus.textContent = isProductPage ? '' : chrome.i18n.getMessage('save_module_not_product_page');
  });
}

dsiSaveBtn.addEventListener('click', () => {
  const tabId = Number(dsiSaveBtn.dataset.tabId);
  if (!tabId) return;
  dsiSaveBtn.disabled = true;
  chrome.tabs.sendMessage(tabId, { action: 'dsiScrapeAndSave' }, response => {
    dsiSaveBtn.disabled = false;
    if (chrome.runtime.lastError || response?.error || response?.ok === false) {
      dsiSaveStatus.textContent = chrome.i18n.getMessage('save_module_error');
    } else {
      dsiSaveStatus.textContent = chrome.i18n.getMessage('save_module_success');
      dsiLoadSavedModules();
    }
  });
});

function dsiNormalize(str) {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const DSI_LEFT_COLUMN_GROUPS = [
  { keywords: ['auteur', 'author', 'autor', 'autore'], messageKey: 'info_label_author' },
  { keywords: ['version'], messageKey: 'info_label_version' },
  { keywords: ['date de sortie', 'release date', 'veroffentlichung', 'fecha de lanzamiento', 'data di rilascio'], messageKey: 'info_label_release_date' },
  { keywords: ['acces', 'access', 'zugriff', 'acceso', 'accesso'], messageKey: 'info_label_download' },
];
const DSI_RIGHT_COLUMN_GROUPS = [
  { keywords: ['assistance', 'support', 'contact'], messageKey: 'info_label_assistance' },
  { keywords: ['compatibilit', 'compatib'], messageKey: 'info_label_compatibility' },
  { keywords: ['php'], messageKey: 'info_label_php' },
  { keywords: ['mise a jour', 'update', 'aktualisierung', 'actualizacion', 'aggiornamento'], messageKey: 'info_label_last_update' },
];

function dsiFindColumnGroup(norm, columnGroups) {
  return columnGroups.find(group => group.keywords.some(k => norm.includes(k))) || null;
}

function dsiParseDaysFromAccess(value) {
  if (!value) return null;
  const v = value.toLowerCase().trim();
  let m = v.match(/^(\d+)\s*(an|year|anno|jahr|a\xf1o)/);
  if (m) return parseInt(m[1], 10) * 365;
  m = v.match(/^(\d+)\s*(mois|month|mese|monat|mes)/);
  if (m) return parseInt(m[1], 10) * 30;
  m = v.match(/^(\d+)\s*(jour|day|giorno|tag|d\xeda|di)/);
  if (m) return parseInt(m[1], 10);
  m = v.match(/^(\d+)$/);
  if (m) return parseInt(m[1], 10);
  return null;
}

function dsiFindAccessDays(mod) {
  if (!mod.info) return null;
  const group = DSI_LEFT_COLUMN_GROUPS.find(g => g.messageKey === 'info_label_download');
  for (const [label, value] of Object.entries(mod.info)) {
    if (group.keywords.some(k => dsiNormalize(label).includes(k))) return dsiParseDaysFromAccess(value);
  }
  return null;
}

function dsiUpdateRemainingDays(span, purchaseDate, days) {
  if (!purchaseDate || days === null) { span.textContent = ''; return; }
  const expiration = new Date(new Date(purchaseDate).getTime() + days * 86400000);
  const dj = new Date(); dj.setHours(0, 0, 0, 0);
  const remaining = Math.round((expiration - dj) / 86400000);
  span.className = 'dsi-remaining-days ' + (remaining < 0 ? 'dsi-expired' : remaining < 30 ? 'dsi-warning' : 'dsi-ok');
  span.textContent = '(' + (remaining > 0 ? '+' : '') + remaining + ' ' + chrome.i18n.getMessage('days_unit') + ')';
}

// Diffs détectés lors du dernier "Vérifier les mises à jour", indexés par url de module.
const dsiPendingChanges = new Map();

function dsiBuildRefreshRow(mod, diff) {
  const tr = document.createElement('tr');
  tr.className = 'dsi-refresh-row';
  const td = document.createElement('td');
  td.colSpan = 2;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'dsi-refresh-btn';
  btn.title = chrome.i18n.getMessage('refresh_module_info');
  btn.textContent = '🔄';
  btn.addEventListener('click', () => {
    btn.disabled = true;
    const mergedInfo = { ...(mod.info || {}) };
    Object.entries(diff).forEach(([key, change]) => {
      mergedInfo[key] = change.newValue;
    });
    const updatedMod = { ...mod, info: mergedInfo, savedAt: new Date().toISOString() };
    chrome.runtime.sendMessage({ action: 'saveModule', module: updatedMod }, () => {
      dsiPendingChanges.delete(mod.url);
      dsiLoadSavedModules();
    });
  });
  td.appendChild(btn);
  tr.appendChild(td);
  return tr;
}

function dsiBuildColumnTable(entries, diff, insertAfter) {
  const table = document.createElement('table');
  table.className = 'dsi-info-inner';
  let inserted = false;
  entries.forEach(({ label, value, rawLabel, groupKey }) => {
    const tr = document.createElement('tr');
    const tdLabel = document.createElement('td');
    tdLabel.textContent = label;
    const tdValue = document.createElement('td');
    const change = diff && diff[rawLabel];
    if (change) {
      const oldSpan = document.createElement('span');
      oldSpan.className = 'dsi-old-value';
      oldSpan.textContent = change.oldValue;
      const newSpan = document.createElement('span');
      newSpan.className = 'dsi-new-value';
      newSpan.textContent = change.newValue;
      tdValue.append(oldSpan, ' → ', newSpan);
    } else if (groupKey === 'info_label_download') {
      const days = dsiParseDaysFromAccess(value);
      tdValue.textContent = days !== null ? days + ' ' + chrome.i18n.getMessage('days_unit') : value;
    } else {
      tdValue.textContent = value;
    }
    tr.append(tdLabel, tdValue);
    table.appendChild(tr);
    if (insertAfter && groupKey === insertAfter.groupKey) {
      table.appendChild(insertAfter.build());
      inserted = true;
    }
  });
  if (insertAfter && !inserted) {
    table.appendChild(insertAfter.build());
  }
  return table;
}

function dsiBuildInfoPanel(mod) {
  const panel = document.createElement('div');
  panel.className = 'dsi-info-panel';
  const entries = mod.info ? Object.entries(mod.info) : [];
  if (!entries.length) {
    const empty = document.createElement('p');
    empty.className = 'dsi-info-empty';
    empty.textContent = chrome.i18n.getMessage('saved_module_no_info');
    panel.appendChild(empty);
    return panel;
  }

  const diff = dsiPendingChanges.get(mod.url) || null;
  const leftEntries = [];
  const rightEntries = [];
  entries.forEach(([label, value]) => {
    const norm = dsiNormalize(label);
    const leftGroup = dsiFindColumnGroup(norm, DSI_LEFT_COLUMN_GROUPS);
    const rightGroup = dsiFindColumnGroup(norm, DSI_RIGHT_COLUMN_GROUPS);
    const isRight = !!rightGroup && !leftGroup;
    const matchedGroup = isRight ? rightGroup : leftGroup;
    const displayLabel = matchedGroup ? chrome.i18n.getMessage(matchedGroup.messageKey) : label;
    const displayEntry = { label: displayLabel, value, rawLabel: label, groupKey: matchedGroup?.messageKey };
    if (isRight) rightEntries.push(displayEntry);
    else leftEntries.push(displayEntry);
  });

  const outer = document.createElement('table');
  outer.className = 'dsi-info-outer';
  const tr = document.createElement('tr');
  const tdLeft = document.createElement('td');
  tdLeft.appendChild(dsiBuildColumnTable(leftEntries, diff));
  const tdRight = document.createElement('td');
  if (rightEntries.length) {
    const insertAfter = diff ? { groupKey: 'info_label_php', build: () => dsiBuildRefreshRow(mod, diff) } : null;
    tdRight.appendChild(dsiBuildColumnTable(rightEntries, diff, insertAfter));
  }
  tr.append(tdLeft, tdRight);
  outer.appendChild(tr);
  panel.appendChild(outer);
  return panel;
}

function dsiRenderSavedModules(saved) {
  const list = document.getElementById('dsi-saved-list');
  const empty = document.getElementById('dsi-saved-empty');
  list.innerHTML = '';
  empty.style.display = saved.length ? 'none' : 'block';
  saved
    .slice()
    .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt))
    .forEach(mod => {
      const li = document.createElement('li');

      const row = document.createElement('div');
      row.className = 'dsi-row';

      const toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.className = 'dsi-title-btn';
      toggleBtn.title = mod.title;
      toggleBtn.textContent = mod.title;
      toggleBtn.dataset.url = mod.url;
      toggleBtn.classList.toggle('dsi-changed', dsiPendingChanges.has(mod.url));

      const openLink = document.createElement('a');
      openLink.className = 'dsi-open-link';
      openLink.href = mod.url;
      openLink.target = '_blank';
      openLink.title = chrome.i18n.getMessage('open_module');
      openLink.textContent = '↗';

      const removeBtn = document.createElement('button');
      removeBtn.className = 'dsi-remove-btn';
      removeBtn.textContent = chrome.i18n.getMessage('remove_module');
      removeBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'deleteSavedModule', url: mod.url }, () => dsiLoadSavedModules());
      });

      const panel = dsiBuildInfoPanel(mod);
      toggleBtn.addEventListener('click', () => panel.classList.toggle('open'));

      const purchaseDateRow = document.createElement('div');
      purchaseDateRow.className = 'dsi-purchase-date-row';
      const purchaseDateLabel = document.createElement('label');
      purchaseDateLabel.className = 'dsi-purchase-date-label';
      purchaseDateLabel.textContent = chrome.i18n.getMessage('purchase_date_label');
      const purchaseDateInput = document.createElement('input');
      purchaseDateInput.type = 'date';
      purchaseDateInput.className = 'dsi-purchase-date-input';
      purchaseDateInput.value = mod.purchaseDate || '';
      const remainingSpan = document.createElement('span');
      const accessDays = dsiFindAccessDays(mod);
      dsiUpdateRemainingDays(remainingSpan, mod.purchaseDate, accessDays);
      purchaseDateInput.addEventListener('change', () => {
        const updatedMod = { ...mod, purchaseDate: purchaseDateInput.value };
        chrome.runtime.sendMessage({ action: 'saveModule', module: updatedMod });
        dsiUpdateRemainingDays(remainingSpan, purchaseDateInput.value, accessDays);
      });
      purchaseDateRow.append(purchaseDateLabel, purchaseDateInput, remainingSpan);

      row.append(toggleBtn, openLink, removeBtn);
      li.append(row, purchaseDateRow, panel);
      list.appendChild(li);
    });
}

function dsiLoadSavedModules() {
  chrome.runtime.sendMessage({ action: 'getSavedModules' }, response => {
    dsiRenderSavedModules(response?.saved || []);
  });
}

function dsiExtractInfoListFromDoc(doc) {
  const officialTable = doc.querySelector('table.info-table-box');
  if (!officialTable) return null;
  const boxes = officialTable.querySelectorAll('.info-list-box');
  if (!boxes.length) return null;
  const info = {};
  boxes.forEach(box => {
    box.querySelectorAll('li').forEach(li => {
      const labelEls = Array.from(li.querySelectorAll('b, strong'));
      labelEls.forEach((labelEl, i) => {
        const label = labelEl.textContent.trim().replace(/\s*:\s*$/, '');
        if (!label) return;
        const nextLabelEl = labelEls[i + 1] || null;
        let value = '';
        let node = labelEl.nextSibling;
        while (node && node !== nextLabelEl) {
          value += node.textContent;
          node = node.nextSibling;
        }
        value = value.replace(/\u00A0/g, ' ').trim().replace(/^[-:\s]+|[-:\s]+$/g, '');
        info[label] = value;
      });
    });
  });
  return Object.keys(info).length ? info : null;
}

function dsiComputeInfoDiff(oldInfo, newInfo) {
  const diff = {};
  const keys = new Set([...(oldInfo ? Object.keys(oldInfo) : []), ...(newInfo ? Object.keys(newInfo) : [])]);
  keys.forEach(key => {
    const oldValue = oldInfo?.[key] ?? '';
    const newValue = newInfo?.[key] ?? '';
    if (oldValue !== newValue) diff[key] = { oldValue, newValue };
  });
  return diff;
}

async function dsiFetchModuleDiff(mod) {
  const res = await fetch(mod.url, { credentials: 'omit' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const html = await res.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const freshInfo = dsiExtractInfoListFromDoc(doc);
  return dsiComputeInfoDiff(mod.info, freshInfo);
}

function dsiOpenChangedPanels(changedUrls) {
  document.querySelectorAll('#dsi-saved-list .dsi-title-btn').forEach(btn => {
    if (!changedUrls.has(btn.dataset.url)) return;
    const panel = btn.closest('li')?.querySelector('.dsi-info-panel');
    panel?.classList.add('open');
  });
}

const dsiCheckBtn = document.getElementById('dsi-check-btn');
const dsiCheckStatus = document.getElementById('dsi-check-status');
dsiCheckBtn.textContent = chrome.i18n.getMessage('check_updates_button');

dsiCheckBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'getSavedModules' }, async response => {
    const saved = response?.saved || [];
    if (!saved.length) {
      dsiCheckStatus.textContent = chrome.i18n.getMessage('check_updates_none_saved');
      return;
    }
    dsiCheckBtn.disabled = true;
    dsiSaveBtn.disabled = true;
    const changedUrls = new Set();
    for (let i = 0; i < saved.length; i++) {
      dsiCheckStatus.textContent = chrome.i18n.getMessage('check_updates_progress', [String(i + 1), String(saved.length)]);
      try {
        const diff = await dsiFetchModuleDiff(saved[i]);
        if (Object.keys(diff).length) {
          dsiPendingChanges.set(saved[i].url, diff);
          changedUrls.add(saved[i].url);
        } else {
          dsiPendingChanges.delete(saved[i].url);
        }
      } catch (e) {
        // Ignore un module inaccessible et continue la vérification des autres
      }
    }
    dsiCheckBtn.disabled = false;
    dsiInitSaveButton();
    dsiCheckStatus.textContent = changedUrls.size
      ? chrome.i18n.getMessage('check_updates_found', [String(changedUrls.size)])
      : chrome.i18n.getMessage('check_updates_none');
    dsiRenderSavedModules(saved);
    dsiOpenChangedPanels(changedUrls);
  });
});

dsiInitSaveButton();
dsiLoadSavedModules();
