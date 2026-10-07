// v9.51 — datace norem u strojů. ČSN EN 60204-1 má v ČR čtyři verze, ne dvě;
// stroj z roku 2004 spadá pod vydání 03/2000 (dotaz uživatele 2026-09-15).
// Ověřeno u ČAS / normy.biz. Test hlídá, že se ta datace zase nerozjede.
const { chromium } = require('/opt/node22/lib/node_modules/playwright/node_modules/playwright-core');
const res = []; const check = (n, ok, d) => res.push((ok ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));

// Jediné místo pravdy testu: co se ověřilo u zdroje.
const OCEKAVANE = {
  'csn60204str':      { t: /ed\.3/,             od: 'od 02/2019',       platna: true },
  'csn60204e2str':    { t: /ed\.2/,             od: '06/2007 – 09/2021', platna: false },
  'csn60204v2000str': { t: /vyd\. 03\/2000/,    od: '03/2000 – 06/2009', platna: false },
  'csn60204v1995str': { t: /vyd\. 10\/1995/,    od: '10/1995 – 04/2000', platna: false },
  'csn13849str':      { t: /13849-1 ed\.2/,     od: 'od 09/2024',       platna: true },
  'csn13850str':      { t: /^ČSN EN ISO 13850 —/, od: 'od 01/2017',     platna: true },
  'csn12100str':      { t: /ISO 12100/,         od: 'od 06/2011',       platna: true },
  'nv378str':         { t: /378\/2001/,         od: 'od 01/2003',       platna: true },
  'csn332000641str':  { t: /4-41 ed\.3/,        od: 'od 02/2018',       platna: true },
};

(async () => {
  const br = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await br.newContext({ viewport: { width: 1400, height: 1000 } });
  await ctx.addInitScript(() => { navigator.serviceWorker.register = () => new Promise(() => {}); });
  const p = await ctx.newPage();
  const chyby = []; p.on('pageerror', e => chyby.push(e.message));
  await p.goto('http://127.0.0.1:8901/index.html', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1200);
  await p.evaluate(() => {
    localStorage.clear(); STORE.technik = { jmeno: 'M. Š' }; archiv.length = 0;
    aktTyp = 'stroje'; novaZprava('stroje');
  });
  await p.waitForTimeout(500);

  const seznam = await p.evaluate(() => {
    const out = {};
    document.querySelectorAll('#normy-obsah .norma-radek').forEach(r => {
      const ch = r.querySelector('input[type=checkbox]');
      out[ch.id.replace(/^n-/, '')] = {
        nazev: r.querySelector('.norma-nazev').textContent,
        od: (r.querySelector('.norma-platnost') || {}).textContent || '',
        zaskrtnuto: ch.checked,
        neplatna: r.classList.contains('neplatna')
      };
    });
    return out;
  });

  Object.keys(OCEKAVANE).forEach(id => {
    const chci = OCEKAVANE[id], je = seznam[id];
    check('je v seznamu: ' + id, !!je);
    if (!je) return;
    check(id + ' — název', chci.t.test(je.nazev), je.nazev);
    check(id + ' — datace', je.od === chci.od, 'je „' + je.od + '", čekáno „' + chci.od + '"');
    check(id + ' — ' + (chci.platna ? 'platná' : 'označená jako NEPLATNÁ'),
      je.neplatna === !chci.platna, je.neplatna ? 'neplatná' : 'platná');
  });

  // Čtyři verze 60204-1 musí jít za sebou bez díry a nepřekrývat se
  const rady = ['csn60204v1995str', 'csn60204v2000str', 'csn60204e2str', 'csn60204str']
    .map(id => (seznam[id] || {}).od || '');
  // Verze se PŘEKRÝVAJÍ (souběžná platnost) — 1995 dojela 04/2000, ale
  // nástupkyně vyšla už 03/2000. Kontroluje se jen, že jdou chronologicky
  // a že žádná nechybí.
  const mesic = (x) => { const m = x.match(/(\d{2})\/(\d{4})/); return +m[2] * 12 + +m[1]; };
  check('verze 60204-1 jdou chronologicky za sebou',
    mesic(rady[0]) < mesic(rady[1]) && mesic(rady[1]) < mesic(rady[2]) && mesic(rady[2]) < mesic(rady[3]),
    rady.join('  →  '));
  check('1995 platila do 04/2000 (zrušena 1. 4. 2000)', /– 04\/2000$/.test(rady[0]), rady[0]);
  check('stroj z roku 2004 má v seznamu svou verzi',
    /03\/2000 – 06\/2009/.test((seznam['csn60204v2000str'] || {}).od || ''),
    (seznam['csn60204v2000str'] || {}).nazev);
  check('žádná ze starých verzí není předškrtnutá',
    ['csn60204e2str', 'csn60204v2000str', 'csn60204v1995str'].every(id => !seznam[id].zaskrtnuto));
  check('platná ed.3 předškrtnutá zůstala', seznam['csn60204str'].zaskrtnuto);

  // Stará verze se dá zakliknout a vytiskne se i s datací v názvu
  const pdf = await p.evaluate(async () => {
    const ch = document.getElementById('n-csn60204v2000str');
    ch.checked = true; ch.dispatchEvent(new Event('change', { bubbles: true }));
    const set = (id, x) => { const e = document.getElementById(id); if (e) { e.value = x; e.dispatchEvent(new Event('input', { bubbles: true })); } };
    set('f_ev_cislo', 'RS-1'); set('f_misto', 'Hala'); set('f_zahajeni', '2026-09-15');
    set('f_ukonceni', '2026-09-15'); set('f_vypracovani', '2026-09-15');
    generujPDF();
    await new Promise(r => setTimeout(r, 1700));
    return Array.from(document.querySelectorAll('#pdf-pages .a4')).map(s => s.textContent.replace(/\s+/g, ' ')).join(' ');
  });
  check('zakliknutá starší verze se dostane do PDF',
    /ČSN EN 60204-1 \(vyd\. 03\/2000\)/.test(pdf),
    (pdf.match(/ČSN EN 60204-1[^—]{0,22}/g) || []).join(' | '));

  check('bez chyb stránky', chyby.length === 0, chyby.join(' | '));
  await br.close();
  console.log(res.join('\n'));
  console.log(res.every(r => r[0] === '✅') ? '\nVŠE OK (' + res.length + ')' : '\nSELHALO');
  process.exit(res.every(r => r[0] === '✅') ? 0 : 1);
})();
