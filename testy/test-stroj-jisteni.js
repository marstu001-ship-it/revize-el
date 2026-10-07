// v9.48 — nové kolonky u stroje: hlavní jištění, předřazené jištění,
// napětí řídicích obvodů, napájeno z rozváděče, přívodní kabel.
// Doplněno dle vzoru od kolegy (pokyn uživatele 2026-09-15).
const { chromium } = require('/opt/node22/lib/node_modules/playwright/node_modules/playwright-core');
const res = []; const check = (n, ok, d) => res.push((ok ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));
const POLE = ['stroj-jisteni-typ', 'stroj-jisteni-proud', 'stroj-predjisteni-typ',
              'stroj-predjisteni-proud', 'stroj-ridici-napeti', 'stroj-napajeno-z', 'stroj-privodni-kabel'];

(async () => {
  const br = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await br.newContext({ viewport: { width: 1400, height: 1000 } });
  await ctx.addInitScript(() => { navigator.serviceWorker.register = () => new Promise(() => {}); });
  const p = await ctx.newPage();
  const chyby = []; p.on('pageerror', e => chyby.push(e.message));
  await p.goto('http://127.0.0.1:8901/index.html', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1200);

  await p.evaluate(() => {
    localStorage.clear(); STORE.technik = { jmeno: 'M. Technik' }; archiv.length = 0; STORE.archiv = archiv;
    aktTyp = 'stroje'; novaZprava('stroje');
  });
  await p.waitForTimeout(500);

  // 1) pole existují a jsou na titulní straně (režim „jeden stroj")
  const naTitulce = await p.evaluate((POLE) => {
    const blok = document.getElementById('stroje-blok');
    const host = document.getElementById('stroje-titulka-host');
    return {
      vTitulce: !!(host && host.contains(blok)),
      chybi: POLE.filter(c => !document.querySelector('#stroje-container .' + c)),
      popisky: POLE.map(c => {
        const i = document.querySelector('#stroje-container .' + c);
        return i && i.closest('.f') ? i.closest('.f').querySelector('label').textContent.trim() : '(chybí)';
      }),
      datalisty: POLE.map(c => (document.querySelector('#stroje-container .' + c) || {}).getAttribute
        ? document.querySelector('#stroje-container .' + c).getAttribute('list') : null)
    };
  }, POLE);
  check('všech 7 kolonek je na kartě stroje', naTitulce.chybi.length === 0, naTitulce.chybi.join(','));
  check('blok stroje sedí na titulní straně', naTitulce.vTitulce);
  check('popisky odpovídají vzoru',
    /Hlavní jištění stroje/.test(naTitulce.popisky[0]) &&
    /Předřazené jištění/.test(naTitulce.popisky[2]) &&
    /Napětí řídicích obvodů/.test(naTitulce.popisky[4]),
    naTitulce.popisky.join(' | '));
  check('proudové hodnoty mají nápovědu dl_proud_A',
    naTitulce.datalisty[1] === 'dl_proud_A' && naTitulce.datalisty[3] === 'dl_proud_A',
    JSON.stringify(naTitulce.datalisty));

  // 2) vyplnit → uložit → načíst z archivu
  const HODNOTY = {
    'stroj-nazev': 'Soustruh SU 50', 'stroj-jisteni-typ': 'jistič', 'stroj-jisteni-proud': '3×16',
    'stroj-predjisteni-typ': 'jistič', 'stroj-predjisteni-proud': '25',
    'stroj-ridici-napeti': '24 V DC (oddělovací transformátor)',
    'stroj-napajeno-z': 'RS 232.2', 'stroj-privodni-kabel': 'CYKY 5C × 4 mm²'
  };
  await p.evaluate((H) => {
    Object.keys(H).forEach(c => {
      const i = document.querySelector('#stroje-container .' + c);
      if (i) { i.value = H[c]; i.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    ['f_ev_cislo', 'f_misto'].forEach((id, n) => {
      const e = document.getElementById(id); e.value = n ? 'Hala A' : 'RS-26-0001';
      e.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }, HODNOTY);
  await p.waitForTimeout(250);

  const data = await p.evaluate(() => getData().stroje.seznam[0]);
  check('data nesou nové klíče',
    data.jisteni_typ === 'jistič' && data.jisteni_proud === '3×16' &&
    data.predjisteni_typ === 'jistič' && data.predjisteni_proud === '25' &&
    data.ridici_napeti.indexOf('24 V DC') === 0 &&
    data.napajeno_z === 'RS 232.2' && data.privodni_kabel === 'CYKY 5C × 4 mm²',
    JSON.stringify({ j: data.jisteni_proud, pj: data.predjisteni_proud, k: data.privodni_kabel }));

  await p.evaluate(() => { saveToArchiv(); });
  await p.waitForTimeout(400);
  await p.evaluate(() => { novaZprava('stroje'); });
  await p.waitForTimeout(400);
  await p.evaluate(() => { otevritZpravu(0); });
  await p.waitForTimeout(700);
  const poNacteni = await p.evaluate((POLE) => POLE.map(c => {
    const i = document.querySelector('#stroje-container .' + c); return i ? i.value : null;
  }), POLE);
  check('po načtení z archivu jsou hodnoty zpátky',
    poNacteni[0] === 'jistič' && poNacteni[1] === '3×16' && poNacteni[4].indexOf('24 V DC') === 0 &&
    poNacteni[6] === 'CYKY 5C × 4 mm²', JSON.stringify(poNacteni));

  // 3) PDF — jeden stroj: titulní strana
  await p.evaluate(() => { generujPDF(); });
  await p.waitForTimeout(1600);
  const pdf = await p.evaluate(() => document.querySelector('#pdf-pages').innerText.replace(/\s+/g, ' '));
  check('PDF: hlavní jištění s jednotkou', /hlavní jištění stroje jistič 3×16 A/i.test(pdf),
    (pdf.match(/hlavní jištění stroje[^·]{0,30}/i) || ['—'])[0]);
  check('PDF: předřazené jištění', /předřazené jištění přívodu jistič 25 A/i.test(pdf),
    (pdf.match(/předřazené jištění[^·]{0,30}/i) || ['—'])[0]);
  check('PDF: napětí řídicích obvodů', /napětí řídicích obvodů 24 V DC/i.test(pdf));
  check('PDF: napájeno z rozváděče', /napájeno z rozváděče RS 232\.2/i.test(pdf));
  check('PDF: přívodní kabel', /přívodní kabel CYKY 5C × 4 mm²/i.test(pdf));
  check('PDF: žádné „A A"', !/\d\s?A A\b/.test(pdf), (pdf.match(/.{0,20}A A.{0,10}/) || ['—'])[0]);

  // 4) prázdné kolonky se netisknou
  await p.evaluate(() => {
    ['stroj-jisteni-typ', 'stroj-jisteni-proud', 'stroj-ridici-napeti', 'stroj-napajeno-z', 'stroj-privodni-kabel']
      .forEach(c => { const i = document.querySelector('#stroje-container .' + c); i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true })); });
    generujPDF();
  });
  await p.waitForTimeout(1600);
  const pdf2 = await p.evaluate(() => document.querySelector('#pdf-pages').innerText.replace(/\s+/g, ' '));
  check('prázdná kolonka se do PDF nedostane',
    !/hlavní jištění/i.test(pdf2) && !/přívodní kabel/i.test(pdf2) && /předřazené jištění/i.test(pdf2),
    (pdf2.match(/hlavní jištění.{0,20}/i) || ['nic (správně)'])[0]);

  // 5) soubor strojů — podkapitola
  await p.evaluate(() => {
    document.getElementById('f_stroje_rozsah').value = 'soubor';
    document.getElementById('f_stroje_rozsah').dispatchEvent(new Event('change', { bubbles: true }));
  });
  await p.waitForTimeout(400);
  await p.evaluate(() => {
    addStroj({ nazev: 'Lis LEN 40', jisteni_typ: 'pojistka', jisteni_proud: '3×63', privodni_kabel: 'CYKY 4B×16' });
    generujPDF();
  });
  await p.waitForTimeout(1800);
  const pdf3 = await p.evaluate(() => document.querySelector('#pdf-pages').innerText.replace(/\s+/g, ' '));
  check('soubor strojů: údaje v podkapitole',
    /hlavní jištění stroje: pojistka 3×63 A/i.test(pdf3) && /přívodní kabel: CYKY 4B×16/i.test(pdf3),
    (pdf3.match(/hlavní jištění stroje:.{0,25}/i) || ['—'])[0]);

  check('bez chyb stránky', chyby.length === 0, chyby.join(' | '));
  await br.close();
  console.log(res.join('\n'));
  console.log(res.every(r => r[0] === '✅') ? '\nVŠE OK (' + res.length + ')' : '\nSELHALO');
  process.exit(res.every(r => r[0] === '✅') ? 0 : 1);
})();
