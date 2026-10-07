// v9.56 — AI sken štítku zapisoval KABEL do špatného sloupce: u obvodu do
// „5×IΔn tvyp. ms", u hlavičky chrániče taky o dva vedle. Počítalo se pořadí
// <input> a komentář u toho vynechával Isc a Rpe.
// Opraveno stejně jako v9.55: přes VIZUÁLNÍ sloupec (fillCilovyInput).
// + kontrola karty v Novinkách.
const { chromium } = require('/opt/node22/lib/node_modules/playwright/node_modules/playwright-core');
const res = []; const check = (n, ok, d) => res.push((ok ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));

(async () => {
  const br = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await br.newContext({ viewport: { width: 1500, height: 1000 } });
  await ctx.addInitScript(() => { navigator.serviceWorker.register = () => new Promise(() => {}); });
  const p = await ctx.newPage();
  const chyby = []; p.on('pageerror', e => chyby.push(e.message));
  await p.goto('http://127.0.0.1:8901/index.html', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1200);

  await p.evaluate(() => {
    localStorage.clear(); STORE.technik = { jmeno: 'M. Š' }; archiv.length = 0; STORE.archiv = archiv;
    aktTyp = 'elektro'; aktPodtyp = 'dum'; novaZprava('elektro');
  });
  await p.waitForTimeout(600);

  // ══ 1. OBVOD ze skenu ════════════════════════════════════════════
  const obvod = await p.evaluate(() => {
    const tb = document.querySelector('#rozvadece-container tbody');
    tb.innerHTML = '';
    addMereniRowFromData(tb, { cislo: 'FA1', nazev: 'Zásuvky kuchyně', typ_pol: 'EATON',
                               ch: 'B', proud: '16', kabel: 'CYKY 3×2,5' });
    const tr = tb.querySelector('tr[data-rowtype="obvod"]');
    const v = (i) => { const x = fillCilovyInput(tr, i); return x ? x.value : null; };
    return {
      cislo: v(0), nazev: v(1), znacka: v(2), ch: v(3), a: v(4),
      isc: v(6), zsm: v(7), riso: v(8), rpe: v(9),
      vyp: v(11), cas: v(12), t5idn: v(13), ut: v(14), kabel: v(15),
      poli: tr.querySelectorAll('input').length
    };
  });
  check('obvod: KABEL je ve sloupci Kabel', obvod.kabel === 'CYKY 3×2,5', String(obvod.kabel));
  check('obvod: kabel NEspadl do „5×IΔn tvyp. ms"', !obvod.t5idn, String(obvod.t5idn));
  check('obvod: ostatní sloupce sedí',
    obvod.nazev === 'Zásuvky kuchyně' && obvod.znacka === 'EATON' &&
    obvod.ch === 'B' && obvod.a === '16', JSON.stringify(obvod));
  check('obvod: číslo řádku přepíše auto-číslování (tak to má být)',
    obvod.cislo === '1', String(obvod.cislo));
  check('obvod: do měřených sloupců se nic nevlilo',
    !obvod.isc && !obvod.zsm && !obvod.rpe && !obvod.vyp && !obvod.cas && !obvod.ut,
    JSON.stringify({ isc: obvod.isc, zsm: obvod.zsm, rpe: obvod.rpe, ut: obvod.ut }));
  check('obvod má 16 polí', obvod.poli === 16, String(obvod.poli));

  // ══ 2. CHRÁNIČ ze skenu (o jedno pole míň — Ch./Typ je select) ═══
  const rcd = await p.evaluate(() => {
    const tb = document.querySelector('#rozvadece-container tbody');
    tb.innerHTML = '';
    addRcdRowFromData(tb, { cislo: 'FA7', nazev: 'Chránič koupelna', typ_pol: 'OEZ',
                            ch: 'A', proud: '16', idn: '30', kabel: 'CYKY 3×1,5' });
    const tr = tb.querySelector('tr[data-rowtype="rcd-header"]');
    const v = (i) => { const x = fillCilovyInput(tr, i); return x ? x.value : null; };
    return {
      cislo: v(0), nazev: v(1), znacka: v(2), a: v(4), idn: v(5),
      t5idn: v(13), ut: v(14), kabel: v(15),
      ch: (tr.querySelector('select') || {}).value,
      poli: tr.querySelectorAll('input').length
    };
  });
  check('chránič: KABEL je ve sloupci Kabel', rcd.kabel === 'CYKY 3×1,5', String(rcd.kabel));
  check('chránič: kabel NEspadl do „5×IΔn tvyp. ms"', !rcd.t5idn, String(rcd.t5idn));
  check('chránič: proud a IΔn sedí (posunuté pořadí polí)',
    rcd.a === '16' && rcd.idn === '30', 'A=' + rcd.a + ' IΔn=' + rcd.idn);
  check('chránič: typ jde do rozbalovátka', rcd.ch === 'A', String(rcd.ch));
  check('chránič: ostatní sloupce sedí',
    rcd.nazev === 'Chránič koupelna' && rcd.znacka === 'OEZ', JSON.stringify(rcd));
  check('hlavička chrániče má 15 polí (o jedno míň než obvod)', rcd.poli === 15, String(rcd.poli));

  // ══ 3. KARTA V NOVINKÁCH ═════════════════════════════════════════
  const nov = await p.evaluate(() => {
    const karty = Array.prototype.map.call(
      document.querySelectorAll('#screen-novinky .scard[data-nov-datum]'),
      c => ({ datum: c.dataset.novDatum, titulek: (c.querySelector('.scard-title') || {}).textContent || '' }));
    const bezData = document.querySelectorAll('#screen-novinky .scard:not([data-nov-datum])').length;
    return { karty: karty, bezData: bezData, nejnovejsi: getNovinkyLatest() };
  });
  // Karta se hledá PODLE TITULKU, ne podle indexu — nad ní od v9.58 leží
  // karta k postrannímu archivu se stejným datem a index by se posouval
  // s každou další novinkou.
  const kartaList = nov.karty.filter(k => /Měřicí list do terénu/.test(k.titulek))[0];
  check('karta k měřicímu listu v Novinkách je', !!kartaList,
    nov.karty.slice(0, 2).map(k => k.titulek.trim()).join(' | '));
  // Ani pořadí se nesmí hlídat napevno — každá novější karta ji posune níž.
  // Smysl kontroly je „karta je na svém místě podle data", ne „je druhá".
  // Ani pořadí se nesmí hlídat napevno — každá novější karta ji posune níž
  // a karet se stejným datem může být víc. Kontroluje se skutečný nárok:
  // nad ní nesmí stát nic staršího a pod ní nic novějšího.
  const iList = nov.karty.indexOf(kartaList);
  check('karta stojí na místě podle svého data',
    nov.karty.slice(0, iList).every(k => k.datum >= kartaList.datum) &&
    nov.karty.slice(iList + 1).every(k => k.datum <= kartaList.datum),
    'index ' + iList + ' z ' + nov.karty.length);
  check('karta má datum dnešní session', kartaList.datum === '2026-09-16', kartaList.datum);
  check('datum je i v titulku', /16\. 9\. 2026/.test(kartaList.titulek), kartaList.titulek.trim());
  // Dvě staré karty k AI funkcím (schovaným) atribut nemají odjakživa. Datum
  // mají jen v titulku a je nejstarší, takže pulsování 📰 neovlivní. Hlídá se
  // jen, aby jich nepřibývalo — NOVÁ karta bez data by znamenala, že se
  // o novince nikdo nedozví.
  check('kartu bez data nikdo nepřidal (zůstávají jen dvě staré k AI)',
    nov.bezData === 2, String(nov.bezData));
  // Bere se MAXIMUM přes všechny karty, takže novější karta ho posune —
  // kontrola smí ověřit jen to, že není starší než tahle.
  check('pulsování 📰 se odvodí z nového data', nov.nejnovejsi >= '2026-09-16', nov.nejnovejsi);
  check('karty jdou od nejnovější', nov.karty[0].datum >= nov.karty[1].datum,
    nov.karty.slice(0, 3).map(k => k.datum).join(' > '));

  check('bez chyb stránky', chyby.length === 0, chyby.join(' | '));
  await br.close();
  console.log(res.join('\n'));
  console.log(res.every(x => x[0] === '✅') ? '\nVŠE OK (' + res.length + ')' : '\nSELHALO');
  process.exit(res.every(x => x[0] === '✅') ? 0 : 1);
})();
