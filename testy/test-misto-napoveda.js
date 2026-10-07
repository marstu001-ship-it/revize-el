// v9.74 — našeptávání místa provádění z archivu.
// „u kontroly strojů na titulní straně vyplňujeme místo provádění kontroly —
//  chtělo by to našeptávání místa z uložených kontrol z archivu, celého místa"
const { chromium } = require('/opt/node22/lib/node_modules/playwright/node_modules/playwright-core');
const res = []; const check = (n, ok, d) => res.push((ok?'✅':'❌')+' '+n+(d?' — '+d:''));

const ARCH = [
  ['a','stroje','Hala 3 – lisovna\nSO 12','Sokolovská 573\n686 01 Uherské Hradiště','2026-09-10'],
  ['b','stroje','Hala 1 – svařovna','Sokolovská 573\n686 01 Uherské Hradiště','2026-09-12'],
  ['c','elektro','Rodinný dům č.p. 123','Kyjov 697 01','2026-09-14'],
  ['d','stroje','Hala 3 – lisovna\nSO 12','úplně jiná adresa','2026-09-01']
];

(async () => {
  const br = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await br.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript(() => { navigator.serviceWorker.register = () => new Promise(() => {}); });
  const p = await ctx.newPage();
  const chyby = []; p.on('pageerror', e => chyby.push(e.message));
  await p.goto('http://127.0.0.1:8901/index.html', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1400);

  const nasyp = async (A) => p.evaluate((A) => {
    localStorage.clear();
    STORE.technik = { jmeno: 'Jan Novák', mesto: 'Kyjově' };
    archiv.length = 0;
    A.forEach(r => archiv.push({ uid: r[0], typ: r[1], misto: r[2], ev_cislo: r[0],
      timestamp: r[4], data: { adresa: r[3], misto: r[2], typ: r[1] } }));
    STORE.archiv = archiv;
  }, A);

  // ══ 1. Výběr a řazení ═══════════════════════════════════════════
  await nasyp(ARCH);
  const zdroj = await p.evaluate(async () => {
    aktTyp = 'stroje'; aktPodtyp = 'stroje'; novaZprava('stroje');
    await new Promise(r => setTimeout(r, 700));
    return {
      vse: mistaZArchivu('stroje', '').map(x => x.typ + '|' + x.misto.split('\n')[0]),
      proElektro: mistaZArchivu('elektro', '').map(x => x.typ)[0],
      mezery: mistaZArchivu('stroje', 'hala3').map(x => x.misto.split('\n')[0]),
      diakritika: mistaZArchivu('stroje', 'SVAROVNA').map(x => x.misto),
      adresa: mistaZArchivu('stroje', 'uherske').length,
      nic: mistaZArchivu('stroje', 'xyzabc').length
    };
  });
  check('nabízejí se místa z archivu', zdroj.vse.length === 3, zdroj.vse.join(' / '));
  check('zprávy TÉHOŽ typu jdou první, uvnitř od nejnovější',
    zdroj.vse[0] === 'stroje|Hala 1 – svařovna' && zdroj.vse[1] === 'stroje|Hala 3 – lisovna' &&
    zdroj.vse[2].indexOf('elektro|') === 0, zdroj.vse.join(' / '));
  check('u elektro revize jde první elektro zpráva', zdroj.proElektro === 'elektro', zdroj.proElektro);
  check('stejné místo se nenabízí dvakrát', zdroj.vse.length === 3, 'ze 4 záznamů ' + zdroj.vse.length);
  check('hledá se bez ohledu na mezery („hala3" najde „Hala 3")',
    zdroj.mezery[0] === 'Hala 3 – lisovna', zdroj.mezery.join(','));
  check('hledá se bez ohledu na diakritiku a velikost písmen',
    zdroj.diakritika[0] === 'Hala 1 – svařovna', zdroj.diakritika.join(','));
  check('hledat jde i podle adresy', zdroj.adresa === 2, String(zdroj.adresa));
  check('co v archivu není, se nenabídne', zdroj.nic === 0, String(zdroj.nic));

  // ══ 2. Nabídka na obrazovce ═════════════════════════════════════
  await p.click('#f_misto');
  await p.waitForTimeout(250);
  const menu = await p.evaluate(() => {
    const b = document.querySelector('.misto-nabidka');
    if (!b) return { je: false };
    const r = [...b.querySelectorAll('.misto-volba')];
    return { je: true, pocet: r.length, vBody: b.parentElement === document.body,
      prvniText: r[0].innerText.replace(/\n/g, ' | '),
      viceradkove: /Hala 3 – lisovna[\s\S]*SO 12/.test(r[1].innerText),
      cizitypOznacen: !!r[2].querySelector('.misto-typ'),
      stejnyTypNeoznacen: !r[0].querySelector('.misto-typ'),
      vejde: b.getBoundingClientRect().right <= window.innerWidth + 1 &&
             b.getBoundingClientRect().bottom <= window.innerHeight + 1,
      pata: !!b.querySelector('.misto-pata') };
  });
  check('klepnutím do pole se nabídka otevře', menu.je && menu.pocet === 3, menu.pocet + ' položek');
  check('u místa je vidět i adresa, ať se dvě stejné haly rozliší',
    /Sokolovská/.test(menu.prvniText), menu.prvniText);
  check('víceřádkové místo je vidět CELÉ, ne jen první řádek', menu.viceradkove);
  check('zpráva jiného typu je označená štítkem typu',
    menu.cizitypOznacen && menu.stejnyTypNeoznacen);
  check('nabídka leží v body a vejde se do okna', menu.vBody && menu.vejde);
  check('patička říká, co se stane s adresou', menu.pata);

  // ══ 3. Výběr vloží CELÉ místo ═══════════════════════════════════
  const vyber = await p.evaluate(async () => {
    const pole = document.getElementById('f_misto');
    let dirty = false;
    pole.addEventListener('input', () => { dirty = true; });
    [...document.querySelectorAll('.misto-volba')][1]
      .dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    await new Promise(r => setTimeout(r, 150));
    return { misto: pole.value, adresa: document.getElementById('f_adresa').value,
             zavrena: !document.querySelector('.misto-nabidka'), dirty,
             vDatech: getData().misto };
  });
  check('vloží se CELÉ místo včetně dalších řádků',
    vyber.misto === 'Hala 3 – lisovna\nSO 12', JSON.stringify(vyber.misto));
  check('prázdná adresa se doplní z téže zprávy',
    vyber.adresa === 'Sokolovská 573\n686 01 Uherské Hradiště', JSON.stringify(vyber.adresa));
  check('po výběru se nabídka zavře', vyber.zavrena);
  check('výběr označí zprávu jako změněnou', vyber.dirty);
  check('místo se propíše do dat zprávy',
    vyber.vDatech === 'Hala 3 – lisovna\nSO 12', JSON.stringify(vyber.vDatech));

  // Vyplněná adresa se NEPŘEPÍŠE — co si uživatel napsal, zůstane.
  const nePrepis = await p.evaluate(async () => {
    document.getElementById('f_adresa').value = 'MOJE VLASTNÍ ADRESA';
    document.getElementById('f_misto').value = '';
    mistoNabidkaOtevrit(document.getElementById('f_misto'));
    await new Promise(r => setTimeout(r, 120));
    [...document.querySelectorAll('.misto-volba')][0]
      .dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    await new Promise(r => setTimeout(r, 120));
    return { adresa: document.getElementById('f_adresa').value,
             misto: document.getElementById('f_misto').value };
  });
  check('vyplněná adresa se NEPŘEPÍŠE', nePrepis.adresa === 'MOJE VLASTNÍ ADRESA', nePrepis.adresa);
  check('místo se přitom vloží', nePrepis.misto === 'Hala 1 – svařovna', nePrepis.misto);

  // ══ 4. Klávesnice ═══════════════════════════════════════════════
  const klav = await p.evaluate(async () => {
    const pole = document.getElementById('f_misto');
    pole.value = ''; pole.focus();
    mistoNabidkaOtevrit(pole);
    await new Promise(r => setTimeout(r, 120));
    const kl = (key) => {
      const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      pole.dispatchEvent(e); return e.defaultPrevented;
    };
    kl('ArrowDown');
    const poSipce = document.querySelector('.misto-volba.je').innerText.split('\n')[0];
    const enterZabranen = kl('Enter');
    await new Promise(r => setTimeout(r, 120));
    const poEnteru = pole.value;
    // Esc zavře
    mistoNabidkaOtevrit(pole);
    await new Promise(r => setTimeout(r, 120));
    kl('Escape');
    const poEsc = !!document.querySelector('.misto-nabidka');
    // Enter BEZ otevřené nabídky musí normálně udělat nový řádek
    const enterVolny = kl('Enter');
    return { poSipce, enterZabranen, poEnteru, poEsc, enterVolny };
  });
  check('šipka dolů posune výběr', klav.poSipce === 'Hala 3 – lisovna', klav.poSipce);
  check('Enter vybere označené místo, místo aby udělal nový řádek',
    klav.enterZabranen && klav.poEnteru === 'Hala 3 – lisovna\nSO 12', JSON.stringify(klav.poEnteru));
  check('Esc nabídku zavře', !klav.poEsc);
  check('bez otevřené nabídky Enter v poli funguje normálně (nový řádek)',
    klav.enterVolny === false);

  // ══ 4b. Rolování kolečkem UVNITŘ nabídky ji nesmí zavřít ════════
  // „když chci v tom nabídnutém seznamu zaskrolovat kolečkem, tak zmizne"
  // (uživatel 2026-09-18). Nabídka je rolovatelná, tak v ní musí jít rolovat.
  await p.evaluate((A) => {
    archiv.length = 0;
    for (let i = 1; i <= 20; i++) archiv.push({ uid: 'x' + i, typ: 'elektro',
      misto: 'Budova č. ' + i, ev_cislo: 'RE-26-' + i, timestamp: '2026-09-10',
      data: { adresa: 'Sokolovská 573, Uherské Hradiště' } });
    STORE.archiv = archiv;
    const pole = document.getElementById('f_misto');
    pole.value = ''; pole.focus();
    mistoNabidkaOtevrit(pole);
  }, ARCH);
  await p.waitForTimeout(250);
  const predRolovanim = await p.evaluate(() => {
    const b = document.querySelector('.misto-nabidka');
    return b ? { je: true, rolovatelna: b.scrollHeight > b.clientHeight + 2,
                 kde: Math.round(b.getBoundingClientRect().left + 30),
                 vys: Math.round(b.getBoundingClientRect().top + 40) } : { je: false };
  });
  check('dlouhý seznam je v nabídce rolovatelný',
    predRolovanim.je && predRolovanim.rolovatelna);
  // skutečné kolečko myši nad nabídkou
  await p.mouse.move(predRolovanim.kde, predRolovanim.vys);
  await p.mouse.wheel(0, 120);
  await p.waitForTimeout(250);
  const poKolecku = await p.evaluate(() => {
    const b = document.querySelector('.misto-nabidka');
    return { je: !!b, posunuta: b ? b.scrollTop > 0 : false };
  });
  check('kolečko myši NAD nabídkou ji nezavře', poKolecku.je);
  check('a opravdu se v ní posune obsah', poKolecku.posunuta,
    'scrollTop ' + (poKolecku.posunuta ? '>0' : '0'));
  // rolování STRÁNKY ji naopak zavřít MÁ — jinak by odjela od pole
  const poStrance = await p.evaluate(async () => {
    document.dispatchEvent(new Event('scroll', { bubbles: true }));
    await new Promise(r => setTimeout(r, 150));
    return !!document.querySelector('.misto-nabidka');
  });
  check('rolování STRÁNKY nabídku zavře (odjela by od pole)', !poStrance);

  // ══ 5. Kdy se nabídka NESMÍ objevit ═════════════════════════════
  const nesmi = await p.evaluate(async () => {
    // zamčená (dokončená) zpráva
    window.__formReadOnly = true;
    mistoNabidkaOtevrit(document.getElementById('f_misto'));
    const zamcena = !!document.querySelector('.misto-nabidka');
    window.__formReadOnly = false;
    // prázdný archiv
    archiv.length = 0; STORE.archiv = archiv;
    mistoNabidkaOtevrit(document.getElementById('f_misto'));
    const prazdny = !!document.querySelector('.misto-nabidka');
    return { zamcena, prazdny };
  });
  check('u dokončené (zamčené) zprávy se nabídka neotevře', !nesmi.zamcena);
  check('prázdný archiv nabídku neotevře', !nesmi.prazdny);

  // ══ 6. Funguje i tam, kam se pole stěhuje (spotřebiče) ══════════
  const spotr = await p.evaluate(async () => {
    archiv.length = 0;
    archiv.push({ uid: 'x', typ: 'spotrebice', misto: 'VVZ – m.č. 138', ev_cislo: 'x',
      timestamp: '2026-09-17', data: { adresa: 'Mařatice', misto: 'VVZ – m.č. 138' } });
    STORE.archiv = archiv;
    aktTyp = 'spotrebice'; aktPodtyp = 'spotrebice'; novaZprava('spotrebice');
    await new Promise(r => setTimeout(r, 800));
    const pole = document.getElementById('f_misto');
    const vListu = !!pole.closest('.sp-sheet');
    mistoNabidkaOtevrit(pole);
    await new Promise(r => setTimeout(r, 150));
    const b = document.querySelector('.misto-nabidka');
    const rr = pole.getBoundingClientRect(), br = b ? b.getBoundingClientRect() : null;
    return { vListu, je: !!b,
             podPolem: br ? Math.abs(br.top - rr.bottom) < 20 || Math.abs(br.bottom - rr.top) < 20 : false };
  });
  check('pole se u spotřebičů stěhuje do protokolu', spotr.vListu);
  check('našeptávání funguje i v přestěhovaném poli', spotr.je);
  check('nabídka se drží u pole i ve zmenšeném protokolu', spotr.podPolem);

  // ══ 7. Do PDF se nabídka nedostane ══════════════════════════════
  const pdf = await p.evaluate(async () => {
    document.querySelector('#spotrebice-body [data-k="nazev"]').value = 'Lampa';
    spotrebiceNahled();
    await new Promise(r => setTimeout(r, 700));
    return document.querySelectorAll('#spotrebice-pdf-pages .misto-nabidka').length;
  });
  check('v PDF žádná nabídka není', pdf === 0, String(pdf));

  check('bez chyb stránky', chyby.length === 0, chyby.join(' | '));
  await br.close();
  console.log(res.join('\n'));
  console.log(res.every(x => x[0] === '✅') ? '\nVŠE OK (' + res.length + ')' : '\nSELHALO');
})();
