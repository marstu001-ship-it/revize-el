// v9.44 — přepsání textů, které program skládá sám (nadpis, citace norem,
// posudek) přímo v panelu nastavení tisku + vypnuté podbarvení okének.
const { chromium } = require('/opt/node22/lib/node_modules/playwright/node_modules/playwright-core');
const res = []; const check = (n, ok, d) => res.push((ok?'✅':'❌')+' '+n+(d?' — '+d:''));
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await b.newPage({ viewport: { width: 1500, height: 1200 } });
  const err = []; p.on('pageerror', e => err.push(e.message));
  await p.addInitScript(() => { try { navigator.serviceWorker.register = () => new Promise(() => {}); } catch (e) {} });
  await p.goto('http://127.0.0.1:8901/index.html', { waitUntil: 'load' });
  await p.waitForTimeout(900);

  const zaloz = (typ, podtyp) => p.evaluate(async (a) => {
    aktTyp = a.typ; aktPodtyp = a.podtyp; novaZprava(a.typ);
    await new Promise(r => setTimeout(r, 400));
    const set=(id,x)=>{const e=document.getElementById(id); if(e){e.value=x; e.dispatchEvent(new Event('input',{bubbles:true}));}};
    set('f_ev_cislo','X-1'); set('f_misto','Objekt'); set('f_druh','Pravidelná');
    set('f_zahajeni','2026-01-03'); set('f_ukonceni','2026-01-03'); set('f_celkovy_vysledek','schopno');
    generujPDF();
    await new Promise(r => setTimeout(r, 1500));
  }, { typ, podtyp });

  const nahled = () => p.evaluate(() =>
    Array.from(document.querySelectorAll('#pdf-pages .a4')).map(s => s.textContent.replace(/\s+/g,' ')).join(' '));

  await p.evaluate(() => { localStorage.clear(); archiv.length = 0; STORE.archiv = archiv; STORE.tisk = {}; });

  // ══ 1. VÝCHOZÍ NASTAVENÍ ═════════════════════════════════════════
  await zaloz('stroje','stroje');
  const vych = await p.evaluate(() => {
    const t = tiskNastaveni();
    const pages = document.getElementById('pdf-pages');
    return { kolonky: t.barevneKolonky, tucne: t.mistoTucne,
             tridaTint: pages.classList.contains('pbox-tint'),
             zaskrtKolonky: (document.getElementById('tisk-kolonky')||{}).checked,
             zaskrtTucne: (document.getElementById('tisk-misto-tucne')||{}).checked };
  });
  check('podbarvení okének je vypnuté', vych.kolonky === false, String(vych.kolonky));
  check('v náhledu se netriduje pbox-tint', vych.tridaTint === false, String(vych.tridaTint));
  check('checkbox podbarvení není zaškrtnutý', vych.zaskrtKolonky === false, String(vych.zaskrtKolonky));
  check('tučný nadpis místa zůstal zapnutý', vych.tucne === true && vych.zaskrtTucne === true, String(vych.tucne));

  // ══ 2. PANEL UKAZUJE, CO BY PROGRAM NAPSAL ═══════════════════════
  const naznaky = await p.evaluate(() => {
    const o = {};
    TISK_TEXTY.forEach(x => { o[x.klic] = (document.getElementById(x.id)||{}).placeholder || ''; });
    return o;
  });
  check('náznak nadpisu ukazuje programový text',
    /ZPRÁVA O PRAVIDELNÉ KONTROLE/.test(naznaky.nadpis), naznaky.nadpis.slice(0,60));
  check('náznak citace norem ukazuje programový text',
    /Kontrola provedena v souladu/.test(naznaky.podnadpis), naznaky.podnadpis.slice(0,50));
  check('náznak posudku ukazuje programový text',
    /Provedenou prohlídkou/.test(naznaky.posudek), naznaky.posudek.slice(0,50));

  // ══ 3. PŘEPSÁNÍ Z PANELU ═════════════════════════════════════════
  const prepis = await p.evaluate(async () => {
    const napis = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); };
    napis('tisk-txt-nadpis', 'Zpráva o pravidelné kontrole stroje');
    napis('tisk-txt-podnadpis', 'Podle NV č. 378/2001 Sb.');
    napis('tisk-txt-posudek', 'Stroj je způsobilý provozu.');
    await new Promise(r => setTimeout(r, 2600));
    return { nadpisPole: document.getElementById('f_nadpis_vlastni').value,
             podnadpisPole: document.getElementById('f_podnadpis_vlastni').value,
             posudekPole: document.getElementById('f_posudek_vlastni').value };
  });
  check('panel píše do polí zprávy (nadpis)', prepis.nadpisPole === 'Zpráva o pravidelné kontrole stroje');
  check('panel píše do polí zprávy (citace)', prepis.podnadpisPole === 'Podle NV č. 378/2001 Sb.');
  check('panel píše do polí zprávy (posudek)', prepis.posudekPole === 'Stroj je způsobilý provozu.');

  let t = await nahled();
  check('nadpis se vytiskne PŘESNĚ jak napsán (bez velkých písmen)',
    t.indexOf('Zpráva o pravidelné kontrole stroje') !== -1 &&
    t.indexOf('ZPRÁVA O PRAVIDELNÉ KONTROLE ELEKTRICKÉHO') === -1);
  check('citace norem se přepsala', t.indexOf('Podle NV č. 378/2001 Sb.') !== -1 &&
    t.indexOf('Kontrola provedena v souladu se zákonem') === -1);
  check('posudek se přepsal', t.indexOf('Stroj je způsobilý provozu.') !== -1 &&
    t.indexOf('Provedenou prohlídkou, měřením a zkouškami') === -1);

  // ══ 4. ULOŽIT PRO PŘÍŠTÍ ZPRÁVY TOHOTO TYPU ══════════════════════
  await p.evaluate(() => tiskTextyProTyp());
  const ulozeno = await p.evaluate(() => JSON.stringify((STORE.tisk.textyTyp || {})));
  check('uložilo se to pod typ stroje', /"stroje"/.test(ulozeno) && /kontrole stroje/.test(ulozeno),
    ulozeno.slice(0, 90));

  await zaloz('stroje','stroje');
  const novaStroj = await p.evaluate(() => document.getElementById('f_nadpis_vlastni').value);
  check('nová zpráva o stroji si texty vezme', novaStroj === 'Zpráva o pravidelné kontrole stroje', novaStroj);

  await zaloz('elektro','dum');
  const novaElektro = await p.evaluate(() => document.getElementById('f_nadpis_vlastni').value);
  check('elektro zprávu to neovlivní', novaElektro === '', '„' + novaElektro + '"');
  t = await nahled();
  check('elektro má pořád svůj nadpis', /ZPRÁVA O PRAVIDELNÉ REVIZI/.test(t));

  // ══ 5. VYPRÁZDNĚNÍ VRÁTÍ PROGRAMOVÝ TEXT ═════════════════════════
  await zaloz('stroje','stroje');
  const zpet = await p.evaluate(async () => {
    TISK_TEXTY.forEach(x => {
      const e = document.getElementById(x.id);
      if (e) { e.value = ''; e.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    await new Promise(r => setTimeout(r, 2600));
    return Array.from(document.querySelectorAll('#pdf-pages .a4')).map(s => s.textContent.replace(/\s+/g,' ')).join(' ');
  });
  check('prázdné pole = program si text složí sám',
    /ZPRÁVA O PRAVIDELNÉ KONTROLE ELEKTRICKÉHO ZAŘÍZENÍ PRACOVNÍHO STROJE/.test(zpet) &&
    /Kontrola provedena v souladu s NV č\. 378\/2001 Sb\./.test(zpet));

  check('bez chyb stránky', err.length === 0, err.join(' | '));
  console.log(res.join('\n'));
  await b.close();
  process.exit(res.some(r => r.startsWith('❌')) ? 1 : 0);
})().catch(e => { console.error('CRASH:', e.message); process.exit(2); });
