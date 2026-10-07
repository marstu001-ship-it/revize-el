// ulozitSoubor() nabízí v dialogu „Uložit jako" typ podle druhu blobu.
// v9.42 přibyl ZIP — tenhle test hlídá, že se PDF ani JSON nerozbily.
const { chromium } = require('/opt/node22/lib/node_modules/playwright/node_modules/playwright-core');
const res = []; const check = (n, ok, d) => res.push((ok?'✅':'❌')+' '+n+(d?' — '+d:''));
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await b.newPage({ viewport: { width: 1200, height: 800 }, acceptDownloads: true });
  const err = []; p.on('pageerror', e => err.push(e.message));
  await p.addInitScript(() => { try { navigator.serviceWorker.register = () => new Promise(() => {}); } catch (e) {} });
  await p.goto('http://127.0.0.1:8901/index.html', { waitUntil: 'load' });
  await p.waitForTimeout(900);

  const v = await p.evaluate(async () => {
    const zachyt = [];
    window.showSaveFilePicker = async (o) => {
      zachyt.push(o);
      const e = new Error('zrušeno'); e.name = 'AbortError'; throw e;
    };
    const zkus = async (typ, jmeno) => {
      window.__ulozitSouborLock = 0;                 // zámek proti dvojímu stažení
      await ulozitSoubor(new Blob(['x'], { type: typ }), jmeno);
    };
    await zkus('application/pdf', 'a.pdf');
    await zkus('application/json', 'a.json');
    await zkus('application/zip', 'a.zip');
    return zachyt.map(o => ({
      jmeno: o.suggestedName,
      popis: o.types[0].description,
      pripony: JSON.stringify(o.types[0].accept)
    }));
  });

  check('zachyceny tři pokusy', v.length === 3, String(v.length));
  if (v.length === 3) {
    check('PDF nabízí PDF', /PDF/.test(v[0].popis) && /\.pdf/.test(v[0].pripony), v[0].popis + ' ' + v[0].pripony);
    check('JSON nabízí JSON', /JSON/.test(v[1].popis) && /\.json/.test(v[1].pripony), v[1].popis + ' ' + v[1].pripony);
    check('ZIP nabízí ZIP', /ZIP/.test(v[2].popis) && /\.zip/.test(v[2].pripony), v[2].popis + ' ' + v[2].pripony);
    check('ZIP nedostane příponu .pdf', !/\.pdf/.test(v[2].pripony), v[2].pripony);
  }
  check('bez chyb stránky', err.length === 0, err.join(' | '));

  // snímek karty v Nastavení
  await p.evaluate(() => showScreen('nastaveni'));
  await p.waitForTimeout(400);
  const karta = await p.$('#btn-zip-kodu');
  if (karta) {
    const scard = await p.evaluateHandle(el => el.closest('.scard'), karta);
    await scard.asElement().screenshot({ path: __dirname + '/_beh/snimek-zip-karta.png' });
    check('karta v Nastavení je vidět', true);
  } else check('karta v Nastavení je vidět', false);

  console.log(res.join('\n'));
  await b.close();
  process.exit(res.some(r => r.startsWith('❌')) ? 1 : 0);
})().catch(e => { console.error('CRASH:', e.message); process.exit(2); });
