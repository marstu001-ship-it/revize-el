// v9.61 — „Druh kontroly" u strojů nesmí nabízet Výchozí / Výchozí souhrnná.
// To jsou pojmy ČSN 33 1500 pro REVIZI vyhrazeného el. zařízení; kontrola
// stroje jede podle NV 378/2001 Sb. § 4 (odst. 1 před uvedením do provozu,
// odst. 2 následná nejméně jednou za 12 měsíců).
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
  });

  const volby = () => p.evaluate(() => ({
    volby: Array.from(document.getElementById('f_druh').options).map(o => o.value),
    hodnota: document.getElementById('f_druh').value,
    popisek: document.querySelector('[data-term="f-druh"]').firstChild.nodeValue.trim()
  }));

  // ══ 1. ELEKTRO — beze změny ══════════════════════════════════════
  await p.evaluate(() => { aktTyp = 'elektro'; aktPodtyp = 'dum'; novaZprava('elektro'); });
  await p.waitForTimeout(500);
  let v = await volby();
  check('elektro nabízí všechny čtyři druhy revize',
    v.volby.join(' | ') === 'Výchozí | Výchozí souhrnná | Pravidelná | Mimořádná', v.volby.join(' | '));
  check('elektro má popisek „Druh revize"', /Druh revize/.test(v.popisek), v.popisek);
  check('výchozí volba je Pravidelná', v.hodnota === 'Pravidelná', v.hodnota);

  // ══ 2. STROJE — bez „Výchozí" ════════════════════════════════════
  await p.evaluate(() => { aktTyp = 'stroje'; novaZprava('stroje'); });
  await p.waitForTimeout(800);
  v = await volby();
  check('stroje NENABÍZÍ „Výchozí" ani „Výchozí souhrnná"',
    !v.volby.some(x => /Výchozí/.test(x)), v.volby.join(' | '));
  check('stroje nabízí Pravidelná / Před uvedením do provozu / Mimořádná',
    v.volby.join(' | ') === 'Pravidelná | Před uvedením do provozu | Mimořádná', v.volby.join(' | '));
  check('u strojů je popisek „Druh kontroly"', /Druh kontroly/.test(v.popisek), v.popisek);
  check('nová zpráva o stroji startuje jako Pravidelná', v.hodnota === 'Pravidelná', v.hodnota);

  // ══ 3. Přepínání typů tam a zpět ═════════════════════════════════
  await p.evaluate(() => { aktTyp = 'lps'; novaZprava('lps'); });
  await p.waitForTimeout(600);
  v = await volby();
  check('LPS sdílí sadu s elektro (nepřepisuje se)',
    v.volby.join(' | ') === 'Výchozí | Výchozí souhrnná | Pravidelná | Mimořádná' &&
    v.hodnota === 'Pravidelná', v.volby.join(' | '));
  await p.evaluate(() => { aktTyp = 'stroje'; novaZprava('stroje'); });
  await p.waitForTimeout(700);
  await p.evaluate(() => { aktTyp = 'elektro'; aktPodtyp = 'dum'; novaZprava('elektro'); });
  await p.waitForTimeout(700);
  v = await volby();
  check('zpátky na elektro se sada vrátí celá',
    v.volby.join(' | ') === 'Výchozí | Výchozí souhrnná | Pravidelná | Mimořádná' &&
    v.hodnota === 'Pravidelná', v.volby.join(' | ') + ' / ' + v.hodnota);

  // Ruční volba „Výchozí" u elektro nesmí přepnutím na stroje zmizet do prázdna
  const prechod = await p.evaluate(async () => {
    document.getElementById('f_druh').value = 'Výchozí';
    aktTyp = 'stroje'; novaZprava('stroje');
    await new Promise(r => setTimeout(r, 700));
    return document.getElementById('f_druh').value;
  });
  check('„Výchozí" se při přepnutí na stroje překlopí, ne vyprázdní',
    prechod === 'Pravidelná', '„' + prechod + '"');

  // ══ 4. NADPIS V PDF ══════════════════════════════════════════════
  const nadpisy = await p.evaluate(async () => {
    const out = {};
    const vyrob = async (druh) => {
      aktTyp = 'stroje'; novaZprava('stroje');
      await new Promise(r => setTimeout(r, 700));
      document.getElementById('f_ev_cislo').value = 'RS-26-0001';
      document.getElementById('f_misto').value = 'Hala M4';
      document.getElementById('f_zahajeni').value = '2026-09-16';
      document.getElementById('f_ukonceni').value = '2026-09-16';
      document.getElementById('f_druh').value = druh;
      generujPDF();
      await new Promise(r => setTimeout(r, 1400));
      // Věta „Předmětem…" NENÍ na titulní straně — vymezení předmětu je
      // ve vlastní kapitole. Číst se proto musí celý náhled.
      return {
        nadpis: (window.__pdfVychoziTexty || {}).nadpis || '',
        predmet: document.getElementById('pdf-pages').innerText.replace(/\s+/g, ' ')
      };
    };
    out.prav = await vyrob('Pravidelná');
    out.pred = await vyrob('Před uvedením do provozu');
    out.mim = await vyrob('Mimořádná');
    return out;
  });
  check('pravidelná: „ZPRÁVA O PRAVIDELNÉ KONTROLE ELEKTRICKÉHO ZAŘÍZENÍ PRACOVNÍHO STROJE"',
    nadpisy.prav.nadpis === 'ZPRÁVA O PRAVIDELNÉ KONTROLE ELEKTRICKÉHO ZAŘÍZENÍ PRACOVNÍHO STROJE',
    nadpisy.prav.nadpis);
  check('před uvedením do provozu: dovětek je ZA podstatným jménem',
    nadpisy.pred.nadpis === 'ZPRÁVA O KONTROLE ELEKTRICKÉHO ZAŘÍZENÍ PRACOVNÍHO STROJE PŘED UVEDENÍM DO PROVOZU',
    nadpisy.pred.nadpis);
  check('mimořádná: „ZPRÁVA O MIMOŘÁDNÉ KONTROLE…"',
    /^ZPRÁVA O MIMOŘÁDNÉ KONTROLE ELEKTRICKÉHO ZAŘÍZENÍ/.test(nadpisy.mim.nadpis), nadpisy.mim.nadpis);
  check('věta o předmětu: „Předmětem pravidelné kontroly bylo…"',
    /Předmětem pravidelné kontroly bylo elektrické zařízení pracovního stroje/.test(nadpisy.prav.predmet),
    (nadpisy.prav.predmet.match(/Předmětem[^.]*\./) || [''])[0]);
  check('věta o předmětu: „Předmětem kontroly před uvedením do provozu bylo…"',
    /Předmětem kontroly před uvedením do provozu bylo elektrické zařízení pracovního stroje/.test(nadpisy.pred.predmet),
    (nadpisy.pred.predmet.match(/Předmětem[^.]*\./) || [''])[0]);

  // ══ 5. STARÁ ZPRÁVA S „Výchozí" ══════════════════════════════════
  const stara = await p.evaluate(async () => {
    const D = {
      typ: 'stroje', ev_cislo: 'RS-25-0009', misto: 'Stará hala',
      druh: 'Výchozí', zahajeni: '2025-04-01', ukonceni: '2025-04-01',
      celkovy_vysledek: 'schopno',
      stroje: { rozsah: 'jeden', seznam: [{ nazev: 'Lis', typ: 'P100', mereni: [], kontroly: [] }] }
    };
    archiv.length = 0;
    archiv.push({ uid: 'u-stara', typ: 'stroje', ev_cislo: D.ev_cislo, misto: D.misto,
                  datum: D.zahajeni, vysledek: 'schopno', stav: '', data: D,
                  timestamp: '2025-04-01T08:00:00Z' });
    STORE.archiv = archiv; saveStore();
    otevritZpravu(0);
    await new Promise(r => setTimeout(r, 900));
    const sel = document.getElementById('f_druh');
    return {
      hodnota: sel.value,
      index: sel.selectedIndex,
      volby: Array.from(sel.options).map(o => o.value),
      vArchivu: archiv[0].data.druh          // uložená data se při načtení nepřepisují
    };
  });
  check('stará zpráva o stroji s „Výchozí" se překlopí na Pravidelná',
    stara.hodnota === 'Pravidelná', '„' + stara.hodnota + '"');
  check('rozbalovátko NEZŮSTANE prázdné (selectedIndex ≥ 0)',
    stara.index >= 0, 'index ' + stara.index);
  check('nabídka je ta pro kontrolu', !stara.volby.some(x => /Výchozí/.test(x)), stara.volby.join(' | '));
  check('archivní data se při pouhém otevření nepřepisují',
    stara.vArchivu === 'Výchozí', String(stara.vArchivu));

  const poUlozeni = await p.evaluate(async () => {
    saveToArchiv();
    await new Promise(r => setTimeout(r, 300));
    const z = archiv.filter(x => x.ev_cislo === 'RS-25-0009')[0];
    return z ? z.data.druh : null;
  });
  check('uložením zprávy se překlopení promítne i do archivu',
    poUlozeni === 'Pravidelná', String(poUlozeni));

  // Stará zpráva ELEKTRO s „Výchozí" musí zůstat výchozí!
  const staraEl = await p.evaluate(async () => {
    const D = { typ: 'elektro', podtyp: 'dum', ev_cislo: 'RE-25-0001', misto: 'Dům',
                druh: 'Výchozí souhrnná', zahajeni: '2025-05-01', ukonceni: '2025-05-01' };
    archiv.length = 0;
    archiv.push({ uid: 'u-el', typ: 'elektro', podtyp: 'dum', ev_cislo: D.ev_cislo, misto: D.misto,
                  datum: D.zahajeni, vysledek: '', stav: '', data: D, timestamp: '2025-05-01T08:00:00Z' });
    STORE.archiv = archiv; saveStore();
    otevritZpravu(0);
    await new Promise(r => setTimeout(r, 900));
    return document.getElementById('f_druh').value;
  });
  check('U ELEKTRO zůstává „Výchozí souhrnná" nedotčená',
    staraEl === 'Výchozí souhrnná', '„' + staraEl + '"');

  // ══ 6. Důvod mimořádné se pořád ukazuje ══════════════════════════
  const mim = await p.evaluate(async () => {
    aktTyp = 'stroje'; novaZprava('stroje');
    await new Promise(r => setTimeout(r, 700));
    const sel = document.getElementById('f_druh');
    const skryto = getComputedStyle(document.querySelector('.duvod-mim-wrap')).display;
    sel.value = 'Mimořádná';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 200));
    return { pred: skryto, po: getComputedStyle(document.querySelector('.duvod-mim-wrap')).display };
  });
  check('pole „důvod mimořádné" se u strojů pořád ukazuje jen u Mimořádné',
    mim.pred === 'none' && mim.po !== 'none', mim.pred + ' → ' + mim.po);

  check('bez chyb stránky', chyby.length === 0, chyby.join(' | '));
  await br.close();
  console.log(res.join('\n'));
  console.log(res.every(x => x[0] === '✅') ? '\nVŠE OK (' + res.length + ')' : '\nSELHALO');
  process.exit(res.every(x => x[0] === '✅') ? 0 : 1);
})();
