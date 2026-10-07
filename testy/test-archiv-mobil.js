// v9.102 — zaškrtávátka hromadného výběru v archivu i v zobrazení Mobil a na úzkém okně.
const { chromium } = require('/opt/node22/lib/node_modules/playwright/node_modules/playwright-core');
const PORT = process.env.PORT || 8901;
const res = []; const check = (n, ok, d) => res.push((ok?'✅':'❌')+' '+n+(d?' — '+d:''));
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const err = [];
  async function stav(sirka, mobil) {
    const p = await b.newPage({ viewport: { width: sirka, height: 900 } });
    p.on('pageerror', e => err.push(e.message));
    await p.addInitScript(() => { try { navigator.serviceWorker.register = () => new Promise(() => {}); } catch (e) {} });
    await p.goto('http://127.0.0.1:' + PORT + '/index.html', { waitUntil: 'load' });
    await p.waitForTimeout(700);
    const r = await p.evaluate((mobil) => {
      localStorage.clear(); archiv.length = 0;
      ['RE-26-0001', 'RE-26-0002', 'RS-26-0003'].forEach((ev, i) => archiv.push({ uid: 'u' + i, ev_cislo: ev, misto: 'Místo ' + i, datum: '2026-09-0' + (i + 1), typ: i === 2 ? 'stroje' : 'elektro', stav: '', data: {} }));
      STORE.archiv = archiv;
      document.documentElement.classList.toggle('view-mobile', mobil);
      showScreen('home'); renderArchiv();
      const t = document.querySelector('#screen-home .archiv-table');
      const vid = el => el && el.offsetParent !== null && getComputedStyle(el).display !== 'none';
      const radek = t.querySelector('tbody tr');
      const hl = Array.from(t.querySelectorAll('thead th')).filter(vid).length;
      const bu = Array.from(radek.children).filter(vid).length;
      return { cb: t.querySelectorAll('tbody .archiv-check').length, cbVid: Array.from(t.querySelectorAll('.archiv-check')).filter(vid).length,
               poradi: Array.from(t.querySelectorAll('.archiv-poradi')).filter(vid).length, hl, bu };
    }, mobil);
    await p.close();
    return r;
  }
  const pc = await stav(1300, false);
  check('PC: zaškrtávátka jsou u všech zpráv i v hlavičce', pc.cbVid === 4, JSON.stringify(pc));
  check('PC: pořadové číslo je vidět', pc.poradi > 0);
  const mob = await stav(1300, true);
  check('zobrazení Mobil: zaškrtávátka zůstala', mob.cbVid === 4, JSON.stringify(mob));
  check('zobrazení Mobil: schová se jen pořadové číslo', mob.poradi === 0);
  check('zobrazení Mobil: hlavička a řádky mají stejně sloupců', mob.hl === mob.bu, mob.hl + ' / ' + mob.bu);
  const uzk = await stav(600, false);
  check('úzké okno: zaškrtávátka zůstala', uzk.cbVid === 4, JSON.stringify(uzk));
  check('úzké okno: schová se jen pořadové číslo, sloupce sedí', uzk.poradi === 0 && uzk.hl === uzk.bu, JSON.stringify(uzk));
  // odběratelé: v Mobil se dál schovává jejich pořadové číslo
  const p = await b.newPage({ viewport: { width: 1300, height: 900 } });
  await p.addInitScript(() => { try { navigator.serviceWorker.register = () => new Promise(() => {}); } catch (e) {} });
  await p.goto('http://127.0.0.1:' + PORT + '/index.html', { waitUntil: 'load' }); await p.waitForTimeout(700);
  const od = await p.evaluate(() => {
    odberatele.length = 0; odberatele.push({ id: 'o1', nazev: 'Firma s.r.o.', ico: '12345678' }); STORE.odberatele = odberatele;
    document.documentElement.classList.add('view-mobile'); showScreen('home');
    if (typeof renderOdberatele === 'function') renderOdberatele();
    const t = Array.from(document.querySelectorAll('.archiv-table')).find(x => /Název \/ firma/.test(x.textContent));
    if (!t) return null;
    const vid = el => getComputedStyle(el).display !== 'none';
    return { th1: t.querySelector('thead th').textContent, vid1: vid(t.querySelector('thead th')),
             hl: Array.from(t.querySelectorAll('thead th')).filter(vid).length, bu: Array.from(t.querySelector('tbody tr').children).filter(vid).length };
  });
  check('odběratelé v Mobil: pořadové číslo schované, sloupce sedí', od && !od.vid1 && od.hl === od.bu, JSON.stringify(od));
  check('bez chyb stránky', err.length === 0, err.join(' | '));
  console.log(res.join('\n'));
  await b.close();
  process.exit(res.some(r => r.startsWith('❌')) ? 1 : 0);
})().catch(e => { console.error('CRASH:', e.message); process.exit(2); });
