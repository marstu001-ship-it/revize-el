// v9.49 — u stroje je měření a hned za ním jeho kontroly, v jedné kapitole.
// Zpráva uložená DŘÍV (bez příznaku D.stroje.spolu) se musí tisknout POSTARU,
// jinak by se jí posunulo číslo kapitoly Závady, na které odkazuje závěr.
const { chromium } = require('/opt/node22/lib/node_modules/playwright/node_modules/playwright-core');
const res = []; const check = (n, ok, d) => res.push((ok ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));

async function pdfText(p) {
  await p.evaluate(() => { generujPDF(); });
  await p.waitForTimeout(1800);
  return await p.evaluate(() => ({
    text: document.querySelector('#pdf-pages').innerText.replace(/[ \t]+/g, ' '),
    kap: Array.prototype.map.call(document.querySelectorAll('#pdf-pages .sec-head'),
      h => h.textContent.trim().replace(/\s+/g, ' ')),
    stran: document.querySelectorAll('#pdf-pages .a4').length
  }));
}

(async () => {
  const br = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await br.newContext({ viewport: { width: 1400, height: 1000 } });
  await ctx.addInitScript(() => { navigator.serviceWorker.register = () => new Promise(() => {}); });
  const p = await ctx.newPage();
  const chyby = []; p.on('pageerror', e => chyby.push(e.message));
  await p.goto('http://127.0.0.1:8901/index.html', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1200);

  // ── soubor dvou strojů, nová zpráva ─────────────────────────────
  await p.evaluate(() => {
    localStorage.clear(); STORE.technik = { jmeno: 'M. Technik' }; archiv.length = 0; STORE.archiv = archiv;
    aktTyp = 'stroje'; novaZprava('stroje');
  });
  await p.waitForTimeout(500);
  await p.evaluate(() => {
    const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); } };
    set('f_ev_cislo', 'RS-26-0001'); set('f_misto', 'Hala A'); set('f_zahajeni', '2026-09-15');
    set('f_celkovy_vysledek', 'neschopno');
    const sel = document.getElementById('f_stroje_rozsah');
    sel.value = 'soubor'; sel.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await p.waitForTimeout(400);
  await p.evaluate(() => {
    document.querySelector('#stroje-container .stroj-nazev').value = 'Soustruh SU 50';
    document.querySelector('#stroje-container .stroj-nazev').dispatchEvent(new Event('input', { bubbles: true }));
    addStroj({ nazev: 'Lis LEN 40' });
  });
  await p.waitForTimeout(400);

  const A = await pdfText(p);
  const kapStroje = A.kap.filter(k => /Naměřené hodnoty|Provedené kontroly/.test(k));
  check('jedna sloučená kapitola, ne dvě', kapStroje.length === 1, kapStroje.join(' || '));
  check('kapitola se jmenuje podle obojího',
    /Naměřené hodnoty, zkoušky a provedené kontroly/.test(kapStroje[0] || ''), kapStroje[0]);

  // pořadí: stroj1 → měření → kontroly → stroj2 → měření → kontroly
  // POZOR: innerText respektuje CSS text-transform, takže nadpis kapitoly
  // vyjde VELKÝMI PÍSMENY. Porovnávat bez ohledu na velikost.
  const t = A.text.toLowerCase();
  const iS1 = t.indexOf('soustruh su 50'), iS2 = t.indexOf('lis len 40');
  // Nadpis kapitoly sám obsahuje „provedené kontroly", proto se počítá
  // až od prvního stroje dál.
  const mer = [...t.matchAll(/naměřené hodnoty a zkoušky/g)].map(m => m.index).filter(x => x > iS1);
  const kon = [...t.matchAll(/provedené kontroly/g)].map(m => m.index).filter(x => x > iS1);
  check('každý stroj má svoje měření i kontroly', mer.length === 2 && kon.length === 2,
    'měření ×' + mer.length + ', kontroly ×' + kon.length);
  check('pořadí stroj1 → měření → kontroly → stroj2',
    iS1 >= 0 && iS2 >= 0 && iS1 < mer[0] && mer[0] < kon[0] && kon[0] < iS2 && iS2 < mer[1] && mer[1] < kon[1],
    JSON.stringify({ s1: iS1, m1: mer[0], k1: kon[0], s2: iS2, m2: mer[1], k2: kon[1] }) +
    ' | podkapitoly: ' + A.kap.filter(k => /^5\./.test(k)).join(' / '));

  // číslování kapitol musí sedět se závěrem
  const cisla = await p.evaluate(() => ({
    zavady: cisloKapitolyZavady(),
    vPdf: Array.prototype.map.call(document.querySelectorAll('#pdf-pages .sec-head'),
      h => h.querySelector('.sec-num').textContent.trim() + ' ' + h.querySelector('.sec-name').textContent.trim())
  }));
  const radekZavady = cisla.vPdf.find(x => /závad/i.test(x)) || '';
  check('cisloKapitolyZavady sedí s číslem v PDF',
    radekZavady.indexOf(String(cisla.zavady) + '.') === 0, 'funkce: ' + cisla.zavady + ', PDF: ' + radekZavady);
  const odkaz = (t.match(/uvedeny v kapitole (\d+) této zprávy/) || [])[1];
  check('odkaz z Prohlídky míří na kapitolu s kontrolami',
    odkaz && (cisla.vPdf.find(x => x.indexOf(odkaz + '.') === 0) || '').indexOf('provedené kontroly') !== -1,
    'odkaz na ' + odkaz + ' → ' + (cisla.vPdf.find(x => x.indexOf(odkaz + '.') === 0) || '?'));

  // ── jeden stroj ─────────────────────────────────────────────────
  await p.evaluate(() => {
    const sel = document.getElementById('f_stroje_rozsah');
    sel.value = 'jeden'; sel.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await p.waitForTimeout(400);
  const B = await pdfText(p);
  check('jeden stroj: taky jedna kapitola',
    B.kap.filter(k => /Naměřené hodnoty|Provedené kontroly/.test(k)).length === 1,
    B.kap.filter(k => /Naměřené|kontroly/.test(k)).join(' || '));
  check('jeden stroj: měření je před kontrolami',
    B.text.indexOf('Naměřené hodnoty a zkoušky') < B.text.indexOf('Provedené kontroly'));

  // ── ZPRÁVA ULOŽENÁ DŘÍV (bez příznaku) se tiskne postaru ────────
  await p.evaluate(() => { saveToArchiv(); });
  await p.waitForTimeout(500);
  const stare = await p.evaluate(() => {
    // simulace zprávy z v9.48: příznak se z dat odstraní
    delete archiv[0].data.stroje.spolu;
    saveStore(); otevritZpravu(0);
    return true;
  });
  await p.waitForTimeout(900);
  const C = await pdfText(p);
  const kapC = C.kap.filter(k => /Naměřené hodnoty|Provedené kontroly/.test(k));
  check('stará zpráva: zase DVĚ kapitoly', kapC.length === 2, kapC.join(' || '));
  check('stará zpráva: původní název kapitoly',
    /Naměřené hodnoty a zkoušky \(dle/.test(kapC[0] || ''), kapC[0]);
  const cislaC = await p.evaluate(() => ({
    zavady: cisloKapitolyZavady(),
    vPdf: Array.prototype.map.call(document.querySelectorAll('#pdf-pages .sec-head'),
      h => h.querySelector('.sec-num').textContent.trim() + ' ' + h.querySelector('.sec-name').textContent.trim())
  }));
  const radekC = cislaC.vPdf.find(x => /závad/i.test(x)) || '';
  check('stará zpráva: číslování kapitol pořád sedí',
    radekC.indexOf(String(cislaC.zavady) + '.') === 0, 'funkce: ' + cislaC.zavady + ', PDF: ' + radekC);
  check('stará zpráva má o kapitolu vyšší číslo závad než nová',
    cislaC.zavady === cisla.zavady + 1, cislaC.zavady + ' vs ' + cisla.zavady);

  check('bez chyb stránky', chyby.length === 0, chyby.join(' | '));
  await br.close();
  console.log(res.join('\n'));
  console.log(res.every(r => r[0] === '✅') ? '\nVŠE OK (' + res.length + ')' : '\nSELHALO');
  process.exit(res.every(r => r[0] === '✅') ? 0 : 1);
})();
