// v9.118 — Prohlídka Plánu revizí po hlášení „už mě to pěkně štve, jak pořád
// narážím na takové hloupé chyby v plánu revizí" (2026-10-12). Sonda našla:
//  1. změna měsíce u budoucího termínu smazala dopočítané termíny před ním,
//  2. „Vymazat termín" u termínu z lhůty neudělal nic a neřekl proč,
//  3. šedé 5 / 4 ve lhůtách vypadaly jako nastavená lhůta,
//  4. hromadně nešla lhůta zrušit,
//  5. úpravy termínů a objektů nešly vzít ZPĚT (jinde v programu jdou).
// Vymyšlená data.
const { chromium } = require('./pw');
const PORT = process.env.PORT || 8901;
const res = []; const check = (n, ok, d) => res.push((ok ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));

(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await br.newContext({ viewport: { width: 1500, height: 1000 } });
  await ctx.addInitScript(() => { navigator.serviceWorker.register = () => new Promise(() => {}); });
  const p = await ctx.newPage(); const chyby = []; p.on('pageerror', e => chyby.push(e.message));
  p.on('dialog', d => d.accept());
  await p.goto('http://127.0.0.1:' + PORT + '/index.html', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);

  const zaloz = () => p.evaluate(() => {
    window.confirm = () => true;
    localStorage.clear(); archiv.length = 0; STORE.archiv = archiv; STORE.plan = {};
    const P = planData(); P.nastaveni.rokOd = 2024; P.nastaveni.pocetLet = 10; P.nastaveni.rucne = true;
    P.objekty.push({ id: 'a', nazev: 'Kotelna A', cyklus: { EL: 1 }, terminy: [
      { rok: 2026, polozky: [{ druh: 'EL', mesic: 8, stav: 'hotovo' }], poznamka: '' }] });
    P.objekty.push({ id: 'b', nazev: 'Sklad B', cyklus: { EL: 2, LPS: 4 }, terminy: [
      { rok: 2025, polozky: [{ druh: 'EL', mesic: 1, stav: 'hotovo' }, { druh: 'LPS', mesic: 1, stav: 'hotovo' }], poznamka: '' }] });
    planUlozit(); otevritPlan();
  });
  const roky = (id, druh) => p.evaluate(([id, druh]) => {
    const r = planRadky().find(x => x.id === id);
    return Object.keys(r.roky).filter(k => (r.roky[k].polozky || []).some(q => q.druh === druh))
      .map(k => { const q = r.roky[k].polozky.find(x => x.druh === druh); return k + (q.stav === 'zruseno' ? 'Z' : ''); }).join(' ');
  }, [id, druh]);
  const terminOkno = async (id, rok) => { await p.click('[data-action="planTermin"][data-id="' + id + '"][data-rok="' + rok + '"]'); };

  // ── 1. změna měsíce u budoucího termínu ───────────────────────────────
  await zaloz();
  check('výchozí řada z lhůty 1 rok', (await roky('a', 'EL')) === '2026 2027 2028 2029 2030 2031 2032 2033', await roky('a', 'EL'));
  await terminOkno('a', 2029);
  await p.evaluate(() => { document.getElementById('plan-t-mesic-el').value = '4'; });
  await p.click('#modal-plan-termin [data-action="planTerminUlozit"]');
  check('změna měsíce v roce 2029 nesmaže termíny 2027 a 2028',
    (await roky('a', 'EL')) === '2026 2027 2028 2029 2030 2031 2032 2033', await roky('a', 'EL'));
  const mesic2030 = await p.evaluate(() => planRadky().find(x => x.id === 'a').roky[2030].polozky[0].mesic);
  check('řada za upraveným rokem jede v novém měsíci', mesic2030 === 4, String(mesic2030));

  // ── 2. zrušený rok drží rytmus ────────────────────────────────────────
  await terminOkno('a', 2027);
  await p.evaluate(() => { document.getElementById('plan-t-stav-el').value = 'zruseno'; });
  await p.click('#modal-plan-termin [data-action="planTerminUlozit"]');
  check('zrušený rok 2027 nerozhodí řadu (2028 zůstane)', (await roky('a', 'EL')) === '2026 2027Z 2028 2029 2030 2031 2032 2033', await roky('a', 'EL'));

  // ── 3. „Vymazat termín" jen tam, kde je co vymazat ───────────────────
  const smazatVidet = () => p.evaluate(() => { const b = document.querySelector('#modal-plan-termin [data-action="planTerminSmazat"]'); return !!(b && b.offsetHeight); });
  await terminOkno('a', 2031);
  check('u termínu z lhůty se „Vymazat termín" nenabízí', !(await smazatVidet()));
  await p.click('#modal-plan-termin [data-action="planTerminZavrit"]');
  await terminOkno('a', 2029);
  check('u ručního termínu „Vymazat termín" je', await smazatVidet());
  await p.click('#modal-plan-termin [data-action="planTerminZavrit"]');

  // ── 5. ZPĚT po uložení termínu, po vymazání a Ctrl+Z ──────────────────
  await zaloz();
  await terminOkno('a', 2028);
  await p.evaluate(() => { document.getElementById('plan-t-el').checked = false; });
  await p.click('#modal-plan-termin [data-action="planTerminUlozit"]');
  check('rok 2028 vyprázdněn', !(await roky('a', 'EL')).split(' ').includes('2028'), await roky('a', 'EL'));
  const zpet = await p.$('#toast-wrap .toast button');
  check('hláška nabízí ZPĚT', !!zpet && /ZPĚT/.test(await zpet.textContent()));
  if (zpet) await zpet.click(); await p.waitForTimeout(150);
  check('ZPĚT vrátí termín 2028', (await roky('a', 'EL')).split(' ').includes('2028'), await roky('a', 'EL'));

  await terminOkno('a', 2030);
  await p.evaluate(() => { document.getElementById('plan-t-mesic-el').value = '0'; });
  await p.click('#modal-plan-termin [data-action="planTerminUlozit"]');
  await p.evaluate(() => { document.activeElement && document.activeElement.blur(); });
  await p.keyboard.press('Control+z'); await p.waitForTimeout(150);
  const terminy2030 = await p.evaluate(() => (planData().objekty.find(o => o.id === 'a').terminy || []).filter(t => t.rok === 2030).length);
  check('Ctrl+Z vezme zpět i uložení termínu', terminy2030 === 0, String(terminy2030));

  await terminOkno('a', 2029);
  await p.evaluate(() => { document.getElementById('plan-t-mesic-el').value = '2'; });
  await p.click('#modal-plan-termin [data-action="planTerminUlozit"]');
  await terminOkno('a', 2029);
  await p.evaluate(() => planTerminSmazat());
  const poSmazani = await p.evaluate(() => (planData().objekty.find(o => o.id === 'a').terminy || []).some(t => t.rok === 2029));
  const zpet2 = await p.$$('#toast-wrap .toast button');
  if (zpet2.length) await zpet2[zpet2.length - 1].click(); await p.waitForTimeout(150);
  const poZpet = await p.evaluate(() => (planData().objekty.find(o => o.id === 'a').terminy || []).some(t => t.rok === 2029));
  check('ZPĚT vrátí vymazaný ruční termín', !poSmazani && poZpet, poSmazani + ' → ' + poZpet);

  // ZPĚT po uložení okna objektu (lhůta)
  await p.evaluate(() => { planOtevritObjekt('a'); document.getElementById('plan-o-cyklus-el').value = '3'; planObjektUlozit(); });
  const cyk3 = await p.evaluate(() => planData().objekty.find(o => o.id === 'a').cyklus.EL);
  const zpet3 = await p.$$('#toast-wrap .toast button');
  if (zpet3.length) await zpet3[zpet3.length - 1].click(); await p.waitForTimeout(150);
  const cykZpet = await p.evaluate(() => planData().objekty.find(o => o.id === 'a').cyklus.EL);
  check('ZPĚT vrátí i změnu lhůty v okně objektu', cyk3 === 3 && cykZpet === 1, cyk3 + ' → ' + cykZpet);

  // ── 3b. šedé „5 / 4" už nevypadají jako lhůta ─────────────────────────
  const ph = await p.evaluate(() => { planOtevritObjekt('a'); const g = id => document.getElementById(id).placeholder;
    const v = [g('plan-o-cyklus-el'), g('plan-o-cyklus-lps'), g('plan-o-cyklus-t')]; planObjektZavrit(); return v; });
  check('prázdná lhůta se ukazuje jako „nenastaveno", ne jako číslo', ph.every(x => x === 'nenastaveno'), ph.join(' | '));

  // ── 4. hromadně: 0 lhůtu zruší, prázdné nemění ────────────────────────
  await zaloz();
  const hrom = await p.evaluate(() => {
    __planVybrane = { a: true, b: true };
    planVybraneLhuty();
    const g = id => document.getElementById(id);
    const popis = g('plan-hv-popis').textContent, phHv = g('plan-hv-cyklus-el').placeholder;
    g('plan-hv-cyklus-el').value = '0'; g('plan-hv-cyklus-lps').value = ''; g('plan-hv-cyklus-t').value = '1';
    planHromadnaPotvrdit();
    const o = id => planData().objekty.find(x => x.id === id).cyklus;
    return { popis, phHv, a: JSON.stringify(o('a')), b: JSON.stringify(o('b')) };
  });
  check('hromadně: okno řekne, že 0 lhůtu zruší', /0 lhůtu zruší/.test(hrom.popis), hrom.popis);
  check('hromadně: prázdné pole ukazuje „beze změny"', hrom.phHv === 'beze změny', hrom.phHv);
  check('hromadně: 0 zrušila EL, prázdné LPS nechalo, T nastavena',
    hrom.a === '{"T":1}' && hrom.b === '{"LPS":4,"T":1}', hrom.a + ' / ' + hrom.b);
  check('bez lhůty se řada nedopočítá', (await roky('a', 'EL')) === '2026', await roky('a', 'EL'));

  check('žádná chyba stránky', chyby.length === 0, chyby.join(' | '));
  await br.close();
  console.log(res.join('\n'));
  process.exit(res.some(x => x.startsWith('❌')) ? 1 : 0);
})().catch(e => { console.log('CRASH ' + e.message); process.exit(1); });
