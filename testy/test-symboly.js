// v9.77 — znaky, které se na klávesnici nenapíšou (≤ ≥ Δ …).
// „u strojů a spotřebičů technici nevědí, jak se píše na klávesnici menší,
//  větší, nebo rovno, delta In" (uživatel 2026-09-18)
const { chromium } = require('/opt/node22/lib/node_modules/playwright/node_modules/playwright-core');
const res = []; const check = (n, ok, d) => res.push((ok?'✅':'❌')+' '+n+(d?' — '+d:''));

(async () => {
  const br = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await br.newContext({ viewport: { width: 1500, height: 1100 } });
  await ctx.addInitScript(() => { navigator.serviceWorker.register = () => new Promise(() => {}); });
  const p = await ctx.newPage();
  const chyby = []; p.on('pageerror', e => chyby.push(e.message));
  await p.goto('http://127.0.0.1:8901/index.html', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1400);

  // ══ 1. STROJE — měření ══════════════════════════════════════════
  const stroje = await p.evaluate(async () => {
    localStorage.clear(); STORE.technik = { jmeno: 'X', mesto: 'Kyjově' };
    archiv.length = 0; STORE.archiv = archiv;
    aktTyp = 'stroje'; aktPodtyp = 'stroje'; novaZprava('stroje');
    await new Promise(r => setTimeout(r, 900));
    switchTab('stroje-mereni', document.querySelector('#tab-bar-stroje [data-tab="stroje-mereni"]'));
    await new Promise(r => setTimeout(r, 300));
    return {
      uMereni: document.querySelectorAll('#stroje-mereni-hosty .sym-proužek').length,
      uKontrol: document.querySelectorAll('#stroje-kontroly-hosty .sym-proužek').length,
      znaky: [...document.querySelectorAll('#stroje-mereni-hosty .sym-btn')]
             .map(b => b.getAttribute('data-znak'))
    };
  });
  check('u měření strojů je proužek se znaky', stroje.uMereni === 1, String(stroje.uMereni));
  check('u KONTROL proužek NENÍ (výsledek je rozbalovátko)', stroje.uKontrol === 0,
    String(stroje.uKontrol));
  // v9.99: přibyl „<" (pokyn uživatele 2026-09-24)
  check('nabízí se ≤ ≥ < > Δ Ω ± °', stroje.znaky.join('') === '≤≥<>ΔΩ±°', stroje.znaky.join(''));

  // vloží se NA KURZOR, ne na začátek ani konec
  const kurzor = await p.evaluate(async () => {
    const radek = document.querySelector('#stroje-mereni-hosty tr[data-rowtype="stroj-polozka"]');
    const hod = [...radek.querySelectorAll('input')][1];
    hod.focus(); hod.value = '300'; hod.setSelectionRange(0, 0);
    let dirty = false; hod.addEventListener('input', () => { dirty = true; });
    const btn = document.querySelector('#stroje-mereni-hosty .sym-btn[data-znak="≤"]');
    // skutečná cesta: mousedown (nesmí sebrat kurzor) + klik
    const md = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    btn.dispatchEvent(md);
    btn.click();
    await new Promise(r => setTimeout(r, 150));
    return { hodnota: hod.value, kurzorPo: hod.selectionStart, fokus: document.activeElement === hod,
             mdZabranen: md.defaultPrevented, dirty };
  });
  check('klepnutí na znak ho vloží NA KURZOR', kurzor.hodnota === '≤300', kurzor.hodnota);
  check('kurzor zůstane za vloženým znakem', kurzor.kurzorPo === 1, String(kurzor.kurzorPo));
  check('fokus zůstane v buňce, dá se psát dál', kurzor.fokus);
  check('mousedown je zrušený, aby buňka neztratila kurzor', kurzor.mdZabranen);
  check('vložení označí zprávu jako změněnou', kurzor.dirty);

  // uprostřed textu
  const uprostred = await p.evaluate(async () => {
    const radek = document.querySelector('#stroje-mereni-hosty tr[data-rowtype="stroj-polozka"]');
    const hod = [...radek.querySelectorAll('input')][1];
    hod.focus(); hod.value = '10  20'; hod.setSelectionRange(3, 3);
    const btn = document.querySelector('#stroje-mereni-hosty .sym-btn[data-znak="Δ"]');
    btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    btn.click();
    await new Promise(r => setTimeout(r, 120));
    return hod.value;
  });
  check('vloží se doprostřed textu, ne na konec', uprostred === '10 Δ 20', JSON.stringify(uprostred));

  // ══ 2. Psaní zkratkou ═══════════════════════════════════════════
  await p.evaluate(() => {
    const radek = document.querySelector('#stroje-mereni-hosty tr[data-rowtype="stroj-polozka"]');
    const hod = [...radek.querySelectorAll('input')][1];
    hod.value = ''; hod.focus();
  });
  await p.keyboard.type('<=300');
  await p.waitForTimeout(150);
  const zk1 = await p.evaluate(() => [...document.querySelector('#stroje-mereni-hosty tr[data-rowtype="stroj-polozka"]').querySelectorAll('input')][1].value);
  check('napsané „<=" se samo přepíše na ≤', zk1 === '≤300', JSON.stringify(zk1));

  await p.evaluate(() => {
    const hod = [...document.querySelector('#stroje-mereni-hosty tr[data-rowtype="stroj-polozka"]').querySelectorAll('input')][1];
    hod.value = ''; hod.focus();
  });
  await p.keyboard.type('>=1');
  await p.waitForTimeout(150);
  const zk2 = await p.evaluate(() => [...document.querySelector('#stroje-mereni-hosty tr[data-rowtype="stroj-polozka"]').querySelectorAll('input')][1].value);
  check('napsané „>=" se samo přepíše na ≥', zk2 === '≥1', JSON.stringify(zk2));

  // samotné > se NEPŘEPISUJE — „>19,9" je běžný zápis přesahu rozsahu
  await p.evaluate(() => {
    const hod = [...document.querySelector('#stroje-mereni-hosty tr[data-rowtype="stroj-polozka"]').querySelectorAll('input')][1];
    hod.value = ''; hod.focus();
  });
  await p.keyboard.type('>19,9');
  await p.waitForTimeout(150);
  const zk3 = await p.evaluate(() => [...document.querySelector('#stroje-mereni-hosty tr[data-rowtype="stroj-polozka"]').querySelectorAll('input')][1].value);
  check('samotné „>" zůstane („>19,9" je platný zápis)', zk3 === '>19,9', JSON.stringify(zk3));

  // ══ 3. SPOTŘEBIČE ═══════════════════════════════════════════════
  const spotr = await p.evaluate(async () => {
    aktTyp = 'spotrebice'; aktPodtyp = 'spotrebice'; novaZprava('spotrebice');
    await new Promise(r => setTimeout(r, 900));
    const proužek = document.querySelectorAll('#spotrebice-list .sym-proužek').length;
    const bunka = document.querySelector('#spotrebice-body [data-k="riso"]');
    bunka.focus(); bunka.value = '19,9'; bunka.setSelectionRange(0, 0);
    const btn = document.querySelector('#spotrebice-list .sym-btn[data-znak="≥"]');
    btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    btn.click();
    await new Promise(r => setTimeout(r, 150));
    return { proužek, hodnota: bunka.value, vDatech: (getData().spotrebice.seznam[0] || {}).riso };
  });
  check('u spotřebičů je proužek pod tabulkou', spotr.proužek === 1, String(spotr.proužek));
  check('znak se vloží i do buňky protokolu', spotr.hodnota === '≥19,9', spotr.hodnota);
  check('a propíše se do dat zprávy', spotr.vDatech === '≥19,9', spotr.vDatech);

  // ══ 4. Kde proužek být NESMÍ ════════════════════════════════════
  const jinde = await p.evaluate(async () => {
    // do PDF protokolu se nesmí dostat
    document.querySelector('#spotrebice-body [data-k="nazev"]').value = 'Lampa';
    spotrebiceNahled();
    await new Promise(r => setTimeout(r, 700));
    const vPdf = document.querySelectorAll('#spotrebice-pdf-pages .sym-proužek').length;
    // v9.99: proužek je NOVĚ i pod tabulkou elektro rozváděče (pokyn uživatele
    // 2026-09-24 — „nevím jak vložit znaménko větší než")
    showScreen('form');
    aktTyp = 'elektro'; aktPodtyp = 'dum'; novaZprava('elektro');
    await new Promise(r => setTimeout(r, 700));
    return { vPdf, vElektro: document.querySelectorAll('#rozvadece-container .sym-proužek').length };
  });
  check('v PDF protokolu proužek není', jinde.vPdf === 0, String(jinde.vPdf));
  check('pod tabulkou elektro rozváděče proužek je (v9.99)', jinde.vElektro >= 1, String(jinde.vElektro));

  // zkratka NESMÍ přepisovat mimo tyhle dvě tabulky
  const mimo = await p.evaluate(async () => {
    const pole = document.getElementById('f_provozovatel');
    pole.focus(); pole.value = '';
    return !!pole;
  });
  await p.keyboard.type('a<=b');
  await p.waitForTimeout(150);
  const mimoV = await p.evaluate(() => document.getElementById('f_provozovatel').value);
  check('mimo tabulky měření se „<=" NEPŘEPISUJE', mimoV === 'a<=b', JSON.stringify(mimoV));

  // bez vybrané buňky to jen poradí, nespadne
  const bezPole = await p.evaluate(async () => {
    __symPole = null;
    aktTyp = 'stroje'; aktPodtyp = 'stroje'; novaZprava('stroje');
    await new Promise(r => setTimeout(r, 800));
    switchTab('stroje-mereni', document.querySelector('#tab-bar-stroje [data-tab="stroje-mereni"]'));
    await new Promise(r => setTimeout(r, 250));
    __symPole = null;
    document.querySelector('#stroje-mereni-hosty .sym-btn').click();
    await new Promise(r => setTimeout(r, 200));
    const t = [...document.querySelectorAll('.toast, #toast, [class*="toast"]')].pop();
    return t ? t.textContent : '';
  });
  check('bez vybrané buňky program poradí, co udělat',
    /Klepněte nejdřív do buňky/.test(bezPole), bezPole.slice(0, 50) || '(nic)');

  check('bez chyb stránky', chyby.length === 0, chyby.join(' | '));
  await br.close();
  console.log(res.join('\n'));
  console.log(res.every(x => x[0] === '✅') ? '\nVŠE OK (' + res.length + ')' : '\nSELHALO');
  process.exit(res.every(x => x[0] === '✅') ? 0 : 1);
})();
