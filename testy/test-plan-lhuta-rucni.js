// v9.116 — Lhůta u objektu dopočítá řadu i z revizí RUČNĚ DOPSANÝCH do plánu.
// Hlášení uživatele 2026-10-09 (objekt bez zprávy v archivu, EL 2021–2026
// zapsané v plánu, lhůta EL 1 rok): „nastavím si lhůtu na jeden rok a do plánu
// mi to nejde … u ručně dopsané revize do plánu". Ruční termíny se do řádku
// dostávaly až PO výpočtu řady, takže je výpočet neviděl. Vymyšlená data.
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

  const r = await p.evaluate(() => {
    window.confirm = () => true;
    localStorage.clear(); archiv.length = 0; STORE.archiv = archiv; STORE.plan = {};
    const P = planData();
    P.nastaveni.rokOd = 2021; P.nastaveni.pocetLet = 12; P.nastaveni.rucne = true;
    const hotovo = (rok, mesic) => ({ rok: rok, polozky: [{ druh: 'EL', mesic: mesic, stav: 'hotovo' }], poznamka: '' });
    // A) historie EL 2021–2026 dopsaná v plánu (jako vložená z Excelu)
    P.objekty.push({ id: 'oa', nazev: 'Sklad barev', ex: true, cyklus: {}, terminy:
      [hotovo(2021, 2), hotovo(2022, 0), hotovo(2023, 0), hotovo(2024, 0), hotovo(2025, 0), hotovo(2026, 8)] });
    // B) bez zapsaných termínů, jen „Poslední revize" v okně objektu
    P.objekty.push({ id: 'ob', nazev: 'Kompresorovna', cyklus: {}, terminy: [], posledni: {} });
    // C) ruční termín LPS v roce, kam by padla EL z lhůty
    P.objekty.push({ id: 'oc', nazev: 'Trafostanice', cyklus: { EL: 2 }, terminy: [hotovo(2025, 4),
      { rok: 2027, polozky: [{ druh: 'EL', mesic: 10, stav: 'plan' }], poznamka: '' }] });
    planUlozit();
    otevritPlan();
    const g = id => document.getElementById(id);
    const out = {};
    const elRoky = id => { const x = planRadky().find(q => q.id === id); return Object.keys(x.roky).filter(k =>
      (x.roky[k].polozky || []).some(q => q.druh === 'EL' && q.stav === 'odhad')).map(k => k + '/' + x.roky[k].polozky.find(q => q.druh === 'EL').mesic); };
    out.predA = elRoky('oa');
    // postup z hlášení: okno objektu, lhůta EL 1, uložit
    planOtevritObjekt('oa');
    out.posledniVOkne = g('plan-o-posledni-rok-el').value + '/' + g('plan-o-posledni-mesic-el').value;
    g('plan-o-cyklus-el').value = '1';
    planObjektUlozit();
    out.A = elRoky('oa');
    out.bunky2027 = Array.from(document.querySelectorAll('[data-action="planTermin"][data-id="oa"][data-rok="2027"]')).map(b => b.textContent.replace(/\s+/g, ' ').trim()).join('');
    // B) jen poslední revize + lhůta 3 roky
    planOtevritObjekt('ob');
    g('plan-o-cyklus-el').value = '3';
    g('plan-o-posledni-rok-el').value = '2024'; g('plan-o-posledni-mesic-el').value = '5';
    planObjektUlozit();
    out.B = elRoky('ob');
    // C) ruční termín má přednost, řada pokračuje od něj
    out.C = elRoky('oc');
    const c = planRadky().find(q => q.id === 'oc');
    out.C2027 = c.roky[2027].polozky.map(q => q.druh + '/' + q.stav + '/' + q.mesic).join(',');
    // smazaná lhůta řadu zase vezme pryč
    planOtevritObjekt('oa'); g('plan-o-cyklus-el').value = ''; planObjektUlozit();
    out.Abez = elRoky('oa');
    return out;
  });
  check('bez lhůty se u ručních termínů nic nedomýšlí', r.predA.length === 0, r.predA.join(' '));
  check('okno objektu nabídne poslední revizi z plánu (září 2026)', r.posledniVOkne === '2026/8', r.posledniVOkne);
  check('lhůta 1 rok dá EL v každém roce 2027–2032', r.A.join(' ') === '2027/8 2028/8 2029/8 2030/8 2031/8 2032/8', r.A.join(' '));
  check('a je vidět v buňce roku 2027', /EL/.test(r.bunky2027), r.bunky2027);
  check('„Poslední revize" z okna stačí i bez termínů v plánu', r.B.join(' ') === '2027/5 2030/5', r.B.join(' '));
  check('ruční termín zůstal, jak ho technik zadal', r.C2027 === 'EL/plan/10', r.C2027);
  check('řada pokračuje od ručního termínu', r.C.join(' ') === '2029/10 2031/10', r.C.join(' '));
  check('smazaná lhůta řadu zase odebere', r.Abez.length === 0, r.Abez.join(' '));
  check('žádná chyba stránky', chyby.length === 0, chyby.join(' | '));
  await br.close();
  console.log(res.join('\n'));
  process.exit(res.some(x => x.startsWith('❌')) ? 1 : 0);
})().catch(e => { console.log('CRASH ' + e.message); process.exit(1); });
