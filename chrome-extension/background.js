const BG_KEY = 'sellerCache';
const BG_VERSION = 4;
const BG_URL = 'https://www.patas-monkey.com/docs/dolistore_author.json';

chrome.runtime.onMessage.addListener((m, sender, sendResponse) => {
  if (m.action === 'openSeller') {
    chrome.tabs.create({ url: chrome.runtime.getURL('seller/seller.html?seller=' + encodeURIComponent(m.seller)) });
  }
  if (m.action === 'getSellerData') {
    chrome.storage.local.get([BG_KEY, 'ts', 'dsi_version']).then(c => {
      const data = c[BG_KEY];
      if (data && Date.now() - (c.ts || 0) < 86400000 && c.dsi_version === BG_VERSION) {
        sendResponse({ data });
      } else {
        fetch(BG_URL)
          .then(r => r.json())
          .then(data => {
            chrome.storage.local.set({ sellerCache: data, ts: Date.now(), dsi_version: BG_VERSION });
            sendResponse({ data });
          })
          .catch(err => sendResponse({ error: err.message }));
      }
    });
    return true; // réponse asynchrone
  }
});