// v9.99 — Riso „>20" jen jako šedá nápověda; proužek se znaky i pod tabulkou rozváděče.
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
  await p.evaluate(async () => {
    localStorage.clear(); archiv.length = 0; STORE.archiv = archiv;
    aktTyp='elektro'; aktPodtyp='dum'; novaZprava('elektro');
    await new Promise(r=>setTimeout(r,300));
    switchTab('mereni'); addRcdRow(null);
  });
  const riso = await p.evaluate(() => Array.from(document.querySelectorAll('#rozvadece-container .meas-table tbody tr'))
    .filter(tr => /obvod|rcd-header/.test(tr.dataset.rowtype))
    .map(tr => { const i = fillCilovyInput(tr, 8); return { t: tr.dataset.rowtype, v: i.value, ph: i.placeholder }; }));
  check('nový obvod: Riso je prázdné', riso.filter(r => r.t === 'obvod').every(r => r.v === ''), JSON.stringify(riso));
  check('nový obvod: >20 je šedá nápověda', riso.filter(r => r.t === 'obvod').every(r => r.ph === '>20'));
  check('hlavička chrániče: Riso prázdné, >20 jako nápověda', riso.filter(r => r.t === 'rcd-header').every(r => r.v === '' && r.ph === '>20'), JSON.stringify(riso));

  // do PDF se nezměřené Riso nevytiskne
  const pdf = await p.evaluate(async () => { generujPDF(); await new Promise(r=>setTimeout(r,1500));
    return document.getElementById('pdf-pages').innerText; });
  check('v PDF se nezměřené Riso netiskne jako >20', pdf.indexOf('>20') === -1);
  await p.evaluate(() => { showScreen('form'); switchTab('mereni'); });

  // proužek se znaky pod tabulkou rozváděče
  const pr = await p.evaluate(() => {
    const karta = document.querySelector('#rozvadece-container [data-rozvadec-id]');
    const s = karta.querySelector('.sym-proužek');
    return s ? { vid: s.offsetHeight > 0, znaky: Array.from(s.querySelectorAll('.sym-btn')).map(b => b.dataset.znak).join(' '),
                 tip: s.querySelector('[data-znak=">"]').title } : null;
  });
  check('pod tabulkou rozváděče je proužek se znaky', pr && pr.vid, JSON.stringify(pr));
  check('proužek má > i <', pr && /> /.test(pr.znaky + ' ') && /</.test(pr.znaky), pr && pr.znaky);
  check('bublina u > radí klávesovou zkratku', pr && /pravý Alt \+ tečka/.test(pr.tip), pr && pr.tip);

  // klepnout do Riso a na > → vloží se na kurzor
  await p.evaluate(() => {
    const tr = document.querySelector('#rozvadece-container .meas-table tbody tr[data-rowtype="obvod"]');
    const i = fillCilovyInput(tr, 8); i.focus(); i.value = '20'; i.setSelectionRange(0, 0);
  });
  await p.locator('#rozvadece-container .sym-proužek [data-znak=">"]').first().click();
  const v = await p.evaluate(() => fillCilovyInput(document.querySelector('#rozvadece-container .meas-table tbody tr[data-rowtype="obvod"]'), 8).value);
  check('znak > se vložil na kurzor v buňce Riso', v === '>20', v);
  check('zpráva je označená jako změněná', await p.evaluate(() => !!window.__formDirty));

  // zkratka >= v tabulce měření
  await p.evaluate(() => { const i = fillCilovyInput(document.querySelector('#rozvadece-container .meas-table tbody tr[data-rowtype="obvod"]'), 8); i.value = ''; i.focus(); });
  await p.keyboard.type('>=1');
  const z = await p.evaluate(() => fillCilovyInput(document.querySelector('#rozvadece-container .meas-table tbody tr[data-rowtype="obvod"]'), 8).value);
  check('v tabulce rozváděče se >= přepíše na ≥', z === '≥1', z);

  // stará zpráva s >20 v datech zůstane, jak byla
  const stara = await p.evaluate(async () => {
    const D = getData();
    D.rozvadece[0].mereni.forEach(m => { if (m.rowtype === 'obvod' || !m.rowtype) m.riso = '>20'; });
    nacistData(D); await new Promise(r=>setTimeout(r,300));
    const tr = document.querySelector('#rozvadece-container .meas-table tbody tr[data-rowtype="obvod"]');
    return fillCilovyInput(tr, 8).value;
  });
  check('uložená zpráva s >20 si hodnotu drží', stara === '>20', stara);

  // dokončená zpráva — proužek schovaný
  const ro = await p.evaluate(() => { setFormReadOnly(true);
    const s = document.querySelector('#rozvadece-container .sym-btn'); const v = s ? s.offsetHeight : 0; setFormReadOnly(false); return v; });
  check('u dokončené zprávy se tlačítka se znaky neukazují', ro === 0, String(ro));

  check('bez chyb stránky', err.length === 0, err.join(' | '));
  console.log(res.join('\n'));
  await b.close();
  process.exit(res.some(r => r.startsWith('❌')) ? 1 : 0);
})().catch(e => { console.error('CRASH:', e.message); process.exit(2); });
