// U pracovního stroje se dělá KONTROLA, ne revize (NV 378/2001 Sb.,
// ČSN EN 60204-1 ed.3). Elektro a LPS musí zůstat u „revize".
const { chromium } = require('/opt/node22/lib/node_modules/playwright/node_modules/playwright-core');
const res = []; const check = (n, ok, d) => res.push((ok?'✅':'❌')+' '+n+(d?' — '+d:''));
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await b.newPage({ viewport: { width: 1500, height: 1100 } });
  const err = []; p.on('pageerror', e => err.push(e.message));
  await p.addInitScript(() => { try { navigator.serviceWorker.register = () => new Promise(() => {}); } catch (e) {} });
  await p.goto('http://127.0.0.1:8901/index.html', { waitUntil: 'load' });
  await p.waitForTimeout(900);

  const zaloz = (typ, podtyp) => p.evaluate(async (a) => {
    localStorage.clear(); archiv.length = 0; STORE.archiv = archiv;
    STORE.technik = { jmeno:'V. Dostálek', osvedceni:'15685/5/22' };
    aktTyp = a.typ; aktPodtyp = a.podtyp; novaZprava(a.typ);
    await new Promise(r => setTimeout(r, 450));
  }, { typ, podtyp });

  const popisky = () => p.evaluate(() => {
    const t = {};
    document.querySelectorAll('#screen-form [data-term]').forEach(el => {
      t[el.dataset.term] = (el.firstChild && el.firstChild.nodeValue || '').trim();
    });
    t.__rozdelovnik = (document.getElementById('f_rozdelovnik') || {}).value || '';
    t.__ph = (document.getElementById('f_nadpis_vlastni') || {}).placeholder || '';
    return t;
  });

  const pdfText = (typ) => p.evaluate(async (typ) => {
    const set=(id,x)=>{const e=document.getElementById(id); if(e){e.value=x; e.dispatchEvent(new Event('input',{bubbles:true}));}};
    set('f_ev_cislo','X-1'); set('f_misto','Objekt'); set('f_druh','Pravidelná');
    set('f_objednatel','Objednatel s.r.o.'); set('f_pritomen2','pan Kadlec');
    set('f_zahajeni','2026-01-03'); set('f_ukonceni','2026-01-03'); set('f_vypracovani','2026-01-08');
    set('f_predchozi','2025-01-03'); set('f_preruseni_od','2026-01-04'); set('f_preruseni_do','2026-01-05');
    set('f_pristi','2027-01-02'); set('f_celkovy_vysledek','schopno'); set('f_lhuta','1 rok');
    set('f_predmet_je','zařízení'); set('f_predmet_neni','nic');
    generujPDF();
    await new Promise(r => setTimeout(r, 1700));
    return Array.from(document.querySelectorAll('#pdf-pages .a4'))
      .map(s => s.textContent.replace(/\s+/g,' ')).join(' ');
  }, typ);

  // ══ STROJE ═══════════════════════════════════════════════════════
  await zaloz('stroje', 'stroje');
  const S = await popisky();
  check('stroj: druh kontroly', S['f-druh'] === 'Druh kontroly', S['f-druh']);
  check('stroj: místo provádění kontroly', S['f-misto'] === 'Místo provádění kontroly', S['f-misto']);
  check('stroj: termín příští kontroly', S['f-pristi'] === 'Termín příští kontroly', S['f-pristi']);
  check('stroj: kontrolní technik', S['f-technik-card'] === 'Kontrolní technik', S['f-technik-card']);
  check('stroj: objednatel kontroly', S['f-objednatel-card'] === 'Objednatel kontroly', S['f-objednatel-card']);
  check('stroj: při kontrole byl přítomen', S['f-pritomen'] === 'Při kontrole byl přítomen', S['f-pritomen']);
  check('stroj: rozdělovník má kontrolního technika', /Kontrolní technik/.test(S.__rozdelovnik), S.__rozdelovnik);
  check('stroj: nápověda nadpisu je o kontrole', /kontrole/.test(S.__ph), S.__ph);

  const sPdf = await pdfText('stroje');
  check('stroj PDF: ZPRÁVA O PRAVIDELNÉ KONTROLE',
    /ZPRÁVA O PRAVIDELNÉ KONTROLE ELEKTRICKÉHO ZAŘÍZENÍ PRACOVNÍHO STROJE/.test(sPdf));
  check('stroj PDF: Kontrola provedena v souladu', /Kontrola provedena v souladu s NV č\. 378\/2001 Sb\./.test(sPdf));
  ['Místo provádění kontroly:', 'Kontrolní technik:', 'Datum kontroly:', 'kontrola od', 'kontrola do',
   'podpis kontrolního technika', 'Vymezení rozsahu kontroly', 'Předmětem kontroly je:',
   'Předmětem kontroly není:', 'Kontrola provedena dle:', 'Objednatel kontroly:',
   'Při kontrole byl přítomen:', 'Přerušení kontroly:',
   'Doporučená lhůta provedení příští kontroly:'].forEach(s => {
    check('stroj PDF má „' + s + '"', sPdf.indexOf(s) !== -1);
  });
  ['Revizní technik:', 'revize od', 'revize do', 'Předmětem revize je:', 'Vymezení rozsahu revize',
   'podpis revizního technika', 'Objednatel revize:', 'Revize provedena dle:'].forEach(s => {
    check('stroj PDF NEMÁ „' + s + '"', sPdf.indexOf(s) === -1);
  });
  // Názvy norem se měnit nesmí — ČSN 33 1500 se opravdu jmenuje „Revize…".
  // Od v9.50 u strojů není předškrtnutá, takže se pro tuhle kontrolu zaškrtne
  // ručně: ověřuje se NÁZEV normy, ne to, že se tiskne.
  await p.evaluate(() => {
    const ch = document.getElementById('n-csn331500str');
    if (ch && !ch.checked) { ch.checked = true; ch.dispatchEvent(new Event('change', { bubbles: true })); }
  });
  check('stroj PDF nechal názvy norem být',
    /ČSN 33 1500 \(Z1–Z4\) — Revize elektrických zařízení/.test(await pdfText('stroje')));

  // ══ ELEKTRO ZŮSTÁVÁ U REVIZE ═════════════════════════════════════
  await zaloz('elektro', 'dum');
  const E = await popisky();
  check('elektro: druh revize', E['f-druh'] === 'Druh revize', E['f-druh']);
  check('elektro: revizní technik', E['f-technik-card'] === 'Revizní technik', E['f-technik-card']);
  check('elektro: rozdělovník má revizního technika', /Revizní technik/.test(E.__rozdelovnik), E.__rozdelovnik);
  const ePdf = await pdfText('elektro');
  check('elektro PDF: O PRAVIDELNÉ REVIZI', /ZPRÁVA O PRAVIDELNÉ REVIZI/.test(ePdf));
  check('elektro PDF: Revizní technik', ePdf.indexOf('Revizní technik:') !== -1);
  check('elektro PDF nemá slovo kontrola v popiscích',
    ePdf.indexOf('Kontrolní technik') === -1 && ePdf.indexOf('kontrola od') === -1);

  // ══ PŘEPÍNÁNÍ TAM A ZPĚT ═════════════════════════════════════════
  await zaloz('stroje', 'stroje');
  await zaloz('elektro', 'dum');
  const E2 = await popisky();
  check('po přepnutí zpět na elektro jsou popisky zase revizní',
    E2['f-druh'] === 'Druh revize' && E2['f-technik-card'] === 'Revizní technik' &&
    /Revizní technik/.test(E2.__rozdelovnik), E2['f-druh'] + ' / ' + E2.__rozdelovnik);

  // ══ VLASTNÍ TEXT ROZDĚLOVNÍKU SE NEPŘEPÍŠE ═══════════════════════
  const vlastni = await p.evaluate(async () => {
    document.getElementById('f_rozdelovnik').value = 'Výtisk č. 1: šéf, Výtisk č. 2: já';
    aplikovatPojmy('stroje');
    return document.getElementById('f_rozdelovnik').value;
  });
  check('vlastní rozdělovník zůstane', vlastni === 'Výtisk č. 1: šéf, Výtisk č. 2: já', vlastni);

  // ══ ZPRÁVA Z ARCHIVU ═════════════════════════════════════════════
  const zArchivu = await p.evaluate(async () => {
    aktTyp='stroje'; aktPodtyp='stroje'; novaZprava('stroje');
    await new Promise(r => setTimeout(r, 400));
    document.getElementById('f_ev_cislo').value = 'RS-26-0009';
    document.getElementById('f_misto').value = 'Stroj';
    const D = getData();
    aktTyp='elektro'; novaZprava('elektro');            // mezitím jiný typ
    await new Promise(r => setTimeout(r, 300));
    nacistData(D);
    await new Promise(r => setTimeout(r, 500));
    const el = document.querySelector('#screen-form [data-term="f-technik-card"]');
    return (el && el.firstChild && el.firstChild.nodeValue || '').trim();
  });
  check('načtená zpráva o stroji má taky kontrolního technika',
    zArchivu === 'Kontrolní technik', zArchivu);

  check('bez chyb stránky', err.length === 0, err.join(' | '));
  console.log(res.join('\n'));
  await b.close();
  process.exit(res.some(r => r.startsWith('❌')) ? 1 : 0);
})().catch(e => { console.error('CRASH:', e.message); process.exit(2); });
