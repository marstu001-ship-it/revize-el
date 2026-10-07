// v9.55 — přepis hodnot z papíru zpátky do programu.
// Nejdůležitější: hodnota musí skončit ve SPRÁVNÉ buňce i uvnitř skupiny
// chráničů a pod řádkem „jiný řádek", kde jsou sloučené buňky a posunuté
// indexy inputů. Proto se adresuje přes fillCilovyInput, ne přes pořadí.
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

  // ══ ELEKTRO: obvod + chránič s podřádkem + jiný řádek ════════════
  await p.evaluate(() => {
    localStorage.clear(); STORE.technik = { jmeno: 'M. Š' }; archiv.length = 0; STORE.archiv = archiv;
    aktTyp = 'elektro'; aktPodtyp = 'dum'; novaZprava('elektro');
  });
  await p.waitForTimeout(600);
  await p.evaluate(() => {
    const k = document.querySelector('#rozvadece-container [data-rozvadec-id]');
    k.querySelector('.rozv-nazev').value = 'RD';
    const tb = k.querySelector('tbody');
    tb.innerHTML = '';                      // pryč s prázdnými řádky z novaZprava
    addMereniRowTo(tb);
    const i = tb.lastElementChild.querySelectorAll('input');
    i[1].value = 'Zásuvky kuchyně'; i[4].value = '16';
    const btn = document.createElement('button'); btn.dataset.rozvadec = k.dataset.rozvadecId;
    addRcdRow(btn);
    const hl = tb.querySelector('tr[data-rowtype="rcd-header"]').querySelectorAll('input');
    hl[1].value = 'Chránič koupelna'; hl[3].value = '16'; hl[4].value = '30';
    hl[7].value = '';                        // Riso „>20" pryč, ať je vidět zápis
    addInfoRowTo(tb, { cislo: '', popis: 'Vývod do RP2', hodnota: 'pojistky' });
  });
  await p.waitForTimeout(300);

  const stav = await p.evaluate(() => {
    const tb = document.querySelector('#rozvadece-container tbody');
    return Array.prototype.map.call(tb.children, tr => tr.dataset.rowtype);
  });
  check('tabulka má obvod, hlavičku chrániče, podřádek i jiný řádek',
    stav.join(',') === 'obvod,rcd-header,rcd-mereni,info', stav.join(','));

  // procházka
  await p.evaluate(() => rychleZadaniOtevrit());
  await p.waitForTimeout(400);
  const seznam = await p.evaluate(() => __rz.polozky.map(x => x.popis + ' @ ' + x.kontext));
  check('modál se otevřel a má co procházet', seznam.length > 0, seznam.length + ' položek');
  check('„jiný řádek" se do procházky nedostal (sloučené buňky)',
    !seznam.some(x => /Vývod do RP2/.test(x)), seznam.filter(x => /Vývod/.test(x)).join(','));
  check('sloupec Fáze se nezadává (je readonly)',
    !seznam.some(x => /^Fáze/.test(x)), seznam.filter(x => /Fáze/.test(x)).join(','));
  check('u podřádku chrániče se nabízí jen Vyp./čas/5×IΔn',
    seznam.filter(x => /chránič A-/.test(x)).length === 3,
    seznam.filter(x => /chránič A-/.test(x)).join(' | '));

  // Napsat hodnoty klávesnicí — přesně jak to dělá uživatel
  const zapsano = await p.evaluate(async () => {
    const napis = (v) => {
      const pole = document.getElementById('rz-pole');
      pole.value = v;
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    };
    const poradi = [];
    for (let n = 0; n < 12; n++) {
      poradi.push(__rz.polozky[__rz.i].popis + ' @ ' + __rz.polozky[__rz.i].kontext);
      napis(String(n + 1));
      await new Promise(r => setTimeout(r, 30));
    }
    const tb = document.querySelector('#rozvadece-container tbody');
    const radky = Array.prototype.map.call(tb.children, tr =>
      Array.prototype.map.call(tr.querySelectorAll('input'), i => i.value).join('|'));
    return { poradi: poradi, radky: radky, dirty: !!window.__formDirty };
  });
  check('u běžného jističe se nenabízí měření chrániče',
    zapsano.poradi.slice(0, 4).every(x => /Zásuvky kuchyně/.test(x)) &&
    !zapsano.poradi.slice(0, 4).some(x => /Vyp\.|čas|5×IΔn|Ut/.test(x)),
    zapsano.poradi.slice(0, 5).join(' → '));
  check('pořadí odpovídá papíru — nejdřív celý obvod, pak chránič',
    /^Isc/.test(zapsano.poradi[0]) && /Chránič koupelna/.test(zapsano.poradi[4]),
    zapsano.poradi.slice(3, 6).join(' → '));
  check('zápis označí zprávu jako neuloženou', zapsano.dirty);

  // kam hodnoty opravdu spadly
  const kam = await p.evaluate(() => {
    const tb = document.querySelector('#rozvadece-container tbody');
    const obvod = tb.children[0].querySelectorAll('input');
    const hlav = tb.children[1].querySelectorAll('input');
    const sub = tb.children[2].querySelectorAll('input');
    const info = tb.children[3].querySelectorAll('input');
    return {
      obvod: { isc: obvod[6].value, zsm: obvod[7].value, riso: obvod[8].value, rpe: obvod[9].value,
               nazev: obvod[1].value, a: obvod[4].value, kabel: obvod[15].value },
      hlav: { isc: hlav[5].value, zsm: hlav[6].value, riso: hlav[7].value, rpe: hlav[8].value,
              nazev: hlav[1].value, idn: hlav[4].value },
      sub: Array.prototype.map.call(sub, i => i.value),
      info: Array.prototype.map.call(info, i => i.value)
    };
  });
  check('OBVOD: Isc/Zsm/Riso/Rpe dostaly 1,2,3,4',
    kam.obvod.isc === '1' && kam.obvod.zsm === '2' && kam.obvod.riso === '3' && kam.obvod.rpe === '4',
    JSON.stringify(kam.obvod));
  check('OBVOD: předvyplněné sloupce se nepřepsaly',
    kam.obvod.nazev === 'Zásuvky kuchyně' && kam.obvod.a === '16', kam.obvod.nazev + ' / ' + kam.obvod.a);
  check('HLAVIČKA CHRÁNIČE: hodnoty sedí i přes posunuté indexy (Ch./Typ je select)',
    kam.hlav.isc === '5' && kam.hlav.zsm === '6' && kam.hlav.riso === '7' && kam.hlav.rpe === '8',
    JSON.stringify(kam.hlav));
  check('HLAVIČKA CHRÁNIČE: název a IΔn zůstaly',
    kam.hlav.nazev === 'Chránič koupelna' && kam.hlav.idn === '30', kam.hlav.nazev + ' / ' + kam.hlav.idn);
  check('„JINÝ ŘÁDEK" zůstal nedotčený (číslo řádku je od renumberRows, ne od nás)',
    kam.info[1] === 'Vývod do RP2' && kam.info[2] === 'pojistky',
    kam.info.join(' | '));

  // Shift+Enter zpátky
  const zpet = await p.evaluate(async () => {
    const pred = __rz.i;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true }));
    await new Promise(r => setTimeout(r, 60));
    return { pred: pred, po: __rz.i };
  });
  check('Shift+Enter se vrátí o krok zpět', zpet.po === zpet.pred - 1, zpet.pred + ' → ' + zpet.po);

  // Esc zavře
  await p.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  await p.waitForTimeout(300);
  check('Esc zadávání zavře',
    !(await p.evaluate(() => document.getElementById('modal-rz').classList.contains('open'))));

  // ══ ZAMČENÁ ZPRÁVA ══════════════════════════════════════════════
  const zamceno = await p.evaluate(() => {
    window.__formReadOnly = true;
    let hlaska = '';
    const p0 = window.alert; window.alert = (t) => { hlaska = t; };
    rychleZadaniOtevrit();
    window.alert = p0;
    const otevreno = document.getElementById('modal-rz').classList.contains('open');
    window.__formReadOnly = false;
    return { otevreno: otevreno, hlaska: hlaska };
  });
  check('u dokončené zprávy se zadávání neotevře', !zamceno.otevreno && /dokončená/.test(zamceno.hlaska),
    zamceno.hlaska.slice(0, 60));

  // ══ STROJE — kontroly klávesami 1/2/3 ═══════════════════════════
  await p.evaluate(() => { aktTyp = 'stroje'; novaZprava('stroje'); });
  await p.waitForTimeout(800);
  await p.evaluate(() => rychleZadaniOtevrit());
  await p.waitForTimeout(400);
  const stroj = await p.evaluate(() => ({
    pocet: __rz.polozky.length,
    maMereni: __rz.polozky.some(x => /Hodnota/.test(x.popis)),
    maKontroly: __rz.polozky.some(x => x.jeSelect),
    sloupceSkryte: document.getElementById('rz-sloupce').parentNode.style.display === 'none'
  }));
  check('stroje: procházka má měření i kontroly',
    stroj.pocet > 20 && stroj.maMereni && stroj.maKontroly, stroj.pocet + ' položek');
  check('stroje: výběr sloupců se nenabízí', stroj.sloupceSkryte);

  const klavesa = await p.evaluate(async () => {
    // skočit na první kontrolu (select)
    while (__rz.i < __rz.polozky.length - 1 && !__rz.polozky[__rz.i].jeSelect) __rz.i++;
    rychleZadaniVykresli();
    await new Promise(r => setTimeout(r, 60));
    const cil = __rz.polozky[__rz.i].input;
    const predI = __rz.i;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true }));
    await new Promise(r => setTimeout(r, 60));
    return { hodnota: cil.value, posun: __rz.i > predI, volby: STROJE_VYSLEDKY.filter(Boolean) };
  });
  check('stroje: klávesa 1 nastaví „vyhovuje" a posune dál',
    klavesa.hodnota === klavesa.volby[0] && klavesa.posun,
    klavesa.hodnota + ' (posun ' + klavesa.posun + ')');

  await p.evaluate(() => rychleZadaniZavrit());
  await p.waitForTimeout(200);
  check('bez chyb stránky', chyby.length === 0, chyby.join(' | '));
  await br.close();
  console.log(res.join('\n'));
  console.log(res.every(x => x[0] === '✅') ? '\nVŠE OK (' + res.length + ')' : '\nSELHALO');
  process.exit(res.every(x => x[0] === '✅') ? 0 : 1);
})();
