// v9.117 — V buňce roku jde nastavit „v tomto roce se nic nedělá".
// Hlášení uživatele 2026-10-12 (objekt U3 vedený v plánu, LPS v roce 2030 se
// tam plánovalo, přestože hromosvod už hlídá zpráva z programu): „když kliknu
// do okénka, abych to smazal, program vyžaduje, že tam musí být něco
// zakliknuto, ale v tom roce tam nic nemá být." Vymyšlená data.
const { chromium } = require('./pw');
const PORT = process.env.PORT || 8901;
const res = []; const check = (n, ok, d) => res.push((ok ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));

(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await br.newContext({ viewport: { width: 1500, height: 1000 } });
  await ctx.addInitScript(() => { navigator.serviceWorker.register = () => new Promise(() => {}); });
  const p = await ctx.newPage(); const chyby = []; p.on('pageerror', e => chyby.push(e.message));
  const alerty = []; p.on('dialog', d => { alerty.push(d.message()); d.accept(); });
  await p.goto('http://127.0.0.1:' + PORT + '/index.html', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);

  await p.evaluate(() => {
    localStorage.clear(); archiv.length = 0; STORE.archiv = archiv; STORE.plan = {};
    // zpráva o hromosvodu v archivu: hotovo 2026, příští 2030
    archiv.push({ uid: 'z1', typ: 'lps', ev_cislo: 'RE-26-0200', misto: 'Sklad U9', datum: '2026-08-10',
      data: { typ: 'lps', pristi: '2030-08-10' } });
    STORE.archiv = archiv;
    const P = planData();
    P.nastaveni.rokOd = 2021; P.nastaveni.pocetLet = 12; P.nastaveni.rucne = true;
    // objekt vedený jen v plánu, LPS z lhůty 4 roky od 2026
    P.objekty.push({ id: 'u9', nazev: 'U9', cyklus: { LPS: 4 }, terminy: [
      { rok: 2023, polozky: [{ druh: 'LPS', mesic: 2, stav: 'hotovo' }], poznamka: '' },
      { rok: 2026, polozky: [{ druh: 'LPS', mesic: 7, stav: 'plan' }], poznamka: '' }] });
    planUlozit();
    otevritPlan();
  });
  const bunka = (id, rok) => p.evaluate(([id, rok]) => {
    const b = document.querySelector('[data-action="planTermin"][data-id="' + id + '"][data-rok="' + rok + '"]');
    return b ? b.textContent.replace(/\s+/g, ' ').trim() : 'NENÍ';
  }, [id, rok]);

  check('na začátku je LPS v roce 2030 z lhůty', /LPS/.test(await bunka('u9', 2030)), await bunka('u9', 2030));

  // postup z hlášení: klepnout do buňky, odškrtnout, uložit
  await p.click('[data-action="planTermin"][data-id="u9"][data-rok="2030"]');
  const napoveda = await p.evaluate(() => document.getElementById('modal-plan-termin').textContent);
  check('okno radí, jak nastavit „nic"', /Odškrtněte vše a uložte/.test(napoveda));
  await p.evaluate(() => { document.getElementById('plan-t-lps').checked = false; });
  await p.click('#modal-plan-termin [data-action="planTerminUlozit"]');
  await p.waitForTimeout(200);
  check('žádné „zaškrtněte aspoň jednu revizi"', alerty.length === 0, alerty.join(' | '));
  const zavreno = await p.evaluate(() => !document.getElementById('modal-plan-termin').classList.contains('open'));
  check('okno se zavře', zavreno);
  check('buňka 2030 je prázdná', (await bunka('u9', 2030)) === '', await bunka('u9', 2030));
  const toast = await p.evaluate(() => document.body.innerText);
  check('hláška řekne, co se stalo a jak to vrátit', /nic neplánuje/.test(toast) && /Vymazat termín/.test(toast));
  check('řada z lhůty pokračuje dál (2034 mimo rozsah, 2026 zůstal)', /LPS/.test(await bunka('u9', 2026)), await bunka('u9', 2026));
  const ulozeno = await p.evaluate(() => JSON.stringify(planData().objekty.find(o => o.id === 'u9').terminy.find(t => t.rok === 2030)));
  check('uložen prázdný rok 2030', /"polozky":\[\]/.test(ulozeno), ulozeno);

  // Vymazat termín vrátí buňku k lhůtě
  await p.click('[data-action="planTermin"][data-id="u9"][data-rok="2030"]');
  await p.click('#modal-plan-termin [data-action="planTerminSmazat"]');
  await p.waitForTimeout(200);
  check('„Vymazat termín" vrátí LPS z lhůty', /LPS/.test(await bunka('u9', 2030)), await bunka('u9', 2030));

  // u objektu ze zprávy: odhad z termínu příští revize jde potlačit, hotová revize zůstane
  // id se po první ruční úpravě změní (objekt ze zprávy se stane vlastním) — hledá se podle názvu
  const idSkladu = () => p.evaluate(() => planRadky().find(r => r.nazev === 'Sklad U9').id);
  let a = await idSkladu();
  check('ze zprávy: 2030 je LPS odhad', /LPS/.test(await bunka(a, 2030)), await bunka(a, 2030));
  for (const rok of [2030, 2026]) {
    a = await idSkladu();
    await p.click('[data-action="planTermin"][data-id="' + a + '"][data-rok="' + rok + '"]');
    await p.evaluate(() => { document.querySelectorAll('#plan-termin-druhy input[type=checkbox]').forEach(c => { c.checked = false; }); });
    await p.click('#modal-plan-termin [data-action="planTerminUlozit"]');
    await p.waitForTimeout(150);
  }
  a = await idSkladu();
  check('ze zprávy: odhad 2030 zmizí', (await bunka(a, 2030)) === '', await bunka(a, 2030));
  check('ze zprávy: hotová revize 2026 zůstane, i když se rok vyprázdní', /LPS/.test(await bunka(a, 2026)), await bunka(a, 2026));

  // Dopočítat řadu prázdný rok nezaplní
  await p.evaluate(() => {
    const o = planData().objekty.find(x => x.id === 'u9');
    o.terminy = o.terminy.filter(t => t.rok !== 2030);
    o.terminy.push({ rok: 2027, polozky: [], poznamka: '' });
    planUlozit(); renderPlan();
    window.confirm = () => true;
    planOtevritObjekt('u9');
    const g = id => document.getElementById(id);
    g('plan-o-cyklus-lps').value = '1'; g('plan-o-posledni-rok-lps').value = '2026'; g('plan-o-posledni-mesic-lps').value = '7';
    planDopocitat();
  });
  const t2027 = await p.evaluate(() => JSON.stringify(planData().objekty.find(o => o.id === 'u9').terminy.find(t => t.rok === 2027)));
  check('„Dopočítat řadu" vyprázdněný rok nezaplní', /"polozky":\[\]/.test(t2027), t2027);

  // Sloučení nepřenese prázdný rok do cíle
  const slouceni = await p.evaluate(() => {
    const P = planData();
    P.objekty.push({ id: 'x1', nazev: 'Cíl', cyklus: {}, terminy: [{ rok: 2028, polozky: [{ druh: 'EL', mesic: 1, stav: 'plan' }], poznamka: '' }] });
    P.objekty.push({ id: 'x2', nazev: 'Zdroj', cyklus: {}, terminy: [{ rok: 2028, polozky: [], poznamka: '' }] });
    planUlozit(); renderPlan();
    window.confirm = () => true;
    __planVybrane = { x1: true, x2: true };
    planVybraneSloucit();
    const c = P.objekty.find(o => o.id === 'x1');
    return c.terminy.map(t => t.rok + ':' + t.polozky.map(q => q.druh).join('+')).join(' ');
  });
  check('sloučení nepřenese „nic" do cíle', /2028:EL/.test(slouceni), slouceni);

  check('žádná chyba stránky', chyby.length === 0, chyby.join(' | '));
  await br.close();
  console.log(res.join('\n'));
  process.exit(res.some(x => x.startsWith('❌')) ? 1 : 0);
})().catch(e => { console.log('CRASH ' + e.message); process.exit(1); });
