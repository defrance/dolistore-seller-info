const BG_URL = 'https://raw.githubusercontent.com/defrance/dolistore-seller-info/refs/heads/develop/datas/dolistore_author.json';
const SAVED_MODULES_KEY = 'dsiSavedModules';

async function dsiSaveModule(mod) {
  const { [SAVED_MODULES_KEY]: saved = [] } = await chrome.storage.local.get(SAVED_MODULES_KEY);
  const idx = saved.findIndex(m => m.url === mod.url);
  if (idx >= 0) saved[idx] = mod; else saved.push(mod);
  await chrome.storage.local.set({ [SAVED_MODULES_KEY]: saved });
}

async function dsiDeleteModule(url) {
  const { [SAVED_MODULES_KEY]: saved = [] } = await chrome.storage.local.get(SAVED_MODULES_KEY);
  await chrome.storage.local.set({ [SAVED_MODULES_KEY]: saved.filter(m => m.url !== url) });
}

chrome.runtime.onMessage.addListener((m, sender, sendResponse) => {
  if (m.action === 'openSeller') {
    chrome.tabs.create({ url: chrome.runtime.getURL('seller/seller.html?seller=' + encodeURIComponent(m.seller)) });
  }
  if (m.action === 'getSellerData') {
    fetch(BG_URL)
      .then(r => r.json())
      .then(data => sendResponse({ data }))
      .catch(err => sendResponse({ error: err.message }));
    return true; // réponse asynchrone
  }
  if (m.action === 'saveModule') {
    dsiSaveModule(m.module)
      .then(() => sendResponse({ ok: true }))
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }
  if (m.action === 'getSavedModules') {
    chrome.storage.local.get(SAVED_MODULES_KEY)
      .then(({ [SAVED_MODULES_KEY]: saved = [] }) => sendResponse({ saved }))
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }
  if (m.action === 'deleteSavedModule') {
    dsiDeleteModule(m.url)
      .then(() => sendResponse({ ok: true }))
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }
});