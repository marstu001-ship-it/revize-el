// v9.87 — přenos vybraných zpráv do souboru a zpátky (balík + hromada souborů).
const { chromium } = require('/opt/node22/lib/node_modules/playwright/node_modules/playwright-core');
const res = []; const check = (n, ok, d) => res.push((ok?'✅':'❌')+' '+n+(d?' — '+d:''));

(async () => {
  const br = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await br.newContext({ viewport: { width: 1400, height: 950 } });
  await ctx.addInitScript(() => { navigator.serviceWorker.register = () => new Promise(() => {}); });
  const p = await ctx.newPage();
  const chyby = []; p.on('pageerror', e => chyby.push(e.message));
  await p.goto('http://127.0.0.1:8901/index.html', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);

  await p.evaluate(() => {
    window.__ulozene = [];
    window.ulozitSoubor = function (blob, nazev) {
      return blob.text().then(t => { window.__ulozene.push({ nazev, text: t }); return true; });
    };
    window.__hlasky = []; window.__toastOpts = null;
    const t0 = window.showToast;
    window.showToast = function (t, o) { window.__hlasky.push(t); window.__toastOpts = o; return t0.apply(this, arguments); };
    window.__confirmy = []; window.__odpovedi = [];
    window.confirm = function (m) { window.__confirmy.push(m); return window.__odpovedi.length ? window.__odpovedi.shift() : true; };
    window.alert = function (m) { window.__hlasky.push('ALERT: ' + m); };
  });

  const zaloz = () => p.evaluate(async () => {
    localStorage.clear(); archiv.length = 0; STORE.archiv = archiv;
    STORE.technik = { jmeno: 'J. Novák' };
    for (let i = 1; i <= 4; i++) archiv.push({
      uid: 'u' + i, typ: i === 4 ? 'stroje' : 'elektro', podtyp: 'dum',
      ev_cislo: 'RE-26-000' + i, misto: 'Objekt ' + i, datum: '2026-09-0' + i,
      vysledek: 'schopno', stav: i === 1 ? 'aktivni' : '', pinned: false,
      data: { typ: i === 4 ? 'stroje' : 'elektro', ev_cislo: 'RE-26-000' + i, misto: 'Objekt ' + i,
              zahajeni: '2026-09-0' + i, celkovy_vysledek: 'schopno', zhodnoceni: 'Text zprávy ' + i }
    });
    __archivVybrane = {}; window.__archivLimit = 25; window.__archivFilterSig = null;
    window.__openZpravaUid = null;
    showScreen('home'); renderArchiv();
    await new Promise(r => setTimeout(r, 250));
  });

  // ══ 1. Export vybraných ═══════════════════════════════════════════
  await zaloz();
  const exp = await p.evaluate(async () => {
    // Po každém zaškrtnutí se archiv překresluje, takže se musí hledat znovu —
    // starý prvek už v dokumentu nevisí a klik by spadl do prázdna.
    const radek = i => [...document.querySelectorAll('#archiv-container tbody .archiv-check')][i];
    radek(0).click(); await new Promise(r => setTimeout(r, 150));
    radek(2).click(); await new Promise(r => setTimeout(r, 150));
    const tl = document.querySelector('[data-action="archivExportVybrane"]');
    const vidi = !!tl && !document.getElementById('archiv-hromadne').classList.contains('archiv-hromadne-skryta');
    tl.click();
    await new Promise(r => setTimeout(r, 400));
    const s = window.__ulozene[window.__ulozene.length - 1];
    return { vidi, nazev: s && s.nazev, balik: s && JSON.parse(s.text), hlaska: window.__hlasky[window.__hlasky.length - 1] };
  });
  check('tlačítko „Soubor pro kolegu" je v liště výběru', exp.vidi);
  check('uloží se jeden soubor se jménem podle počtu zpráv', /^Zpravy_2_\d{4}-\d{2}-\d{2}\.json$/.test(exp.nazev || ''), exp.nazev);
  check('soubor je označkovaný jako balík zpráv', exp.balik && exp.balik._format === 'revize-el-zpravy', exp.balik && exp.balik._format);
  check('obsahuje právě vybrané zprávy', (exp.balik.zpravy || []).map(z => z.ev_cislo).join(',') === 'RE-26-0001,RE-26-0003',
    (exp.balik.zpravy || []).map(z => z.ev_cislo).join(','));
  check('a nese CELÉ položky archivu, ne jen data', !!(exp.balik.zpravy[0].uid && exp.balik.zpravy[0].data && exp.balik.zpravy[0].data.zhodnoceni));
  check('včetně stavu rozpracovanosti', exp.balik.zpravy[0].stav === 'aktivni' && exp.balik.zpravy[1].stav === '',
    exp.balik.zpravy.map(z => z.stav || '(dokončená)').join(' / '));
  check('hláška řekne, kolik se uložilo', /2 zprávy/.test(exp.hlaska || ''), exp.hlaska);

  // ══ 2. Načtení u kolegy (prázdný archiv) ══════════════════════════
  const imp = await p.evaluate(async (balik) => {
    localStorage.clear(); archiv.length = 0; STORE.archiv = archiv;
    window.__openZpravaUid = null; window.__confirmy = []; window.__odpovedi = [];
    showScreen('home'); renderArchiv();
    zpracovatZpravuData(balik);
    await new Promise(r => setTimeout(r, 300));
    return {
      pocet: archiv.length,
      cisla: archiv.map(z => z.ev_cislo).join(','),
      dotaz: window.__confirmy[0] || '',
      stavy: archiv.map(z => z.stav || '(dok)').join(','),
      texty: archiv.map(z => (z.data || {}).zhodnoceni).join('|'),
      hlaska: window.__hlasky[window.__hlasky.length - 1],
      radku: document.querySelectorAll('#archiv-container tbody tr').length
    };
  }, exp.balik);
  check('načtení se nejdřív zeptá a řekne počet', /Nových: 2/.test(imp.dotaz), (imp.dotaz || '').replace(/\n/g, ' | '));
  check('obě zprávy jsou v archivu i s daty', imp.pocet === 2 && imp.texty === 'Text zprávy 1|Text zprávy 3', imp.cisla + ' → ' + imp.texty);
  check('pořadí ze souboru zůstalo zachované', imp.cisla === 'RE-26-0001,RE-26-0003', imp.cisla);
  check('stav dokončenosti se přenesl', imp.stavy === 'aktivni,(dok)', imp.stavy);
  check('a archiv se rovnou překreslil', imp.radku === 2, String(imp.radku));
  check('nabídne se ZPĚT', /Načteno 2 zprávy/.test(imp.hlaska || ''), imp.hlaska);

  const zpet = await p.evaluate(async () => {
    window.__toastOpts.action();
    await new Promise(r => setTimeout(r, 200));
    return { pocet: archiv.length, hlaska: window.__hlasky[window.__hlasky.length - 1] };
  });
  check('ZPĚT načtení vezme zpět', zpet.pocet === 0, zpet.pocet + ' zpráv');

  // ══ 3. Podruhé — tytéž zprávy už v archivu ════════════════════════
  const podruhe = await p.evaluate(async (balik) => {
    localStorage.clear(); archiv.length = 0; STORE.archiv = archiv;
    window.__openZpravaUid = null;
    zpracovatZpravuData(balik);
    await new Promise(r => setTimeout(r, 250));
    archiv[0].data.zhodnoceni = 'MOJE ÚPRAVA';
    window.__confirmy = []; window.__odpovedi = [true, false];   // ano načíst, ne nepřepisovat
    zpracovatZpravuData(balik);
    await new Promise(r => setTimeout(r, 250));
    const bezPrepisu = { pocet: archiv.length, text: archiv[0].data.zhodnoceni, dotaz: window.__confirmy[1] || '' };
    window.__confirmy = []; window.__odpovedi = [true, true];     // ano načíst, ano přepsat
    zpracovatZpravuData(balik);
    await new Promise(r => setTimeout(r, 250));
    return { bezPrepisu, poPrepisu: { pocet: archiv.length, text: archiv[0].data.zhodnoceni } };
  }, exp.balik);
  check('podruhé program pozná, že už je má', /2 z nich už v archivu je/.test(podruhe.bezPrepisu.dotaz),
    (podruhe.bezPrepisu.dotaz || '').replace(/\n/g, ' | '));
  check('„nechat stávající" nic nepřepíše ani nezduplikuje',
    podruhe.bezPrepisu.pocet === 2 && podruhe.bezPrepisu.text === 'MOJE ÚPRAVA',
    podruhe.bezPrepisu.pocet + ' zpráv, ' + podruhe.bezPrepisu.text);
  check('„přepsat" nahradí verzí ze souboru',
    podruhe.poPrepisu.pocet === 2 && podruhe.poPrepisu.text === 'Text zprávy 1',
    podruhe.poPrepisu.pocet + ' zpráv, ' + podruhe.poPrepisu.text);

  // ══ 4. Otevřenou zprávu import vynechá ════════════════════════════
  const otevrena = await p.evaluate(async (balik) => {
    localStorage.clear(); archiv.length = 0; STORE.archiv = archiv;
    window.__openZpravaUid = balik.zpravy[0].uid;
    window.__confirmy = []; window.__odpovedi = [true];
    zpracovatZpravuData(balik);
    await new Promise(r => setTimeout(r, 250));
    return { pocet: archiv.length, cisla: archiv.map(z => z.ev_cislo).join(','), dotaz: window.__confirmy[0] || '' };
  }, exp.balik);
  check('zprávu otevřenou ve formuláři import vynechá a řekne to',
    otevrena.pocet === 1 && otevrena.cisla === 'RE-26-0003' && /Vynechá se: 1/.test(otevrena.dotaz),
    otevrena.cisla + ' | ' + (otevrena.dotaz || '').replace(/\n/g, ' ~ '));

  // ══ 5. Dvacet jednotlivých souborů naráz ══════════════════════════
  const hromada = await p.evaluate(async () => {
    localStorage.clear(); archiv.length = 0; STORE.archiv = archiv;
    window.__openZpravaUid = null; window.__confirmy = []; window.__odpovedi = [true];
    const soubory = [];
    for (let i = 1; i <= 20; i++) soubory.push(new File(
      [JSON.stringify({ typ: 'elektro', ev_cislo: 'RE-25-00' + String(i).padStart(2, '0'),
                        misto: 'Dům ' + i, zahajeni: '2025-05-01', zhodnoceni: 'Zpráva ' + i })],
      'RZ_' + i + '.json', { type: 'application/json' }));
    soubory.push(new File(['{tohle není json'], 'rozbity.json', { type: 'application/json' }));
    importSouboryZprav(soubory);
    await new Promise(r => setTimeout(r, 900));
    return {
      pocet: archiv.length,
      dotaz: window.__confirmy[0] || '',
      stavy: [...new Set(archiv.map(z => z.stav || '(dok)'))].join(','),
      uidy: new Set(archiv.map(z => z.uid)).size,
      hlasky: window.__hlasky.slice(-3).join(' // '),
      prvni: archiv[0].ev_cislo, posledni: archiv[19].ev_cislo
    };
  });
  check('dvacet jednotlivých souborů se načte naráz', hromada.pocet === 20, hromada.pocet + ' zpráv');
  check('a pořadí souborů zůstane', hromada.prvni === 'RE-25-0001' && hromada.posledni === 'RE-25-0020',
    hromada.prvni + ' … ' + hromada.posledni);
  check('každá dostane vlastní uid', hromada.uidy === 20, String(hromada.uidy));
  check('cizí vydaná zpráva se uloží jako DOKONČENÁ, ne rozpracovaná', hromada.stavy === '(dok)', hromada.stavy);
  check('rozbitý soubor dávku neshodí a řekne se o něm', /nešlo přečíst/.test(hromada.hlasky), hromada.hlasky);

  // ══ 6. Jedna zpráva v souboru se chová jako dřív ══════════════════
  const jedna = await p.evaluate(async () => {
    localStorage.clear(); archiv.length = 0; STORE.archiv = archiv;
    window.__openZpravaUid = null; window.__confirmy = [];
    zpracovatZpravuData({ typ: 'elektro', ev_cislo: 'RE-24-0001', misto: 'Chata', zahajeni: '2024-04-04' });
    await new Promise(r => setTimeout(r, 600));
    return { obrazovka: document.querySelector('.screen.active') ? document.querySelector('.screen.active').id : '',
             pocet: archiv.length };
  });
  check('jediná zpráva se pořád otevře ve formuláři (nic se nezměnilo)',
    jedna.obrazovka === 'screen-form' && jedna.pocet === 1, jedna.obrazovka + ', ' + jedna.pocet);

  check('bez chyb stránky', chyby.length === 0, chyby.join(' | '));
  await br.close();
  console.log(res.join('\n'));
  console.log(res.every(x => x[0] === '✅') ? '\nVŠE OK (' + res.length + ')' : '\nSELHALO');
})();
