// v9.90 — konvence z Office: ukotvená hlavička, Ctrl+P/F/H/F2,
// Najít a nahradit, stavový řádek.
const { chromium } = require('/opt/node22/lib/node_modules/playwright/node_modules/playwright-core');
const res = []; const check = (n, ok, d) => res.push((ok?'✅':'❌')+' '+n+(d?' — '+d:''));

(async () => {
  const br = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await br.newContext({ viewport: { width: 1400, height: 800 } });
  await ctx.addInitScript(() => { navigator.serviceWorker.register = () => new Promise(() => {}); });
  const p = await ctx.newPage();
  const chyby = []; p.on('pageerror', e => chyby.push(e.message));
  await p.goto('http://127.0.0.1:8901/index.html', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);
  await p.evaluate(() => {
    window.confirm = () => true;
    window.__hlasky = []; window.__toastOpts = null;
    const t0 = window.showToast;
    window.showToast = function (t, o) { window.__hlasky.push(t); window.__toastOpts = o; return t0.apply(this, arguments); };
  });

  const novaElektro = () => p.evaluate(async () => {
    localStorage.clear(); archiv.length = 0; STORE.archiv = archiv;
    STORE.technik = { jmeno: 'M. Technik' };
    aktTyp = 'elektro'; aktPodtyp = 'dum'; novaZprava('elektro');
    await new Promise(r => setTimeout(r, 800));
    document.getElementById('f_ev_cislo').value = 'RE-26-0001';
    document.getElementById('f_misto').value = 'Rodinný dům';
    const mer = [...document.querySelectorAll('.tab-bar .tab-btn')].find(b => /měřen/i.test(b.textContent));
    mer.click();
    await new Promise(r => setTimeout(r, 300));
    const tb = document.querySelector('#rozvadece-container .meas-table tbody');
    for (let i = 0; i < 30; i++) addMereniRowTo(tb);
    await new Promise(r => setTimeout(r, 300));
  });

  // ══ 1. Ukotvená hlavička tabulky měření ═══════════════════════════
  await novaElektro();
  const pred = await p.evaluate(() => {
    const b = document.getElementById('plov-hlavicka');
    return { je: !!b, videt: !!(b && b.style.display !== 'none' && b.offsetWidth) };
  });
  check('bez odrolování žádná plovoucí hlavička nevisí', !pred.videt);

  await p.evaluate(() => window.scrollTo(0, 900));
  await p.waitForTimeout(300);
  const po = await p.evaluate(() => {
    const b = document.getElementById('plov-hlavicka');
    const tab = document.querySelector('#rozvadece-container .meas-table');
    const wrap = tab.closest('.meas-table-wrap');
    const text = t => [...t.querySelectorAll('thead th')].map(x => x.textContent.replace(/\s+/g, '')).join('|');
    const sirky = t => [...t.querySelectorAll('thead tr:last-child th')].map(x => Math.round(x.getBoundingClientRect().width));
    const bar = aktivniTabBar();
    return {
      videt: !!(b && b.style.display !== 'none' && b.offsetHeight),
      textSedi: b ? text(b) === text(tab) : false,
      sirkySedi: b ? JSON.stringify(sirky(b)) === JSON.stringify(sirky(tab)) : false,
      top: b ? Math.round(b.getBoundingClientRect().top) : -1,
      podListou: b ? Math.abs(b.getBoundingClientRect().top - bar.getBoundingClientRect().bottom) : 999,
      levySedi: b ? Math.abs(b.getBoundingClientRect().left - wrap.getBoundingClientRect().left) : 999,
      nadTabulkou: b ? (b.getBoundingClientRect().left >= 0) : false
    };
  });
  check('po odrolování se hlavička ukotví pod lištou tabů', po.videt && po.podListou <= 2,
    'top ' + po.top + ', odchylka ' + po.podListou);
  check('a je to TÁŽ hlavička (stejné popisky sloupců)', po.textSedi);
  check('sloupce kopie sedí na sloupce tabulky na pixel', po.sirkySedi);
  check('kopie leží přesně nad tabulkou', po.levySedi <= 1 && po.nadTabulkou, 'odchylka ' + po.levySedi);

  // Vodorovné rolování se projeví, až když se šestnáct sloupců na šířku
  // okna nevejde — na velkém monitoru tabulka rolovat nepotřebuje.
  await p.setViewportSize({ width: 900, height: 800 });
  await p.waitForTimeout(300);
  await p.evaluate(() => window.scrollTo(0, 900));
  await p.waitForTimeout(300);
  const vodorovne = await p.evaluate(async () => {
    const wrap = document.querySelector('#rozvadece-container .meas-table-wrap');
    const b = document.getElementById('plov-hlavicka');
    const pred = b.firstChild.style.left;
    wrap.scrollLeft = 200;
    await new Promise(r => setTimeout(r, 300));
    return { pred: pred, po: b.firstChild.style.left, roluje: wrap.scrollLeft,
             tab: Math.round(document.querySelector('#rozvadece-container .meas-table').getBoundingClientRect().left),
             klon: Math.round(b.firstChild.getBoundingClientRect().left) };
  });
  check('vodorovné rolování tabulkou posune i kopii hlavičky',
    vodorovne.roluje > 0 && vodorovne.pred !== vodorovne.po &&
    Math.abs(vodorovne.tab - vodorovne.klon) <= 1,
    vodorovne.pred + ' → ' + vodorovne.po + ' (scrollLeft ' + vodorovne.roluje + ')');
  await p.setViewportSize({ width: 1400, height: 800 });
  await p.waitForTimeout(300);

  const zpet = await p.evaluate(async () => {
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 300));
    const b = document.getElementById('plov-hlavicka');
    const naHlavni = () => { showScreen('home'); };
    const stav1 = b.style.display;
    window.scrollTo(0, 900);
    await new Promise(r => setTimeout(r, 250));
    naHlavni();
    await new Promise(r => setTimeout(r, 250));
    return { nahore: stav1, jinde: b.style.display };
  });
  check('nahoře se kopie schová', zpet.nahore === 'none', zpet.nahore);
  check('a mimo formulář taky', zpet.jinde === 'none', zpet.jinde);

  // ══ 2. Stavový řádek ══════════════════════════════════════════════
  await novaElektro();
  const sr = await p.evaluate(async () => {
    await new Promise(r => setTimeout(r, 200));
    const el = document.getElementById('stavovy-radek');
    const text = () => el.innerText.replace(/\s+/g, ' ').trim();
    const zav = [...document.querySelectorAll('.tab-bar .tab-btn')].find(b => /závad/i.test(b.textContent));
    if (zav) { zav.click(); await new Promise(r => setTimeout(r, 200)); addZavada(); addZavada(); }
    window.__formDirty = true; updateUlozitStav();
    const spinave = text();
    const viditelny = !!(el.offsetHeight && getComputedStyle(el).display !== 'none');
    saveToArchiv();
    await new Promise(r => setTimeout(r, 200));
    const ulozene = text();
    showScreen('home');
    await new Promise(r => setTimeout(r, 200));
    const mimo = el.style.display;
    return { spinave, ulozene, mimo, viditelny, cas: window.__poslednUlozeno };
  });
  check('stavový řádek je ve formuláři OPRAVDU VIDĚT', sr.viditelny);
  check('stavový řádek zná typ i ev. číslo zprávy',
    /Elektro/.test(sr.spinave) && /RE-26-0001/.test(sr.spinave), sr.spinave);
  check('počítá rozváděče, obvody i závady',
    /1× rozváděč/.test(sr.spinave) && /obvod/.test(sr.spinave) && /2× závada/.test(sr.spinave), sr.spinave);
  check('neuložené změny jsou vidět', /neuložené změny/.test(sr.spinave));
  check('po uložení ukáže čas', /uloženo v \d\d:\d\d/.test(sr.ulozene), sr.ulozene);
  check('mimo formulář se schová', sr.mimo === 'none', sr.mimo);

  // ══ 3. Klávesové zkratky ══════════════════════════════════════════
  await novaElektro();
  const f2 = await p.evaluate(async () => {
    document.body.focus();
    return { pred: (document.activeElement || {}).id };
  });
  await p.keyboard.press('F2');
  await p.waitForTimeout(200);
  const f2po = await p.evaluate(() => ({ id: (document.activeElement || {}).id,
    vybrano: (document.activeElement || {}).selectionStart === 0 }));
  check('F2 ve formuláři skočí na ev. číslo (přejmenování zprávy)',
    f2po.id === 'f_ev_cislo', f2.pred + ' → ' + f2po.id);

  await p.keyboard.press('Control+f');
  await p.waitForTimeout(400);
  const ctrlF = await p.evaluate(() => ({ id: (document.activeElement || {}).id,
    panel: document.body.classList.contains('fa-open') }));
  check('Ctrl+F ve formuláři otevře postranní archiv a skočí do hledání',
    ctrlF.id === 'fa-hledat' && ctrlF.panel, ctrlF.id);

  const ctrlH = await p.evaluate(async () => {
    document.getElementById('fa-hledat').blur();
    return true;
  });
  await p.keyboard.press('Control+h');
  await p.waitForTimeout(300);
  const hOtev = await p.evaluate(() => document.getElementById('modal-najit').classList.contains('open'));
  check('Ctrl+H otevře Najít a nahradit', hOtev);
  await p.keyboard.press('Escape');
  await p.waitForTimeout(200);

  await p.keyboard.press('Control+p');
  await p.waitForTimeout(2500);
  const ctrlP = await p.evaluate(() => ({
    obrazovka: (document.querySelector('.screen.active') || {}).id,
    varovani: !!document.querySelector('.modal-overlay.open')
  }));
  check('Ctrl+P spustí tisk zprávy (náhled nebo dotaz na chybějící pole)',
    ctrlP.obrazovka === 'screen-pdf' || ctrlP.varovani, JSON.stringify(ctrlP));

  const ctrlFdoma = await p.evaluate(async () => {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
    showScreen('home');
    await new Promise(r => setTimeout(r, 300));
    return true;
  });
  await p.keyboard.press('Control+f');
  await p.waitForTimeout(250);
  const domaId = await p.evaluate(() => (document.activeElement || {}).id);
  check('Ctrl+F na hlavní straně skočí do hledání v archivu',
    /hledat|search/i.test(domaId || ''), domaId);

  // ══ 4. Najít a nahradit ═══════════════════════════════════════════
  const nah = await p.evaluate(async () => {
    aktTyp = 'elektro'; aktPodtyp = 'dum'; novaZprava('elektro');
    await new Promise(r => setTimeout(r, 800));
    const popis = document.getElementById('f_popis') || document.querySelector('#screen-form textarea[data-rich]');
    const zaver = document.getElementById('f_zhodnoceni');
    popis.value = 'Rozvaděč v Kyjově, druhý rozvaděč v <strong>Kyjově</strong>.';
    popis.dispatchEvent(new Event('input', { bubbles: true }));
    zaver.value = 'Revize provedena v kyjove.';
    zaver.dispatchEvent(new Event('input', { bubbles: true }));
    najitOtevrit();
    document.getElementById('najit-co').value = 'Kyjov';
    najitPrehled();
    const prehled = document.getElementById('najit-vysledek').innerText.replace(/\s+/g, ' ').trim();
    document.getElementById('najit-citlive').checked = true;
    najitPrehled();
    const citlivy = document.getElementById('najit-vysledek').innerText.replace(/\s+/g, ' ').trim();
    document.getElementById('najit-citlive').checked = false;
    document.getElementById('najit-co').value = 'Kyjově';
    document.getElementById('najit-cim').value = 'Brně';
    najitNahradit();
    await new Promise(r => setTimeout(r, 200));
    return { prehled, citlivy, popis: popis.value, zaver: zaver.value,
             hlaska: window.__hlasky[window.__hlasky.length - 1], maZpet: !!(window.__toastOpts || {}).action };
  });
  check('najde text napříč poli bez ohledu na velikost písmen',
    /3 nález/.test(nah.prehled), nah.prehled);
  check('a s rozlišováním velikosti velké „Kyjov" najde jen dvakrát',
    /2 nález/.test(nah.citlivy), nah.citlivy);
  check('nahrazení projde všemi poli, která text mají', /Brně/.test(nah.popis),
    nah.popis + ' || ' + nah.zaver);
  check('ZNAČKY FORMÁTOVÁNÍ zůstanou celé', /<strong>Brně<\/strong>/.test(nah.popis), nah.popis);
  check('hláška řekne počet a nabídne ZPĚT',
    /2×/.test(nah.hlaska || '') && nah.maZpet, nah.hlaska);

  const zpetNah = await p.evaluate(async () => {
    window.__toastOpts.action();
    await new Promise(r => setTimeout(r, 200));
    const popis = document.getElementById('f_popis') || document.querySelector('#screen-form textarea[data-rich]');
    return popis.value;
  });
  check('ZPĚT vrátí původní text', /Kyjov/.test(zpetNah) && !/Brně/.test(zpetNah), zpetNah);

  const escape = await p.evaluate(async () => {
    const popis = document.getElementById('f_popis') || document.querySelector('#screen-form textarea[data-rich]');
    popis.value = 'text AAA text';
    popis.dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('najit-co').value = 'AAA';
    document.getElementById('najit-cim').value = '<b>tučně</b>';
    najitNahradit();
    await new Promise(r => setTimeout(r, 150));
    return popis.value;
  });
  check('do pole s formátováním se značka z klávesnice vloží jako TEXT',
    /&lt;b&gt;/.test(escape), escape);

  const zamceno = await p.evaluate(async () => {
    window.__formReadOnly = true;
    window.__hlasky = [];
    const popis = document.getElementById('f_popis') || document.querySelector('#screen-form textarea[data-rich]');
    popis.value = 'zamčeno BBB';
    document.getElementById('najit-co').value = 'BBB';
    document.getElementById('najit-cim').value = 'CCC';
    najitNahradit();
    await new Promise(r => setTimeout(r, 150));
    const v = popis.value;
    window.__formReadOnly = false;
    return { v, hlaska: window.__hlasky[window.__hlasky.length - 1] };
  });
  check('v dokončené zprávě se nenahrazuje a program to řekne',
    /BBB/.test(zamceno.v) && /jen pro čtení/.test(zamceno.hlaska || ''), zamceno.hlaska);

  check('bez chyb stránky', chyby.length === 0, chyby.join(' | '));
  await br.close();
  console.log(res.join('\n'));
  console.log(res.every(x => x[0] === '✅') ? '\nVŠE OK (' + res.length + ')' : '\nSELHALO');
})();
