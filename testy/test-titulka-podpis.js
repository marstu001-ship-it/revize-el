// v9.82 — titulní strana se nikdy nedělí, takže jako jediná může přetéct.
// Nahlásil Jan Novák 2026-09-21: podpisová okénka uříznutá, popisky pryč.
const { chromium } = require('/opt/node22/lib/node_modules/playwright/node_modules/playwright-core');
const res = []; const check = (n, ok, d) => res.push((ok?'✅':'❌')+' '+n+(d?' — '+d:''));

(async () => {
  const br = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await br.newContext({ viewport: { width: 1400, height: 1200 } });
  await ctx.addInitScript(() => { navigator.serviceWorker.register = () => new Promise(() => {}); });
  const p = await ctx.newPage();
  const chyby = []; p.on('pageerror', e => chyby.push(e.message));
  await p.goto('http://127.0.0.1:8901/index.html', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1400);

  const zprava = (typ, plno) => p.evaluate(async (o) => {
    localStorage.clear(); archiv.length = 0; STORE.archiv = archiv;
    STORE.technik = { jmeno: 'Jan Novák', ulice: 'Zkušební 1', psc: '600 00',
      mesto: 'Nedakonice', osvedceni: '6960/26/R-EZ-E2A' };
    aktTyp = o.typ; aktPodtyp = (o.typ === 'elektro') ? 'dum' : o.typ;
    novaZprava(o.typ);
    await new Promise(r => setTimeout(r, 900));
    document.getElementById('f_misto').value = 'Hala 3 – lisovna, SO 12, areál Vzor';
    document.getElementById('f_zahajeni').value = '2026-09-21';
    document.getElementById('f_ukonceni').value = '2026-09-21';
    document.getElementById('f_predano_datum').value = '2026-09-21';
    if (o.plno) {
      document.querySelectorAll('#normy-obsah input[type=checkbox]').forEach(c => { c.checked = true; });
      // **Musí to být `f_posudek_vlastni`, ne `f_zhodnoceni`.** Do titulky jde
      // přepsání posudku z panelu tisku; `f_zhodnoceni` si program skládá sám
      // a delší text v něm výšku titulky nezmění — fixtura by nepřetékala.
      const z = document.getElementById('f_posudek_vlastni') || document.getElementById('f_zhodnoceni');
      if (z) z.value = ('Provedenou prohlídkou, měřením a zkouškami bylo zjištěno, že zařízení je schopno provozu. ').repeat(o.plno);
    }
    generujPDF();
    await new Promise(r => setTimeout(r, 2600));
  }, { typ, plno });

  const zmer = () => p.evaluate(() => {
    const str = document.querySelector('#pdf-pages .a4-titulni');
    const r = str.getBoundingClientRect();
    const pat = str.querySelector('.a4-footer').getBoundingClientRect();
    const boxy = [...str.querySelectorAll('.podp-inner')];
    const obsah = str.querySelector('.a4-content');
    return {
      pocetBoxu: boxy.length,
      popisky: [...str.querySelectorAll('.podp-lbl')].map(l => l.textContent.trim()),
      // spodek podpisového okénka nesmí přeteci pod patičku
      nejnizsi: Math.max(...boxy.map(b => b.getBoundingClientRect().bottom)),
      patickaTop: pat.top,
      spodekStrany: r.bottom,
      // popisek musí být celý VIDĚT (nenulová plocha nad patičkou)
      popiskyNadPatickou: [...str.querySelectorAll('.podp-lbl')]
        .every(l => l.getBoundingClientRect().bottom <= pat.top + 0.5),
      mer: obsah.style.transform || '(bez zmenšení)',
      sirka: obsah.getBoundingClientRect().width,
      sirkaStrany: r.width
    };
  });

  // ══ 1. Běžná zpráva — nic se nezmenšuje ═════════════════════════
  await zprava('stroje', 0);
  const a = await zmer();
  check('běžná titulka se NEZMENŠUJE', a.mer === '(bez zmenšení)', a.mer);
  check('obě podpisová okénka jsou celá nad patičkou',
    a.pocetBoxu === 2 && a.popiskyNadPatickou, a.nejnizsi.toFixed(0) + ' vs patička ' + a.patickaTop.toFixed(0));
  check('popisky jsou správné',
    a.popisky.join(' | ') === 'podpis provozovatele | podpis kontrolního technika', a.popisky.join(' | '));

  // ══ 2. Plná titulka — všechny normy + dlouhý posudek ════════════
  // Kolik odstavců posudku je třeba, aby titulka přetekla, se mění s tím,
  // co na ní je — v9.85 z ní u stroje vypadly dvě kolonky, takže šestinásobek
  // už stačil. Fixtura musí zůstat tak velká, aby zmenšování OPRAVDU nastalo.
  await zprava('stroje', 12);
  const b = await zmer();
  check('přeplněná titulka se zmenší, aby se vešla', /scale\(/.test(b.mer), b.mer);
  check('a podpisy zůstanou CELÉ nad patičkou (to je ta nahlášená chyba)',
    b.popiskyNadPatickou, 'spodek ' + b.nejnizsi.toFixed(0) + ' vs patička ' + b.patickaTop.toFixed(0));
  check('oba popisky jsou pořád vidět',
    b.popisky.join(' | ') === 'podpis provozovatele | podpis kontrolního technika', b.popisky.join(' | '));
  check('zmenšením se nezúžila šířka obsahu',
    Math.abs(b.sirka - a.sirka) < 2, b.sirka.toFixed(0) + ' vs ' + a.sirka.toFixed(0) + ' px');
  check('nic nepřeteklo pod okraj strany', b.nejnizsi <= b.spodekStrany + 0.5);

  // ══ 3. Totéž u elektro revize ═══════════════════════════════════
  await zprava('elektro', 8);
  const c = await zmer();
  check('u elektro revize to platí taky', c.popiskyNadPatickou && c.pocetBoxu === 2,
    c.mer);

  check('bez chyb stránky', chyby.length === 0, chyby.join(' | '));
  await br.close();
  console.log(res.join('\n'));
  console.log(res.every(x => x[0] === '✅') ? '\nVŠE OK (' + res.length + ')' : '\nSELHALO');
})();
