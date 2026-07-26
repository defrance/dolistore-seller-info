async function dsiGetData() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: 'getSellerData' }, response => {
      if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
      if (response?.error) return reject(new Error(response.error));
      resolve(response.data);
    });
  });
}

function dsiShowToast(message, isError) {
  document.getElementById('dsi-toast')?.remove();
  const toast = document.createElement('div');
  toast.id = 'dsi-toast';
  toast.textContent = message;
  toast.style.cssText = `position:fixed;top:16px;right:16px;z-index:999999;background:${isError ? '#d9534f' : '#28a745'};color:#fff;padding:10px 16px;border-radius:6px;font-family:sans-serif;font-size:13px;box-shadow:0 4px 12px rgba(0,0,0,.2)`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

function dsiExtractInfoList() {
  const officialTable = document.querySelector('table.info-table-box');
  if (!officialTable) return null;
  const boxes = officialTable.querySelectorAll('.info-list-box');
  if (!boxes.length) return null;
  const info = {};
  boxes.forEach(box => {
    box.querySelectorAll('li').forEach(li => {
      const clone = li.cloneNode(true);
      clone.querySelectorAll('.dsi-magnifier-icon').forEach(iconEl => iconEl.remove());
      const labelEls = Array.from(clone.querySelectorAll('b, strong'));
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

function dsiGetProductTitle() {
  return document.querySelector('h1')?.textContent.trim() || document.title;
}

chrome.runtime.onMessage.addListener((m, sender, sendResponse) => {
  if (m.action === 'dsiScrapeAndSave') {
    const module = {
      url: location.href,
      title: dsiGetProductTitle(),
      info: dsiExtractInfoList(),
      savedAt: new Date().toISOString(),
    };
    chrome.runtime.sendMessage({ action: 'saveModule', module }, response => {
      const ok = !chrome.runtime.lastError && !response?.error;
      dsiShowToast(ok ? t.moduleSaveSuccess : t.moduleSaveError, !ok);
      sendResponse({ ok, error: response?.error });
    });
    return true; // réponse asynchrone
  }
});

function dsiShowPopup(seller, info, anchorEl) {
  document.getElementById('dsi-popup')?.remove();
  const p = document.createElement('div');
  p.id = 'dsi-popup';
  p.style.cssText = 'position:absolute;z-index:999999;background:#fff;border:1px solid #ddd;border-radius:10px;padding:16px;width:520px;box-shadow:0 4px 24px rgba(0,0,0,.18);font-family:sans-serif;font-size:13px;color:#333;';
  if (!info) {
    p.innerHTML = `<b>${seller}</b><br><em style="color:#999">${t.sellerNotFound}</em><span id="dsi-x" style="position:absolute;top:10px;right:14px;cursor:pointer;font-size:18px;color:#bbb">✕</span>`;
  } else {
    const { nb_produits, nb_actifs, nb_inactifs, nb_avec_acces_updates, prix_moyen, prix_min, prix_max, derniere_mise_a_jour, jours_depuis_derniere_maj, date_premier_produit, date_dernier_produit, produits, moyenne_telechargement, socname, preferred_partner, github_contributor_level, presentation_text, versions_dolibarr } = info;
    const row = (label, val) => `<tr><td style="padding:3px 0;color:#888">${label}</td><td style="text-align:right;font-weight:500">${val}</td></tr>`;
    const sep = `<tr><td colspan="2"><hr style="border:none;border-top:1px solid #f0f0f0;margin:5px 0"></td></tr>`;
    const toFR = d => { const [m, j, a] = d.split('/'); return `${j}/${m}/${a}`; };
    const top5 = (produits || []).filter(pr => pr.active === 2).slice(0, 5);
    const accesLabel = moyenne_telechargement === null || moyenne_telechargement === undefined ? t.unlimited : moyenne_telechargement + ' ' + t.days;
    const githubColor = github_contributor_level >= 100 ? '#FAE57E'
                      : github_contributor_level >= 50  ? '#E1E4E4'
                      : github_contributor_level >= 25  ? '#F9BFA7'
                      : github_contributor_level >= 10  ? '#000000'
                      : null;
    const prodRows = top5.map(pr => `
      <tr style="border-bottom:1px solid #f0f0f0;cursor:pointer" onclick="window.open('https://www.dolistore.com/product.php?id=${pr.id}','_blank')">
        <td style="padding:3px 4px;white-space:nowrap">${toFR(pr.date)}</td>
        <td style="padding:3px 4px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-decoration:underline" title="${pr.product_name}">${pr.product_name}</td>
        <td style="padding:3px 4px;white-space:nowrap">${toFR(pr.last_update.split(' ')[0])}</td>
        <td style="padding:3px 4px;white-space:nowrap">${pr.compatibility_dolibarr}</td>
        <td style="padding:3px 4px;white-space:nowrap;text-align:right">${pr.price} €</td>
      </tr>`).join('');
    p.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <span style="font-size:14px;font-weight:700">
          ${socname || seller}
          ${preferred_partner === 1 ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" style="width:24px;height:24px;fill:#E8A000;vertical-align:middle;margin-left:4px"><title>Dolibarr prefered partner</title><path d="M263.6 224.2L263.6 543.7L144.2 542.4L144.2 96L299.8 96C368 96 421.5 113.2 460.1 147.7C506 188.9 528.9 244.8 528.9 315.5C528.9 383.1 509.3 438.2 470.1 481C430.9 523.8 381.3 544 319.6 544C312.3 544 299.3 543.8 283 543.7L283 412.6L315.9 412.4C385.5 412 406.5 380.2 406.5 315.4C406.5 254.6 372.3 224.2 303.9 224.2L263.6 224.2z"/></svg>' : ''}
          ${githubColor ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" style="width:24px;height:24px;fill:${githubColor};vertical-align:middle;margin-left:4px"><title>GitHub core contributor</title><path d="M480 96C515.3 96 544 124.7 544 160L544 480C544 515.3 515.3 544 480 544L160 544C124.7 544 96 515.3 96 480L96 160C96 124.7 124.7 96 160 96L480 96zM319.7 160C231.3 160 160 232.2 160 320.6C160 390 204.1 447.5 263.4 469C271.8 472.1 280 466.5 280 458.1L280 433.1C275.6 435 270 436.2 265 436.2C244.4 436.2 232.2 425 223.4 404C220 395.6 216.2 390.6 209 389.6C205.3 389.3 204 387.7 204 385.8C204 382.1 210.2 379.2 216.5 379.2C225.6 379.2 233.4 384.8 241.5 396.4C247.7 405.5 254.3 409.5 262.1 409.5C269.9 409.5 274.9 406.7 282.1 399.5C287.4 394.2 291.5 389.5 295.2 386.4C253.9 381.4 224.9 351.7 224.9 313.3C224.9 297.7 230.5 280.8 239.9 269.5C235.8 259.2 236.5 237.3 241.1 228.3C253.6 226.7 270.5 233.3 280.5 242.4C292.4 238.7 304.9 236.8 320.2 236.8C335.5 236.8 348 238.7 359.3 242.1C369 233.3 386.2 226.8 398.7 228.3C403.1 236.7 403.7 258.6 399.6 269.2C409.6 281.1 414.9 297 414.9 313.3C414.9 351.7 385.8 380.8 344 386.1C354.6 393 361.8 408 361.8 425.2L361.8 457.7C361.8 467.1 369.6 472.4 379 468.6C435.6 447 479.9 390.5 479.9 320.5C479.9 232.1 408 159.9 319.6 159.9z"/></svg>` : ''}
        </span>
        <span id="dsi-x" style="cursor:pointer;font-size:18px;line-height:1;color:#bbb">✕</span>
      </div>
      ${presentation_text ? `<p style="margin:0 0 10px 0;font-size:12px;color:#555;font-style:italic">${presentation_text}</p>` : ''}
      <table style="width:100%;border-collapse:collapse">
        ${row(t.firstModuleYear, date_premier_produit.split('/').pop() + ' - ' + date_dernier_produit.split('/').pop())}
        ${row(t.modulesForSale, nb_actifs+' '+t.active+' / '+nb_inactifs+' '+t.inactive)}
        ${row(t.dolibarrCompatibility, versions_dolibarr)}
        ${sep}
        ${row(t.averagePrice, prix_moyen + ' €')}
        ${row(t.averageUpdateAccess, accesLabel)}
        ${sep}
      </table>
      ${top5.length ? `
      <table style="width:100%;border-collapse:collapse;font-size:11px;margin-top:6px">
        <thead>
          <tr style="color:#888;border-bottom:2px solid #eee">
            <th style="padding:3px 4px;font-weight:600;text-align:left">${t.colDate}</th>
            <th style="padding:3px 4px;font-weight:600;text-align:left">${t.colProduct}</th>
            <th style="padding:3px 4px;font-weight:600;text-align:left">${t.colUpdate}</th>
            <th style="padding:3px 4px;font-weight:600;text-align:left">${t.colCompat}</th>
            <th style="padding:3px 4px;font-weight:600;text-align:right">${t.colPrice}</th>
          </tr>
        </thead>
        <tbody>${prodRows}</tbody>
      </table>` : ''}`;
  }
  document.body.appendChild(p);
  // Positionne au-dessus de l'élément cliqué
  const rect = anchorEl.getBoundingClientRect();
  const popupH = p.offsetHeight;
  const top = rect.top + window.scrollY - popupH - 8;
  const left = Math.min(rect.left + window.scrollX, window.innerWidth - 540);
  p.style.top = Math.max(window.scrollY + 8, top) + 'px';
  p.style.left = Math.max(8, left) + 'px';
  document.getElementById('dsi-x').addEventListener('click', () => p.remove());
}

document.querySelectorAll('span.infos-module').forEach(el => {
  // Ne traiter que le span qui suit <b>Auteur / Author / Autor / Autore</b>
  const li = el.closest('li');
  if (!li) return;
  const label = li.querySelector('b');
  const AUTHOR_LABELS = ['Auteur', 'Author', 'Autor', 'Autore'];
  if (!label || !AUTHOR_LABELS.includes(label.textContent.trim())) return;

  // Ajoute l'icône loupe après le nom du vendeur
  const icon = document.createElement('span');
  icon.className = 'dsi-magnifier-icon';
  icon.textContent = ' 🔍';
  icon.style.cssText = 'font-size:12px;cursor:pointer;';
  el.append(icon);

  el.style.cursor = 'pointer';
  el.title = t.clickToSeeProfile;
  el.addEventListener('click', async e => {
    e.preventDefault();
    e.stopPropagation();
    const seller = el.childNodes[0].textContent.trim();
    const data = await dsiGetData();
    const info = data[seller] || data[seller.toLowerCase()] || null;
    dsiShowPopup(seller, info, el);
  });
});