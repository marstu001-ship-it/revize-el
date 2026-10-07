// v9.89 — stroje v Plánu revizí: objektem je STROJ, ne místnost.
const { chromium } = require('/opt/node22/lib/node_modules/playwright/node_modules/playwright-core');
const res = []; const check = (n, ok, d) => res.push((ok?'✅':'❌')+' '+n+(d?' — '+d:''));

(async () => {
  const br = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await br.newContext({ viewport: { width: 1500, height: 1000 } });
  await ctx.addInitScript(() => { navigator.serviceWorker.register = () => new Promise(() => {}); });
  const p = await ctx.newPage();
  const chyby = []; p.on('pageerror', e => chyby.push(e.message));
  await p.goto('http://127.0.0.1:8901/index.html', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);
  await p.evaluate(() => { window.confirm = () => true; });

  // ══ 1. Skutečná zpráva o stroji s PRÁZDNÝM místem provádění ═══════
  // Přesně ten případ, na který uživatel přišel: vyplněná je jen karta
  // stroje. Do v9.88 zpráva neměla klíč a plán ji mlčky zahodil.
  const realna = await p.evaluate(async () => {
    localStorage.clear(); archiv.length = 0; STORE.archiv = archiv; STORE.plan = {};
    STORE.technik = { jmeno: 'M. Technik' };
    aktTyp = 'stroje'; aktPodtyp = 'stroje'; novaZprava('stroje');
    await new Promise(r => setTimeout(r, 900));
    document.querySelector('.stroj-nazev').value = 'Konvektomat';
    document.querySelector('.stroj-umisteni').value = 'Budova M4 – kuchyně';
    document.getElementById('f_ev_cislo').value = 'RS-26-0001';
    document.getElementById('f_zahajeni').value = '2026-03-10';
    document.getElementById('f_pristi').value = '2027-03-10';
    saveToArchiv();
    const r = planRadky();
    return { mistoVeZprave: archiv[0].misto, radku: r.length,
             nazev: r[0] && r[0].nazev, popis: r[0] && r[0].popis,
             roky: r[0] ? Object.keys(r[0].roky).map(k => k + ':' +
               (r[0].roky[k].polozky || []).map(x => x.druh + '/' + x.stav).join('+')).sort().join(' ') : '' };
  });
  check('zpráva o stroji bez „místa provádění" se do plánu DOSTANE',
    realna.radku === 1 && realna.mistoVeZprave === '', realna.radku + ' řádků, místo „' + realna.mistoVeZprave + '"');
  check('objektem je STROJ, ne místnost', realna.nazev === 'Konvektomat', realna.nazev);
  check('a vedle názvu se drží jeho umístění', realna.popis === 'Budova M4 – kuchyně', realna.popis);
  check('hotová kontrola i příští termín sedí v letech',
    realna.roky === '2026:T/hotovo 2027:T/odhad', realna.roky);

  // ══ 2. Soubor strojů = řádek za každý stroj ═══════════════════════
  const fixture = () => p.evaluate(async () => {
    localStorage.clear(); archiv.length = 0; STORE.archiv = archiv; STORE.plan = {};
    const stroj = (nazev, umisteni) => ({ nazev: nazev, umisteni: umisteni, mereni: [], kontroly: [] });
    archiv.push({ uid: 's1', typ: 'stroje', ev_cislo: 'RS-26-0002', misto: '', datum: '2026-04-01',
      data: { typ: 'stroje', pristi: '2027-04-01', stroje: { rozsah: 'soubor', seznam: [
        stroj('Nářezový stroj', 'Budova M4 – kuchyně'),
        stroj('Konvektomat', 'Budova M4 – kuchyně'),
        stroj('Myčka nádobí', 'Budova M4 – kuchyně') ] } } });
    archiv.push({ uid: 'e1', typ: 'elektro', ev_cislo: 'RE-26-0001', misto: 'Budova M4 – kuchyně',
      datum: '2026-02-01', data: { typ: 'elektro', pristi: '2031-02-01' } });
    archiv.push({ uid: 's2', typ: 'stroje', ev_cislo: 'RS-26-0003', misto: '', datum: '2026-05-01',
      data: { typ: 'stroje', stroje: { seznam: [ stroj('Konvektomat', 'Jídelna B') ] } } });
    archiv.push({ uid: 's3', typ: 'stroje', ev_cislo: 'RS-26-0004', misto: 'Sklad', datum: '2026-06-01',
      data: { typ: 'stroje', stroje: { seznam: [ stroj('', '') ] } } });
    STORE.archiv = archiv;
    return planRadky().map(r => ({ nazev: r.nazev, popis: r.popis, klic: r.klic, zprav: r.zpravy.length,
      druhy: Object.keys(r.roky).map(k => (r.roky[k].polozky || []).map(x => x.druh).join('')).join(',') }));
  });
  const rr = await fixture();
  check('zpráva o třech strojích dá tři řádky',
    rr.filter(r => /Budova M4/.test(r.popis || '')).length === 3,
    rr.map(r => r.nazev).join(' | '));
  check('elektro revize téhož místa zůstane vlastním řádkem',
    rr.some(r => r.nazev === 'Budova M4 – kuchyně' && r.druhy.indexOf('EL') >= 0),
    rr.map(r => r.nazev + '=' + r.druhy).join(' | '));
  check('stroj se do řádku místnosti NEPŘIDÁ',
    !rr.some(r => r.nazev === 'Budova M4 – kuchyně' && r.druhy.indexOf('T') >= 0));
  check('dva stroje téhož jména na různých místech jsou dva objekty',
    rr.filter(r => r.nazev === 'Konvektomat').length === 2,
    rr.filter(r => r.nazev === 'Konvektomat').map(r => r.popis).join(' / '));
  check('zpráva o stroji bez vyplněného stroje se chová postaru — podle místa',
    rr.some(r => r.nazev === 'Sklad' && r.klic === 'sklad'),
    (rr.find(r => r.nazev === 'Sklad') || {}).klic);
  // Klíč stroje má prefix `stroj:`, klíč místa ne — jinak by stroj „Kuchyně"
  // a místnost „Kuchyně" splynuly do jednoho řádku.
  check('klíč stroje se nesplete s klíčem místnosti',
    rr.filter(r => /^stroj:/.test(r.klic)).length === 4 &&
    rr.filter(r => !/^stroj:/.test(r.klic)).map(r => r.klic).sort().join(',') === 'budova m4 – kuchyně,sklad',
    rr.map(r => r.klic).join(' | '));

  // ══ 3. Hledání a zařazení do budovy ═══════════════════════════════
  const hledani = await p.evaluate(async () => {
    showScreen('plan'); renderPlan();
    await new Promise(r => setTimeout(r, 300));
    const pole = document.getElementById('plan-hledat');
    pole.value = 'jídelna'; renderPlan();
    await new Promise(r => setTimeout(r, 200));
    // Pozor: `td.plan-objekt` má i řádek složky („Nezařazené objekty"),
    // objekty se poznají podle ikony 📄.
    const nalezeno = [...document.querySelectorAll('#plan-tabulka tr td.plan-objekt')]
      .filter(td => /📄/.test(td.innerText))
      .map(td => td.innerText.replace(/\s+/g, ' ').trim());
    pole.value = ''; renderPlan();
    await new Promise(r => setTimeout(r, 200));
    return { nalezeno };
  });
  check('stroj se najde i podle umístění, ne jen podle názvu',
    hledani.nalezeno.length === 1 && /Konvektomat/.test(hledani.nalezeno[0]) && /Jídelna B/.test(hledani.nalezeno[0]),
    hledani.nalezeno.join(' | '));

  const zarazeni = await p.evaluate(async () => {
    const P = planData();
    P.slozky = [{ id: 'prov1', typ: 'provozovatel', nazev: 'Areál', rodic: '' },
                { id: 'bud1', typ: 'budova', nazev: 'Kuchyně', rodic: 'prov1' }];
    // stroj si technik zařadí do budovy — objekt se tím stane vlastním
    const r = planRadky().find(x => x.nazev === 'Nářezový stroj');
    const o = planZajistitObjekt(r.id);
    o.rodic = 'bud1';
    planUlozit(); renderPlan();
    await new Promise(r => setTimeout(r, 300));
    const radky = [...document.querySelectorAll('#plan-tabulka tr')];
    const text = radky.map(t => t.innerText.replace(/\s+/g, ' ').trim());
    return { text: text.filter(Boolean).slice(0, 12), objekt: { nazev: o.nazev, klic: o.klic, rodic: o.rodic } };
  });
  check('zařazený stroj si nese svůj název i klíč',
    zarazeni.objekt.nazev === 'Nářezový stroj' && /^stroj:/.test(zarazeni.objekt.klic),
    JSON.stringify(zarazeni.objekt));
  check('a objeví se pod budovou', zarazeni.text.some(t => /Kuchyně/.test(t)) &&
    zarazeni.text.some(t => /Nářezový stroj/.test(t)), zarazeni.text.join(' // ').slice(0, 200));

  // ══ 4. Třetí volba rozbalení ══════════════════════════════════════
  const uroven = await p.evaluate(async () => {
    const stav = () => {
      const P = planData();
      return { prov: P.otevrene['prov1'], bud: P.otevrene['bud1'],
               videtStroj: [...document.querySelectorAll('#plan-tabulka td.plan-objekt')]
                 .some(td => /Nářezový stroj/.test(td.innerText)),
               videtBudovu: [...document.querySelectorAll('#plan-tabulka td')]
                 .some(td => /Kuchyně/.test(td.innerText)) };
    };
    planRozbalitVse(true); await new Promise(r => setTimeout(r, 200));
    const vse = stav();
    planUroven(); await new Promise(r => setTimeout(r, 200));
    const jen = stav();
    planRozbalitVse(false); await new Promise(r => setTimeout(r, 200));
    const nic = stav();
    return { vse, jen, nic, tlacitko: !!document.querySelector('[data-action="planUroven"]') };
  });
  check('v liště je třetí tlačítko k rozbalení', uroven.tlacitko);
  check('„rozbalit vše" ukáže i stroje pod budovou', uroven.vse.videtStroj && uroven.vse.videtBudovu);
  check('„jen provozovatele" nechá budovu vidět, ale zavřenou',
    uroven.jen.prov === true && uroven.jen.bud === false && uroven.jen.videtBudovu && !uroven.jen.videtStroj,
    JSON.stringify(uroven.jen));
  check('„sbalit vše" schová i budovu', !uroven.nic.videtBudovu && !uroven.nic.videtStroj,
    JSON.stringify(uroven.nic));

  // ══ 5. Elektro, LPS a spotřebiče se nezměnily ═════════════════════
  const ostatni = await p.evaluate(async () => {
    localStorage.clear(); archiv.length = 0; STORE.archiv = archiv; STORE.plan = {};
    archiv.push({ uid: 'a', typ: 'elektro', misto: 'Dům A', datum: '2026-01-05', data: { typ: 'elektro', pristi: '2031-01-05' } });
    archiv.push({ uid: 'b', typ: 'lps', misto: 'Dům A', datum: '2026-01-06', data: { typ: 'lps', pristi: '2030-01-06' } });
    archiv.push({ uid: 'c', typ: 'spotrebice', misto: 'Dům A', datum: '2026-01-07', data: { typ: 'spotrebice', pristi: '2027-01-07' } });
    STORE.archiv = archiv;
    const r = planRadky();
    return { radku: r.length, nazev: r[0] && r[0].nazev, klic: r[0] && r[0].klic,
             druhy: r[0] ? Object.keys(r[0].roky).sort().map(k => k + ':' +
               (r[0].roky[k].polozky || []).map(x => x.druh).sort().join('+')).join(' ') : '' };
  });
  check('elektro + LPS + spotřebiče dál sdílejí jeden řádek podle místa',
    ostatni.radku === 1 && ostatni.nazev === 'Dům A' && ostatni.klic === 'dům a',
    ostatni.radku + ' řádků, klíč ' + ostatni.klic);
  check('a jejich značky jsou beze změny', ostatni.druhy === '2026:EL+LPS+T 2027:T 2030:LPS 2031:EL', ostatni.druhy);

  check('bez chyb stránky', chyby.length === 0, chyby.join(' | '));
  await br.close();
  console.log(res.join('\n'));
  console.log(res.every(x => x[0] === '✅') ? '\nVŠE OK (' + res.length + ')' : '\nSELHALO');
})();
