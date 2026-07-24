const DATA_URL = 'https://www.patas-monkey.com/docs/dolistore_author.json';
const VERSION = 4;
const GITHUB_10_LEVEL = "#000000";
const GITHUB_25_LEVEL = "#F9BFA7";
const GITHUB_50_LEVEL = "#E1E4E4";
const GITHUB_100_LEVEL = "#FAE57E";

const p = new URLSearchParams(location.search);
const n = p.get('seller');
document.getElementById('n').textContent = n;
const K = 'sellerCache';

async function load() {
  let c = await chrome.storage.local.get([K, 'ts', 'dsi_version']);
  let data = c[K];
  if (!data || Date.now() - (c.ts || 0) > 86400000 || c.dsi_version !== VERSION) {
    const r = await fetch(DATA_URL);
    data = await r.json();
    await chrome.storage.local.set({ sellerCache: data, ts: Date.now(), dsi_version: VERSION });
  }
  const info = data[n] || data[n.toLowerCase()] || null;
  document.getElementById('s').textContent = info ? JSON.stringify(info, null, 2) : 'Seller not found';
}

load();