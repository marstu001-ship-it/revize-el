// v9.97 — dialog „Napájí tento jistič rozváděč?": zaškrtávátko a název v jednom řádku vlevo.
const { chromium } = require('/opt/node22/lib/node_modules/playwright/node_modules/playwright-core');
const postav = require('./schema-fixt.js');
const res = []; const check = (n, ok, d) => res.push((ok?'✅':'❌')+' '+n+(d?' — '+d:''));
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
  const err = []; p.on('pageerror', e => err.push(e.message));
  await p.addInitScript(() => { try { navigator.serviceWorker.register = () => new Promise(() => {}); } catch (e) {} });
  await p.goto('http://127.0.0.1:' + (process.env.PORT||8901) + '/index.html', { waitUntil: 'load' });
  await p.waitForTimeout(800);
  await postav(p);
  await p.evaluate(() => { switchTab('mereni'); });
  const r = await p.evaluate(async () => {
    const karta = document.querySelectorAll('#rozvadece-container [data-rozvadec-id]')[18]; // RS11
    const tr = karta.querySelector('tbody tr[data-rowtype="obvod"]');
    const btn = tr.querySelector('[data-action="stromPriradit"]');
    btn.click();
    await new Promise(r => setTimeout(r, 200));
    const radky = Array.from(document.querySelectorAll('#napaji-vyber label'));
    const box = document.getElementById('napaji-vyber').getBoundingClientRect();
    return radky.slice(0, 8).map(l => {
      const cb = l.querySelector('input').getBoundingClientRect();
      const n = l.querySelector('strong');
      const nr = n.getBoundingClientRect();
      return { cbX: cb.left - box.left, cbW: cb.width, nX: nr.left - box.left, nH: nr.height,
               lH: l.getBoundingClientRect().height, text: n.textContent,
               tt: getComputedStyle(l).textTransform, um: (l.querySelector('.tm') || {}).textContent || '' };
    });
  });
  check('zaškrtávátko je vlevo a malé', r.every(x => x.cbX < 20 && x.cbW < 24), JSON.stringify(r[0]));
  check('název stojí hned za zaškrtávátkem', r.every(x => x.nX < 45), r.map(x => Math.round(x.nX)).join(','));
  check('název se nezalomil na dva řádky', r.every(x => x.nH < 24), r.map(x => Math.round(x.nH)).join(','));
  check('název není převedený na VELKÁ PÍSMENA', r.every(x => x.tt === 'none'), r[0].tt);
  check('u rozváděče je vidět umístění', r.some(x => /Rozvodna|Chodba|Schodiště/.test(x.um)), r.map(x => x.um).join(' | '));
  await p.locator('#modal-napaji .modal').screenshot({ path: __dirname + '/_beh/napaji-dialog.png' });
  check('bez chyb stránky', err.length === 0, err.join(' | '));
  console.log(res.join('\n'));
  await b.close();
  process.exit(res.some(r => r.startsWith('❌')) ? 1 : 0);
})().catch(e => { console.error('CRASH:', e.message); process.exit(2); });
