// v9.92 — vložení bloku buněk z Excelu do tabulky měření.
const { chromium } = require('/opt/node22/lib/node_modules/playwright/node_modules/playwright-core');
const res = []; const check = (n, ok, d) => res.push((ok ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));

(async () => {
  const br = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await br.newContext({ viewport: { width: 1500, height: 1000 } });
  await ctx.addInitScript(() => { navigator.serviceWorker.register = () => new Promise(() => {}); });
  const p = await ctx.newPage();
  const chyby = []; p.on('pageerror', e => chyby.push(e.message));
  await p.goto('http://127.0.0.1:8901/index.html', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);
  await p.evaluate(() => { window.confirm = () => true; });

  const novaElektro = async () => {
    await p.evaluate(async () => {
      localStorage.clear(); archiv.length = 0; STORE.archiv = archiv;
      STORE.technik = { jmeno: 'M. Technik' };
      aktTyp = 'elektro'; aktPodtyp = 'dum'; novaZprava('elektro');
      await new Promise(r => setTimeout(r, 800));
      document.querySelector('.tab-btn[data-tab="mereni"]').click();
    });
    await p.waitForTimeout(350);
  };
  // Obsah tabulky měření jako pole řetězců „sloupec|sloupec|…".
  const obsah = (n) => p.evaluate((n) => {
    const tb = document.querySelectorAll('#rozvadece-container tbody')[n || 0];
    return [...tb.querySelectorAll('tr[data-rowtype="obvod"],tr[data-rowtype="rcd-header"]')].map(tr =>
      TEREN_KOLONKY.map(s => { const i = fillCilovyInput(tr, s.i); return i ? i.value : ''; }).join('|'));
  }, n);
  const vlozitDoPole = (txt) => p.evaluate((t) => {
    document.getElementById('vm-text').value = t;
    vlozitMereniRozebrat();
  }, txt);
  const paste = (sel, txt) => p.evaluate(([s, t]) => {
    const inp = document.querySelector(s);
    const dt = new DataTransfer(); dt.setData('text/plain', t);
    const ev = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
    inp.focus();
    inp.dispatchEvent(ev);
    return ev.defaultPrevented;
  }, [sel, txt]);
  const modalOtevreny = () => p.evaluate(() =>
    document.getElementById('modal-vlozit-mereni').classList.contains('open'));

  const TEREN_SL = await p.evaluate(() => {
    const m = {}; TEREN_KOLONKY.forEach((s, i) => { m[s.klic] = i; }); return m;
  });

  const HLAVICKA = 'Název obvodu\tZnačka\tCh./Typ\tA\tKabel typ, průřez\n' +
    'Světla chodba\tEATON\tB\t10\tCYKY 3×1,5\n' +
    'Zásuvky kuchyně\tOEZ\tB\t16\tCYKY 3×2,5\n' +
    'Myčka\tOEZ\tC\t16\tCYKY 3×2,5';

  // ══ 1. Hlavička se rozpozná a sloupce se spárují samy ═════════════
  await novaElektro();
  await p.evaluate(() => vlozitMereniOtevrit({ od: 1 }));
  await vlozitDoPole(HLAVICKA);
  let v = await p.evaluate(() => ({ h: __vlozeni.hlavicka, mapa: __vlozeni.mapa,
    check: document.getElementById('vm-hlavicka').checked,
    potvrdit: document.getElementById('vm-potvrdit').style.display !== 'none' }));
  check('hlavička v prvním řádku se pozná', v.h && v.check);
  check('sloupce se podle ní spárují s tabulkou',
    JSON.stringify(v.mapa) === JSON.stringify([1, 2, 3, 4, 15]), JSON.stringify(v.mapa));
  check('tlačítko „Vložit" se nabídne až po kontrole', v.potvrdit);
  await p.evaluate(() => vlozitMereniPotvrdit());
  await p.waitForTimeout(250);
  let o = await obsah();
  const sl = (radek, klic) => radek.split('|')[TEREN_SL[klic]];
  check('hodnoty padnou do správných sloupců',
    sl(o[0], 'n') === 'Světla chodba' && sl(o[0], 'typ') === 'EATON' &&
    sl(o[0], 'ch') === 'B' && sl(o[0], 'a') === '10' && sl(o[0], 'kabel') === 'CYKY 3×1,5', o[0]);
  check('prázdné výchozí řádky se použijí, nezůstanou viset nahoře',
    o.length === 3, o.length + ' řádků');
  check('vložené řádky se přečíslují 1,2,3',
    o.map(x => x.split('|')[0]).join(',') === '1,2,3', o.map(x => x.split('|')[0]).join(','));

  // ══ 1b. IΔn se nesmí vlít do sloupce A ═══════════════════════════
  await novaElektro();
  await p.evaluate(() => vlozitMereniOtevrit({ od: 1 }));
  await vlozitDoPole('Název obvodu\tA\tIΔn\nZásuvky\t16\t0,03');
  v = await p.evaluate(() => __vlozeni.mapa);
  check('„IΔn" se spáruje s IΔn, ne se jmenovitým proudem A',
    JSON.stringify(v) === JSON.stringify([1, 4, 5]), JSON.stringify(v));
  await p.evaluate(() => vlozitMereniPotvrdit());
  await p.waitForTimeout(250);
  o = await obsah();
  check('a hodnoty sednou do obou sloupců zvlášť',
    sl(o[0], 'a') === '16' && sl(o[0], 'idn') === '0,03', o[0]);

  // ══ 2. ZPĚT vrátí vložení ════════════════════════════════════════
  await novaElektro();
  await p.evaluate(() => vlozitMereniOtevrit({ od: 1 }));
  await vlozitDoPole(HLAVICKA);
  // Staré hlášky pryč, ať se „ZPĚT" netrefí do dřívějšího vložení.
  await p.evaluate(() => { const w = document.getElementById('toast-wrap'); if (w) w.innerHTML = ''; });
  await p.evaluate(() => vlozitMereniPotvrdit());
  await p.waitForTimeout(250);
  await p.evaluate(() => { const b = [...document.querySelectorAll('#toast-wrap button')]
    .filter(x => x.textContent.includes('ZPĚT'))[0]; if (b) b.click(); });
  await p.waitForTimeout(250);
  o = await obsah();
  check('ZPĚT vrátí vložení i nové řádky', o.length === 2 && !o[0].includes('Světla'), o.length + ': ' + o[0]);

  // ══ 3. Bez hlavičky se mapuje podle buňky, do které se vkládalo ══
  await novaElektro();
  const bezHlavicky = 'EATON\tB\t10\nOEZ\tC\t16';
  const cil = '#rozvadece-container tr[data-rowtype="obvod"] td:nth-child(3) input';
  let prevent = await paste(cil, bezHlavicky);
  check('Ctrl+V bloku do buňky si program vezme', prevent && await modalOtevreny());
  v = await p.evaluate(() => ({ od: __vlozeni.od, mapa: __vlozeni.mapa, h: __vlozeni.hlavicka,
    text: document.getElementById('vm-text').value.length }));
  check('mapuje se od sloupce, do kterého se vkládalo',
    !v.h && JSON.stringify(v.mapa) === JSON.stringify([2, 3, 4]), 'od ' + v.od + ' → ' + JSON.stringify(v.mapa));
  check('text ze schránky je v dialogu předvyplněný', v.text > 10);
  const prepsatVidi = await p.evaluate(() =>
    getComputedStyle(document.getElementById('vm-rezim-prepsat').parentNode).display !== 'none' &&
    document.getElementById('vm-rezim-prepsat').checked);
  check('u Ctrl+V do řádku se nabídne „přepsat od tohoto řádku" a je předvolené', prepsatVidi);
  await p.evaluate(() => vlozitMereniPotvrdit());
  await p.waitForTimeout(250);
  o = await obsah();
  check('blok bez hlavičky sedne od té buňky doprava a dolů',
    o[0].split('|')[2] === 'EATON' && o[0].split('|')[3] === 'B' && o[0].split('|')[4] === '10' &&
    o[1].split('|')[2] === 'OEZ', o[0] + ' / ' + o[1]);
  check('a nepřibyl řádek navíc (přepisovalo se do stávajících)', o.length === 2, o.length + ' řádků');

  // ══ 4. Jedna buňka propadne prohlížeči ═══════════════════════════
  await novaElektro();
  prevent = await paste(cil, 'EATON');
  check('vložení JEDNÉ hodnoty si program nebere', !prevent && !(await modalOtevreny()));

  // ══ 5. Ruční přemapování a „nevkládat" ═══════════════════════════
  await novaElektro();
  await p.evaluate(() => vlozitMereniOtevrit({ od: 1 }));
  await vlozitDoPole('Světla\tEATON\tB');
  const premapuj = (i, hodnota) => p.evaluate(([i, h]) => {
    const sel = document.querySelectorAll('.vm-mapa')[i];
    sel.value = h;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  }, [i, hodnota]);
  await premapuj(1, '');       // Značka → nevkládat
  await premapuj(2, '15');     // třetí sloupec → Kabel
  await p.waitForTimeout(150);
  v = await p.evaluate(() => __vlozeni.mapa);
  check('sloupec jde přemapovat rukou', JSON.stringify(v) === JSON.stringify([1, null, 15]), JSON.stringify(v));
  await p.evaluate(() => vlozitMereniPotvrdit());
  await p.waitForTimeout(250);
  o = await obsah();
  check('„nevkládat" sloupec se opravdu nevloží a přemapovaný sedne',
    sl(o[0], 'n') === 'Světla' && sl(o[0], 'typ') === '' && sl(o[0], 'kabel') === 'B', o[0]);

  // ══ 6. Prázdná buňka nepřepíše naměřenou hodnotu ═════════════════
  await novaElektro();
  await p.evaluate(() => {
    const tr = document.querySelector('#rozvadece-container tr[data-rowtype="obvod"]');
    fillCilovyInput(tr, 7).value = '0,45';        // Zsm max
    fillCilovyInput(tr, 1).value = 'Původní';
  });
  await p.evaluate(() => vlozitMereniOtevrit({ od: 1 }));
  await vlozitDoPole('Název obvodu\tZsm max (Ω)\nSvětla chodba\t');
  await p.evaluate(() => {
    document.getElementById('vm-rezim-prepsat').checked = false;
    document.getElementById('vm-rezim-nove').checked = true;
    __vlozeni.startTr = document.querySelector('#rozvadece-container tr[data-rowtype="obvod"]');
    document.getElementById('vm-rezim-prepsat').checked = true;
    vlozitMereniPotvrdit();
  });
  await p.waitForTimeout(250);
  o = await obsah();
  check('prázdná buňka z Excelu nesmaže, co je naměřené',
    o[0].split('|')[1] === 'Světla chodba' && o[0].split('|')[7] === '0,45', o[0]);

  // ══ 7. Delší blok než řádků → zbytek se dopíše ═══════════════════
  await novaElektro();
  await p.evaluate(() => {
    __vlozeni = null;
    vlozitMereniOtevrit({ od: 1, startTr: document.querySelector('#rozvadece-container tr[data-rowtype="obvod"]'),
      tbody: document.querySelector('#rozvadece-container tbody') });
  });
  await vlozitDoPole('Světla\nZásuvky\nMyčka\nTrouba\nBojler');
  await p.evaluate(() => {
    document.getElementById('vm-rezim-prepsat').checked = true;
    vlozitMereniPotvrdit();
  });
  await p.waitForTimeout(250);
  o = await obsah();
  check('blok delší než tabulka dopíše zbývající řádky',
    o.length === 5 && sl(o[4], 'n') === 'Bojler', o.length + ' řádků, poslední „' + sl(o[4] || '', 'n') + '"');

  // ══ 8. Buňka s odřádkováním v uvozovkách ═════════════════════════
  await novaElektro();
  await p.evaluate(() => vlozitMereniOtevrit({ od: 1 }));
  await vlozitDoPole('"Světla\nchodba"\tEATON');
  v = await p.evaluate(() => __vlozeni.radky);
  check('buňka s odřádkováním v uvozovkách zůstane jednou buňkou',
    v.length === 1 && v[0][0] === 'Světla\nchodba' && v[0][1] === 'EATON', JSON.stringify(v));
  await p.evaluate(() => vlozitMereniZavrit());

  // ══ 9. Dokončená zpráva ══════════════════════════════════════════
  await novaElektro();
  const tlacitkoVidi = await p.evaluate(() => {
    const b = document.querySelector('[data-action="vlozitExcel"]');
    return !!(b && b.offsetHeight > 0);
  });
  check('tlačítko „📋 Vložit z Excelu" je u rozváděče vidět', tlacitkoVidi);
  await p.evaluate(() => setFormReadOnly(true));
  await p.waitForTimeout(200);
  const zamceno = await p.evaluate(() => {
    const b = document.querySelector('[data-action="vlozitExcel"]');
    return { btn: !!(b && b.offsetHeight > 0),
      paste: (() => {
        const inp = document.querySelector('#rozvadece-container tr[data-rowtype="obvod"] input');
        const dt = new DataTransfer(); dt.setData('text/plain', 'A\tB\nC\tD');
        const ev = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
        inp.dispatchEvent(ev);
        return ev.defaultPrevented;
      })(),
      modal: document.getElementById('modal-vlozit-mereni').classList.contains('open') };
  });
  check('u dokončené zprávy je tlačítko schované a Ctrl+V se nechytá',
    !zamceno.btn && !zamceno.paste && !zamceno.modal, JSON.stringify(zamceno));
  await p.evaluate(() => setFormReadOnly(false));

  // ══ 10. Druhý rozváděč z nabídky ═════════════════════════════════
  await novaElektro();
  await p.evaluate(() => { addRozvadec(); });
  await p.waitForTimeout(400);
  await p.evaluate(() => {
    const karty = document.querySelectorAll('#rozvadece-container [data-rozvadec-id]');
    karty[0].querySelector('.rozv-nazev').value = 'RH';
    karty[1].querySelector('.rozv-nazev').value = 'RM1';
    vlozitMereniOtevrit({ od: 1 });
  });
  await vlozitDoPole('Název obvodu\nSvětla RM1');
  await p.evaluate(() => {
    const sel = document.getElementById('vm-rozvadec');
    sel.value = document.querySelectorAll('#rozvadece-container [data-rozvadec-id]')[1].dataset.rozvadecId;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    vlozitMereniPotvrdit();
  });
  await p.waitForTimeout(250);
  const o0 = await obsah(0), o1 = await obsah(1);
  check('vkládá se do rozváděče vybraného v nabídce',
    o1.some(x => x.includes('Světla RM1')) && !o0.some(x => x.includes('Světla RM1')),
    'RH: ' + o0.length + ' řádků, RM1: ' + o1.map(x => sl(x, 'n')).join(','));
  check('zkopírovaný jediný sloupec i s nadpisem: nadpis do tabulky nespadne',
    !o1.some(x => sl(x, 'n') === 'Název obvodu'), o1.map(x => sl(x, 'n')).join(','));

  // ══ 11. Sloupec Č. proti automatickému číslování ═════════════════
  await novaElektro();
  await p.evaluate(() => vlozitMereniOtevrit({ od: 0 }));
  await vlozitDoPole('Č.\tNázev obvodu\nFA1\tSvětla');
  const varovani = await p.evaluate(() => document.getElementById('vm-nahled').innerText);
  check('náhled upozorní, že sloupec Č. přepíše automatické číslování',
    /automatick[éeá] číslování/i.test(varovani), varovani.slice(0, 160));

  // ══ Karta v Novinkách (schválena 2026-09-24) — hledá se podle titulku,
  // pořadí se ověřuje nárokem „nad ní nic staršího, pod ní nic novějšího".
  const nov = await p.evaluate(() => {
    const karty = [...document.querySelectorAll('#screen-novinky .scard[data-nov-datum]')];
    const i = karty.findIndex(k => /Excel ↔ tabulka měření/.test(k.textContent));
    if (i < 0) return null;
    const d = karty[i].dataset.novDatum;
    return { d, titulekDatum: !!karty[i].querySelector('.nov-datum'),
      nadStarsi: karty.slice(0, i).some(k => k.dataset.novDatum < d),
      podNovejsi: karty.slice(i + 1).some(k => k.dataset.novDatum > d),
      text: karty[i].textContent };
  });
  check('karta v Novinkách existuje a má datum v atributu i v titulku', !!nov && nov.titulekDatum, nov ? nov.d : 'chybí');
  check('karta stojí v časovém pořadí', !!nov && !nov.nadStarsi && !nov.podNovejsi);
  check('karta zmiňuje Ctrl+V, načtení .xlsx i pravý klik',
    !!nov && /Ctrl\+V/.test(nov.text) && /Načíst ze souboru \.xlsx/.test(nov.text) && /Pravý klik/.test(nov.text));

  check('žádné chyby v konzoli', chyby.length === 0, chyby.join(' | '));

  console.log(res.join('\n'));
  console.log('\n' + res.filter(x => x[0] === '✅').length + '/' + res.length + ' prošlo');
  await br.close();
  process.exit(res.some(x => x[0] === '❌') ? 1 : 0);
})();
