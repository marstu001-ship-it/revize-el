// v9.107 — „⚠ CHYBÍ TERMÍN" v Plánu revizí zhasne, když termín doplní technik
// PŘÍMO V PLÁNU (lhůtou u objektu nebo termínem v buňce roku). Hlášení
// uživatele 2026-10-05 (paketovací lis): „svítilo mi, že chybí termín, a když
// ho doplním a uložím, tak to svítí pořád." Vymyšlená data.
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

  const r = await p.evaluate(async () => {
    window.confirm = () => true;
    const stroj = (nazev) => ({ nazev: nazev, umisteni: 'Hala Z', mereni: [], kontroly: [] });
    const zalozit = () => {
      localStorage.clear(); archiv.length = 0; STORE.archiv = archiv; STORE.plan = {};
      ['Lis A', 'Lis B', 'Lis C'].forEach((n, i) => archiv.push({ uid: 's' + i, typ: 'stroje', ev_cislo: 'RS-26-01' + i,
        misto: '', datum: '2026-10-01', data: { typ: 'stroje', pristi: '', stroje: { rozsah: 'jeden', seznam: [stroj(n)] } } }));
      archiv.push({ uid: 'e1', typ: 'elektro', ev_cislo: 'RE-26-0100', misto: 'Kotelna Z', datum: '2026-03-01',
        data: { typ: 'elektro', pristi: '' } });
      STORE.archiv = archiv;
    };
    const radek = n => planRadky().find(x => x.nazev === n);
    const stav = n => { const x = radek(n); return { chybi: x.bezTerminu.length,
      otaznik: Object.keys(x.roky).some(k => x.roky[k].chybiTermin),
      roky: Object.keys(x.roky).map(k => k + ':' + x.roky[k].polozky.map(q => q.druh + '/' + q.stav).join('+')).join(' ') }; };
    const g = id => document.getElementById(id);
    const out = {};

    zalozit();
    showScreen('plan'); renderPlan();
    out.pred = ['Lis A', 'Lis B', 'Lis C', 'Kotelna Z'].map(n => stav(n).chybi);
    out.bannerPred = g('plan-varovani').style.display !== 'none' ? g('plan-varovani').textContent : '';

    // A) lhůta 2 roky u objektu — přesně postup z hlášení
    planOtevritObjekt(radek('Lis A').id);
    g('plan-o-cyklus-t').value = '2';
    planObjektUlozit();
    out.A = stav('Lis A');
    out.stitekA = Array.from(document.querySelectorAll('#screen-plan tr')).filter(t => /Lis A/.test(t.textContent))
      .some(t => t.querySelector('.plan-chybi-stitek'));

    // B) ruční termín v buňce roku 2027 pro druh T
    const o = planZajistitObjekt(radek('Lis B').id);
    o.terminy = [{ rok: 2027, polozky: [{ druh: 'T', mesic: 9, stav: 'plan' }], poznamka: '' }];
    planUlozit(); renderPlan();
    out.B = stav('Lis B');

    // C) ruční termín jen ZRUŠENÝ — termín pořád neznáme
    const oc = planZajistitObjekt(radek('Lis C').id);
    oc.terminy = [{ rok: 2027, polozky: [{ druh: 'T', mesic: 9, stav: 'zruseno' }], poznamka: '' }];
    planUlozit(); renderPlan();
    out.C = stav('Lis C');

    // D) lhůta jiného druhu (EL) u stroje (T) varování nezhasne
    planOtevritObjekt(radek('Lis C').id);
    g('plan-o-cyklus-el').value = '5';
    planObjektUlozit();
    out.D = stav('Lis C');

    out.kotelna = stav('Kotelna Z');
    out.banner = g('plan-varovani').style.display !== 'none' ? g('plan-varovani').textContent : '';
    out.filtrChybi = (() => { const f = g('plan-filtr'); if (!f) return null;
      f.value = 'chybi'; f.dispatchEvent(new Event('change', { bubbles: true })); renderPlan();
      return Array.from(document.querySelectorAll('#screen-plan tbody tr')).map(t => t.textContent)
        .filter(t => /Lis A|Lis B|Lis C|Kotelna Z/.test(t)).map(t => (t.match(/Lis A|Lis B|Lis C|Kotelna Z/) || [])[0]); })();

    // lhůta smazaná = varování se vrátí
    planOtevritObjekt(radek('Lis A').id);
    g('plan-o-cyklus-t').value = '';
    planObjektUlozit();
    out.zpet = stav('Lis A');
    return out;
  });

  check('výchozí stav: všem čtyřem chybí termín', r.pred.join(',') === '1,1,1,1', r.pred.join(','));
  check('lhůta 2 roky u objektu: varování zhasne', r.A.chybi === 0 && !r.A.otaznik, JSON.stringify(r.A));
  check('lhůta 2 roky: řada se dopočítá (2028, 2030…)', /2028:T\/odhad/.test(r.A.roky) && /2030:T\/odhad/.test(r.A.roky), r.A.roky);
  check('lhůta 2 roky: štítek „CHYBÍ TERMÍN" v řádku zmizí', r.stitekA === false);
  check('ruční termín v buňce roku: varování zhasne', r.B.chybi === 0 && !r.B.otaznik, JSON.stringify(r.B));
  check('jen ZRUŠENÝ termín: varování zůstává', r.C.chybi === 1, JSON.stringify(r.C));
  check('lhůta jiného druhu (EL u stroje): varování zůstává', r.D.chybi === 1 && r.D.otaznik, JSON.stringify(r.D));
  check('objekt bez doplnění (kotelna): varování zůstává', r.kotelna.chybi === 1 && r.kotelna.otaznik);
  check('souhrnné varování počítá jen ty, kde termín opravdu chybí', /2×/.test(r.banner) && /2 objekty/.test(r.banner), r.banner.slice(0, 90));
  check('souhrnné varování radí i lhůtu u objektu', /lhůtu/.test(r.banner));
  if (r.filtrChybi) check('filtr „chybí termín" ukáže jen Lis C a kotelnu',
    r.filtrChybi.sort().join(',') === 'Kotelna Z,Lis C', r.filtrChybi.join(','));
  check('smazaná lhůta: varování se vrátí', r.zpet.chybi === 1 && r.zpet.otaznik, JSON.stringify(r.zpet));
  check('bez chyb v konzoli', chyby.length === 0, chyby.slice(0, 3).join(' | '));
  await br.close();
  res.forEach(x => console.log(x));
  process.exit(res.some(x => x.startsWith('❌')) ? 1 : 0);
})();
