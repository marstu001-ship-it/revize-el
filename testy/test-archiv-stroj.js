// v9.47 — v seznamu archivu má zpráva o stroji ukázat NÁZEV a TYP stroje,
// ne jen umístění (pokyn uživatele 2026-09-15). Jen u typu „stroje".
const { chromium } = require('/opt/node22/lib/node_modules/playwright/node_modules/playwright-core');
const res = []; const check = (n, ok, d) => res.push((ok ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));

(async () => {
  const br = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await br.newContext({ viewport: { width: 1400, height: 900 } });
  await ctx.addInitScript(() => { navigator.serviceWorker.register = () => new Promise(() => {}); });
  const p = await ctx.newPage();
  const chyby = []; p.on('pageerror', e => chyby.push(e.message));
  await p.goto('http://127.0.0.1:8901/index.html', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1200);

  // Naplnit archiv: stroj vyplněný, stroj nevyplněný, soubor 3 strojů, elektro
  await p.evaluate(() => {
    localStorage.clear();
    STORE.technik = { jmeno: 'M. Technik' };
    archiv.length = 0;
    const mk = (o) => ({ uid: 'u' + Math.random(), typ: o.typ, ev_cislo: o.ev, misto: o.misto,
      datum: '2026-09-15', vysledek: 'schopno', stav: '', data: o.data, timestamp: new Date().toISOString() });
    archiv.push(mk({ typ: 'stroje', ev: 'RS-26-0001', misto: 'Budova M4 – kuchyně – areál Vzorová firma',
      data: { typ: 'stroje', stroje: { rozsah: 'jeden', seznam: [{ nazev: 'Soustruh SU 50', typ: 'SUI 50/1000', vyrobni_cislo: 'A-7781' }] } } }));
    archiv.push(mk({ typ: 'stroje', ev: 'RS-26-0002', misto: 'Hala B',
      data: { typ: 'stroje', stroje: { rozsah: 'jeden', seznam: [{}] } } }));
    archiv.push(mk({ typ: 'stroje', ev: 'RS-26-0003', misto: 'Lakovna',
      data: { typ: 'stroje', stroje: { rozsah: 'soubor', seznam: [
        { nazev: 'Lis LEN 40', typ: 'LEN 40 C' }, { nazev: 'Bruska BPH 320' }, { nazev: 'Pila PK 250' }] } } }));
    archiv.push(mk({ typ: 'elektro', ev: 'RE-26-0100', misto: 'Rodinný dům Kyjov',
      data: { typ: 'elektro' } }));
    STORE.archiv = archiv; saveStore(); renderArchiv();
    showScreen('archiv');
  });
  await p.waitForTimeout(400);

  const radky = await p.$$eval('.archiv-table tbody tr', trs => trs.map(tr => ({
    ev: (function () { var c = tr.querySelector('[data-archiv-ev]'); return c ? c.textContent.trim() : ''; })(),
    misto: (function () { var c = tr.querySelector('[data-archiv-misto]'); return c ? c.innerText.trim() : ''; })(),
  })));
  const najdi = (ev) => (radky.find(r => r.ev.indexOf(ev) !== -1) || {}).misto || '';

  const r1 = najdi('RS-26-0001');
  check('stroj: název je v seznamu', r1.indexOf('Soustruh SU 50') !== -1, r1.replace(/\n/g, ' ⏎ '));
  check('stroj: typ je v seznamu', r1.indexOf('SUI 50/1000') !== -1);
  check('stroj: umístění zůstalo', r1.indexOf('Budova M4') !== -1);
  check('stroj: pořadí název → typ → místo',
    r1.indexOf('Soustruh') < r1.indexOf('SUI 50') && r1.indexOf('SUI 50') < r1.indexOf('Budova M4'), r1.replace(/\n/g, ' ⏎ '));

  const r2 = najdi('RS-26-0002');
  check('nevyplněný stroj se chová jako dřív', r2 === 'Hala B', JSON.stringify(r2));

  const r3 = najdi('RS-26-0003');
  check('soubor strojů: první stroj + počet', /Lis LEN 40/.test(r3) && /\+ 2 další/.test(r3), r3.replace(/\n/g, ' ⏎ '));

  const r4 = najdi('RE-26-0100');
  check('elektro se nezměnilo', r4 === 'Rodinný dům Kyjov', JSON.stringify(r4));

  // velikosti písma: název > místo
  const velikosti = await p.evaluate(() => {
    const tr = Array.from(document.querySelectorAll('.archiv-table tbody tr'))
      .find(t => t.textContent.indexOf('RS-26-0001') !== -1);
    const d = tr.querySelector('[data-archiv-misto]').querySelectorAll('div');
    return Array.from(d).map(x => parseFloat(getComputedStyle(x).fontSize) + '|' + getComputedStyle(x).fontWeight);
  });
  check('název je větší a tučnější než místo',
    parseFloat(velikosti[0]) > parseFloat(velikosti[2]) && parseInt(velikosti[0].split('|')[1]) >= 600,
    velikosti.join(' , '));

  // hledání podle názvu stroje a podle výrobního čísla
  for (const [dotaz, cekam] of [['soustruh', 'RS-26-0001'], ['A-7781', 'RS-26-0001'], ['bruska', 'RS-26-0003']]) {
    await p.evaluate((q) => { document.getElementById('archiv-search').value = q; renderArchiv(); }, dotaz);
    await p.waitForTimeout(250);
    const evs = await p.$$eval('.archiv-table tbody tr', trs => trs.map(function (t) {
      var c = t.querySelector('[data-archiv-ev]'); return c ? c.textContent.trim() : '';
    }));
    check('hledání „' + dotaz + '" najde ' + cekam, evs.length === 1 && evs[0].indexOf(cekam) !== -1, evs.join(','));
  }
  await p.evaluate(() => { document.getElementById('archiv-search').value = ''; renderArchiv(); });
  await p.waitForTimeout(300);

  // Naposledy otevřené
  await p.evaluate(() => { archiv[0].pinned = true; saveStore(); renderArchiv(); });
  await p.waitForTimeout(300);
  const karta = await p.$eval('#archiv-recents', e => e.innerText);
  check('karta „Připnuté" ukazuje stroj taky', /Soustruh SU 50/.test(karta), karta.replace(/\n/g, ' ⏎ ').slice(0, 120));

  check('bez chyb stránky', chyby.length === 0, chyby.join(' | '));
  await p.screenshot({ path: __dirname + '/_beh/archiv-stroj.png', clip: { x: 0, y: 120, width: 1400, height: 560 } });
  await br.close();
  console.log(res.join('\n'));
  console.log(res.every(r => r[0] === '✅') ? '\nVŠE OK (' + res.length + ')' : '\nSELHALO');
  process.exit(res.every(r => r[0] === '✅') ? 0 : 1);
})();
