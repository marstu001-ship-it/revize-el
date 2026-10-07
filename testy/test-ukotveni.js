// v9.98 — ukotvený sloupec Č. a Název obvodu při vodorovném posunu tabulky.
const { chromium } = require('/opt/node22/lib/node_modules/playwright/node_modules/playwright-core');
const PORT = process.env.PORT || 8901;
const res = []; const check = (n, ok, d) => res.push((ok?'✅':'❌')+' '+n+(d?' — '+d:''));
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await b.newPage({ viewport: { width: 760, height: 900 } });
  const err = []; p.on('pageerror', e => err.push(e.message));
  await p.addInitScript(() => { try { navigator.serviceWorker.register = () => new Promise(() => {}); } catch (e) {} });
  await p.goto('http://127.0.0.1:' + PORT + '/index.html', { waitUntil: 'load' });
  await p.waitForTimeout(900);
  await p.evaluate(async () => {
    localStorage.clear(); archiv.length = 0; STORE.archiv = archiv;
    aktTyp='elektro'; aktPodtyp='dum'; novaZprava('elektro');
    await new Promise(r=>setTimeout(r,300));
    switchTab('mereni');
    const tb = document.querySelector('#rozvadece-container .meas-table tbody');
    while (tb.querySelectorAll('tr[data-rowtype="obvod"]').length < 25) addMereniRowTo(tb);
    addRcdRow(null);
    tb.querySelectorAll('tr[data-rowtype="obvod"]').forEach((tr, i) => { tr.querySelectorAll('input')[1].value = 'Zásuvky ' + (i + 1); });
  });
  await p.evaluate(() => document.querySelector('#rozvadece-container .meas-table tbody tr[data-rowtype="obvod"]').scrollIntoView({ block: 'center' }));
  const stav = async () => p.evaluate(() => {
    const wrap = document.querySelector('#rozvadece-container .meas-table-wrap');
    const wr = wrap.getBoundingClientRect();
    const tr = document.querySelector('#rozvadece-container .meas-table tbody tr[data-rowtype="obvod"]');
    const c1 = tr.children[0].getBoundingClientRect(), c2 = tr.children[1].getBoundingClientRect(), c5 = tr.children[6].getBoundingClientRect();
    const th2 = document.querySelector('#rozvadece-container .meas-table th.mr-lep2').getBoundingClientRect();
    // co je vidět na místě názvu obvodu
    const bod = document.elementFromPoint(c2.left + 8, c2.top + c2.height / 2);
    return { wl: wr.left, sl: wrap.scrollLeft, max: wrap.scrollWidth - wrap.clientWidth,
      c1: c1.left, c1r: c1.right, c2: c2.left, c5: c5.left, th2: th2.left,
      vidim: bod && bod.closest('td') === tr.children[1],
      stin: wrap.classList.contains('mr-odsunuto') };
  });
  const a = await stav();
  check('na úzkém okně se tabulka posouvá do strany', a.max > 50, String(a.max));
  await p.evaluate(() => { const w = document.querySelector('#rozvadece-container .meas-table-wrap'); w.scrollLeft = 400; });
  await p.waitForTimeout(150);
  const z = await stav();
  check('sloupec Č. zůstal u levého kraje', Math.abs(z.c1 - z.wl) < 2, JSON.stringify(z));
  check('Název obvodu stojí hned vedle, nepřekrývá Č.', Math.abs(z.c2 - z.c1r) < 2, z.c2 + ' vs ' + z.c1r);
  check('ostatní sloupce odjely o celý posun', Math.abs((a.c5 - z.c5) - z.sl) < 2, a.c5 + '→' + z.c5 + ' posun ' + z.sl);
  check('na místě názvu je opravdu buňka názvu (nic pod ní neprosvítá)', z.vidim);
  check('záhlaví Název obvodu drží s ním', Math.abs(z.th2 - z.c2) < 2, z.th2 + ' vs ' + z.c2);
  check('za ukotveným sloupcem je stínek', z.stin);
  // podřádky chrániče (sloučené buňky) se neukotvují
  const rcd = await p.evaluate(() => {
    const tr = document.querySelector('#rozvadece-container .meas-table tbody tr[data-rowtype="rcd-mereni"]');
    return tr ? getComputedStyle(tr.children[0]).position + '/' + tr.children[0].colSpan : 'není';
  });
  check('sloučená buňka podřádku chrániče se neukotví', /^(static|relative)\/\d+$/.test(rcd) && !/\/1$/.test(rcd), rcd);
  // plovoucí hlavička po odrolování dolů
  await p.evaluate(() => { const t = document.querySelector('#rozvadece-container .meas-table'); window.scrollTo(0, t.getBoundingClientRect().top + window.scrollY + 300); });
  await p.waitForTimeout(250);
  const pl = await p.evaluate(() => {
    const k = document.querySelector('#plov-hlavicka th.mr-lep2');
    const tr = document.querySelector('#rozvadece-container .meas-table tbody tr[data-rowtype="obvod"]');
    return k ? { k: k.getBoundingClientRect().left, c2: tr.children[1].getBoundingClientRect().left,
                 vid: document.getElementById('plov-hlavicka').offsetHeight } : null;
  });
  check('plovoucí hlavička má „Název obvodu" nad ukotveným sloupcem', pl && pl.vid > 0 && Math.abs(pl.k - pl.c2) < 3, JSON.stringify(pl));
  // bez posunu: vše na svém místě jako dřív
  await p.evaluate(() => { const w = document.querySelector('#rozvadece-container .meas-table-wrap'); w.scrollLeft = 0; });
  await p.waitForTimeout(150);
  const n = await stav();
  check('bez posunu vypadá tabulka jako dřív (bez stínku)', !n.stin && Math.abs(n.c2 - a.c2) < 1);
  check('bez chyb stránky', err.length === 0, err.join(' | '));
  console.log(res.join('\n'));
  await b.close();
  process.exit(res.some(r => r.startsWith('❌')) ? 1 : 0);
})().catch(e => { console.error('CRASH:', e.message); process.exit(2); });
