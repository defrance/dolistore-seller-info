const BG_URL = 'https://raw.githubusercontent.com/defrance/dolistore-seller-info/refs/heads/main/datas/dolistore_author.json';

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
});