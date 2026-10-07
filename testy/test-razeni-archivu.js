// v9.98 — řazení archivu kliknutím na záhlaví sloupce (jako Outlook).
const { chromium } = require('/opt/node22/lib/node_modules/playwright/node_modules/playwright-core');
const PORT = process.env.PORT || 8901;
const res = []; const check = (n, ok, d) => res.push((ok?'✅':'❌')+' '+n+(d?' — '+d:''));
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await b.newPage({ viewport: { width: 1500, height: 1000 } });
  const err = []; p.on('pageerror', e => err.push(e.message));
  await p.addInitScript(() => { try { navigator.serviceWorker.register = () => new Promise(() => {}); } catch (e) {} });
  await p.goto('http://127.0.0.1:' + PORT + '/index.html', { waitUntil: 'load' });
  await p.waitForTimeout(900);
  await p.evaluate(() => {
    localStorage.clear(); archiv.length = 0;
    const z = (ev, misto, datum, typ, stav, ts) => ({ uid: 'u' + ev, ev_cislo: ev, misto: misto, datum: datum, typ: typ, stav: stav, timestamp: ts, data: {} });
    archiv.push(z('RE-26-0010', 'Škola Kyjov', '2026-03-01', 'elektro', '', 3));
    archiv.push(z('RE-26-0009', 'Autoservis', '2026-05-10', 'lps', '', 2));
    archiv.push(z('RE-26-0100', 'Byt Novák', '2026-01-15', 'elektro', 'aktivni', 1));
    archiv.push(z('RS-26-0002', 'Čerpací stanice', '2026-07-20', 'stroje', '', 4));
    STORE.archiv = archiv; showScreen('home'); renderArchiv();
  });
  const poradi = () => p.evaluate(() => Array.from(document.querySelectorAll('#archiv-list [data-archiv-ev], .archiv-table [data-archiv-ev]'))
    .map(td => td.textContent.trim().match(/R[ES]-\d\d-\d+/)[0]).join(','));
  const klik = (sl) => p.evaluate((sl) => document.querySelector('.archiv-table th[data-sloupec="' + sl + '"]').click(), sl);
  const vychozi = await poradi();
  check('výchozí pořadí: rozpracovaná nahoře', vychozi.split(',')[0] === 'RE-26-0100', vychozi);

  await klik('ev');
  check('Ev. číslo ▲ — čísla jako čísla (9 před 10 před 100)', (await poradi()) === 'RE-26-0009,RE-26-0010,RE-26-0100,RS-26-0002', await poradi());
  const th = await p.evaluate(() => document.querySelector('.archiv-table th[data-sloupec="ev"]').textContent);
  check('záhlaví ukazuje šipku ▲', /▲/.test(th), th);
  await klik('ev');
  check('druhý klik obrátí pořadí ▼', (await poradi()) === 'RS-26-0002,RE-26-0100,RE-26-0010,RE-26-0009', await poradi());
  await klik('ev');
  check('třetí klik vrátí výchozí pořadí', (await poradi()) === vychozi, await poradi());

  await klik('datum');
  check('Datum napoprvé od nejnovějšího (jako pošta)', (await poradi()) === 'RS-26-0002,RE-26-0009,RE-26-0010,RE-26-0100', await poradi());
  await klik('misto');
  check('Místo podle abecedy s háčky (Č po C, Š po S)', (await poradi()) === 'RE-26-0009,RE-26-0100,RS-26-0002,RE-26-0010', await poradi());

  // přežije překreslení i restart (localStorage)
  await p.evaluate(() => renderArchiv());
  check('řazení přežije překreslení', (await poradi()) === 'RE-26-0009,RE-26-0100,RS-26-0002,RE-26-0010');
  const ulozeno = await p.evaluate(() => localStorage.getItem('revize_el_archiv_razeni'));
  check('řazení je zapamatované v prohlížeči', /misto/.test(ulozeno || ''), ulozeno);

  // zaškrtávátko v hlavičce dál jen označuje, neřadí
  await p.evaluate(() => document.querySelector('.archiv-table .archiv-check[data-action="archivVyberVse"]').click());
  check('zaškrtávátko v hlavičce pořadí nezmění', (await poradi()) === 'RE-26-0009,RE-26-0100,RS-26-0002,RE-26-0010', await poradi());

  check('bez chyb stránky', err.length === 0, err.join(' | '));
  console.log(res.join('\n'));
  await b.close();
  process.exit(res.some(r => r.startsWith('❌')) ? 1 : 0);
})().catch(e => { console.error('CRASH:', e.message); process.exit(2); });
