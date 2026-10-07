// v9.57 — postranní archiv ve formuláři (jako seznam pošty v Outlooku).
// Hlídá se hlavně to, co se dá snadno rozbít:
//  - panel leží MIMO #screen-form, takže hledání zprávu neoznačí jako změněnou
//  - klik přepne zprávu a ZŮSTANE na tomtéž tabu
//  - u jiného typu zprávy (stroje nemají tab „popis") se spadne na titulku
//  - neuložené změny projdou dialogem, nikdy se nezahodí potichu
//  - sbalení se pamatuje a panel se neukazuje mimo formulář
const { chromium } = require('/opt/node22/lib/node_modules/playwright/node_modules/playwright-core');
const res = []; const check = (n, ok, d) => res.push((ok ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));

(async () => {
  const br = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await br.newContext({ viewport: { width: 1600, height: 1000 } });
  await ctx.addInitScript(() => { navigator.serviceWorker.register = () => new Promise(() => {}); });
  const p = await ctx.newPage();
  const chyby = []; p.on('pageerror', e => chyby.push(e.message));
  await p.goto('http://127.0.0.1:8901/index.html', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1200);

  // ══ Připravit archiv: elektro, LPS, stroje ═══════════════════════
  await p.evaluate(() => {
    localStorage.clear();
    STORE.technik = { jmeno: 'M. Š' };
    archiv.length = 0;
    const mk = (uid, typ, cislo, misto, datum, stav, extra) => {
      const D = Object.assign({
        typ: typ, podtyp: typ === 'elektro' ? 'dum' : '', ev_cislo: cislo, misto: misto,
        zahajeni: datum, ukonceni: datum, vypracovani: datum, celkovy_vysledek: 'schopno'
      }, extra || {});
      archiv.push({ uid: uid, typ: typ, podtyp: D.podtyp, ev_cislo: cislo, misto: misto,
        datum: datum, vysledek: 'schopno', stav: stav || '', data: D,
        timestamp: datum + 'T08:00:00.000Z' });
    };
    // Stroj je v archivu PRVNÍ schválně — jen tak se pozná, že se pořadí
    // tlačítek filtru bere z TYPY_ZPRAV, a ne z pořadí v archivu.
    mk('u-d', 'stroje', 'RS-26-0001', 'Hala M4', '2026-09-11', 'aktivni',
       { stroje: { rozsah: 'jeden', spolu: true,
                   seznam: [{ nazev: 'Soustruh SU 50', typ: 'SU50', umisteni: 'kuchyně',
                              mereni: [], kontroly: [] }] } });
    mk('u-a', 'elektro', 'RE-26-10001', 'Garáže autobusu – V3, areál Vzor', '2026-05-05', 'aktivni');
    mk('u-b', 'elektro', 'RE-26-10005', 'Čistička odpadních vod', '2026-08-27', '');
    mk('u-c', 'lps', 'RE-25-10004', 'Budova pomocných provozů', '2025-07-06', '');
    const najdi = (u) => archiv.filter(z => z.uid === u)[0];
    najdi('u-b').last_opened_at = '2026-09-15T10:00:00.000Z';
    najdi('u-c').pinned = true;
    STORE.archiv = archiv; saveStore();
    aktTyp = 'elektro'; aktPodtyp = 'dum'; novaZprava('elektro');
  });
  await p.waitForTimeout(600);

  // ══ 1. Výchozí stav: panel schovaný ══════════════════════════════
  let s = await p.evaluate(() => ({
    vidi: getComputedStyle(document.getElementById('form-archiv')).display,
    body: document.body.classList.contains('fa-open'),
    tlacitko: !!document.getElementById('btn-form-archiv')
  }));
  check('panel je ve výchozím stavu schovaný', s.vidi === 'none' && !s.body, s.vidi);
  check('tlačítko 📚 Archiv je ve formuláři', s.tlacitko);

  // ══ 2. Zapnutí ═══════════════════════════════════════════════════
  await p.click('#btn-form-archiv');
  await p.waitForTimeout(300);
  s = await p.evaluate(() => {
    const el = document.getElementById('form-archiv');
    const cs = getComputedStyle(el);
    const form = document.getElementById('screen-form');
    return {
      display: cs.display, left: cs.left, sirka: cs.width,
      body: document.body.classList.contains('fa-open'),
      padding: getComputedStyle(form).paddingLeft,
      radku: document.querySelectorAll('#fa-seznam .fa-radek').length,
      skupiny: Array.from(document.querySelectorAll('#fa-seznam .fa-skupina')).map(x => x.textContent),
      poradi: Array.from(document.querySelectorAll('#fa-seznam .fa-radek')).map(x => x.dataset.uid),
      ulozeno: localStorage.getItem('revize_el_form_archiv'),
      mimoForm: !document.getElementById('form-archiv').closest('#screen-form')
    };
  });
  check('panel se otevřel jako sloupec vlevo', s.display === 'flex' && s.left === '0px', s.display + ' / ' + s.left);
  check('na široké obrazovce obsah odsune, nepřekrývá', s.padding === s.sirka, s.padding + ' vs ' + s.sirka);
  check('panel leží MIMO #screen-form', s.mimoForm);
  check('v seznamu jsou všechny 4 zprávy', s.radku === 4, String(s.radku));
  // v9.64: žádné oddíly. Klik na zprávu ji dřív přesunul do „Naposledy
  // otevřené", takže zmizela ze svého místa a seznam pod ní poskočil.
  check('seznam nemá žádné oddíly (nic se nepřeskupuje)', s.skupiny.length === 0,
    s.skupiny.join(' | '));
  check('řadí se podle ev. čísla sestupně',
    s.poradi.join(',') === 'u-d,u-b,u-a,u-c',
    s.poradi.join(','));
  check('sbalení/rozbalení se pamatuje v localStorage', s.ulozeno === '1', String(s.ulozeno));

  // ══ 3. Stroj se v panelu pozná podle názvu (v9.47) ════════════════
  const stroj = await p.evaluate(() => {
    const r = Array.from(document.querySelectorAll('#fa-seznam .fa-radek'))
      .find(x => x.dataset.uid === 'u-d');
    return r ? r.textContent : '';
  });
  check('u zprávy o stroji je vidět název stroje, ne jen místo',
    /Soustruh SU 50/.test(stroj), stroj.replace(/\s+/g, ' ').trim().slice(0, 70));

  // ══ 4. Hledání NESMÍ označit zprávu jako změněnou ════════════════
  const hledani = await p.evaluate(async () => {
    window.__formDirty = false;
    const pole = document.getElementById('fa-hledat');
    pole.value = 'čistička';
    pole.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 80));
    return {
      dirty: !!window.__formDirty,
      radku: document.querySelectorAll('#fa-seznam .fa-radek').length,
      nalezeno: (document.querySelector('#fa-seznam .fa-radek') || {}).dataset
    };
  });
  check('psaní do hledání NEoznačí zprávu jako neuloženou', !hledani.dirty);
  check('hledání filtruje (1 nález)', hledani.radku === 1 && hledani.nalezeno.uid === 'u-b',
    hledani.radku + ' / ' + (hledani.nalezeno || {}).uid);

  const nicNenalezeno = await p.evaluate(async () => {
    const pole = document.getElementById('fa-hledat');
    pole.value = 'xyzžádnýnález';
    pole.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 80));
    const t = document.getElementById('fa-seznam').textContent;
    pole.value = '';
    pole.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 80));
    return { text: t, zpet: document.querySelectorAll('#fa-seznam .fa-radek').length };
  });
  check('prázdný výsledek to řekne', /neodpovídá/.test(nicNenalezeno.text), nicNenalezeno.text.trim().slice(0, 40));
  check('smazání hledání vrátí celý seznam', nicNenalezeno.zpet === 4, String(nicNenalezeno.zpet));

  // ══ 4a. ROZTAŽENÍ PANELU MYŠÍ (v9.60) ═══════════════════════════
  const uchyt = await p.evaluate(() => {
    const r = document.getElementById('fa-resize').getBoundingClientRect();
    return { x: r.x, sirka: r.width, kurzor: getComputedStyle(document.getElementById('fa-resize')).cursor,
             panel: document.getElementById('form-archiv').getBoundingClientRect().width };
  });
  check('na pravé hraně je úchyt s kurzorem col-resize',
    uchyt.kurzor === 'col-resize' && uchyt.sirka >= 5, uchyt.kurzor + ' / ' + uchyt.sirka + 'px');
  check('úchyt sedí na hraně panelu', Math.abs((uchyt.x + uchyt.sirka / 2) - uchyt.panel) < 5,
    'hrana ' + uchyt.panel + ', střed úchytu ' + (uchyt.x + uchyt.sirka / 2));

  // Tažení doprava. Myš schválně přejede PŘES formulář — bez
  // setPointerCapture by se tažení v tu chvíli utrhlo.
  await p.mouse.move(uchyt.x + uchyt.sirka / 2, 400);
  await p.mouse.down();
  await p.mouse.move(340, 400);
  await p.mouse.move(430, 420);
  const behem = await p.evaluate(() => ({
    sirka: document.getElementById('form-archiv').getBoundingClientRect().width,
    padding: getComputedStyle(document.getElementById('screen-form')).paddingLeft,
    trida: document.body.classList.contains('fa-tahne'),
    ulozeno: localStorage.getItem('revize_el_form_archiv_sirka')
  }));
  await p.mouse.up();
  await p.waitForTimeout(150);
  check('panel se při tažení roztahuje', Math.abs(behem.sirka - 430) < 6, behem.sirka + 'px');
  check('obsah se odsune spolu s ním', behem.padding === Math.round(behem.sirka) + 'px',
    behem.padding + ' vs ' + behem.sirka);
  check('tažení přes formulář se neutrhne (pointer capture)', Math.abs(behem.sirka - 430) < 6);
  check('během tažení se neoznačuje text (body.fa-tahne)', behem.trida);
  check('do localStorage se zapisuje až na konci, ne na každý pixel',
    behem.ulozeno === null || behem.ulozeno === '280', String(behem.ulozeno));

  const poTazeni = await p.evaluate(() => ({
    ulozeno: localStorage.getItem('revize_el_form_archiv_sirka'),
    trida: document.body.classList.contains('fa-tahne')
  }));
  check('puštěním se šířka uloží', Math.abs(parseInt(poTazeni.ulozeno, 10) - 430) < 6, poTazeni.ulozeno);
  check('po puštění se označování textu vrátí', !poTazeni.trida);

  // Dolní mez
  await p.mouse.move(uchyt.x + 430 - 280 + uchyt.sirka / 2, 400);
  const hrana = await p.evaluate(() => {
    const r = document.getElementById('fa-resize').getBoundingClientRect();
    return r.x + r.width / 2;
  });
  await p.mouse.move(hrana, 400);
  await p.mouse.down();
  await p.mouse.move(400, 400);
  await p.mouse.move(40, 400);            // hodně doleva
  const min = await p.evaluate(() => document.getElementById('form-archiv').getBoundingClientRect().width);
  await p.mouse.up();
  check('panel nejde zúžit pod čitelnou mez', Math.abs(min - 200) < 3, min + 'px');

  // Dvojklik = výchozí šířka
  const poDvojkliku = await p.evaluate(async () => {
    const el = document.getElementById('fa-resize');
    el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await new Promise(r => setTimeout(r, 100));
    return { sirka: document.getElementById('form-archiv').getBoundingClientRect().width,
             ulozeno: localStorage.getItem('revize_el_form_archiv_sirka') };
  });
  check('dvojklik na čáru vrátí výchozích 280 px',
    Math.abs(poDvojkliku.sirka - 280) < 2 && poDvojkliku.ulozeno === '280',
    poDvojkliku.sirka + 'px / uloženo ' + poDvojkliku.ulozeno);

  // ══ 4b. FILTR TYPU (v9.59) ══════════════════════════════════════
  const chipy = await p.evaluate(() => Array.from(document.querySelectorAll('#fa-typy .fa-typ'))
    .map(b => ({ typ: b.dataset.typ, text: b.textContent.trim(), on: b.classList.contains('fa-typ-on') })));
  check('filtr nabízí Vše + jen typy, které v archivu jsou',
    chipy.length === 4 && chipy[0].typ === '' &&
    chipy.map(c => c.typ).join(',') === ',elektro,lps,stroje',
    chipy.map(c => c.text).join(' | '));
  check('u každého typu je počet', chipy[0].text === 'Vše 4' &&
    chipy.find(c => c.typ === 'elektro').text === 'Elektro 2' &&
    chipy.find(c => c.typ === 'stroje').text === 'Stroje 1',
    chipy.map(c => c.text).join(' | '));
  check('ve výchozím stavu svítí Vše', chipy[0].on && !chipy.slice(1).some(c => c.on));
  // Pořadí se bere z TYPY_ZPRAV, ne z archivu — jinak by tlačítka
  // poskakovala podle toho, jaká zpráva je v archivu první.
  const poradiVArchivu = await p.evaluate(() =>
    archiv.filter(z => z.data).map(z => z.typ).filter((t, n, a) => a.indexOf(t) === n).join(','));
  check('pořadí tlačítek je pevné, ne podle archivu',
    chipy.slice(1).map(c => c.typ).join(',') === 'elektro,lps,stroje' &&
    poradiVArchivu !== 'elektro,lps,stroje',
    'chipy: ' + chipy.slice(1).map(c => c.typ).join(',') + ' / archiv: ' + poradiVArchivu);

  const jenStroje = await p.evaluate(async () => {
    document.querySelector('#fa-typy .fa-typ[data-typ="stroje"]').click();
    await new Promise(r => setTimeout(r, 120));
    return {
      uid: Array.from(document.querySelectorAll('#fa-seznam .fa-radek')).map(x => x.dataset.uid),
      chipy: Array.from(document.querySelectorAll('#fa-typy .fa-typ'))
        .map(b => ({ typ: b.dataset.typ, on: b.classList.contains('fa-typ-on') })),
      pocty: Array.from(document.querySelectorAll('#fa-typy .fa-typ')).map(b => b.textContent.trim())
    };
  });
  check('„Stroje" ukáže jen zprávy o strojích',
    jenStroje.uid.length === 1 && jenStroje.uid[0] === 'u-d', jenStroje.uid.join(','));
  check('zvolený typ svítí, Vše zhasne',
    jenStroje.chipy.find(c => c.typ === 'stroje').on && !jenStroje.chipy[0].on);
  check('ostatní typy z nabídky NEZMIZÍ (jde se vrátit)',
    jenStroje.pocty.join(' | ') === 'Vše 4 | Elektro 2 | LPS 1 | Stroje 1',
    jenStroje.pocty.join(' | '));

  // filtr + hledání dohromady
  const kombinace = await p.evaluate(async () => {
    const pole = document.getElementById('fa-hledat');
    pole.value = 'garáže';                       // elektro zpráva, ne stroj
    pole.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 120));
    const prazdno = document.getElementById('fa-seznam').textContent.trim();
    document.querySelector('#fa-typy .fa-typ[data-typ="elektro"]').click();
    await new Promise(r => setTimeout(r, 120));
    return { prazdno: prazdno,
             uid: Array.from(document.querySelectorAll('#fa-seznam .fa-radek')).map(x => x.dataset.uid) };
  });
  check('filtr a hledání platí zároveň a prázdný výsledek to vysvětlí',
    /neodpovídá/.test(kombinace.prazdno) && /Stroje/.test(kombinace.prazdno),
    kombinace.prazdno.slice(0, 60));
  check('přepnutí typu s hledáním najde správnou zprávu',
    kombinace.uid.length === 1 && kombinace.uid[0] === 'u-a', kombinace.uid.join(','));

  const zrusit = await p.evaluate(async () => {
    const pole = document.getElementById('fa-hledat');
    pole.value = '';
    pole.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 100));
    document.querySelector('#fa-typy .fa-typ[data-typ="elektro"]').click();  // druhý klik = zrušit
    await new Promise(r => setTimeout(r, 120));
    return { radku: document.querySelectorAll('#fa-seznam .fa-radek').length,
             vse: document.querySelector('#fa-typy .fa-typ').classList.contains('fa-typ-on') };
  });
  check('druhý klik na tentýž typ filtr zruší',
    zrusit.radku === 4 && zrusit.vse, zrusit.radku + ' řádků');

  // ══ 5. PŘEPNUTÍ ZPRÁVY — zůstane se na tomtéž tabu ═══════════════
  await p.evaluate(() => { const b = document.querySelector('#tab-bar-el .tab-btn[data-tab="mereni"]'); switchTab('mereni', b); });
  await p.waitForTimeout(200);
  await p.evaluate(() => { window.__formDirty = false; });   // čistý start, žádný dialog
  await p.click('#fa-seznam .fa-radek[data-uid="u-b"]');
  await p.waitForTimeout(700);
  let po = await p.evaluate(() => ({
    tab: (document.querySelector('.tab-panel.active') || {}).id,
    tlacitko: (document.querySelector('.tab-btn.active') || {}).getAttribute('data-tab'),
    uid: window.__openZpravaUid,
    cislo: (document.getElementById('f_ev_cislo') || {}).value,
    zvyrazneno: (document.querySelector('#fa-seznam .fa-radek.fa-akt') || {}).dataset,
    panelVidi: getComputedStyle(document.getElementById('form-archiv')).display
  }));
  check('klik zprávu opravdu otevřel', po.uid === 'u-b' && po.cislo === 'RE-26-10005',
    po.uid + ' / ' + po.cislo);
  check('ZŮSTALO SE NA TÉMŽE TABU (E. Měření)',
    po.tab === 'tab-mereni' && po.tlacitko === 'mereni', po.tab + ' / ' + po.tlacitko);
  check('otevřená zpráva je v panelu zvýrazněná', (po.zvyrazneno || {}).uid === 'u-b',
    (po.zvyrazneno || {}).uid);
  check('panel po přepnutí zůstal otevřený', po.panelVidi === 'flex', po.panelVidi);

  // ══ 5b. KLIK NESMÍ POŘADÍM POHNOUT (v9.64) ══════════════════════
  // Tohle je jádro stížnosti: do v9.63 se otevřená zpráva přesunula do
  // oddílu „Naposledy otevřené", zmizela ze svého místa a celý seznam
  // pod ní poskočil.
  const stabilita = await p.evaluate(async () => {
    const poradi = () => Array.from(document.querySelectorAll('#fa-seznam .fa-radek'))
      .map(x => x.dataset.uid).join(',');
    const pred = poradi();
    window.__formDirty = false;
    document.querySelector('#fa-seznam .fa-radek[data-uid="u-c"]').click();
    await new Promise(r => setTimeout(r, 800));
    const po = poradi();
    window.__formDirty = false;
    document.querySelector('#fa-seznam .fa-radek[data-uid="u-a"]').click();
    await new Promise(r => setTimeout(r, 900));
    return { pred: pred, po: po, po2: poradi(),
             otevrena: (document.querySelector('#fa-seznam .fa-radek.fa-akt') || {}).dataset };
  });
  check('po otevření zprávy zůstane pořadí NEZMĚNĚNÉ',
    stabilita.pred === stabilita.po && stabilita.po === stabilita.po2,
    stabilita.pred + '  →  ' + stabilita.po + '  →  ' + stabilita.po2);
  check('otevřená zpráva se jen zvýrazní na svém místě',
    (stabilita.otevrena || {}).uid === 'u-a', (stabilita.otevrena || {}).uid);

  // Řazení „jak by to udělal člověk" — 9 před 10, ne za ním
  const razeni = await p.evaluate(() => ({
    devet: cisloPorovnat('RE-26-9', 'RE-26-10'),
    nula: cisloPorovnat('RE-26-0001', 'RE-26-0001'),
    bezCisla: cisloPorovnat('', 'RE-26-0001'),
    peti: cisloPorovnat('RE-26-10005', 'RE-26-0036')
  }));
  check('řazení je „lidské" — RE-26-9 je před RE-26-10', razeni.devet < 0, String(razeni.devet));
  check('pětimístné číslo je nad čtyřmístným', razeni.peti > 0, String(razeni.peti));
  check('stejná čísla jsou si rovna', razeni.nula === 0, String(razeni.nula));
  check('zpráva bez čísla padá nakonec', razeni.bezCisla < 0, String(razeni.bezCisla));

  // ══ 5c. KOPIE → NOVÁ ZPRÁVA (v9.65) ═════════════════════════════
  const kopie = await p.evaluate(async () => {
    // číslování: automatika zapnutá, ať je vidět, že kopie bere další volné
    STORE.technik.cislo_auto = true; saveStore();
    window.__formDirty = false;
    const puvodni = archiv.filter(z => z.uid === 'u-b')[0];
    const pocetPred = archiv.length;
    // do zdrojové zprávy dát naměřenou hodnotu a závadu, ať je vidět, že se čistí
    puvodni.data.rozvadece = [{ nazev: 'RD', uid: 'r1',
      mereni: [{ rowtype: 'obvod', c: '1', n: 'Zásuvky', a: '16', kabel: 'CYKY 3×2,5',
                 zsm: '0,23', riso: '>20', ut: '12' }] }];
    puvodni.data.zavady = [{ popis: 'Chybí kryt', kod: 'C2' }];
    puvodni.data.predchozi = '2024-05-05';
    puvodni.data.pristi = '2029-05-05';
    STORE.archiv = archiv; saveStore();
    let dotaz = '';
    const p0 = window.confirm; window.confirm = (t) => { dotaz = t; return true; };
    document.querySelector('#fa-seznam .fa-radek[data-uid="u-b"] .fa-kopie').click();
    await new Promise(r => setTimeout(r, 1200));
    window.confirm = p0;
    const D = getData();
    return {
      dotaz: dotaz,
      cislo: document.getElementById('f_ev_cislo').value,
      misto: document.getElementById('f_misto').value,
      zahajeni: document.getElementById('f_zahajeni').value,
      predchozi: document.getElementById('f_predchozi').value,
      predchudce: window.__predchudceUid,
      obvod: (D.rozvadece && D.rozvadece[0] && D.rozvadece[0].mereni[0]) || {},
      zavady: (D.zavady || []).length,
      pocetPred: pocetPred, pocetPo: archiv.length,
      puvodniZustala: !!archiv.filter(z => z.uid === 'u-b')[0],
      puvodniHodnota: (archiv.filter(z => z.uid === 'u-b')[0].data.rozvadece[0].mereni[0] || {}).zsm,
      dnes: new Date().toISOString().slice(0, 10)
    };
  });
  check('kopie se nejdřív zeptá a ukáže nové číslo',
    /Vytvořit novou zprávu jako kopii/.test(kopie.dotaz) && /RE-26-10006/.test(kopie.dotaz),
    kopie.dotaz.split('\n')[0]);
  check('nová zpráva dostane číslo podle šablony technika',
    kopie.cislo === 'RE-26-10006', kopie.cislo);
  check('texty a rozpis obvodů se přenesou',
    kopie.misto === 'Čistička odpadních vod' && kopie.obvod.n === 'Zásuvky' &&
    kopie.obvod.a === '16' && kopie.obvod.kabel === 'CYKY 3×2,5',
    kopie.misto + ' / ' + kopie.obvod.n + ' / ' + kopie.obvod.a);
  check('NAMĚŘENÉ HODNOTY se vyprázdní (nesmí se vydat cizí měření)',
    !kopie.obvod.zsm && !kopie.obvod.ut, JSON.stringify(kopie.obvod));
  check('závady se vyprázdní', kopie.zavady === 0, String(kopie.zavady));
  check('data se přepíšou na dnešek', kopie.zahajeni === kopie.dnes, kopie.zahajeni);
  check('datum předchozí revize se smaže (patřilo jinému objektu)',
    !kopie.predchozi, '„' + kopie.predchozi + '"');
  check('kopie NEVYTVÁŘÍ řetěz (to dělá jen Navázat v hlavním archivu)',
    !kopie.predchudce, '„' + kopie.predchudce + '"');
  check('kopie se rovnou uloží do archivu', kopie.pocetPo === kopie.pocetPred + 1,
    kopie.pocetPred + ' → ' + kopie.pocetPo);
  check('původní zpráva zůstane nedotčená i s naměřenými hodnotami',
    kopie.puvodniZustala && kopie.puvodniHodnota === '0,23', kopie.puvodniHodnota);

  // Odmítnutí dialogu nesmí nic udělat
  const odmitnuto = await p.evaluate(async () => {
    const pocet = archiv.length;
    const cislo = document.getElementById('f_ev_cislo').value;
    const p0 = window.confirm; window.confirm = () => false;
    document.querySelector('#fa-seznam .fa-radek[data-uid="u-a"] .fa-kopie').click();
    await new Promise(r => setTimeout(r, 400));
    window.confirm = p0;
    return { pocet: pocet, po: archiv.length,
             cislo: document.getElementById('f_ev_cislo').value === cislo };
  });
  check('„Zrušit" v dialogu nic nevytvoří', odmitnuto.pocet === odmitnuto.po && odmitnuto.cislo,
    odmitnuto.pocet + ' → ' + odmitnuto.po);

  // Klik na ⧉ nesmí zprávu zároveň otevřít
  const neotevre = await p.evaluate(async () => {
    const uid = window.__openZpravaUid;
    const p0 = window.confirm; window.confirm = () => false;
    document.querySelector('#fa-seznam .fa-radek[data-uid="u-c"] .fa-kopie').click();
    await new Promise(r => setTimeout(r, 400));
    window.confirm = p0;
    return window.__openZpravaUid === uid;
  });
  check('klik na ⧉ zprávu neotevře (stopPropagation)', neotevre);

  // Neuložené změny musí projít dialogem i při kopírování
  const neulozene = await p.evaluate(async () => {
    document.getElementById('f_misto').value = 'Rozdělaná změna';
    window.__formDirty = true;
    const p0 = window.confirm; window.confirm = () => true;
    document.querySelector('#fa-seznam .fa-radek[data-uid="u-a"] .fa-kopie').click();
    await new Promise(r => setTimeout(r, 400));
    window.confirm = p0;
    const otevreny = document.getElementById('modal-leave-form').classList.contains('open');
    if (otevreny) leaveFormDiscard();
    await new Promise(r => setTimeout(r, 900));
    return { modal: otevreny, misto: document.getElementById('f_misto').value };
  });
  check('rozdělaná zpráva projde dialogem i při kopírování',
    neulozene.modal, 'modal=' + neulozene.modal);
  check('po zahození se kopie opravdu založí',
    neulozene.misto === 'Garáže autobusu – V3, areál Vzor', neulozene.misto);

  await p.evaluate(() => { STORE.technik.cislo_auto = false; saveStore(); window.__formDirty = false; });

  // ══ 5d. ✕ SMAZÁNÍ ZPRÁVY (v9.66) ════════════════════════════════
  const smazani = await p.evaluate(async () => {
    window.__formDirty = false;
    // otevřít jinou zprávu, ať se maže ta, která otevřená není
    document.querySelector('#fa-seznam .fa-radek[data-uid="u-d"]').click();
    await new Promise(r => setTimeout(r, 900));
    const pocetPred = archiv.length;
    let dotaz = '';
    const p0 = window.confirm; window.confirm = (t) => { dotaz = t; return true; };
    document.querySelector('#fa-seznam .fa-radek[data-uid="u-c"] .fa-smazat').click();
    await new Promise(r => setTimeout(r, 300));
    window.confirm = p0;
    return {
      dotaz: dotaz,
      pocetPred: pocetPred, pocetPo: archiv.length,
      zmizela: !archiv.some(z => z.uid === 'u-c'),
      vSeznamu: !document.querySelector('#fa-seznam .fa-radek[data-uid="u-c"]'),
      toast: (Array.from(document.querySelectorAll('#toast-wrap .toast')).pop() || {}).textContent || ''
    };
  });
  check('✕ se zeptá a zprávu POJMENUJE',
    /Smazat zprávu/.test(smazani.dotaz) && /RE-25-10004/.test(smazani.dotaz), smazani.dotaz);
  check('zpráva zmizí z archivu i ze seznamu',
    smazani.zmizela && smazani.vSeznamu && smazani.pocetPo === smazani.pocetPred - 1,
    smazani.pocetPred + ' → ' + smazani.pocetPo);
  check('nabídne se vzetí zpět', /ZPĚT/.test(smazani.toast), smazani.toast.slice(0, 60));

  const vraceno = await p.evaluate(async () => {
    const btn = Array.from(document.querySelectorAll('#toast-wrap .toast button'))
      .filter(b => /ZPĚT/.test(b.textContent))[0];
    if (btn) btn.click();
    await new Promise(r => setTimeout(r, 300));
    return { vArchivu: archiv.some(z => z.uid === 'u-c'),
             vSeznamu: !!document.querySelector('#fa-seznam .fa-radek[data-uid="u-c"]'),
             poradi: Array.from(document.querySelectorAll('#fa-seznam .fa-radek')).map(x => x.dataset.uid) };
  });
  check('ZPĚT zprávu vrátí do archivu i do seznamu',
    vraceno.vArchivu && vraceno.vSeznamu, 'archiv=' + vraceno.vArchivu + ' seznam=' + vraceno.vSeznamu);
  check('vrácená zpráva je zpátky na svém místě v řazení',
    vraceno.poradi.indexOf('u-c') === vraceno.poradi.length - 1, vraceno.poradi.join(','));

  const odmitnute = await p.evaluate(async () => {
    const pocet = archiv.length;
    const p0 = window.confirm; window.confirm = () => false;
    document.querySelector('#fa-seznam .fa-radek[data-uid="u-a"] .fa-smazat').click();
    await new Promise(r => setTimeout(r, 250));
    window.confirm = p0;
    return { pocet: pocet, po: archiv.length };
  });
  check('„Zrušit" v dialogu zprávu nesmaže', odmitnute.pocet === odmitnute.po,
    odmitnute.pocet + ' → ' + odmitnute.po);

  // Otevřenou zprávu smazat nejde — formulář by ji při dalším uložení vrátil
  const otevrena = await p.evaluate(async () => {
    const uid = window.__openZpravaUid;
    const radek = document.querySelector('#fa-seznam .fa-radek.fa-akt');
    return { uid: uid, maKrizek: !!(radek && radek.querySelector('.fa-smazat')),
             maKopii: !!(radek && radek.querySelector('.fa-kopie')) };
  });
  check('u otevřené zprávy se ✕ vůbec nenabízí', otevrena.uid && !otevrena.maKrizek,
    'uid=' + otevrena.uid + ' křížek=' + otevrena.maKrizek);
  check('kopírovat z otevřené zprávy ale jde dál', otevrena.maKopii);

  const pojistka = await p.evaluate(async () => {
    // i kdyby se tlačítko někde objevilo, funkce to musí odmítnout
    let hlaska = '';
    const p0 = window.confirm; window.confirm = () => { hlaska = 'ZEPTAL SE'; return true; };
    const pocet = archiv.length;
    formArchivSmazat(window.__openZpravaUid, -1);
    await new Promise(r => setTimeout(r, 250));
    window.confirm = p0;
    return { pocet: pocet, po: archiv.length, hlaska: hlaska,
             toast: (Array.from(document.querySelectorAll('#toast-wrap .toast')).pop() || {}).textContent || '' };
  });
  check('a funkce sama otevřenou zprávu odmítne smazat',
    pojistka.pocet === pojistka.po && !pojistka.hlaska && /otevřenou/.test(pojistka.toast),
    pojistka.toast.slice(0, 60));

  // klik na ✕ nesmí zprávu zároveň otevřít
  const neotevreSmaz = await p.evaluate(async () => {
    const uid = window.__openZpravaUid;
    const p0 = window.confirm; window.confirm = () => false;
    document.querySelector('#fa-seznam .fa-radek[data-uid="u-b"] .fa-smazat').click();
    await new Promise(r => setTimeout(r, 250));
    window.confirm = p0;
    return window.__openZpravaUid === uid;
  });
  check('klik na ✕ zprávu neotevře (stopPropagation)', neotevreSmaz);

  // Dvě tlačítka v úzkém sloupci ubrala místo — ev. číslo se začalo
  // ořezávat („RE-26-…"), a to je při řazení PODLE ČÍSLA ta nejhorší věc,
  // co se může uříznout. Ustupovat smí jedině datum.
  const rozvrzeni = await p.evaluate(() => {
    return Array.from(document.querySelectorAll('#fa-seznam .fa-radek')).map(row => {
      const b = row.querySelector('b');
      const akce = row.querySelector('.fa-akce');
      const vysl = row.querySelector('.fa-vysl');
      const rb = row.getBoundingClientRect();
      return {
        cislo: b.textContent,
        cisloOrez: b.scrollWidth > b.clientWidth + 1,
        akceVen: akce ? akce.getBoundingClientRect().right > rb.right + 1 : false,
        vyslOrez: vysl ? vysl.scrollWidth > vysl.clientWidth + 1 : false
      };
    });
  });
  check('ev. číslo se v řádku NEOŘEZÁVÁ', !rozvrzeni.some(r => r.cisloOrez),
    rozvrzeni.filter(r => r.cisloOrez).map(r => r.cislo).join(', ') || 'všechna celá');
  check('tlačítka ⧉ a ✕ se vejdou do šířky panelu', !rozvrzeni.some(r => r.akceVen));
  check('výsledek ✅/❌ se neořezává spolu s datem', !rozvrzeni.some(r => r.vyslOrez));

  // Oddíl 6 potřebuje mít otevřenou ELEKTRO zprávu (jinak by klik na stroj
  // nic nepřepínal — na už otevřenou zprávu se nereaguje).
  await p.evaluate(() => { window.__formDirty = false; });
  await p.click('#fa-seznam .fa-radek[data-uid="u-a"]');
  await p.waitForTimeout(900);

  // ══ 6. Jiný typ zprávy — tab, který tam není ═════════════════════
  await p.evaluate(() => { const b = document.querySelector('#tab-bar-el .tab-btn[data-tab="popis"]'); switchTab('popis', b); window.__formDirty = false; });
  await p.waitForTimeout(200);
  await p.click('#fa-seznam .fa-radek[data-uid="u-d"]');      // zpráva o stroji
  await p.waitForTimeout(900);
  po = await p.evaluate(() => ({
    typ: aktTyp,
    tab: (document.querySelector('.tab-panel.active') || {}).id,
    viditelnyPanel: (function() {
      const el = document.querySelector('.tab-panel.active');
      return el ? getComputedStyle(el).display : '';
    }()),
    bar: (function() { const b = aktivniTabBar(); return b ? b.id : ''; }())
  }));
  check('přepnutí na zprávu o stroji přepnulo typ', po.typ === 'stroje' && po.bar === 'tab-bar-stroje',
    po.typ + ' / ' + po.bar);
  check('tab „popis" u strojů není → spadlo se na titulku, ne na prázdno',
    po.tab === 'tab-titulni' && po.viditelnyPanel === 'block', po.tab + ' / ' + po.viditelnyPanel);

  // ══ 7. Neuložené změny — dialog, nic se nezahodí potichu ═════════
  const dialog = await p.evaluate(async () => {
    document.getElementById('f_misto').value = 'Rozdělaná změna';
    window.__formDirty = true;
    const pred = window.__openZpravaUid;
    document.querySelector('#fa-seznam .fa-radek[data-uid="u-c"]').click();
    await new Promise(r => setTimeout(r, 300));
    return {
      modal: document.getElementById('modal-leave-form').classList.contains('open'),
      uid: window.__openZpravaUid,
      stejna: window.__openZpravaUid === pred
    };
  });
  check('neuložené změny otevřou dialog a zprávu zatím nepřepnou',
    dialog.modal && dialog.stejna, 'modal=' + dialog.modal + ' uid=' + dialog.uid);

  const poZahozeni = await p.evaluate(async () => {
    leaveFormDiscard();
    await new Promise(r => setTimeout(r, 800));
    return { uid: window.__openZpravaUid, typ: aktTyp };
  });
  check('po „Zahodit" se přepne na vybranou zprávu',
    poZahozeni.uid === 'u-c' && poZahozeni.typ === 'lps', poZahozeni.uid + ' / ' + poZahozeni.typ);

  // ══ 8. Klik na už otevřenou zprávu nic nedělá ════════════════════
  const znovu = await p.evaluate(async () => {
    window.__formDirty = true;
    document.querySelector('#fa-seznam .fa-radek[data-uid="u-c"]').click();
    await new Promise(r => setTimeout(r, 250));
    return { modal: document.getElementById('modal-leave-form').classList.contains('open'), uid: window.__openZpravaUid };
  });
  check('klik na otevřenou zprávu ji znovu nenačítá', !znovu.modal && znovu.uid === 'u-c');

  // ══ 9. Panel mimo formulář a jeho sbalení ════════════════════════
  const mimo = await p.evaluate(async () => {
    window.__formDirty = false;
    showScreen('home');
    await new Promise(r => setTimeout(r, 200));
    const a = getComputedStyle(document.getElementById('form-archiv')).display;
    const bodyA = document.body.classList.contains('fa-open');
    showScreen('form');
    await new Promise(r => setTimeout(r, 200));
    return { home: a, bodyHome: bodyA, form: getComputedStyle(document.getElementById('form-archiv')).display };
  });
  check('mimo formulář se panel schová (hlavní strana, náhled PDF)',
    mimo.home === 'none' && !mimo.bodyHome, mimo.home);
  check('návratem do zprávy se zase ukáže', mimo.form === 'flex', mimo.form);

  await p.click('.fa-x');
  await p.waitForTimeout(250);
  const sbaleno = await p.evaluate(() => ({
    display: getComputedStyle(document.getElementById('form-archiv')).display,
    padding: getComputedStyle(document.getElementById('screen-form')).paddingLeft,
    ulozeno: localStorage.getItem('revize_el_form_archiv'),
    btn: document.getElementById('btn-form-archiv').classList.contains('fa-btn-on')
  }));
  check('« panel sbalí a obrazovku uvolní',
    sbaleno.display === 'none' && sbaleno.padding === '0px', sbaleno.display + ' / ' + sbaleno.padding);
  check('sbalený stav se pamatuje', sbaleno.ulozeno === '0' && !sbaleno.btn, String(sbaleno.ulozeno));

  // ══ 10. Sbalený stav přežije restart ═════════════════════════════
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1200);
  const poRestartu = await p.evaluate(async () => {
    aktTyp = 'elektro'; novaZprava('elektro');
    await new Promise(r => setTimeout(r, 400));
    return { display: getComputedStyle(document.getElementById('form-archiv')).display };
  });
  check('po restartu zůstává sbalený', poRestartu.display === 'none', poRestartu.display);

  // ══ 11. Zamčená (dokončená) zpráva — panel funguje dál ═══════════
  const zamcena = await p.evaluate(async () => {
    formArchivNastavit(true);
    await new Promise(r => setTimeout(r, 200));
    setFormReadOnly(true);
    await new Promise(r => setTimeout(r, 200));
    const btn = document.getElementById('btn-form-archiv');
    const x = document.querySelector('.fa-x');
    const out = {
      tlacitko: getComputedStyle(btn).display,
      zavrit: getComputedStyle(x).display,
      radku: document.querySelectorAll('#fa-seznam .fa-radek').length
    };
    setFormReadOnly(false);
    return out;
  });
  check('u dokončené zprávy se panel ani jeho tlačítka neschovají',
    zamcena.tlacitko !== 'none' && zamcena.zavrit !== 'none' && zamcena.radku > 0,
    zamcena.tlacitko + ' / ' + zamcena.zavrit + ' / ' + zamcena.radku + ' řádků');

  // ══ 12. Úzké okno — překryv místo mačkání tabulky ════════════════
  await p.setViewportSize({ width: 1200, height: 900 });
  await p.waitForTimeout(300);
  const uzke = await p.evaluate(() => ({
    panel: getComputedStyle(document.getElementById('form-archiv')).display,
    padding: getComputedStyle(document.getElementById('screen-form')).paddingLeft
  }));
  check('na úzkém okně panel leží PŘES obsah (tabulka měření se nemačká)',
    uzke.panel === 'flex' && uzke.padding === '0px', uzke.panel + ' / ' + uzke.padding);

  // ══ 13. Karta v Novinkách (v9.58, schváleno uživatelem) ══════════
  const nov = await p.evaluate(() => {
    const karty = Array.from(document.querySelectorAll('#screen-novinky .scard[data-nov-datum]'))
      .map(c => ({ datum: c.dataset.novDatum, titulek: (c.querySelector('.scard-title') || {}).textContent || '' }));
    return {
      karty: karty,
      bezData: document.querySelectorAll('#screen-novinky .scard:not([data-nov-datum])').length,
      nejnovejsi: getNovinkyLatest()
    };
  });
  // Karta se hledá PODLE TITULKU, ne podle indexu — novější karta ji posune
  // a kontrola by spadla, aniž by se cokoli pokazilo (past z CLAUDE.md).
  var kartaFA = nov.karty.filter(function(k) { return /Postranní archiv/.test(k.titulek); })[0];
  check('karta v Novinkách je', !!kartaFA, kartaFA ? kartaFA.titulek.trim() : 'CHYBÍ');
  check('karta má datum dnešní session i v titulku',
    kartaFA && kartaFA.datum === '2026-09-16' && /16\. 9\. 2026/.test(kartaFA.titulek),
    kartaFA && kartaFA.datum);
  // Pulsování se bere z MAXIMA přes všechny karty, takže se nesmí porovnávat
  // s datem téhle karty — musí být aspoň tak nové.
  check('pulsování 📰 se odvodí z data', nov.nejnovejsi >= '2026-09-16', nov.nejnovejsi);
  // Dvě staré karty k (schovaným) AI funkcím atribut nemají odjakživa —
  // hlídá se jen, aby jich nepřibývalo.
  check('kartu bez data nikdo nepřidal', nov.bezData === 2, String(nov.bezData));
  // Kontroluje se jen ČELO seznamu. Hlouběji (kolem 05–06/2026) mají dvě
  // staré karty datum mimo pořadí — je to tak odjakživa, na pulsování 📰
  // to nemá vliv (bere se maximum) a rovnat cizí karty sem nepatří.
  const celo = nov.karty.slice(0, 10);
  check('nová karta nerozhodila pořadí nahoře',
    celo.every((k, n) => n === 0 || celo[n - 1].datum >= k.datum),
    celo.map(k => k.datum).join(' ≥ '));

  // ══ 12b. Šířka: zmenšení okna a restart ══════════════════════════
  await p.setViewportSize({ width: 1600, height: 1000 });
  await p.waitForTimeout(200);
  await p.evaluate(() => formArchivSirkaNastav(700, true));
  await p.waitForTimeout(100);
  const siroky = await p.evaluate(() => document.getElementById('form-archiv').getBoundingClientRect().width);
  check('panel jde roztáhnout hodně doprava', Math.abs(siroky - 700) < 2, siroky + 'px');

  await p.setViewportSize({ width: 900, height: 900 });
  await p.waitForTimeout(300);
  const stisnute = await p.evaluate(() => ({
    sirka: document.getElementById('form-archiv').getBoundingClientRect().width,
    ulozeno: localStorage.getItem('revize_el_form_archiv_sirka')
  }));
  check('zmenšení okna panel osekne, ať na formulář zbude místo',
    stisnute.sirka <= 900 - 320 + 1 && stisnute.sirka >= 200,
    stisnute.sirka + 'px v okně 900px');
  check('osekání NEpřepíše uloženou šířku (na velkém monitoru zůstane 700)',
    stisnute.ulozeno === '700', stisnute.ulozeno);

  await p.setViewportSize({ width: 1600, height: 1000 });
  await p.waitForTimeout(300);
  const zpetSiroky = await p.evaluate(() => document.getElementById('form-archiv').getBoundingClientRect().width);
  check('zvětšením okna se šířka vrátí', Math.abs(zpetSiroky - 700) < 2, zpetSiroky + 'px');

  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1200);
  const poRestartu2 = await p.evaluate(async () => {
    aktTyp = 'elektro'; novaZprava('elektro');
    formArchivNastavit(true);
    await new Promise(r => setTimeout(r, 400));
    return { sirka: document.getElementById('form-archiv').getBoundingClientRect().width,
             padding: getComputedStyle(document.getElementById('screen-form')).paddingLeft };
  });
  check('šířka přežije restart programu', Math.abs(poRestartu2.sirka - 700) < 2, poRestartu2.sirka + 'px');
  check('a odsazení obsahu sedí i po restartu',
    poRestartu2.padding === '700px', poRestartu2.padding);

  check('bez chyb stránky', chyby.length === 0, chyby.join(' | '));
  await br.close();
  console.log(res.join('\n'));
  console.log(res.every(x => x[0] === '✅') ? '\nVŠE OK (' + res.length + ')' : '\nSELHALO');
  process.exit(res.every(x => x[0] === '✅') ? 0 : 1);
})();
