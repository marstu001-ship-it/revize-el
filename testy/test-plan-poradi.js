// v9.116 — Pořadí objektů v Plánu revizí se při úpravě NEMĚNÍ (jako v Excelu
// a Outlooku). Hlášení uživatele 2026-10-09: „strašně mě plete, že když opravím
// termín revize u objektu ručně vloženého, tak se to pořadí změní."
// Znovu se seřadí při otevření plánu, při tisku a tlačítkem „↕ Seřadit znovu".
// Vymyšlená data.
const { chromium } = require('/opt/node22/lib/node_modules/playwright/node_modules/playwright-core');
const PORT = process.env.PORT || 8901;
const res = []; const check = (n, ok, d) => res.push((ok ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));

(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await br.newContext({ viewport: { width: 1500, height: 1000 } });
  await ctx.addInitScript(() => { navigator.serviceWorker.register = () => new Promise(() => {}); });
  const p = await ctx.newPage(); const chyby = []; p.on('pageerror', e => chyby.push(e.message));
  await p.goto('http://127.0.0.1:' + PORT + '/index.html', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);

  // Tři ručně přidané objekty s termíny 2027 / 2028 / 2029.
  await p.evaluate(() => {
    window.confirm = () => true;
    localStorage.clear(); archiv.length = 0; STORE.archiv = archiv; STORE.plan = {};
    const P = planData();
    P.nastaveni.rokOd = 2026; P.nastaveni.pocetLet = 8; P.nastaveni.rucne = true;
    [['Kotelna A', 2027], ['Sklad B', 2028], ['Dílna C', 2029]].forEach(([n, rok], i) => {
      P.objekty.push({ id: 'ob' + i, nazev: n, terminy: [{ rok: rok, polozky: [{ druh: 'EL', mesic: 3, stav: 'plan' }], poznamka: '' }] });
    });
    planUlozit();
    otevritPlan();
  });
  const poradi = () => p.evaluate(() => Array.from(document.querySelectorAll('#plan-tabulka tr[data-uzel^="objekt"], #plan-tabulka tr'))
    .map(t => (t.querySelector('.plan-nazev, [data-action="planObjekt"]') || {}).textContent || '')
    .filter(x => /Kotelna A|Sklad B|Dílna C|Hala D/.test(x)).map(x => x.match(/Kotelna A|Sklad B|Dílna C|Hala D/)[0]));
  const tlacitko = () => p.evaluate(() => { const b = document.getElementById('plan-btn-seradit'); return !!(b && b.offsetHeight); });

  const p0 = await poradi();
  check('na začátku seřazeno podle termínu', p0.join(',') === 'Kotelna A,Sklad B,Dílna C', p0.join(','));
  check('„Seřadit znovu" není vidět, když je seřazeno', !(await tlacitko()));

  // Termín Kotelny A se přesune na 2031 — klepnutím do buňky, jako uživatel.
  await p.evaluate(() => {
    const smaz = document.querySelector('[data-action="planTermin"][data-id="ob0"][data-rok="2027"]');
    smaz.click(); planTerminSmazat();
  });
  await p.click('[data-action="planTermin"][data-id="ob0"][data-rok="2031"]');
  await p.evaluate(() => { document.getElementById('plan-t-el').checked = true; document.getElementById('plan-t-mesic-el').value = '5'; });
  await p.evaluate(() => planTerminUlozit());
  const p1 = await poradi();
  check('po změně termínu zůstane objekt na svém místě', p1.join(',') === 'Kotelna A,Sklad B,Dílna C', p1.join(','));
  const ulozeno = await p.evaluate(() => JSON.stringify(planData().objekty.find(o => o.id === 'ob0').terminy));
  check('nový termín se přitom uložil', /2031/.test(ulozeno) && !/2027/.test(ulozeno), ulozeno);
  check('objeví se „↕ Seřadit znovu"', await tlacitko());

  // Úprava názvu přes okno objektu taky nic neposune.
  await p.evaluate(() => { planOtevritObjekt('ob2'); document.getElementById('plan-o-nazev').value = 'Dílna C'; planObjektUlozit(); });
  const p2 = await poradi();
  check('uložení okna objektu nic neposune', p2.join(',') === 'Kotelna A,Sklad B,Dílna C', p2.join(','));

  // Nový objekt se zařadí podle termínu, staré zůstanou, jak byly.
  await p.evaluate(() => {
    planData().objekty.push({ id: 'ob3', nazev: 'Hala D', terminy: [{ rok: 2026, polozky: [{ druh: 'EL', mesic: 11, stav: 'plan' }], poznamka: '' }] });
    planUlozit(); renderPlan();
  });
  const p3 = await poradi();
  check('nový objekt přibude a ostatní se nepohnou', p3.length === 4 &&
    p3.filter(x => x !== 'Hala D').join(',') === 'Kotelna A,Sklad B,Dílna C', p3.join(','));

  // Hledání a filtr pořadí taky nemíchají.
  await p.fill('#plan-hledat', 'a'); await p.waitForTimeout(300);
  await p.fill('#plan-hledat', ''); await p.waitForTimeout(300);
  const p4 = await poradi();
  check('hledání pořadí nezmění', p4.join(',') === p3.join(','), p4.join(','));

  // Tisk jde seřazený podle termínů.
  const tisk = await p.evaluate(() => { if (typeof planZamekZrusit === 'function') planZamekZrusit(); return planTiskoveRadky().filter(r => r.radek).map(r => r.radek.nazev); });
  check('do tisku jde seřazeno podle termínu', tisk.join(',') === 'Hala D,Sklad B,Dílna C,Kotelna A', tisk.join(','));
  await p.evaluate(() => renderPlan());

  // Tlačítko seřadí znovu a samo zmizí.
  await p.evaluate(() => { const b = document.getElementById('plan-btn-seradit'); if (b) b.click(); });
  const p5 = await poradi();
  check('„Seřadit znovu" seřadí podle termínu', p5.join(',') === 'Hala D,Sklad B,Dílna C,Kotelna A', p5.join(','));
  check('a tlačítko pak zmizí', !(await tlacitko()));

  // Znovuotevření plánu řadí od začátku.
  await p.evaluate(() => {
    const o = planData().objekty.find(x => x.id === 'ob1');
    o.terminy = [{ rok: 2033, polozky: [{ druh: 'EL', mesic: 1, stav: 'plan' }], poznamka: '' }];
    planUlozit(); renderPlan();
  });
  const p6 = await poradi();
  check('další úprava zase nic neposune', p6.join(',') === 'Hala D,Sklad B,Dílna C,Kotelna A', p6.join(','));
  await p.evaluate(() => { showScreen('home'); otevritPlan(); });
  const p7 = await poradi();
  check('po novém otevření plánu je seřazeno podle termínu', p7.join(',') === 'Hala D,Dílna C,Kotelna A,Sklad B', p7.join(','));

  // Složky zůstávají nad objekty i s ukotveným pořadím.
  await p.evaluate(() => {
    const P = planData();
    P.slozky.push({ id: 'sl1', typ: 'budova', nazev: 'Budova Z' });
    P.objekty.find(x => x.id === 'ob1').rodic = 'sl1';
    P.objekty.find(x => x.id === 'ob2').rodic = 'sl1';
    planUlozit(); renderPlan();
    planPrepnoutSlozku({ getAttribute: () => 'sl1' });
  });
  const typy = await p.evaluate(() => Array.from(document.querySelectorAll('#plan-tabulka tbody tr'))
    .map(t => t.classList.contains('plan-slozka') ? (t.getAttribute('data-uzel') || '').split(':')[0] : 'objekt'));
  const prvniNezarazene = typy.indexOf('nezarazene');
  check('složka Budova Z stojí nad Nezařazenými', typy[0] === 'budova' && prvniNezarazene > 0, typy.join(','));

  check('žádná chyba stránky', chyby.length === 0, chyby.join(' | '));
  await br.close();
  console.log(res.join('\n'));
  process.exit(res.some(r => r.startsWith('❌')) ? 1 : 0);
})().catch(e => { console.log('CRASH ' + e.message); process.exit(1); });
