// v9.120 — Plán nabídne sloučení ručně dopsaného objektu se zprávami v archivu.
// Přání uživatele 2026-10-12: „našlo se v archivu zprávu, která je stejná jako
// ručně doplněná revize — a otázka, jestli to sloučit." A k tomu: „mám podobné
// názvy, protože jsou dvě budovy vedle sebe a každá má svoji revizi elektro,
// ale LPS mají společné, tak mám založený objekt U1+U2, kde je jen LPS — tam
// chci mít duplikaci." Vymyšlená data.
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
    const zp = (uid, typ, misto, datum, pristi) => archiv.push({ uid, typ, ev_cislo: 'RE-' + uid, misto, datum,
      data: { typ, pristi } });
    zp('e1', 'elektro', 'Budova U1', '2025-03-10', '2030-03-10');
    zp('e2', 'elektro', 'Budova U2', '2025-03-12', '2030-03-12');
    zp('l3', 'lps', 'Budova U 3', '2026-08-10', '2030-08-10');
    STORE.archiv = archiv;
    const P = planData();
    P.nastaveni.rokOd = 2021; P.nastaveni.pocetLet = 12; P.nastaveni.rucne = true;
    if (!Array.isArray(P.slozky)) P.slozky = [];
    P.slozky.push({ id: 'sl1', typ: 'budova', nazev: 'Areál Jih', rodic: '' });
    const h = (rok, druh, mesic) => ({ rok, polozky: [{ druh, mesic, stav: 'hotovo' }], poznamka: '' });
    P.objekty.push({ id: 'u3', nazev: 'U3', rodic: 'sl1', technik: '', cyklus: { LPS: 4 },
      terminy: [h(2021, 'EL', 4), h(2026, 'EL', 4), h(2022, 'LPS', 7)] });
    // společný hromosvod dvou budov — záměrně zvlášť
    P.objekty.push({ id: 'u12', nazev: 'U1+U2', rodic: 'sl1', cyklus: { LPS: 4 },
      terminy: [h(2024, 'LPS', 5)] });
    planUlozit();
  });
  const otevreno = () => p.evaluate(() => document.getElementById('modal-plan-shody').classList.contains('open'));
  const nazvy = () => p.evaluate(() => planRadky().map(r => r.nazev).sort().join(','));

  await zaloz();
  await p.evaluate(() => { showScreen('home'); otevritPlan(); });
  await p.waitForTimeout(200);
  check('při otevření plánu se nabídne sloučení', await otevreno());
  const text = await p.evaluate(() => document.getElementById('plan-shody-seznam').innerText);
  check('nabídne se právě dvojice U3 ⇄ Budova U 3',
    (await p.$$('#plan-shody-seznam .plan-shoda')).length === 1 && /U3/.test(text) && /Budova U 3/.test(text), text.replace(/\s+/g, ' '));
  check('U1+U2 se s U1 ani U2 neplete', !/U1\+U2/.test(text));
  check('dvojice ukazuje, co je v plánu a co v archivu', /ručně v plánu/.test(text) && /Areál Jih/.test(text) && /1 zpráva v archivu/.test(text) && /RE-l3/.test(text));
  check('„Sloučit všechny" se u jediné dvojice neukazuje', await p.evaluate(() => !document.getElementById('plan-shody-vse').offsetHeight));
  await p.screenshot({ path: __dirname + '/_beh/plan-shody.png' });

  // Sloučit
  await p.click('#plan-shody-seznam [data-action="planShodaSloucit"]');
  await p.waitForTimeout(150);
  check('okno se po rozhodnutí zavře', !(await otevreno()));
  const po = await p.evaluate(() => {
    const r = planRadky().filter(x => /U ?3/.test(x.nazev));
    const u = r[0];
    return { pocet: r.length, nazev: u.nazev, rodic: u.rodic, zprav: u.zpravy.length,
      lps2026: (u.roky[2026].polozky || []).filter(q => q.druh === 'LPS').map(q => q.stav + '/' + q.mesic).join(),
      el2021: (u.roky[2021].polozky || []).map(q => q.druh + '/' + q.stav).join(),
      skryte: (planData().skryte || []).length };
  });
  check('z dvou řádků je jeden „U3"', po.pocet === 1 && po.nazev === 'U3', JSON.stringify(po));
  check('U3 zůstal ve své složce a s ručně dopsanými roky', po.rodic === 'sl1' && po.el2021 === 'EL/hotovo');
  check('a ukazuje hotovou LPS ze zprávy', po.zprav === 1 && po.lps2026 === 'hotovo/7', po.lps2026);
  check('nic se neskrylo', po.skryte === 0, String(po.skryte));
  const zpet = await p.$$('#toast-wrap .toast button');
  check('sloučení nabízí ZPĚT', zpet.length > 0 && /ZPĚT/.test(await zpet[zpet.length - 1].textContent()));

  // revize uložená příště se ukáže v U3
  const nova = await p.evaluate(() => {
    archiv.push({ uid: 'l4', typ: 'lps', ev_cislo: 'RE-l4', misto: 'Budova U 3', datum: '2030-08-01', data: { typ: 'lps', pristi: '2034-08-01' } });
    STORE.archiv = archiv;
    const r = planRadky().filter(x => /U ?3/.test(x.nazev));
    return r.length + ':' + r[0].nazev + ':' + (r[0].roky[2030].polozky || []).filter(q => q.druh === 'LPS').map(q => q.stav).join();
  });
  check('revize uložená v programu příště se ukáže v řádku U3', nova === '1:U3:hotovo', nova);
  await p.evaluate(() => { archiv.pop(); STORE.archiv = archiv; renderPlan(); });

  // ZPĚT vrátí dva řádky
  if (zpet.length) await zpet[zpet.length - 1].click();
  await p.waitForTimeout(150);
  check('ZPĚT vrátí oba řádky', /Budova U 3/.test(await nazvy()) && /U3/.test(await nazvy()), await nazvy());

  // Nechat zvlášť — zapamatuje se
  await p.evaluate(() => { showScreen('home'); otevritPlan(); });
  await p.waitForTimeout(150);
  check('nerozhodnutá dvojice se při dalším otevření nabídne znovu', await otevreno());
  await p.click('#plan-shody-seznam [data-action="planShodaNechat"]');
  await p.waitForTimeout(150);
  check('„Nechat zvlášť" nechá oba řádky', !(await otevreno()) && /Budova U 3/.test(await nazvy()));
  await p.evaluate(() => { showScreen('home'); otevritPlan(); });
  await p.waitForTimeout(150);
  check('na odmítnutou dvojici se už neptá', !(await otevreno()));
  check('odmítnutí jde se zálohou plánu (STORE.plan)', await p.evaluate(() => (planData().neslucovat || []).length === 1));

  // „Rozhodnout později" jen zavře
  await zaloz();
  await p.evaluate(() => { showScreen('home'); otevritPlan(); });
  await p.waitForTimeout(150);
  await p.click('#modal-plan-shody [data-action="zavritPlanShody"]');
  check('„Rozhodnout později" nic nezmění', !(await otevreno()) && /Budova U 3/.test(await nazvy()) &&
    await p.evaluate(() => !(planData().neslucovat || []).length));

  // nejednoznačné → neptat
  const nejedn = await p.evaluate(() => {
    planData().objekty.push({ id: 'u3b', nazev: 'Ú 3', cyklus: {}, terminy: [] });
    planUlozit();
    return planShodyNajit().length;
  });
  check('dva ruční „U3" k jedné budově = neptá se (neví, který)', nejedn === 0, String(nejedn));

  // Ruční sloučení přes lištu taky páruje (dřív se zprávy skryly)
  await zaloz();
  const rucne = await p.evaluate(() => {
    showScreen('plan'); renderPlan();
    const a = planRadky().find(x => x.nazev === 'Budova U 3');
    __planVybrane = { u3: true }; __planVybrane[a.id] = true;
    planVybraneSloucit();
    archiv.push({ uid: 'l5', typ: 'lps', ev_cislo: 'RE-l5', misto: 'Budova U 3', datum: '2030-08-01', data: { typ: 'lps', pristi: '2034-08-01' } });
    STORE.archiv = archiv;
    const r = planRadky().filter(x => /U ?3/.test(x.nazev));
    return { pocet: r.length, nazev: r[0].nazev, skryte: (planData().skryte || []).length,
      lps2030: (r[0].roky[2030].polozky || []).filter(q => q.druh === 'LPS').map(q => q.stav).join() };
  });
  check('ruční „Sloučit" z lišty: příští revize se ukáže v U3, nic se neskryje',
    rucne.pocet === 1 && rucne.nazev === 'U3' && rucne.skryte === 0 && rucne.lps2030 === 'hotovo', JSON.stringify(rucne));

  // Pruh složky přes celý řádek (jako v tisku) — přání uživatele 2026-10-12
  const pruh = await p.evaluate(() => {
    renderPlan();
    const tr = document.querySelector('#plan-tabulka tr.plan-slozka');
    const bg = el => getComputedStyle(el).backgroundColor;
    const roky = Array.from(tr.querySelectorAll('td.plan-bunka-slozka')).map(bg);
    const obj = document.querySelector('#plan-tabulka tr.plan-objekt-radek td.plan-bunka, #plan-tabulka tr.plan-objekt-radek td:last-child');
    return { nazev: bg(tr.querySelector('td.plan-objekt')), roky: Array.from(new Set(roky)), objekt: obj ? bg(obj) : '' };
  });
  check('šedý pruh složky jde přes všechny sloupce let', pruh.roky.length === 1 && pruh.roky[0] === pruh.nazev &&
    pruh.nazev !== 'rgba(0, 0, 0, 0)', JSON.stringify(pruh));

  check('žádná chyba stránky', chyby.length === 0, chyby.join(' | '));
  await br.close();
  console.log(res.join('\n'));
  process.exit(res.some(x => x.startsWith('❌')) ? 1 : 0);
})().catch(e => { console.log('CRASH ' + e.message); process.exit(1); });
