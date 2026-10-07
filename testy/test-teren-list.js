// v9.53 — měřicí list do terénu. Tabulka se všemi okruhy a PRÁZDNÝMI buňkami
// na naměřené hodnoty (přání kolegy Jana Nováka, 2026-09-15).
// Nejdůležitější kontrola: `renderTiskRows(data)` bez druhého parametru musí
// vracet bajt po bajtu totéž — jede přes ni „🖨️ Tisk měření samostatně".
const { chromium } = require('/opt/node22/lib/node_modules/playwright/node_modules/playwright-core');
const res = []; const check = (n, ok, d) => res.push((ok ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));

const VZOREK = [
  { rowtype:'obvod', c:'1', n:'Zásuvky kuchyně', typ:'EATON', ch:'B', a:'16', idn:'', isc:'1,2', zsm:'0,43', riso:'>20', rpe:'0,12', faze:'', vyp:'', cas:'', t5idn:'', ut:'', kabel:'CYKY 3×2,5' },
  { rowtype:'rcd-header', rcdGroup:'rcd-1', c:'2', n:'Chránič koupelna', typ:'OEZ', ch:'A', a:'16', idn:'30', isc:'', zsm:'0,51', riso:'>20', rpe:'0,2', faze:'A+', vyp:'18', cas:'22', t5idn:'9', ut:'0,4', kabel:'CYKY 3×1,5' },
  { rowtype:'rcd-mereni', rcdGroup:'rcd-1', c:'', n:'', typ:'', ch:'', a:'', idn:'', zsm:'', riso:'', faze:'A-', vyp:'19', cas:'24', t5idn:'8', ut:'', kabel:'' },
  { rowtype:'info', c:'3', popis:'Pojistky 3x80A SPH 00', hodnota:'do RMS2' }
];

// Kolik buněk má řádek po rozpadu na <td> (colspany se počítají podle atributu)
function sirkaRadku(html) {
  const tds = html.match(/<td[^>]*>/g) || [];
  return tds.reduce((s, t) => {
    const m = t.match(/colspan="(\d+)"/);
    return s + (m ? +m[1] : 1);
  }, 0);
}

(async () => {
  const br = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await br.newContext({ viewport: { width: 1500, height: 1000 } });
  await ctx.addInitScript(() => { navigator.serviceWorker.register = () => new Promise(() => {}); });
  const p = await ctx.newPage();
  const chyby = []; p.on('pageerror', e => chyby.push(e.message));
  await p.goto('http://127.0.0.1:8901/index.html', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1200);

  // ══ 1. renderTiskRows — beze změny bez `o`, a co dělá s `o` ══════
  const r = await p.evaluate((d) => ({
    holy: renderTiskRows(d),
    prazdne: renderTiskRows(d, { prazdne: TEREN_MERENE }),
    sedy: renderTiskRows(d, { prazdne: TEREN_MERENE, minule: { 0: { riso: '48' } } }),
    skryte: renderTiskRows(d, { prazdne: TEREN_MERENE, skryte: [6, 7] }),
    merene: TEREN_MERENE
  }), VZOREK);

  check('TEREN_MERENE neobsahuje `faze`', r.merene.indexOf('faze') === -1, r.merene.join(','));
  check('měřené sloupce jsou prázdné',
    !/>1,2</.test(r.prazdne) && !/>0,43</.test(r.prazdne) && !/>18</.test(r.prazdne) && !/>22</.test(r.prazdne),
    (r.prazdne.match(/>(1,2|0,43|18|22)</g) || []).join(' '));
  check('Riso „>20" se NEpřetiskne (program ho předvyplňuje)',
    r.prazdne.indexOf('&gt;20') === -1, (r.prazdne.match(/.{0,20}&gt;20.{0,10}/) || ['—'])[0]);
  check('předvyplněné sloupce zůstaly', /Zásuvky kuchyně/.test(r.prazdne) && /CYKY 3×2,5/.test(r.prazdne) && />EATON</.test(r.prazdne));
  check('polarity chrániče se předtisknou', />A\+</.test(r.prazdne) && />A-</.test(r.prazdne));
  check('minulá hodnota se vytiskne šedě', /color:#aaa[^>]*>48</.test(r.sedy), (r.sedy.match(/.{0,45}>48<.{0,5}/) || ['—'])[0]);

  // colspany po skrytí sloupců
  const radky = r.holy.split('</tr>').filter(x => x.trim()).map(x => x + '</tr>');
  const radkySk = r.skryte.split('</tr>').filter(x => x.trim()).map(x => x + '</tr>');
  check('bez skrývání má každý řádek 16 sloupců',
    radky.every(x => sirkaRadku(x) === 16), radky.map(sirkaRadku).join(','));
  check('po skrytí dvou sloupců má KAŽDÝ řádek 14 — i info a rcd-mereni',
    radkySk.every(x => sirkaRadku(x) === 14), radkySk.map(sirkaRadku).join(','));

  // ══ 2. ELEKTRO — list se vygeneruje ══════════════════════════════
  await p.evaluate(() => {
    localStorage.clear(); STORE.technik = { jmeno: 'M. Technik' }; archiv.length = 0; STORE.archiv = archiv;
    aktTyp = 'elektro'; aktPodtyp = 'dum'; novaZprava('elektro');
  });
  await p.waitForTimeout(600);
  await p.evaluate(() => {
    const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); } };
    set('f_ev_cislo', 'RE-26-0100'); set('f_misto', 'Rodinný dům Kyjov'); set('f_zahajeni', '2026-09-15');
    const karta = document.querySelector('#rozvadece-container [data-rozvadec-id]');
    karta.querySelector('.rozv-nazev').value = 'RD';
    karta.querySelector('.rozv-umisteni').value = 'Technická místnost';
    const tb = karta.querySelector('tbody');
    for (let i = 0; i < 24; i++) {
      addMereniRowTo(tb);
      const inp = tb.lastElementChild.querySelectorAll('input');
      inp[1].value = 'Obvod ' + (i + 1); inp[4].value = '16'; inp[15].value = 'CYKY 3×2,5';
    }
    addRozvadec();
    const k2 = document.querySelectorAll('#rozvadece-container [data-rozvadec-id]')[1];
    k2.querySelector('.rozv-nazev').value = 'RP2';
  });
  await p.waitForTimeout(400);

  await p.evaluate(() => terenOtevrit());
  await p.waitForTimeout(300);
  const dlg = await p.evaluate(() => ({
    otevreno: document.getElementById('modal-teren').classList.contains('open'),
    polozek: document.querySelectorAll('#teren-vyber .teren-ch').length,
    sloupcu: document.querySelectorAll('#teren-sloupce .teren-sl').length,
    minuleVidet: getComputedStyle(document.getElementById('teren-minule-wrap')).display !== 'none',
    text: document.getElementById('teren-vyber').innerText.replace(/\s+/g, ' ').slice(0, 60)
  }));
  check('dialog nabídne oba rozváděče', dlg.otevreno && dlg.polozek === 2, 'položek ' + dlg.polozek);
  check('dialog nabídne skrývání sloupců', dlg.sloupcu === 5, 'sloupců ' + dlg.sloupcu);
  check('volba „minulé hodnoty" je schovaná (zpráva na nic nenavazuje)', !dlg.minuleVidet);

  // jen první rozváděč
  await p.evaluate(() => {
    document.querySelectorAll('#teren-vyber .teren-ch')[1].checked = false;
    terenVytvorit();
  });
  await p.waitForTimeout(900);
  const list = await p.evaluate(() => ({
    obrazovka: (document.querySelector('.screen.active') || {}).id,
    stran: document.querySelectorAll('#teren-pdf-pages .a4').length,
    landscape: document.querySelectorAll('#teren-pdf-pages .a4.a4-landscape').length,
    text: document.getElementById('teren-pdf-pages').innerText.replace(/[ \t]+/g, ' '),
    info: document.getElementById('teren-pdf-info').textContent,
    vysky: Array.prototype.map.call(document.querySelectorAll('#teren-pdf-pages .a4'),
      p => Math.round(p.getBoundingClientRect().height / (96 / 25.4)))
  }));
  check('přepnulo se na náhled listu', list.obrazovka === 'screen-teren-pdf', list.obrazovka);
  check('list je na šířku', list.landscape === list.stran && list.stran > 0, list.stran + ' stran');
  check('respektoval výběr — RP2 na listu není', list.text.indexOf('RP2') === -1 && list.text.indexOf('RD') !== -1);
  check('hlavička má místo na datum měření i přístroj',
    /Měřeno dne/.test(list.text) && /Přístroj/.test(list.text));
  check('je tam mřížka L-PEN / f / Z / Ik', /L-PEN/.test(list.text) && /I_k/.test(list.text));
  check('stránky nepřetečou A4 na šířku (210 mm)', list.vysky.every(v => v <= 211), list.vysky.join(', '));
  check('stránkuje se (24 obvodů se na jednu stranu nevejde)', list.stran >= 2, list.stran + ' stran');
  check('info v liště sedí', /1 rozváděč/.test(list.info), list.info);

  // ══ 2b. MINULÁ REVIZE — párování přes uid rozváděče ══════════════
  // Nejrizikovější část: když se rozváděč nebo řádek nesejde, nesmí se
  // vytisknout cizí číslo — radši nic.
  const min = await p.evaluate(() => {
    localStorage.clear(); archiv.length = 0; STORE.archiv = archiv;
    const staraD = {
      typ: 'elektro',
      rozvadece: [{
        uid: 'rv-test', nazev: 'RD', mereni: [
          { rowtype: 'obvod', c: '1', n: 'Světla obývák', riso: '48', zsm: '0,31', rpe: '0,09' },
          { rowtype: 'obvod', c: '2', n: 'Zásuvky kuchyně', riso: '52', zsm: '0,44', rpe: '0,11' }
        ]
      }]
    };
    archiv.push({ uid: 'z-stara', typ: 'elektro', ev_cislo: 'RE-25-0001', misto: 'Dům',
                  datum: '2025-09-15', data: staraD, timestamp: new Date().toISOString() });
    archiv.push({ uid: 'z-nova', typ: 'elektro', ev_cislo: 'RE-26-0100', misto: 'Dům',
                  datum: '2026-09-15', predchudce_uid: 'z-stara', data: {}, timestamp: new Date().toISOString() });
    STORE.archiv = archiv;
    window.__openZpravaUid = 'z-nova';
    const maPred = !!terenPredchozi();
    // stejný rozváděč (uid sedí), jeden řádek se jménem sedí, druhý ne
    const rozvSedi = { uid: 'rv-test', nazev: 'RD', mereni: [
      { rowtype: 'obvod', c: '1', n: 'Světla obývák' },
      { rowtype: 'obvod', c: '9', n: 'Nový obvod' }
    ]};
    const rozvJiny = { uid: 'rv-jiny', nazev: 'RP2', mereni: [
      { rowtype: 'obvod', c: '1', n: 'Světla obývák' }
    ]};
    return {
      maPred: maPred,
      sedi: terenMinuleProRozvadec(rozvSedi, terenPredchozi()),
      jiny: terenMinuleProRozvadec(rozvJiny, terenPredchozi())
    };
  });
  check('navázaná zpráva svou předchůdkyni najde', min.maPred);
  check('shodný řádek dostane minulé hodnoty',
    min.sedi && min.sedi[0] && min.sedi[0].riso === '48' && min.sedi[0].zsm === '0,31',
    JSON.stringify(min.sedi && min.sedi[0]));
  check('neshodný řádek zůstane prázdný (nevytiskne cizí číslo)',
    min.sedi && !min.sedi[1], JSON.stringify(min.sedi && min.sedi[1]));
  check('jiný rozváděč (jiné uid) nedostane nic ani při shodě jmen',
    min.jiny === null, JSON.stringify(min.jiny));

  // ══ 3. STROJE ════════════════════════════════════════════════════
  await p.evaluate(() => { aktTyp = 'stroje'; novaZprava('stroje'); });
  await p.waitForTimeout(700);
  await p.evaluate(() => {
    const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); } };
    set('f_ev_cislo', 'RS-26-0001'); set('f_misto', 'Hala M4');
    const sel = document.getElementById('f_stroje_rozsah');
    sel.value = 'soubor'; sel.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await p.waitForTimeout(400);
  await p.evaluate(() => {
    document.querySelector('#stroje-container .stroj-nazev').value = 'Soustruh SU 50';
    addStroj({ nazev: 'Lis LEN 40' });
  });
  await p.waitForTimeout(400);
  await p.evaluate(() => terenOtevrit());
  await p.waitForTimeout(300);
  const dlgS = await p.evaluate(() => ({
    polozek: document.querySelectorAll('#teren-vyber .teren-ch').length,
    maMereni: !!document.getElementById('teren-s-mereni'),
    maKontroly: !!document.getElementById('teren-s-kontroly'),
    sloupceSkryte: document.getElementById('teren-sloupce-wrap').style.display === 'none'
  }));
  check('u strojů dialog nabídne oba stroje', dlgS.polozek === 2, 'položek ' + dlgS.polozek);
  check('u strojů jde vybrat měření i kontroly', dlgS.maMereni && dlgS.maKontroly);
  check('u strojů se skrývání sloupců nenabízí', dlgS.sloupceSkryte);

  await p.evaluate(() => {
    document.querySelectorAll('#teren-vyber .teren-ch')[1].checked = false;
    terenVytvorit();
  });
  await p.waitForTimeout(900);
  const listS = await p.evaluate(() => ({
    stran: document.querySelectorAll('#teren-pdf-pages .a4').length,
    landscape: document.querySelectorAll('#teren-pdf-pages .a4.a4-landscape').length,
    text: document.getElementById('teren-pdf-pages').innerText.replace(/[ \t]+/g, ' '),
    vysky: Array.prototype.map.call(document.querySelectorAll('#teren-pdf-pages .a4'),
      p => Math.round(p.getBoundingClientRect().height / (96 / 25.4)))
  }));
  check('list stroje je na výšku', listS.landscape === 0 && listS.stran > 0, listS.stran + ' stran');
  check('respektoval výběr strojů', /Soustruh SU 50/.test(listS.text) && listS.text.indexOf('Lis LEN 40') === -1);
  check('kontroly mají zaškrtávací políčko', /☐/.test(listS.text), (listS.text.match(/.{0,18}☐/) || ['—'])[0]);
  check('u kontrol je sloupec Provedeno', /Provedeno/.test(listS.text));
  check('měřené hodnoty u stroje jsou prázdné, jednotky zůstaly', /MΩ/.test(listS.text) && /Ω/.test(listS.text));
  check('stránky stroje nepřetečou A4 (297 mm)', listS.vysky.every(v => v <= 298), listS.vysky.join(', '));

  // ══ 4. NÁVRAT ════════════════════════════════════════════════════
  await p.evaluate(() => terenNahledZpet());
  await p.waitForTimeout(400);
  check('Zpět vrací do formuláře',
    (await p.evaluate(() => (document.querySelector('.screen.active') || {}).id)) === 'screen-form');

  check('bez chyb stránky', chyby.length === 0, chyby.join(' | '));
  await br.close();
  console.log(res.join('\n'));
  console.log(res.every(x => x[0] === '✅') ? '\nVŠE OK (' + res.length + ')' : '\nSELHALO');
  process.exit(res.every(x => x[0] === '✅') ? 0 : 1);
})();
