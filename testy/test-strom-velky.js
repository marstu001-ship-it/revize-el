// v9.105 — schéma „Zapojení rozváděčů" vyšší než list. Převod cizí zprávy
// (32 provázaných rozváděčů) dal schéma na 2,5 listu, které nešlo rozdělit,
// a stránkování se na něm zaseklo: dalších 31 rozváděčů skončilo na JEDNÉ
// straně vysoké 29 000 px. Data jsou vymyšlená (repo je veřejné).
const { chromium } = require('/opt/node22/lib/node_modules/playwright/node_modules/playwright-core');
const PORT = process.env.PORT || 8901;
const res = []; const check = (n, ok, d) => res.push((ok ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));

function zprava(V, pocet, vetveni) {
  const D = JSON.parse(JSON.stringify(V));
  const r0 = V.rozvadece[0], m0 = r0.mereni[0];
  D.rozvadece = [];
  for (let i = 0; i < pocet; i++) {
    const mer = [];
    for (let k = 0; k < 3; k++) mer.push(Object.assign({}, m0, { c: String(k + 1), n: 'obvod ' + (k + 1), ch: 'B', a: '16', napaji: [], napajiNazev: [] }));
    for (let d = 1; d <= vetveni; d++) {
      const cil = i * vetveni + d;
      if (cil < pocet) mer.push(Object.assign({}, m0, { c: String(mer.length + 1), n: 'vývod RT' + cil, ch: 'B', a: '25', kabel: 'CYKY 5×4', napaji: ['u' + cil], napajiNazev: [] }));
    }
    D.rozvadece.push(Object.assign({}, r0, { uid: 'u' + i, nazev: 'RT' + i, umisteni: 'místnost ' + (100 + i), privod: i ? '' : 'CYKY 5×25 z hlavní rozvodny', mereni: mer }));
  }
  D.ev_cislo = 'TEST-STROM-' + pocet;
  D.rozvStrom = { zapnuto: true, sbaleno: false };
  return D;
}

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const err = [];
  async function stranka() {
    const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
    p.on('pageerror', e => err.push(e.message));
    p.on('dialog', d => d.accept());
    await p.addInitScript(() => { try { navigator.serviceWorker.register = () => new Promise(() => {}); } catch (e) {} });
    await p.goto('http://127.0.0.1:' + PORT + '/index.html', { waitUntil: 'load' });
    await p.waitForTimeout(700);
    return p;
  }
  async function vykresli(p, D) {
    await p.evaluate(async (D) => { zpracovatZpravuData(D); await new Promise(r => setTimeout(r, 400)); generujPDF(); }, D);
    // počkat, až se počet stran ustálí
    let pred = -1;
    for (let i = 0; i < 60; i++) {
      await p.waitForTimeout(500);
      const n = await p.evaluate(() => document.querySelectorAll('#pdf-pages .a4').length);
      if (n === pred && n > 0) break; pred = n;
    }
    return p.evaluate(() => {
      const mm = 96 / 25.4;
      const listy = Array.from(document.querySelectorAll('#pdf-pages .a4'));
      const pretece = listy.filter(a => a.getBoundingClientRect().height > (a.classList.contains('a4-landscape') ? 210 : 297) * mm + 2)
        .map(a => Math.round(a.getBoundingClientRect().height));
      const bloky = Array.from(document.querySelectorAll('#pdf-pages .pdf-strom'));
      const nazvyStrom = bloky.flatMap(bl => Array.from(bl.querySelectorAll('.pdf-strom-radek')).map(r => (r.querySelector('span[style*="font-weight:bold"]') || {}).textContent));
      const radky = stromZDat(getData());
      const text = document.getElementById('pdf-pages').innerText;
      const mereni = (text.match(/MĚŘENÍ: RT\d+/gi) || []).map(s => s.toUpperCase());
      const prvniLand = document.querySelector('#pdf-pages .a4-landscape');
      return {
        stran: listy.length, pretece,
        bloku: bloky.length, pokracovani: bloky.filter(bl => /pokračování/.test(bl.textContent)).length,
        nazvyStrom, poradi: radky.map(r => r.rozv.nazev),
        mereni: Array.from(new Set(mereni)).length,
        prvniMaStromIRozv: !!(prvniLand && prvniLand.querySelector('.pdf-strom') && prvniLand.querySelector('[data-rozv]')),
        cestaPrvni: bloky[1] ? (bloky[1].querySelector('.pdf-strom-radek') || {}).getAttribute?.('data-cesta') : null,
        carPokr: bloky[1] ? bloky[1].querySelector('.pdf-strom-radek span[style*="position:absolute"]') !== null : null
      };
    });
  }

  const p = await stranka();
  const V = await p.evaluate(() => { novaZprava('elektro'); return getData(); });

  // ── velký areál: 40 rozváděčů, každý napájí tři další ──
  const velky = await vykresli(p, zprava(V, 40, 3));
  check('velké schéma: žádný list nepřetéká', velky.pretece.length === 0, velky.pretece.slice(0, 5).join(', ') + ' px; stran ' + velky.stran);
  check('velké schéma: rozdělené na víc listů', velky.bloku >= 2, velky.bloku + ' bloků');
  check('pokračování má nadpis „pokračování"', velky.pokracovani === velky.bloku - 1, velky.pokracovani + '/' + (velky.bloku - 1));
  check('každý rozváděč je ve schématu právě jednou', velky.nazvyStrom.length === 40 && new Set(velky.nazvyStrom).size === 40, velky.nazvyStrom.length);
  check('pořadí ve schématu přes listy sedí se stromem', JSON.stringify(velky.nazvyStrom) === JSON.stringify(velky.poradi));
  check('pokračující řádek nese cestu předků', !!velky.cestaPrvni && /RT0/.test(velky.cestaPrvni), velky.cestaPrvni);
  check('na pokračování navazují čáry', velky.carPokr === true);
  check('všech 40 tabulek měření je v PDF', velky.mereni === 40, velky.mereni);

  // ── malý strom: chová se jako dřív ──
  const p2 = await stranka();
  const maly = await vykresli(p2, zprava(V, 3, 2));
  check('malé schéma: jeden blok bez pokračování', maly.bloku === 1 && maly.pokracovani === 0, maly.bloku + '/' + maly.pokracovani);
  check('malé schéma: na prvním listu měření je schéma i první rozváděč (beze změny)', maly.prvniMaStromIRozv);
  check('malé schéma: nic nepřetéká', maly.pretece.length === 0);

  check('bez chyb v konzoli', err.length === 0, err.slice(0, 3).join(' | '));
  await b.close();
  res.forEach(r => console.log(r));
  process.exit(res.some(r => r.startsWith('❌')) ? 1 : 0);
})();
