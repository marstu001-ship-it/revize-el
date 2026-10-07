// v9.106 — „🖨️ Tisk měření samostatně" tiskne i přehledové schéma zapojení
// rozváděčů (pokyn uživatele 2026-10-01: „když si dám tisk měření samostatně,
// tak tam není to přehledové schéma zapojení rozváděčů"). Vymyšlená data.
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
  const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
  p.on('pageerror', e => err.push(e.message));
  p.on('dialog', d => d.accept());
  await p.addInitScript(() => { try { navigator.serviceWorker.register = () => new Promise(() => {}); } catch (e) {} });
  await p.goto('http://127.0.0.1:' + PORT + '/index.html', { waitUntil: 'load' });
  await p.waitForTimeout(700);
  const V = await p.evaluate(() => { novaZprava('elektro'); return getData(); });

  async function tisk(D) {
    await p.evaluate(async (D) => { zpracovatZpravuData(D); await new Promise(r => setTimeout(r, 400)); }, D);
    const [okno] = await Promise.all([p.waitForEvent('popup'), p.evaluate(() => { tiskMereni(); })]);
    await okno.waitForLoadState();
    await okno.evaluate(() => { window.print = () => {}; });
    const r = await okno.evaluate(() => ({
      text: document.body.innerText,
      bloku: document.querySelectorAll('.pdf-strom').length,
      radku: document.querySelectorAll('.pdf-strom-radek').length,
      nazvy: Array.from(document.querySelectorAll('.pdf-strom-radek')).map(r => (r.querySelector('span[style*="font-weight:bold"]') || {}).textContent),
      cary: document.querySelectorAll('.pdf-strom-radek span[style*="position:absolute"]').length,
      stromPred: (() => { const s = document.querySelector('.pdf-strom'), m = document.querySelector('.sec'); return !!(s && m && (s.compareDocumentPosition(m) & Node.DOCUMENT_POSITION_FOLLOWING)); })(),
      sekci: document.querySelectorAll('.sec').length
    }));
    return { r, okno };
  }

  const s = await tisk(zprava(V, 7, 2));
  check('schéma je v tisku měření', s.r.bloku === 1 && /Zapojení rozváděčů/.test(s.r.text));
  check('všech 7 rozváděčů ve schématu', s.r.radku === 7 && new Set(s.r.nazvy).size === 7, s.r.nazvy.join(','));
  check('schéma má čáry kabelů', s.r.cary > 0, s.r.cary);
  check('schéma stojí před tabulkami měření', s.r.stromPred);
  check('všech 7 tabulek měření zůstalo', s.r.sekci === 7, s.r.sekci);
  await s.okno.screenshot({ path: __dirname + '/_beh/tisk-mereni-strom.png', fullPage: true });
  await s.okno.close();

  const D0 = zprava(V, 3, 2);
  D0.rozvadece.forEach(r => r.mereni.forEach(m => { m.napaji = []; }));
  D0.ev_cislo = 'TEST-BEZ-VAZEB';
  const b0 = await tisk(D0);
  check('bez provázaných rozváděčů se schéma netiskne', b0.r.bloku === 0 && !/Zapojení rozváděčů/.test(b0.r.text));
  check('bez vazeb: tabulky měření beze změny', b0.r.sekci === 3, b0.r.sekci);
  await b0.okno.close();

  check('bez chyb v konzoli', err.length === 0, err.slice(0, 3).join(' | '));
  await b.close();
  res.forEach(r => console.log(r));
  process.exit(res.some(r => r.startsWith('❌')) ? 1 : 0);
})();
