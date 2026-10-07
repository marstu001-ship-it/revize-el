// v9.54 — export měřicího listu do .xlsx. Nestačí „ZIP se rozbalil":
// soubor se OTEVÍRÁ přes openpyxl a převádí LibreOffice, ať je jisté,
// že ho otevře i skutečný Excel.
const { chromium } = require('/opt/node22/lib/node_modules/playwright/node_modules/playwright-core');
const fs = require('fs'), cp = require('child_process');
const DIR = __dirname, OUT = DIR + '/_beh/out-xlsx';
const res = []; const check = (n, ok, d) => res.push((ok ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));

function py(kod) {
  return cp.execSync('python3 -c ' + JSON.stringify(kod), { encoding: 'utf8', cwd: OUT }).trim();
}

(async () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const br = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await br.newContext({ viewport: { width: 1500, height: 1000 }, acceptDownloads: true });
  await ctx.addInitScript(() => {
    try { navigator.serviceWorker.register = () => new Promise(() => {}); } catch (e) {}
    // showSaveFilePicker v headless bez gesta nikdy nedoresolvuje
    try { delete window.showSaveFilePicker; } catch (e) { window.showSaveFilePicker = undefined; }
  });
  const p = await ctx.newPage();
  const chyby = []; p.on('pageerror', e => chyby.push(e.message));
  await p.goto('http://127.0.0.1:8901/index.html', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1200);

  // ══ 1. zipVytvor bez MIME se nesmí změnit ════════════════════════
  const mimy = await p.evaluate(async () => {
    const d = new TextEncoder().encode('ahoj');
    const bezMime = await zipVytvor([{ nazev: 'a.txt', data: d }]);
    const sMime = await zipVytvor([{ nazev: 'a.txt', data: d }], 'application/x-test');
    return { bez: bezMime.type, s: sMime.type };
  });
  check('zipVytvor bez druhého parametru dál vrací application/zip',
    mimy.bez === 'application/zip', mimy.bez);
  check('zipVytvor s MIME ho použije', mimy.s === 'application/x-test', mimy.s);

  // ══ 2. TEREN_KOLONKY sedí s TEREN_MERENE ═════════════════════════
  const kol = await p.evaluate(() => ({
    klice: TEREN_KOLONKY.map(k => k.klic),
    indexy: TEREN_KOLONKY.map(k => k.i),
    merene: TEREN_KOLONKY.filter(k => k.merene).map(k => k.klic),
    ocekavane: TEREN_MERENE
  }));
  check('TEREN_KOLONKY má 16 sloupců s indexy 0–15',
    kol.indexy.length === 16 && kol.indexy.every((v, i) => v === i), kol.indexy.join(','));
  check('měřené sloupce v TEREN_KOLONKY sedí s TEREN_MERENE',
    kol.merene.slice().sort().join(',') === kol.ocekavane.slice().sort().join(','),
    kol.merene.join(',') + '  vs  ' + kol.ocekavane.join(','));
  check('typy souborů znají xlsx',
    await p.evaluate(() => !!TYPY_SOUBORU['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']));
  check('neznámý MIME spadne do PDF, ne do prázdna',
    await p.evaluate(() => (TYPY_SOUBORU['neco/jineho'] || TYPY_SOUBORU['application/pdf']).pripona === '.pdf'));

  // ══ 3. ELEKTRO — vyrobit sešit ═══════════════════════════════════
  await p.evaluate(() => {
    localStorage.clear(); STORE.technik = { jmeno: 'M. Technik' }; archiv.length = 0; STORE.archiv = archiv;
    aktTyp = 'elektro'; aktPodtyp = 'dum'; novaZprava('elektro');
  });
  await p.waitForTimeout(600);
  await p.evaluate(() => {
    const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); } };
    set('f_ev_cislo', 'RE-26-0100'); set('f_misto', 'Rodinný dům Kyjov');
    const k = document.querySelector('#rozvadece-container [data-rozvadec-id]');
    k.querySelector('.rozv-nazev').value = 'RD';
    k.querySelector('.rozv-umisteni').value = 'Technická místnost';
    const tb = k.querySelector('tbody');
    [['Světla obývák', '10', 'CYKY 3×1,5'], ['Zásuvky kuchyně', '16', 'CYKY 3×2,5']].forEach(o => {
      addMereniRowTo(tb);
      const i = tb.lastElementChild.querySelectorAll('input');
      i[1].value = o[0]; i[2].value = 'EATON'; i[3].value = 'B'; i[4].value = o[1]; i[15].value = o[2];
    });
    addInfoRowTo(tb, { cislo: '', popis: 'Vývod do RP2', hodnota: 'pojistky 3×35 A' });
    // druhý rozváděč se STEJNÝM názvem — Excel nesnese dva listy téhož jména
    addRozvadec();
    document.querySelectorAll('#rozvadece-container [data-rozvadec-id]')[1].querySelector('.rozv-nazev').value = 'RD';
  });
  await p.waitForTimeout(400);
  await p.evaluate(() => terenOtevrit());
  await p.waitForTimeout(300);
  const cekani = p.waitForEvent('download', { timeout: 60000 });
  await p.evaluate(() => { terenVytvorit(); });
  await p.waitForTimeout(900);
  await p.evaluate(() => { terenExcel(); });
  let soubor = null;
  try {
    const d = await cekani;
    soubor = OUT + '/' + d.suggestedFilename();
    await d.saveAs(soubor);
  } catch (e) { /* null */ }
  check('sešit se stáhne', !!soubor, soubor ? soubor.split('/').pop() : 'nestáhl se');
  if (!soubor) { hotovo(); return; }
  check('název má příponu .xlsx', /\.xlsx$/.test(soubor), soubor.split('/').pop());

  // ══ 4. STRUKTURA ZIPu ════════════════════════════════════════════
  const hlavicka = fs.readFileSync(soubor).slice(0, 2).toString('latin1');
  check('začíná PK', hlavicka === 'PK', hlavicka);
  let t = '';
  try { t = cp.execSync('unzip -t "' + soubor + '"', { encoding: 'utf8' }); } catch (e) { t = 'CHYBA ' + e.message; }
  check('unzip -t projde', /No errors detected/.test(t), t.trim().split('\n').pop());
  const seznam = cp.execSync('unzip -Z1 "' + soubor + '"', { encoding: 'utf8' }).trim().split('\n');
  check('[Content_Types].xml je PRVNÍ položka', seznam[0] === '[Content_Types].xml', seznam.slice(0, 3).join(' | '));
  check('sešit má oba listy', seznam.filter(x => /^xl\/worksheets\//.test(x)).length === 2, seznam.filter(x => /worksheets/.test(x)).join(','));

  // ══ 5. OTEVŘE HO SKUTEČNÁ TABULKA ════════════════════════════════
  const jm = soubor.split('/').pop();
  let op = '';
  try {
    op = py(
      "import openpyxl,json;" +
      "w=openpyxl.load_workbook('" + jm + "');" +
      "s=w[w.sheetnames[0]];" +
      "hl=[c.value for c in s[s.max_row and 1 or 1]];" +
      "rows=[[c.value for c in r] for r in s.iter_rows()];" +
      "hi=[i for i,r in enumerate(rows) if r and r[0]=='Č.'][0];" +
      "oi=[i for i,r in enumerate(rows) if 'Světla obývák' in r][0];" +
      "print(json.dumps({'listy':w.sheetnames,'freeze':s.freeze_panes," +
      "'hlavicka':rows[hi],'prvni':rows[oi],'sirka_b':s.column_dimensions['B'].width," +
      "'typy':[type(x).__name__ for x in rows[oi]]},ensure_ascii=False))");
  } catch (e) { op = 'CHYBA: ' + (e.stderr || e.message || e); }
  let d = null;
  try { d = JSON.parse(op); } catch (e) { /* null */ }
  check('openpyxl sešit načte', !!d, d ? '' : op.slice(0, 300));
  if (d) {
    check('dva stejně pojmenované rozváděče dostanou unikátní listy',
      d.listy.length === 2 && d.listy[0] !== d.listy[1], d.listy.join(' | '));
    check('hlavička tabulky je v sešitu', (d.hlavicka || []).indexOf('Název obvodu') !== -1,
      (d.hlavicka || []).filter(Boolean).slice(0, 5).join(' | '));
    check('panel je zmrazený pod hlavičkou', !!d.freeze, String(d.freeze));
    check('šířky sloupců jsou nastavené', d.sirka_b > 10, 'B = ' + d.sirka_b);
    const nazevIdx = (d.hlavicka || []).indexOf('Název obvodu');
    const aIdx = (d.hlavicka || []).indexOf('A');
    const risoIdx = (d.hlavicka || []).indexOf('Riso (MΩ)');
    check('předvyplněný sloupec má hodnotu', d.prvni[nazevIdx] === 'Světla obývák', String(d.prvni[nazevIdx]));
    check('MĚŘENÁ buňka je prázdná', d.prvni[risoIdx] === null, String(d.prvni[risoIdx]));
    check('proud je ČÍSLO, ne text se zeleným rohem',
      d.typy[aIdx] === 'int' || d.typy[aIdx] === 'float', d.typy[aIdx] + ' (' + d.prvni[aIdx] + ')');
    check('značka zůstala text', d.typy[nazevIdx] === 'str', d.typy[nazevIdx]);
  }

  // LibreOffice jako druhá, nezávislá čtečka — ALE nejdřív se musí ověřit,
  // že v tomhle kontejneru xlsx vůbec umí. Když neotevře ani referenční
  // soubor z openpyxl, je rozbitý on, ne náš sešit, a check se přeskočí
  // (ověřeno 2026-09-16: chybí mu Java a filtr pro xlsx).
  function loNaCsv(cesta) {
    var csv = cesta.replace(/\.xlsx$/, '.csv');
    try { fs.rmSync(csv, { force: true }); } catch (e) {}
    try {
      cp.execSync('soffice --headless --convert-to csv --outdir "' + OUT + '" "' + cesta + '" 2>&1',
        { encoding: 'utf8', timeout: 180000 });
    } catch (e) { /* níž se pozná podle souboru */ }
    return fs.existsSync(csv) ? fs.readFileSync(csv, 'utf8') : null;
  }
  const refXlsx = OUT + '/ref_openpyxl.xlsx';
  try {
    py("import openpyxl;w=openpyxl.Workbook();s=w.active;s.append(['Č.','Název obvodu']);" +
       "s.append([1,'Světla obývák']);w.save('ref_openpyxl.xlsx')");
  } catch (e) { /* níž */ }
  const loUmi = fs.existsSync(refXlsx) && loNaCsv(refXlsx) !== null;
  if (!loUmi) {
    check('LibreOffice: přeskočeno — v tomto kontejneru neotevře ani referenční xlsx', true,
      'kontrolní soubor z openpyxl taky neprošel, takže to není vada našeho sešitu');
  } else {
    const lo = loNaCsv(soubor) || '';
    check('LibreOffice sešit otevře a převede', /Název obvodu/.test(lo) && /Světla obývák/.test(lo),
      lo.slice(0, 120).replace(/\n/g, ' ⏎ '));
  }

  // ══ 6. STROJE ════════════════════════════════════════════════════
  await p.evaluate(() => { aktTyp = 'stroje'; novaZprava('stroje'); });
  await p.waitForTimeout(700);
  await p.evaluate(() => {
    const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); } };
    set('f_ev_cislo', 'RS-26-0001'); set('f_misto', 'Hala M4');
    document.querySelector('#stroje-container .stroj-nazev').value = 'Soustruh SU 50';
  });
  await p.waitForTimeout(300);
  await p.evaluate(() => terenOtevrit());
  await p.waitForTimeout(300);
  const cekani2 = p.waitForEvent('download', { timeout: 60000 });
  await p.evaluate(() => { terenVytvorit(); });
  await p.waitForTimeout(900);
  await p.evaluate(() => { terenExcel(); });
  let soubor2 = null;
  try { const d2 = await cekani2; soubor2 = OUT + '/' + d2.suggestedFilename(); await d2.saveAs(soubor2); } catch (e) {}
  check('sešit pro stroje se stáhne', !!soubor2, soubor2 ? soubor2.split('/').pop() : 'nestáhl se');
  if (soubor2) {
    let s2 = '';
    try {
      s2 = py("import openpyxl,json;w=openpyxl.load_workbook('" + soubor2.split('/').pop() + "');" +
        "s=w[w.sheetnames[0]];rows=[[c.value for c in r] for r in s.iter_rows()];" +
        "print(json.dumps({'listy':w.sheetnames,'text':[x for r in rows for x in r if x]},ensure_ascii=False))");
    } catch (e) { s2 = 'CHYBA: ' + (e.stderr || e.message); }
    let d2 = null; try { d2 = JSON.parse(s2); } catch (e) {}
    check('stroj: openpyxl sešit načte', !!d2, d2 ? '' : s2.slice(0, 200));
    if (d2) {
      check('stroj: list se jmenuje podle stroje', /Soustruh/.test(d2.listy[0]), d2.listy.join(','));
      check('stroj: je tam měření i kontroly',
        d2.text.some(x => /Měření — položka/.test(x)) && d2.text.some(x => /Kontrola — položka/.test(x)));
      check('stroj: sloupec Provedeno na zaškrtnutí', d2.text.some(x => x === 'Provedeno'));
    }
  }

  check('bez chyb stránky', chyby.length === 0, chyby.join(' | '));
  hotovo();

  async function hotovo() {
    await br.close();
    console.log(res.join('\n'));
    console.log(res.every(x => x[0] === '✅') ? '\nVŠE OK (' + res.length + ')' : '\nSELHALO');
    process.exit(res.every(x => x[0] === '✅') ? 0 : 1);
  }
})();
