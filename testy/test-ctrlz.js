// v9.98 — Ctrl+Z vezme poslední ZPĚT i po zmizení hlášky.
const { chromium } = require('/opt/node22/lib/node_modules/playwright/node_modules/playwright-core');
const PORT = process.env.PORT || 8901;
const res = []; const check = (n, ok, d) => res.push((ok?'✅':'❌')+' '+n+(d?' — '+d:''));
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await b.newPage({ viewport: { width: 1500, height: 1000 } });
  const err = []; p.on('pageerror', e => err.push(e.message));
  p.on('dialog', d => d.accept());
  await p.addInitScript(() => { try { navigator.serviceWorker.register = () => new Promise(() => {}); } catch (e) {} });
  await p.goto('http://127.0.0.1:' + PORT + '/index.html', { waitUntil: 'load' });
  await p.waitForTimeout(900);
  await p.evaluate(async () => {
    localStorage.clear(); archiv.length = 0; STORE.archiv = archiv;
    aktTyp='elektro'; aktPodtyp='dum'; novaZprava('elektro');
    await new Promise(r=>setTimeout(r,300));
    switchTab('mereni');
    const tb = document.querySelector('#rozvadece-container .meas-table tbody');
    while (tb.querySelectorAll('tr[data-rowtype="obvod"]').length < 4) addMereniRowTo(tb);
    tb.querySelectorAll('tr[data-rowtype="obvod"]').forEach((tr, i) => { tr.querySelectorAll('input')[1].value = 'Obvod ' + (i + 1); });
  });
  const nazvy = () => p.evaluate(() => Array.from(document.querySelectorAll('#rozvadece-container .meas-table tbody tr[data-rowtype="obvod"]'))
    .map(tr => tr.querySelectorAll('input')[1].value).join(','));
  const smaz = (n) => p.evaluate((n) => {
    const tr = Array.from(document.querySelectorAll('#rozvadece-container .meas-table tbody tr[data-rowtype="obvod"]'))
      .find(t => t.querySelectorAll('input')[1].value === n);
    tr.querySelector('[data-action="delRow"]').click();
  }, n);
  const bezHlasek = () => p.evaluate(() => { const w = document.getElementById('toast-wrap'); if (w) w.innerHTML = ''; });
  const fokusPryc = () => p.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });

  const puvodne = await nazvy();
  await smaz('Obvod 2'); await bezHlasek(); await fokusPryc();
  check('řádek je smazaný a hláška zmizela', (await nazvy()) === 'Obvod 1,Obvod 3,Obvod 4');
  await p.keyboard.press('Control+z');
  check('Ctrl+Z vrátí řádek i po zmizení hlášky na jeho místo', (await nazvy()) === puvodne, await nazvy());
  const hl = await p.evaluate(() => document.getElementById('toast-wrap').innerText);
  check('program řekne, co vzal zpět', /Vzato zpět/.test(hl), hl);

  // dvakrát smazat → dvakrát Ctrl+Z, v obráceném pořadí
  await smaz('Obvod 1'); await smaz('Obvod 4'); await bezHlasek(); await fokusPryc();
  await p.keyboard.press('Control+z');
  check('první Ctrl+Z vrátí naposledy smazaný', (await nazvy()) === 'Obvod 2,Obvod 3,Obvod 4', await nazvy());
  await p.keyboard.press('Control+z');
  check('druhé Ctrl+Z vrátí i ten předtím', (await nazvy()) === puvodne, await nazvy());

  // klik na ZPĚT a potom Ctrl+Z nesmí vrátit dvakrát
  await smaz('Obvod 3');
  await p.evaluate(() => { Array.from(document.querySelectorAll('#toast-wrap button')).find(b => /ZPĚT/.test(b.textContent)).click(); });
  await bezHlasek(); await fokusPryc();
  const pocet = (await nazvy()).split(',').length;
  await p.keyboard.press('Control+z');
  check('po kliknutí na ZPĚT už Ctrl+Z nic nevrací', (await nazvy()).split(',').length === pocet && (await nazvy()) === puvodne, await nazvy());
  const nic = await p.evaluate(() => document.getElementById('toast-wrap').innerText);
  check('když není co vrátit, řekne to', /Není co vzít zpět/.test(nic), nic);

  // Ctrl+Z v psacím poli patří prohlížeči
  await smaz('Obvod 2'); await bezHlasek();
  await p.evaluate(() => document.querySelector('#rozvadece-container .meas-table tbody tr[data-rowtype="obvod"] input:not([readonly])').focus());
  await p.keyboard.press('Control+z');
  check('Ctrl+Z v buňce nechá smazaný řádek smazaný (vrací psaní)', (await nazvy()) === 'Obvod 1,Obvod 3,Obvod 4', await nazvy());
  await fokusPryc();
  await p.keyboard.press('Control+z');
  check('mimo buňku ho pak vrátí', (await nazvy()) === puvodne, await nazvy());

  // otevření jiné zprávy zásobník vyprázdní
  await smaz('Obvod 4'); await bezHlasek();
  await p.evaluate(async () => { saveToArchiv(); novaZprava('elektro'); await new Promise(r=>setTimeout(r,300)); });
  await fokusPryc();
  const radkuPred = await p.evaluate(() => document.querySelectorAll('#rozvadece-container .meas-table tbody tr').length);
  await p.keyboard.press('Control+z');
  const radkuPo = await p.evaluate(() => document.querySelectorAll('#rozvadece-container .meas-table tbody tr').length);
  check('v jiné zprávě Ctrl+Z nevrací řádek z předchozí', radkuPred === radkuPo, radkuPred + '→' + radkuPo);

  // smazaná zpráva v archivu
  await p.evaluate(async () => { showScreen('home'); renderArchiv(); });
  const pred = await p.evaluate(() => archiv.length);
  await p.evaluate(() => { smazatZpravu(0); });
  await bezHlasek(); await fokusPryc();
  await p.keyboard.press('Control+z');
  check('Ctrl+Z vrátí smazanou zprávu do archivu', (await p.evaluate(() => archiv.length)) === pred);

  check('bez chyb stránky', err.length === 0, err.join(' | '));
  console.log(res.join('\n'));
  await b.close();
  process.exit(res.some(r => r.startsWith('❌')) ? 1 : 0);
})().catch(e => { console.error('CRASH:', e.message); process.exit(2); });
