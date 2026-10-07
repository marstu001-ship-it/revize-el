// v9.50 — u KONTROLY stroje nemají co dělat normy o REVIZÍCH vyhrazených
// zařízení (pokyn uživatele 2026-09-15). Tři místa: celkový posudek,
// výchozí zaškrtnutí norem, citace pod nadpisem + odůvodnění lhůty.
// Elektro a LPS se nesmí dotknout — tam je NV 190/2022 i ČSN 33 1500 správně.
const { chromium } = require('/opt/node22/lib/node_modules/playwright/node_modules/playwright-core');
const res = []; const check = (n, ok, d) => res.push((ok ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));

(async () => {
  const br = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await br.newContext({ viewport: { width: 1400, height: 1000 } });
  await ctx.addInitScript(() => { navigator.serviceWorker.register = () => new Promise(() => {}); });
  const p = await ctx.newPage();
  const chyby = []; p.on('pageerror', e => chyby.push(e.message));
  await p.goto('http://127.0.0.1:8901/index.html', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1200);

  const zaloz = async (typ, podtyp) => {
    await p.evaluate(({ typ, podtyp }) => {
      localStorage.clear(); STORE.technik = { jmeno: 'M. Technik' }; archiv.length = 0; STORE.archiv = archiv;
      aktTyp = typ; aktPodtyp = podtyp; novaZprava(typ);
    }, { typ, podtyp });
    await p.waitForTimeout(500);
  };
  const pdfText = () => p.evaluate(async () => {
    const set = (id, x) => { const e = document.getElementById(id); if (e) { e.value = x; e.dispatchEvent(new Event('input', { bubbles: true })); } };
    set('f_ev_cislo', 'X-1'); set('f_misto', 'Objekt'); set('f_zahajeni', '2026-01-03');
    set('f_ukonceni', '2026-01-03'); set('f_vypracovani', '2026-01-08'); set('f_celkovy_vysledek', 'schopno');
    generujPDF();
    await new Promise(r => setTimeout(r, 1700));
    return Array.from(document.querySelectorAll('#pdf-pages .a4'))
      .map(s => s.textContent.replace(/\s+/g, ' ')).join(' ');
  });

  // ══ 1. CELKOVÝ POSUDEK ═══════════════════════════════════════════
  await zaloz('stroje', 'stroje');
  for (const [vysl, jmeno] of [['schopno', 'schopno'], ['neschopno', 'neschopno']]) {
    const t = await p.evaluate((v) => {
      document.getElementById('f_celkovy_vysledek').value = v;
      magicZaver();
      return document.getElementById('f_zhodnoceni').value;
    }, vysl);
    check('posudek (' + jmeno + ') začíná „Kontrola byla provedena"',
      /^Kontrola byla provedena/.test(t), t.slice(0, 70));
    check('posudek (' + jmeno + ') necituje ČSN 33 1500', t.indexOf('33 1500') === -1,
      (t.match(/.{0,40}33 1500.{0,20}/) || ['—'])[0]);
    check('posudek (' + jmeno + ') necituje NV 190/2022', t.indexOf('190/2022') === -1,
      (t.match(/.{0,50}190\/2022.{0,20}/) || ['—'])[0]);
    check('posudek (' + jmeno + ') stojí na NV 378/2001', t.indexOf('378/2001') !== -1);
    check('posudek (' + jmeno + ') nikde neříká „revize"', !/revi[zs]/i.test(t),
      (t.match(/.{0,30}[Rr]evi[zs].{0,25}/) || ['—'])[0]);
  }
  // Knihovna typických textů musí říkat totéž co magic tlačítko
  const knihovna = await p.evaluate(() => TYPY_TEXTU.f_zhodnoceni
    .filter(t => /^Stroj /.test(t.nazev)).map(t => t.text));
  check('knihovna textů: obě varianty stroje', knihovna.length === 2, 'nalezeno ' + knihovna.length);
  check('knihovna textů říká totéž co magic tlačítko',
    knihovna.every(t => /^Kontrola byla provedena/.test(t) && !/revi[zs]/i.test(t)),
    knihovna.map(t => t.slice(0, 40)).join(' | '));

  // ══ 2. VÝCHOZÍ ZAŠKRTNUTÍ NOREM ══════════════════════════════════
  const norm = await p.evaluate(() => {
    const st = {};
    document.querySelectorAll('#normy-obsah input[type=checkbox]').forEach(c => {
      st[c.id] = { zaskrtnuto: c.checked, nazev: c.parentNode.querySelector('.norma-nazev').textContent };
    });
    return st;
  });
  check('ČSN 33 1500 už není předškrtnutá', norm['n-csn331500str'] && !norm['n-csn331500str'].zaskrtnuto);
  check('NV 190/2022 už není předškrtnuté', norm['n-nv190str'] && !norm['n-nv190str'].zaskrtnuto);
  check('obě v seznamu ZŮSTALY, jdou zaklikat',
    !!norm['n-csn331500str'] && !!norm['n-nv190str'],
    Object.keys(norm).length + ' norem v seznamu');
  check('název ČSN 33 1500 se nezměnil',
    (norm['n-csn331500str'] || {}).nazev === 'ČSN 33 1500 (Z1–Z4) — Revize elektrických zařízení',
    (norm['n-csn331500str'] || {}).nazev);
  check('NV 378/2001 zaškrtnuté zůstalo', norm['n-nv378str'] && norm['n-nv378str'].zaskrtnuto);
  check('ČSN EN 60204-1 ed.3 zaškrtnutá zůstala', norm['n-csn60204str'] && norm['n-csn60204str'].zaskrtnuto);

  // ══ 3. CITACE POD NADPISEM + LHŮTA ═══════════════════════════════
  const sPdf = await pdfText();
  check('PDF: citace pod nadpisem stojí na NV 378/2001',
    /Kontrola provedena v souladu s NV č\. 378\/2001 Sb\., ČSN EN 60204-1 ed\.3, ČSN 33 2000-4-41 ed\.3/.test(sPdf),
    (sPdf.match(/Kontrola provedena[^Z]{0,90}/) || ['—'])[0]);
  check('PDF: seznam norem neobsahuje ČSN 33 1500', sPdf.indexOf('33 1500') === -1,
    (sPdf.match(/.{0,40}33 1500.{0,20}/) || ['—'])[0]);
  check('PDF: seznam norem neobsahuje NV 190/2022', sPdf.indexOf('190/2022') === -1,
    (sPdf.match(/.{0,40}190\/2022.{0,20}/) || ['—'])[0]);

  const pozn = await p.evaluate(() => {
    const el = document.querySelector('[data-term-pozn="f-pristi-pozn"]');
    return el ? el.textContent.trim() : null;
  });
  check('poznámka u termínu příští kontroly míří na NV 378/2001',
    pozn === 'dle NV 378/2001 Sb. § 4 a ČSN EN 60204-1 ed.3', pozn);

  const lhuta = await p.evaluate(() => {
    document.getElementById('m_datum') || otevritRevizeModal();
    const d = document.getElementById('m_datum'); d.value = '2026-09-15';
    potvrditRevize();
    return document.getElementById('f_lhuta').value;
  });
  check('odůvodnění lhůty míří na NV 378/2001', /dle NV č\. 378\/2001 Sb\. a ČSN EN 60204-1 ed\.3/.test(lhuta), lhuta);
  check('odůvodnění lhůty už necituje 33 1500 ani 190/2022',
    lhuta.indexOf('33 1500') === -1 && lhuta.indexOf('190/2022') === -1, lhuta);

  // ══ ELEKTRO A LPS SE NESMĚLY ZMĚNIT ══════════════════════════════
  for (const [typ, podtyp] of [['elektro', 'dum'], ['lps', 'dum']]) {
    await zaloz(typ, podtyp);
    const t = await pdfText();
    check(typ + ': citace pod nadpisem pořád jede přes zákon 250/2021',
      /Revize provedena v souladu se zákonem č\. 250\/2021 Sb\., NV č\. 190\/2022 Sb\./.test(t),
      (t.match(/Revize provedena[^Č]{0,70}/) || ['—'])[0]);
    const pz = await p.evaluate(() => {
      const el = document.querySelector('[data-term-pozn="f-pristi-pozn"]');
      return el ? el.textContent.trim() : null;
    });
    check(typ + ': poznámka u termínu zůstala revizní',
      pz === 'dle ČSN 33 1500 č.3.9 + NV 190/2022 příloha č.4', pz);
  }
  const eZaver = await p.evaluate(() => {
    aktTyp = 'elektro'; aktPodtyp = 'dum'; novaZprava('elektro');
    document.getElementById('f_celkovy_vysledek').value = 'schopno';
    magicZaver();
    return document.getElementById('f_zhodnoceni').value;
  });
  // Větu „Podpisem převzetí zprávy o revizi…" mají elektro i stroj — u stroje
  // se měnila, u elektro musela zůstat.
  check('elektro posudek pořád mluví o revizi',
    /revi[zs]/i.test(eZaver) && eZaver.indexOf('zprávy o revizi') !== -1,
    (eZaver.match(/.{0,25}zprávy o \w+.{0,15}/) || ['—'])[0]);

  // ══ Kolonky, které u stroje nemají co dělat (v9.85) ══════════
  // Obojí bydlí v kartě `scard-vtez`, kterou má zpráva o stroji schovanou —
  // technik je neměl kde vyplnit a v PDF zůstávaly prázdné.
  const kolonky = await p.evaluate(async (typ) => {
    aktTyp = typ; aktPodtyp = typ === 'elektro' ? 'dum' : typ;
    novaZprava(typ);
    await new Promise(r => setTimeout(r, 800));
    document.getElementById('f_misto').value = 'Kuchyně';
    const vtez = document.getElementById('scard-vtez');
    generujPDF();
    await new Promise(r => setTimeout(r, 2500));
    const popisky = [...document.querySelectorAll('#pdf-pages .a4-titulni .pbox-label')]
      .map(x => x.textContent.trim());
    return { popisky, kartaVidet: !!(vtez && vtez.offsetParent) };
  }, 'stroje');
  check('u stroje se karta se „Zdrojem" a „Ochranou" vůbec nenabízí',
    !kolonky.kartaVidet);
  check('a proto se ani netisknou — „Zdroj el. proudu" na titulce není',
    kolonky.popisky.indexOf('Zdroj el. proudu:') === -1, kolonky.popisky.join(' | '));
  check('ani „Ochrana před úrazem"',
    kolonky.popisky.indexOf('Ochrana před úrazem:') === -1);
  check('„Síť", „Použité normy" a datum na titulce ZŮSTALY',
    ['Síť:', 'Použité normy:', 'Datum kontroly:']
      .every(function (x) { return kolonky.popisky.indexOf(x) >= 0; }),
    kolonky.popisky.join(' | '));

  const elektroKolonky = await p.evaluate(async () => {
    aktTyp = 'elektro'; aktPodtyp = 'dum'; novaZprava('elektro');
    await new Promise(r => setTimeout(r, 800));
    document.getElementById('f_misto').value = 'Rodinný dům';
    generujPDF();
    await new Promise(r => setTimeout(r, 2500));
    return [...document.querySelectorAll('#pdf-pages .a4-titulni .pbox-label')]
      .map(x => x.textContent.trim());
  });
  check('u ELEKTRO revize obě kolonky zůstávají — tam patří',
    elektroKolonky.indexOf('Zdroj el. proudu:') >= 0 &&
    elektroKolonky.indexOf('Ochrana před úrazem:') >= 0,
    elektroKolonky.join(' | '));

  check('bez chyb stránky', chyby.length === 0, chyby.join(' | '));
  await br.close();
  console.log(res.join('\n'));
  console.log(res.every(r => r[0] === '✅') ? '\nVŠE OK (' + res.length + ')' : '\nSELHALO');
  process.exit(res.every(r => r[0] === '✅') ? 0 : 1);
})();
