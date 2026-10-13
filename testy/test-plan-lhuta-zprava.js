// v9.122 — Lhůta se bere ze ZPRÁVY (datum kontroly → termín příští kontroly).
// Hlášení uživatele 2026-10-13 (stroj od kolegy, kontrola 10/2026, příští
// 10/2028, zařazený do složky): „plán nachystá příští kontrolu správně za dva
// roky, ale v kartě objektu není nastavená lhůta, proč?" — a 2030, 2032
// v plánu chyběly. Vymyšlená data.
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

  await p.evaluate(() => {
    window.confirm = () => true;
    localStorage.clear(); archiv.length = 0; STORE.archiv = archiv; STORE.plan = {};
    // zpráva o stroji od kolegy: kontrola 10/2026, příští 10/2028
    archiv.push({ uid: 's1', typ: 'stroje', ev_cislo: 'RS-26-0101', misto: '', datum: '2026-10-05',
      data: { typ: 'stroje', pristi: '2028-10-05', stroje: { seznam: [{ nazev: 'Sušička S1', umisteni: 'Kompresorovna' }] } } });
    // elektro zpráva, objekt jen z archivu (nezařazený): 5/2022 → 5/2027
    archiv.push({ uid: 'e1', typ: 'elektro', ev_cislo: 'RE-22-0007', misto: 'Dílna Z', datum: '2022-05-10',
      data: { typ: 'elektro', pristi: '2027-05-10' } });
    // spotřebiče po půl roce — do ročních sloupců se lhůta nevejde
    archiv.push({ uid: 'p1', typ: 'spotrebice', ev_cislo: 'RSP-26-1', misto: 'Kancelář Q', datum: '2026-03-02',
      data: { typ: 'spotrebice', pristi: '2026-09-02' } });
    STORE.archiv = archiv;
    const P = planData();
    P.nastaveni.rokOd = 2021; P.nastaveni.pocetLet = 12; P.nastaveni.rucne = true;
    if (!Array.isArray(P.slozky)) P.slozky = [];
    P.slozky.push({ id: 'sl1', typ: 'budova', nazev: 'Kompresorovna', rodic: '' });
    // technik si stroj přesune pod správný objekt (složku)
    const r = planRadky().find(x => x.nazev === 'Sušička S1');
    planZajistitObjekt(r.id).rodic = 'sl1';
    planUlozit();
    showScreen('home'); otevritPlan();
  });
  const roky = (nazev, druh) => p.evaluate(([nazev, druh]) => {
    const r = planRadky().find(x => x.nazev === nazev);
    return Object.keys(r.roky).filter(k => (r.roky[k].polozky || []).some(q => q.druh === druh))
      .map(k => { const q = r.roky[k].polozky.find(x => x.druh === druh); return k + (q.stav === 'hotovo' ? 'h' : ''); }).join(' ');
  }, [nazev, druh]);

  check('stroj: hotovo 2026, příští 2028 a lhůta 2 roky dopočítá 2030 a 2032',
    (await roky('Sušička S1', 'T')) === '2026h 2028 2030 2032', await roky('Sušička S1', 'T'));
  const bunka2030 = await p.evaluate(() => {
    const id = planRadky().find(x => x.nazev === 'Sušička S1').id;
    const b = document.querySelector('[data-action="planTermin"][data-id="' + id + '"][data-rok="2030"]');
    return b ? b.textContent.replace(/\s+/g, ' ').trim() : 'NENÍ';
  });
  check('a je to vidět v buňce 2030 (T, říjen)', /T/.test(bunka2030) && /říj/.test(bunka2030), bunka2030);

  // okno objektu
  const okno = await p.evaluate(() => {
    const id = planRadky().find(x => x.nazev === 'Sušička S1').id;
    planOtevritObjekt(id);
    const g = x => document.getElementById(x);
    const out = { t: g('plan-o-cyklus-t').value, el: g('plan-o-cyklus-el').value,
      trida: g('plan-o-cyklus-t').classList.contains('plan-lhuta-zprava'),
      pozn: (g('plan-o-lhuty-zpravy') || {}).textContent || '', poznVidet: !!(g('plan-o-lhuty-zpravy') && g('plan-o-lhuty-zpravy').offsetHeight > 0) };
    return out;
  });
  check('v okně objektu je u T lhůta 2 (ze zprávy)', okno.t === '2' && okno.trida, JSON.stringify(okno));
  check('u EL, kde zpráva není, zůstane prázdno', okno.el === '', okno.el);
  check('okno řekne, odkud lhůta je', okno.poznVidet && /2 roky/.test(okno.pozn) && /RS-26-0101/.test(okno.pozn), okno.pozn);

  // uložení beze změny lhůtu jako „ruční" neuloží, řada zůstane
  const ulozeno = await p.evaluate(() => {
    planObjektUlozit();
    const id = planRadky().find(x => x.nazev === 'Sušička S1').id;
    return JSON.stringify(planData().objekty.find(o => o.id === id).cyklus || {});
  });
  check('nezměněná lhůta ze zprávy se neuloží jako ruční', ulozeno === '{}', ulozeno);
  check('řada po uložení okna zůstane', (await roky('Sušička S1', 'T')) === '2026h 2028 2030 2032', await roky('Sušička S1', 'T'));

  // ruční lhůta má přednost
  await p.evaluate(() => {
    const id = planRadky().find(x => x.nazev === 'Sušička S1').id;
    planOtevritObjekt(id);
    document.getElementById('plan-o-cyklus-t').value = '1';
    planObjektUlozit();
  });
  check('přepsaná lhůta (1 rok) má přednost a uloží se',
    (await roky('Sušička S1', 'T')).startsWith('2026h 2027 2028 2029') &&
    await p.evaluate(() => planData().objekty.find(o => o.nazev === 'Sušička S1').cyklus.T === 1),
    await roky('Sušička S1', 'T'));
  const okno2 = await p.evaluate(() => {
    planOtevritObjekt(planRadky().find(x => x.nazev === 'Sušička S1').id);
    const g = x => document.getElementById(x);
    const o = { t: g('plan-o-cyklus-t').value, trida: g('plan-o-cyklus-t').classList.contains('plan-lhuta-zprava') };
    planObjektZavrit(); return o;
  });
  check('ruční lhůta se v okně ukáže jako ruční (bez modré)', okno2.t === '1' && !okno2.trida, JSON.stringify(okno2));

  // objekt jen z archivu (nezařazený) — taky
  check('objekt jen z archivu: EL 2022 → 2027 → 2032', (await roky('Dílna Z', 'EL')) === '2022h 2027 2032', await roky('Dílna Z', 'EL'));
  // půlroční lhůta — nic se nevymýšlí
  check('půlroční spotřebiče: žádná řada navíc', (await roky('Kancelář Q', 'T')) === '2026h', await roky('Kancelář Q', 'T'));

  check('žádná chyba stránky', chyby.length === 0, chyby.join(' | '));
  await br.close();
  console.log(res.join('\n'));
  process.exit(res.some(x => x.startsWith('❌')) ? 1 : 0);
})().catch(e => { console.log('CRASH ' + e.message); process.exit(1); });
