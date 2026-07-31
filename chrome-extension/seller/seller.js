const DATA_URL = 'https://raw.githubusercontent.com/defrance/dolistore-seller-info/refs/heads/develop/datas/dolistore_author.json';
const GITHUB_10_LEVEL = "#000000";
const GITHUB_25_LEVEL = "#F9BFA7";
const GITHUB_50_LEVEL = "#E1E4E4";
const GITHUB_100_LEVEL = "#FAE57E";

const p = new URLSearchParams(location.search);
const n = p.get('seller');
document.getElementById('n').textContent = n;
async function load() {
  const r = await fetch(DATA_URL);
  const data = await r.json();
  const info = data[n] || data[n.toLowerCase()] || null;
  document.getElementById('s').textContent = info ? JSON.stringify(info, null, 2) : 'Seller not found';
}

load();