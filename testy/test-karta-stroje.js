// v9.111 — Karta stroje k zápisu v terénu: každý stroj na list na šířku,
// táž pole jako tab „2. Stroj", vyplněné se předtiskne. Vymyšlená data.
const { chromium } = require('/opt/node22/lib/node_modules/playwright/node_modules/playwright-core');
const PORT = process.env.PORT || 8901;
// Port 8920 = předchozí verze (testy/_beh/predchozi, v9.110 z gitu — staví servery.sh). NE 8905–8907 — ty si berou test-zip-kodu a test-sri.
const res = []; const check = (n, ok, d) => res.push((ok ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await br.newContext({ viewport: { width: 1400, height: 950 } });
  await ctx.addInitScript(() => { navigator.serviceWorker.register = () => new Promise(() => {}); });
  const chyby = [];
  const otevri = async (port) => { const p = await ctx.newPage(); p.on('pageerror', e => chyby.push(e.message)); p.on('dialog', d => d.accept());
    await p.goto('http://127.0.0.1:' + port + '/index.html'); await p.waitForTimeout(1500); return p; };

  // formulář stroje vypadá stejně jako v předchozí verzi (rozvržení z jedné tabulky)
  const karta = async (p) => p.evaluate(async () => { localStorage.clear(); novaZprava('stroje'); await new Promise(r => setTimeout(r, 500));
    return document.querySelector('#stroje-container [data-stroj-id]').innerHTML; });
  const stara = await otevri(process.env.PORT_STARA || 8920); const htmlStara = await karta(stara); await stara.close();
  const p = await otevri(PORT); const htmlNova = await karta(p);
  check('formulář karty stroje je beze změny (shodné HTML s v9.110)', htmlStara === htmlNova, htmlStara.length + ' / ' + htmlNova.length);

  const r = await p.evaluate(async () => {
    const g = id => document.getElementById(id); const out = {};
    g('f_rozsah_stroje') ; // nic
    const sel = g('f_stroje_rozsah'); if (sel) { sel.value = 'soubor'; sel.dispatchEvent(new Event('change', { bubbles: true })); }
    await new Promise(r => setTimeout(r, 200));
    if (document.querySelectorAll('#stroje-container [data-stroj-id]').length < 2) addStroj({});
    const karty = document.querySelectorAll('#stroje-container [data-stroj-id]');
    karty[0].querySelector('.stroj-nazev').value = 'Lis Test';
    karty[0].querySelector('.stroj-kryti').value = 'IP 54';
    karty[0].querySelector('.stroj-poznamka').value = 'štítek u dveří';
    g('f_misto').value = 'Hala T';
    terenOtevrit();
    out.volba = !!g('teren-s-karta'); out.volbaPred = g('teren-s-karta').checked;
    // výchozí: bez karty → list beze změny (žádná strana na šířku)
    terenVytvorit(); await new Promise(r => setTimeout(r, 300));
    out.bezKarty = document.querySelectorAll('#teren-pdf-pages .a4-landscape').length;
    // s kartou + 1 prázdná navíc
    terenOtevrit(); g('teren-s-karta').checked = true; g('teren-karet-navic').value = '1';
    terenVytvorit(); await new Promise(r => setTimeout(r, 300));
    const strany = Array.from(document.querySelectorAll('#teren-pdf-pages > .a4'));
    out.poradi = strany.map(s => s.classList.contains('teren-karta') ? 'K' : 'M').join('');
    const k = strany.filter(s => s.classList.contains('teren-karta'));
    out.karet = k.length;
    out.naSirku = k.every(s => s.classList.contains('a4-landscape'));
    const mm = 96 / 25.4;
    out.vejde = k.map(s => { const c = s.firstElementChild; return Math.round(s.scrollHeight / mm); });
    const pole = s => Array.from(s.querySelectorAll('.teren-karta-pole')).map(x => x.dataset.pole + '=' + x.textContent);
    out.pole1 = pole(k[0]); out.pole3 = pole(k[2]);
    out.text1 = k[0].innerText;
    out.mapa = Object.keys(STROJ_POLE_MAPA).sort().join(',');
    out.zapamatovano = STORE.teren.karta;
    // jen karta, bez měření a kontrol
    terenOtevrit(); g('teren-s-mereni').checked = false; g('teren-s-kontroly').checked = false;
    terenVytvorit(); await new Promise(r => setTimeout(r, 300));
    out.jenKarta = Array.from(document.querySelectorAll('#teren-pdf-pages > .a4')).map(s => s.classList.contains('teren-karta') ? 'K' : 'M').join('');
    out.info = g('teren-pdf-info').textContent;
    return out;
  });
  check('v dialogu je volba karty, výchozí vypnutá', r.volba && r.volbaPred === false);
  check('bez karty se list nemění (žádný list na šířku)', r.bezKarty === 0, String(r.bezKarty));
  check('každý stroj: karta, za ní jeho měření; + prázdná karta na konci', /^KM+KM+K$/.test(r.poradi), r.poradi);
  check('karty jsou na šířku', r.karet === 3 && r.naSirku);
  check('karta se vejde na jeden list (≤ 210 mm)', r.vejde.every(h => h <= 210), r.vejde.join(','));
  check('karta má všechna pole stroje (jako tab 2. Stroj)', r.pole1.map(x => x.split('=')[0]).sort().join(',') === r.mapa, r.pole1.length + ' polí');
  check('vyplněné se předtiskne', r.pole1.includes('stroj-nazev=Lis Test') && r.pole1.includes('stroj-kryti=IP 54') && r.pole1.includes('stroj-poznamka=štítek u dveří'));
  check('nevyplněné zůstane prázdné okénko', r.pole1.includes('stroj-vyrobce=') && r.pole1.includes('stroj-rok='));
  check('prázdná karta navíc je celá prázdná', r.pole3.length === r.pole1.length && r.pole3.every(x => /=$/.test(x)));
  check('karta nese místo a popisky polí', /Hala T/.test(r.text1) && /Předřazené jištění/i.test(r.text1) && /Zapsáno dne/i.test(r.text1));
  check('volba karty se pamatuje', r.zapamatovano === true);
  check('jen karta (bez měření a kontrol) = jen karty, info správně česky', r.jenKarta === 'KK' && /2 stroje · 2 strany/.test(r.info), r.jenKarta + ' · ' + r.info);
  // Excel: karta i v sešitu (v9.112)
  const xl = await p.evaluate(async () => {
    const g = id => document.getElementById(id);
    terenOtevrit(); g('teren-s-karta').checked = true; g('teren-s-mereni').checked = true; g('teren-s-kontroly').checked = true;
    g('teren-karet-navic').value = '2'; terenVytvorit(); await new Promise(r => setTimeout(r, 300));
    const blob = await xlsxVytvor(terenExcelListy(getData(), window.__terenVyber));
    const b = new Uint8Array(await blob.arrayBuffer()); let s = ''; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    // a bez karty: list stroje kartu nemá
    const bez = terenExcelListy(getData(), Object.assign({}, window.__terenVyber, { karta: false, kartNavic: 0 }));
    return { b64: btoa(s), bezKarty: bez.length + '|' + JSON.stringify(bez[0].radky).indexOf('Karta stroje') };
  });
  require('fs').writeFileSync(__dirname + '/_beh/out-karta.xlsx', Buffer.from(xl.b64, 'base64'));
  let py = '';
  try {
    py = require('child_process').execSync(`python3 -c "
import openpyxl
wb = openpyxl.load_workbook('${__dirname}/_beh/out-karta.xlsx')
print('LISTY=' + '|'.join(wb.sheetnames))
ws = wb.worksheets[0]
vals = [[c.value for c in r] for r in ws.iter_rows()]
flat = [x for r in vals for x in r if x is not None]
print('KARTA=' + str('Karta stroje — údaj' in flat))
print('NAZEV=' + str(any(r[0]=='Název stroje' and r[1]=='Lis Test' for r in vals)))
print('KRYTI=' + str(any(r[0]=='Krytí (IP)' and r[1]=='IP 54' for r in vals)))
print('MERENI=' + str(any(isinstance(x,str) and x.startswith('Měření') for x in flat)))
ws3 = wb.worksheets[-1]
v3 = [[c.value for c in r] for r in ws3.iter_rows()]
print('PRAZDNA=' + str(any(r[0]=='Výrobce' and r[1] in (None,'') for r in v3)))
"`, { encoding: 'utf8' });
  } catch (e) { py = 'CHYBA ' + e.message; }
  const m = k => ((py.match(new RegExp(k + '=(.*)')) || [])[1] || '').trim();
  check('Excel: sešit se otevře a má list za stroj + list za každou prázdnou kartu', /Prázdná karta 1\|Prázdná karta 2$/.test(m('LISTY')) && m('LISTY').split('|').length === 4, m('LISTY') || py.slice(0, 200));
  check('Excel: list stroje začíná kartou s vyplněnými údaji', m('KARTA') === 'True' && m('NAZEV') === 'True' && m('KRYTI') === 'True');
  check('Excel: měření zůstalo pod kartou', m('MERENI') === 'True');
  check('Excel: prázdná karta má prázdné hodnoty', m('PRAZDNA') === 'True');
  check('Excel: bez volby karty se sešit nemění', /\|-1$/.test(xl.bezKarty), xl.bezKarty);
  if (process.env.SNIMEK) { const el = await p.$('#teren-pdf-pages .teren-karta'); await el.screenshot({ path: __dirname + '/_beh/karta-stroje.png' }); }
  check('bez chyb v konzoli', chyby.length === 0, chyby.slice(0, 3).join(' | '));
  await br.close(); res.forEach(x => console.log(x));
  process.exit(res.some(x => x.startsWith('❌')) ? 1 : 0);
})();
