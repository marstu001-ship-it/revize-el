// v9.83 — hromadný výběr v archivu: tisk (jedno/oboustranně), dokončení, smazání.
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
  await p.evaluate(() => {
    window.confirm = () => true;
    window.__hlasky = [];
    const p0 = window.showToast;
    window.showToast = function (t, o) { window.__hlasky.push(t); window.__poslednToast = o; return p0.apply(this, arguments); };
  });

  const zaloz = () => p.evaluate(async () => {
    localStorage.clear(); archiv.length = 0; STORE.archiv = archiv;
    STORE.technik = { jmeno: 'M. Technik', mesto: 'Kyjov' };
    const zpravy = [['elektro','dum','Dům A'], ['stroje','stroje','Hala 3'], ['elektro','byt','Byt B']];
    for (const [typ, podtyp, misto] of zpravy) {
      aktTyp = typ; aktPodtyp = podtyp; novaZprava(typ);
      await new Promise(r => setTimeout(r, 700));
      document.getElementById('f_misto').value = misto;
      document.getElementById('f_ev_cislo').value = 'RZ-' + misto.replace(/\s/g, '');
      document.getElementById('f_zahajeni').value = '2026-09-21';
      saveToArchiv();
    }
    showScreen('home'); renderArchiv();
    await new Promise(r => setTimeout(r, 300));
  });

  // `od` = od kolikátého řádku. Po založení zůstává POSLEDNÍ zpráva otevřená
  // ve formuláři (tj. první řádek archivu) — a tu smazat nejde, viz oddíl 6.
  const oznac = (kolik, od) => p.evaluate(async (o) => {
    const radky = () => [...document.querySelectorAll('#archiv-container tbody .archiv-check')];
    for (let i = 0; i < o.kolik; i++) { radky()[o.od + i].click(); await new Promise(r => setTimeout(r, 150)); }
  }, { kolik, od: od || 0 });

  // ══ 1. Zaškrtávátka a lišta ═══════════════════════════════════════
  await zaloz();
  const zac = await p.evaluate(() => ({
    radku: document.querySelectorAll('#archiv-container tbody tr').length,
    vHlavicce: !!document.querySelector('#archiv-container thead .archiv-check'),
    naRadku: document.querySelectorAll('#archiv-container tbody .archiv-check').length,
    skryta: document.getElementById('archiv-hromadne').classList.contains('archiv-hromadne-skryta')
  }));
  check('každý řádek archivu má zaškrtávátko', zac.naRadku === 3 && zac.radku === 3, zac.naRadku + ' z ' + zac.radku);
  check('a v hlavičce je „označit vše"', zac.vHlavicce);
  check('bez výběru je lišta SCHOVANÁ', zac.skryta);

  await oznac(2);
  const po = await p.evaluate(() => ({
    skryta: document.getElementById('archiv-hromadne').classList.contains('archiv-hromadne-skryta'),
    popis: document.getElementById('archiv-vybrano-pocet').textContent,
    poradi: archivVybraneZpravy().map(t => t.z.misto)
  }));
  check('po zaškrtnutí se lišta ukáže a počítá správně', !po.skryta && po.popis === '2 zprávy', po.popis);
  check('vybrané jdou v pořadí, jak jsou na obrazovce', po.poradi.join(' → '), po.poradi.join(' → '));

  // výběr přežije překreslení archivu (filtr, uložení jiné zprávy…)
  const preziti = await p.evaluate(async () => {
    renderArchiv(); await new Promise(r => setTimeout(r, 150));
    return { pocet: archivVybraneKlice().length,
             zaskrtnuto: [...document.querySelectorAll('#archiv-container tbody .archiv-check')].filter(x => x.checked).length };
  });
  check('výběr přežije překreslení seznamu',
    preziti.pocet === 2 && preziti.zaskrtnuto === 2, preziti.pocet + ' / ' + preziti.zaskrtnuto);

  const vse = await p.evaluate(async () => {
    const hlav = () => document.querySelector('#archiv-container thead .archiv-check');
    hlav().click(); await new Promise(r => setTimeout(r, 200));
    const zap = archivVybraneKlice().length;
    hlav().click(); await new Promise(r => setTimeout(r, 200));
    return { zap, vyp: archivVybraneKlice().length, zaskrtnutaHlavicka: hlav().checked };
  });
  check('zaškrtávátko v hlavičce označí a zase odznačí všechny zobrazené',
    vse.zap === 3 && vse.vyp === 0 && !vse.zaskrtnutaHlavicka, vse.zap + ' → ' + vse.vyp);
  await oznac(2);

  // ══ 2. Hromadný tisk — jednostranně ═══════════════════════════════
  const jedno = await p.evaluate(async () => {
    archivTiskJedno();
    await new Promise(r => setTimeout(r, 9000));
    const str = [...document.querySelectorAll('#hromadny-pdf-pages .a4')];
    return { obrazovka: (document.querySelector('.screen.active') || {}).id,
             stran: str.length,
             prazdnych: str.filter(x => x.getAttribute('data-prazdna')).length,
             info: (document.getElementById('hromadny-pdf-info') || {}).textContent || '',
             archivNedotcen: archiv.length,
             cisla: archiv.map(z => z.ev_cislo).join(',') };
  });
  check('tisk přepne na sloučený náhled', jedno.obrazovka === 'screen-hromadny-pdf', jedno.obrazovka);
  check('náhled obsahuje stránky obou zpráv', jedno.stran > 2, jedno.stran + ' stran');
  check('jednostranně se NEDOPLŇUJE žádná prázdná strana', jedno.prazdnych === 0, String(jedno.prazdnych));
  check('lišta říká, co se bude tisknout', /jednostrann/.test(jedno.info), jedno.info);
  check('tisk NEPŘEPÍŠE archiv', jedno.archivNedotcen === 3 && jedno.cisla.split(',').length === 3, jedno.cisla);

  // ══ 3. Hromadný tisk — oboustranně ════════════════════════════════
  const obou = await p.evaluate(async () => {
    showScreen('home'); renderArchiv();
    await new Promise(r => setTimeout(r, 200));
    archivTiskObou();
    await new Promise(r => setTimeout(r, 9000));
    const str = [...document.querySelectorAll('#hromadny-pdf-pages .a4')];
    // kde začíná která zpráva — po prázdné straně musí následovat začátek další
    const znacky = str.map(x => x.getAttribute('data-prazdna') ? 'P' : (x.classList.contains('a4-titulni') ? 'T' : '.'));
    return { stran: str.length, prazdnych: str.filter(x => x.getAttribute('data-prazdna')).length,
             znacky: znacky.join(''), info: (document.getElementById('hromadny-pdf-info') || {}).textContent || '' };
  });
  const lichéBezPrázdné = (() => {
    // rozdělit podle titulních stran a ověřit, že každý blok má sudý počet
    const bloky = obou.znacky.split('T').slice(1).map(b => b.length + 1);
    return bloky.filter(n => n % 2 === 1);
  })();
  check('oboustranně: každá zpráva zabírá SUDÝ počet stran',
    obou.stran > 0 && lichéBezPrázdné.length === 0, obou.znacky);
  check('a doplněné strany jsou označené jako prázdné', obou.prazdnych > 0, String(obou.prazdnych));
  check('lišta rozliší oboustranný tisk', /oboustrann/.test(obou.info), obou.info);

  const prazdnaStrana = await p.evaluate(() => {
    const pr = document.querySelector('#hromadny-pdf-pages .a4[data-prazdna]');
    return pr ? { text: pr.innerText.trim(), sirka: pr.getBoundingClientRect().width } : null;
  });
  check('prázdná strana to o sobě řekne (aby to nevypadalo jako chyba tisku)',
    prazdnaStrana && /záměrně prázdná/i.test(prazdnaStrana.text), prazdnaStrana && prazdnaStrana.text);

  // ══ 4. Hromadné dokončení ═════════════════════════════════════════
  await zaloz();
  await oznac(2);
  const uzavr = await p.evaluate(async () => {
    archivHromadneUzavrit();
    await new Promise(r => setTimeout(r, 300));
    return { stavy: archiv.map(z => z.ev_cislo + ':' + (z.stav || '-')).join(' '),
             vyber: archivVybraneKlice().length,
             hlaska: window.__hlasky[window.__hlasky.length - 1],
             maZpet: !!(window.__poslednToast && window.__poslednToast.action) };
  });
  check('vybrané zprávy se označí jako dokončené',
    !/RZ-BytB:aktivni/.test(uzavr.stavy) && !/RZ-Hala3:aktivni/.test(uzavr.stavy) && /RZ-DůmA:aktivni/.test(uzavr.stavy),
    uzavr.stavy);
  check('výběr se po akci zruší', uzavr.vyber === 0, String(uzavr.vyber));
  check('a jde to vzít zpět', uzavr.maZpet, uzavr.hlaska);

  const zpetU = await p.evaluate(async () => {
    window.__poslednToast.action();
    await new Promise(r => setTimeout(r, 200));
    return archiv.map(z => z.ev_cislo + ':' + (z.stav || '-')).join(' ');
  });
  check('ZPĚT vrátí zprávy mezi rozpracované', !/ukoncena/.test(zpetU), zpetU);

  // ══ 5. Hromadné smazání a vzetí zpět ══════════════════════════════
  await zaloz();
  await oznac(2, 1);   // dva spodní řádky — první je otevřený ve formuláři
  const smaz = await p.evaluate(async () => {
    const pred = archiv.map(z => z.ev_cislo);
    archivHromadneSmazat();
    await new Promise(r => setTimeout(r, 300));
    return { pred: pred.join(','), po: archiv.map(z => z.ev_cislo).join(','),
             maZpet: !!(window.__poslednToast && window.__poslednToast.action) };
  });
  check('hromadné smazání odebere právě vybrané zprávy',
    smaz.po === 'RZ-BytB', smaz.pred + ' → ' + smaz.po);
  check('a nabídne ZPĚT', smaz.maZpet);

  const zpetS = await p.evaluate(async () => {
    window.__poslednToast.action();
    await new Promise(r => setTimeout(r, 250));
    return archiv.map(z => z.ev_cislo).join(',');
  });
  check('ZPĚT vrátí všechny smazané na svá místa — i ve správném pořadí',
    zpetS === 'RZ-BytB,RZ-Hala3,RZ-DůmA', zpetS);

  // ══ 6. Otevřenou zprávu smazat nejde ══════════════════════════════
  const otevrena = await p.evaluate(async () => {
    showScreen('home'); renderArchiv(); await new Promise(r => setTimeout(r, 200));
    otevritZpravu(0);                      // otevřít první zprávu
    await new Promise(r => setTimeout(r, 900));
    showScreen('home'); renderArchiv(); await new Promise(r => setTimeout(r, 200));
    const ch = [...document.querySelectorAll('#archiv-container tbody .archiv-check')];
    ch[0].click();                          // právě otevřená
    await new Promise(r => setTimeout(r, 200));
    const pred = archiv.length;
    archivHromadneSmazat();
    await new Promise(r => setTimeout(r, 250));
    return { pred, po: archiv.length, hlaska: window.__hlasky[window.__hlasky.length - 1] };
  });
  check('otevřenou zprávu hromadné mazání NESMAŽE',
    otevrena.po === otevrena.pred, otevrena.hlaska);

  // ══ 7. Filtr typu nad archivem zná všechny typy ══════════════
  const filtr = await p.evaluate(async () => {
    localStorage.clear(); archiv.length = 0; STORE.archiv = archiv;
    STORE.technik = { jmeno: 'M. Technik' };
    for (const [typ, podtyp, misto] of [['elektro','dum','Dům'],['lps','lps','Hala'],
                                        ['stroje','stroje','Lis'],['spotrebice','spotrebice','Hasičárna']]) {
      aktTyp = typ; aktPodtyp = podtyp; novaZprava(typ);
      await new Promise(r => setTimeout(r, 700));
      document.getElementById('f_misto').value = misto;
      document.getElementById('f_ev_cislo').value = 'RZ-' + typ;
      saveToArchiv();
    }
    showScreen('home'); renderArchiv(); await new Promise(r => setTimeout(r, 250));
    const sel = document.getElementById('archiv-typ');
    const volby = [...sel.options].map(o => o.value).join(',');
    const popisky = [...sel.options].map(o => o.textContent).join(',');
    sel.value = 'spotrebice'; renderArchiv(); await new Promise(r => setTimeout(r, 200));
    const jenSpotr = [...document.querySelectorAll('#archiv-container tbody tr')]
      .map(t => (t.querySelector('[data-archiv-ev]') || {}).textContent || '');
    const drziVolbu = document.getElementById('archiv-typ').value;
    sel.value = ''; renderArchiv(); await new Promise(r => setTimeout(r, 200));
    return { volby, popisky, jenSpotr, drziVolbu,
             poradiZTabulky: Object.keys(TYPY_ZPRAV).join(',') };
  });
  check('filtr nabízí VŠECHNY typy zpráv včetně spotřebičů',
    filtr.volby === ',' + filtr.poradiZTabulky, filtr.popisky);
  check('a v tom pořadí, jak je má TYPY_ZPRAV — ne jak přibyly do archivu',
    filtr.volby.slice(1) === filtr.poradiZTabulky, filtr.volby);
  check('výběr „Spotřebiče" nechá v seznamu jen je',
    filtr.jenSpotr.length === 1 && /spotrebice/.test(filtr.jenSpotr[0]), filtr.jenSpotr.join(','));
  check('a překreslení archivu zvolený typ NEZTRATÍ',
    filtr.drziVolbu === 'spotrebice', filtr.drziVolbu);

  // ══ 8. Výběr vs. stránkování archivu (v9.86) ══════════════════════
  // Nahlásil uživatel 2026-09-22: filtr našel 27 strojů, v seznamu jich je
  // 25 a „označit vše" označilo právě těch 25 — bez jediného slova o tom,
  // že dvě zůstaly stranou.
  const davka = await p.evaluate(async () => {
    localStorage.clear(); archiv.length = 0; STORE.archiv = archiv;
    STORE.technik = { jmeno: 'M. Technik' };
    for (let i = 1; i <= 27; i++) archiv.push({
      uid: 'stroj-' + i, typ: 'stroje', ev_cislo: 'RS-26-' + String(i).padStart(4, '0'),
      misto: 'Stroj ' + i, datum: '2026-09-0' + ((i % 9) + 1), stav: 'dokoncena',
      vysledek: 'schopno', data: { typ: 'stroje' }
    });
    for (let i = 1; i <= 4; i++) archiv.push({
      uid: 'elektro-' + i, typ: 'elektro', ev_cislo: 'RE-26-000' + i,
      misto: 'Dům ' + i, datum: '2026-09-02', stav: 'dokoncena',
      vysledek: 'schopno', data: { typ: 'elektro' }
    });
    __archivVybrane = {}; window.__archivLimit = 25; window.__archivFilterSig = null;
    document.getElementById('archiv-typ').value = 'stroje';
    showScreen('home'); renderArchiv();
    await new Promise(r => setTimeout(r, 250));
    return {
      radku: document.querySelectorAll('#archiv-container tbody tr').length,
      vic: (document.querySelector('[data-action="archivShowMore"]') || {}).textContent || '',
      pozn: (document.querySelector('#archiv-container [data-action="archivShowMore"]')
             || {}).parentNode.textContent || ''
    };
  });
  check('filtr s 27 zprávami ukáže jen prvních 25', davka.radku === 25, davka.radku + ' řádků');
  check('a pod seznamem je vidět, že jich je 27', /Zobrazeno 25 z 27/.test(davka.pozn), davka.pozn.trim());

  const vseVidi = await p.evaluate(async () => {
    window.__hlasky = [];
    document.querySelector('#archiv-container thead .archiv-check').click();
    await new Promise(r => setTimeout(r, 300));
    return {
      vybrano: archivVybraneKlice().length,
      hlaska: window.__hlasky[window.__hlasky.length - 1] || '',
      akce: (window.__poslednToast || {}).actionLabel || '',
      tlacitko: (document.querySelector('[data-action="archivVybratSkryte"]') || {}).textContent || '',
      listaVidet: !document.getElementById('archiv-hromadne').classList.contains('archiv-hromadne-skryta')
    };
  });
  check('„označit vše" označí 25 zobrazených', vseVidi.vybrano === 25, String(vseVidi.vybrano));
  check('ale ŘEKNE, kolik jich filtru ve skutečnosti vyhovuje',
    /vyhovuje 27/.test(vseVidi.hlaska) && /nevešel/.test(vseVidi.hlaska), vseVidi.hlaska);
  check('a nabídne je dobrat rovnou z hlášky', /Vybrat i zbývající 2/.test(vseVidi.akce), vseVidi.akce);
  check('v liště výběru zůstane tlačítko „Vybrat i zbývající 2"',
    vseVidi.listaVidet && /zbývající 2/.test(vseVidi.tlacitko), vseVidi.tlacitko);

  const dobrano = await p.evaluate(async () => {
    document.querySelector('[data-action="archivVybratSkryte"]').click();
    await new Promise(r => setTimeout(r, 300));
    return {
      vybrano: archivVybraneKlice().length,
      radku: document.querySelectorAll('#archiv-container tbody tr').length,
      tlacitko: !!document.querySelector('[data-action="archivVybratSkryte"]'),
      vic: !!document.querySelector('[data-action="archivShowMore"]'),
      jenStroje: archivVybraneZpravy().every(t => t.z.typ === 'stroje')
    };
  });
  check('tlačítko dobere zbývající dvě — vybraných je 27', dobrano.vybrano === 27, String(dobrano.vybrano));
  check('a hlavně je ROVNOU UKÁŽE (výběr, na který se nedá podívat, je horší)',
    dobrano.radku === 27 && !dobrano.vic, dobrano.radku + ' řádků');
  check('dobralo jen zprávy z filtru, ne elektro pod ním', dobrano.jenStroje);
  check('a když už nic nezbývá, tlačítko zmizí', !dobrano.tlacitko);

  const bezFiltru = await p.evaluate(async () => {
    archivZrusitVyber();
    document.getElementById('archiv-typ').value = '';
    window.__archivLimit = 25; window.__archivFilterSig = null;
    renderArchiv(); await new Promise(r => setTimeout(r, 250));
    const ch = [...document.querySelectorAll('#archiv-container tbody .archiv-check')];
    ch[0].click();
    await new Promise(r => setTimeout(r, 250));
    return {
      tlacitko: !!document.querySelector('[data-action="archivVybratSkryte"]'),
      celkem: archiv.length
    };
  });
  check('nabídka platí i bez filtru — 31 zpráv, 25 v seznamu',
    bezFiltru.tlacitko && bezFiltru.celkem === 31, String(bezFiltru.celkem));

  const vejdeSe = await p.evaluate(async () => {
    archivZrusitVyber();
    archiv.length = 3; STORE.archiv = archiv;
    window.__archivLimit = 25; window.__archivFilterSig = null;
    renderArchiv(); await new Promise(r => setTimeout(r, 200));
    window.__hlasky = [];
    document.querySelector('#archiv-container thead .archiv-check').click();
    await new Promise(r => setTimeout(r, 250));
    return {
      vybrano: archivVybraneKlice().length,
      tlacitko: !!document.querySelector('[data-action="archivVybratSkryte"]'),
      hlasek: window.__hlasky.length
    };
  });
  check('vejde-li se seznam celý, chová se „označit vše" jako dřív — bez hlášky',
    vejdeSe.vybrano === 3 && !vejdeSe.tlacitko && vejdeSe.hlasek === 0,
    vejdeSe.vybrano + ' vybraných, hlášek ' + vejdeSe.hlasek);

  check('bez chyb stránky', chyby.length === 0, chyby.join(' | '));
  await br.close();
  console.log(res.join('\n'));
  console.log(res.every(x => x[0] === '✅') ? '\nVŠE OK (' + res.length + ')' : '\nSELHALO');
})();
