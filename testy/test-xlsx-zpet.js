// v9.93 — načtení .xlsx zpátky do zprávy (vlastní čtečka ZIPu a OOXML).
const { chromium } = require('/opt/node22/lib/node_modules/playwright/node_modules/playwright-core');
const fs = require('fs');
const path = require('path');
const SP = __dirname + '/_beh', VSTUPY = __dirname + '/vstupy';
const res = []; const check = (n, ok, d) => res.push((ok ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));

(async () => {
  const br = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await br.newContext({ viewport: { width: 1500, height: 1000 } });
  await ctx.addInitScript(() => { navigator.serviceWorker.register = () => new Promise(() => {}); });
  const p = await ctx.newPage();
  const chyby = []; p.on('pageerror', e => chyby.push(e.message));
  await p.goto('http://127.0.0.1:8901/index.html', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);

  const TEREN_SL = await p.evaluate(() => {
    const m = {}; TEREN_KOLONKY.forEach((s, i) => { m[s.klic] = i; }); return m;
  });
  const sl = (radek, klic) => radek.split('|')[TEREN_SL[klic]];
  const obsah = (n) => p.evaluate((n) => {
    const tb = document.querySelectorAll('#rozvadece-container tbody')[n || 0];
    return [...tb.querySelectorAll('tr[data-rowtype="obvod"],tr[data-rowtype="rcd-header"]')].map(tr =>
      TEREN_KOLONKY.map(s => { const i = fillCilovyInput(tr, s.i); return i ? i.value : ''; }).join('|'));
  }, n);

  // Zpráva se dvěma rozváděči a vyplněným rozpisem — přesně to, co technik
  // vygeneruje do terénu.
  const zprava = async () => {
    await p.evaluate(async () => {
      localStorage.clear(); archiv.length = 0; STORE.archiv = archiv;
      STORE.technik = { jmeno: 'M. Technik' };
      aktTyp = 'elektro'; aktPodtyp = 'dum'; novaZprava('elektro');
      await new Promise(r => setTimeout(r, 800));
      document.querySelector('.tab-btn[data-tab="mereni"]').click();
      addRozvadec();
      await new Promise(r => setTimeout(r, 300));
      const karty = document.querySelectorAll('#rozvadece-container [data-rozvadec-id]');
      karty[0].querySelector('.rozv-nazev').value = 'RD';
      karty[1].querySelector('.rozv-nazev').value = 'RM1';
      const jm = [['Světla chodba', '10'], ['Zásuvky kuchyně', '16'], ['Myčka', '16']];
      const tb = karty[0].querySelector('tbody');
      while (tb.querySelectorAll('tr[data-rowtype="obvod"]').length < 3) addMereniRowTo(tb);
      [...tb.querySelectorAll('tr[data-rowtype="obvod"]')].forEach((tr, i) => {
        if (!jm[i]) return;
        fillCilovyInput(tr, 1).value = jm[i][0];
        fillCilovyInput(tr, 4).value = jm[i][1];
      });
    });
    await p.waitForTimeout(300);
  };

  // Vyrobí .xlsx v prohlížeči a uloží ho na disk, ať jde nahrát zpátky
  // opravdovým souborovým polem.
  const vyrobitSoubor = (o) => p.evaluate(async (o) => {
    const D = getData();
    const v = { vybrane: o.vybrane, mereni: true, kontroly: false, minule: !!o.minule,
                poznamka: false, sloupce: {} };
    const blob = await xlsxVytvor(terenExcelListy(D, v));
    const buf = new Uint8Array(await blob.arrayBuffer());
    let s = '';
    for (let i = 0; i < buf.length; i++) s += String.fromCharCode(buf[i]);
    return btoa(s);
  }, o);

  // ══ 1. Kolečko: zpráva → .xlsx → zpátky ══════════════════════════
  await zprava();
  let b64 = await vyrobitSoubor({ vybrane: [0, 1] });
  const souborA = path.join(SP, 'kolecko.xlsx');
  fs.writeFileSync(souborA, Buffer.from(b64, 'base64'));
  let r = await p.evaluate(async (b64) => {
    const bin = atob(b64);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const listy = await xlsxCti(u8.buffer);
    const od = xlsxHlavickaOd(listy[0].radky);
    return { listy: listy.map(l => l.nazev), od: od,
      hlavicka: listy[0].radky[od].slice(0, 3),
      prvni: listy[0].radky[od + 1].slice(0, 5),
      radku: listy[0].radky.length - od - 1 };
  }, b64);
  check('vlastní čtečka přečte náš .xlsx a najde oba listy',
    JSON.stringify(r.listy) === JSON.stringify(['RD', 'RM1']), JSON.stringify(r.listy));
  check('hlavička tabulky se najde AŽ POD hlavičkou zprávy',
    r.od > 5 && r.hlavicka[1] === 'Název obvodu', 'řádek ' + r.od + ': ' + JSON.stringify(r.hlavicka));
  check('data pod ní sedí s tím, co se vygenerovalo',
    r.prvni[1] === 'Světla chodba' && r.prvni[4] === '10' && r.radku === 3,
    JSON.stringify(r.prvni) + ', ' + r.radku + ' řádků');

  // ══ 2. Vyplněné hodnoty (jako po OCR) se vrátí do správných buněk ══
  await zprava();
  const vyplneny = await p.evaluate(async (b64) => {
    const bin = atob(b64);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const listy = await xlsxCti(u8.buffer);
    // „Inteligence" doplnila měřené sloupce prvního listu
    const od = xlsxHlavickaOd(listy[0].radky);
    const hl = listy[0].radky[od];
    const iZsm = hl.indexOf('Zsm max (Ω)'), iRiso = hl.indexOf('Riso (MΩ)'), iRpe = hl.indexOf('Rpe (Ω)');
    [['0,45', '>20', '0,12'], ['0,38', '>20', '0,09'], ['0,51', '>20', '0,15']].forEach((v, i) => {
      const r = listy[0].radky[od + 1 + i];
      if (!r) return;
      r[iZsm] = v[0]; r[iRiso] = v[1]; r[iRpe] = v[2];
    });
    vlozitMereniOtevrit({ od: 1 });
    vlozitZListu(listy, 'mericilist.xlsx');
    return { list: document.getElementById('vm-list').value,
      rozvadec: document.getElementById('vm-rozvadec').selectedOptions[0].textContent,
      prepsat: document.getElementById('vm-rezim-prepsat').checked,
      popisek: document.getElementById('vm-rezim-prepsat-text').textContent,
      vidiVyber: getComputedStyle(document.getElementById('vm-list-wrap')).display !== 'none' };
  }, b64);
  check('list se spáruje s rozváděčem podle jména', vyplneny.rozvadec === 'RD', vyplneny.rozvadec);
  check('u víc listů se nabídne, který se má načíst', vyplneny.vidiVyber);
  check('předvolí se přepsání tabulky od prvního řádku',
    vyplneny.prepsat && /prvního řádku/.test(vyplneny.popisek), vyplneny.popisek);
  await p.evaluate(() => vlozitMereniPotvrdit());
  await p.waitForTimeout(300);
  let o = await obsah(0);
  check('naměřené hodnoty sednou do svých sloupců u svých obvodů',
    sl(o[0], 'n') === 'Světla chodba' && sl(o[0], 'zsm') === '0,45' && sl(o[0], 'rpe') === '0,12' &&
    sl(o[2], 'zsm') === '0,51', o[0]);
  check('a rozpis se nezduplikoval — řádků zůstalo stejně', o.length === 3, o.length + ' řádků');
  check('druhý rozváděč zůstal nedotčený',
    (await obsah(1)).every(x => !sl(x, 'zsm')), JSON.stringify(await obsah(1)));

  // ══ 3. Minulé hodnoty v závorkách se nevracejí ═══════════════════
  await zprava();
  const sZavorkami = await p.evaluate(async (b64) => {
    const bin = atob(b64);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const listy = await xlsxCti(u8.buffer);
    const od = xlsxHlavickaOd(listy[0].radky);
    const hl = listy[0].radky[od];
    const iZsm = hl.indexOf('Zsm max (Ω)');
    listy[0].radky[od + 1][iZsm] = '(0,45)';      // takhle se tisknou minulé
    listy[0].radky[od + 2][iZsm] = '0,38';
    vlozitMereniOtevrit({ od: 1 });
    vlozitZListu(listy, 'x.xlsx');
    vlozitMereniPotvrdit();
    return true;
  }, b64);
  await p.waitForTimeout(300);
  o = await obsah(0);
  check('minulá hodnota v závorce se jako naměřená nevrátí',
    sl(o[0], 'zsm') === '' && sl(o[1], 'zsm') === '0,38', o[0].split('|')[TEREN_SL.zsm] + ' / ' + o[1].split('|')[TEREN_SL.zsm]);

  // ══ 4. Cizí sešit se sdílenými řetězci a čísly ═══════════════════
  await zprava();
  await p.evaluate(() => vlozitExcel(document.querySelector('[data-action="vlozitExcel"]')));
  await p.waitForTimeout(200);
  await p.setInputFiles('#vm-soubor', path.join(VSTUPY, 'cizi.xlsx'));
  await p.waitForTimeout(600);
  const cizi = await p.evaluate(() => ({
    radky: __vlozeni.radky.length, mapa: __vlozeni.mapa,
    prvni: __vlozeni.radky[1], potvrdit: document.getElementById('vm-potvrdit').style.display !== 'none'
  }));
  check('cizí sešit z openpyxl se přečte a hlavička se v něm najde',
    cizi.radky === 3 && JSON.stringify(cizi.mapa) === JSON.stringify([1, 4, 8, 7]), JSON.stringify(cizi.mapa));
  check('číslo z Excelu se převede na desetinnou čárku',
    cizi.prvni[3] === '0,45', JSON.stringify(cizi.prvni));
  await p.evaluate(() => vlozitMereniPotvrdit());
  await p.waitForTimeout(300);
  o = await obsah(0);
  check('a hodnoty z cizího sešitu sednou do tabulky',
    sl(o[0], 'n') === 'Světla chodba' && sl(o[0], 'zsm') === '0,45' && sl(o[0], 'a') === '10', o[0]);

  // ══ 4b. Sdílené řetězce a DÍRA po prázdném řádku ═════════════════
  await zprava();
  await p.evaluate(() => vlozitExcel(document.querySelector('[data-action="vlozitExcel"]')));
  await p.waitForTimeout(200);
  await p.setInputFiles('#vm-soubor', path.join(VSTUPY, 'sdilene.xlsx'));
  await p.waitForTimeout(600);
  const sdil = await p.evaluate(() => ({
    radky: __vlozeni.radky, mapa: __vlozeni.mapa,
    rozvadec: document.getElementById('vm-rozvadec').selectedOptions[0].textContent
  }));
  check('sešit se sdílenými řetězci (`t="s"`) se přečte',
    sdil.radky[1] && sdil.radky[1][0] === 'Světla' && sdil.radky[1][1] === '0,45',
    JSON.stringify(sdil.radky));
  check('prázdný řádek, který Excel do souboru nezapsal, zůstane dírou',
    sdil.radky.length === 5 && sdil.radky[2].join('') === '' && sdil.radky[3][0] === 'Myčka',
    JSON.stringify(sdil.radky.map(r => r.join('~'))));
  await p.evaluate(() => vlozitMereniPotvrdit());
  await p.waitForTimeout(300);
  o = await obsah(0);
  check('díra se do tabulky přenese, hodnoty nesklouznou o řádek výš',
    sl(o[0], 'n') === 'Světla' && sl(o[1], 'n') === 'Zásuvky kuchyně' && sl(o[1], 'zsm') === '' &&
    sl(o[2], 'n') === 'Myčka' && sl(o[2], 'zsm') === '0,51',
    o.map(x => sl(x, 'n') + ':' + sl(x, 'zsm')).join(' | '));

  // ══ 5. Nesmyslný soubor to nerozbije ═════════════════════════════
  const nesmysl = path.join(SP, 'nesmysl.xlsx');
  fs.writeFileSync(nesmysl, 'tohle není ZIP');
  await zprava();
  await p.evaluate(() => vlozitExcel(document.querySelector('[data-action="vlozitExcel"]')));
  await p.waitForTimeout(200);
  await p.setInputFiles('#vm-soubor', nesmysl);
  await p.waitForTimeout(600);
  const hlaska = await p.evaluate(() => ({
    text: document.getElementById('vm-nahled').innerText,
    potvrdit: document.getElementById('vm-potvrdit').style.display !== 'none'
  }));
  check('nesmyslný soubor dá srozumitelnou hlášku a nic nevloží',
    /platný soubor|nepodařilo|\.xlsx/i.test(hlaska.text) && !hlaska.potvrdit, hlaska.text.slice(0, 90));
  await p.evaluate(() => vlozitMereniZavrit());

  // ══ 6. Zapisovač zůstal nedotčený ════════════════════════════════
  const zapis = await p.evaluate(() => ({
    pismeno: xlsxSloupec(0) + ',' + xlsxSloupec(26), index: xlsxSloupecIndex('AA1')
  }));
  check('zapisovač i čtečka mají každý svou funkci na sloupce',
    zapis.pismeno === 'A,AA' && zapis.index === 26, JSON.stringify(zapis));

  check('žádné chyby v konzoli', chyby.length === 0, chyby.join(' | '));

  console.log(res.join('\n'));
  console.log('\n' + res.filter(x => x[0] === '✅').length + '/' + res.length + ' prošlo');
  await br.close();
  process.exit(res.some(x => x[0] === '❌') ? 1 : 0);
})();
