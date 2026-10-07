// v9.114 — Táž ZPRÁVA otevřená ve dvou oknech. Hlášení uživatele 2026-10-07:
// u paketovacího lisu termín příští kontroly ve zprávě vidět byl, plán přesto
// hlásil „chybí termín". Druhé okno drželo zprávu bez termínu ve formuláři
// a náhledem PDF ji uložilo znovu — termín z archivu zmizel, ale v prvním okně
// ho formulář dál ukazoval. Vymyšlená data.
const { chromium } = require('/opt/node22/lib/node_modules/playwright/node_modules/playwright-core');
const PORT = process.env.PORT || 8901;
const res = []; const check = (n, ok, d) => res.push((ok ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await br.newContext({ viewport: { width: 1400, height: 950 } });
  await ctx.addInitScript(() => { navigator.serviceWorker.register = () => new Promise(() => {}); });
  const chyby = []; const dotazy = { A: [], B: [] }; let odpovedB = true;
  const okno = async (jm) => { const p = await ctx.newPage(); p.on('pageerror', e => chyby.push(e.message));
    p.on('dialog', d => { dotazy[jm].push(d.message()); (jm === 'B' && d.type() === 'confirm' && !odpovedB) ? d.dismiss() : d.accept(); });
    await p.goto('http://127.0.0.1:' + PORT + '/index.html'); await p.waitForTimeout(1500); return p; };
  const A = await okno('A');
  await A.evaluate(() => { archiv.length = 0; archiv.push({ uid: 'lis1', typ: 'stroje', ev_cislo: 'RS-26-9028', misto: 'Hala T', datum: '2026-10-05', stav: 'aktivni', timestamp: '2026-10-05T08:00:00.000Z',
    data: { typ: 'stroje', ev_cislo: 'RS-26-9028', misto: 'Hala T', ukonceni: '2026-10-05', pristi: '', stroje: { rozsah: 'jeden', spolu: true, seznam: [{ nazev: 'Lis T', umisteni: 'Hala T', mereni: [], kontroly: [] }] } } });
    STORE.archiv = archiv; saveStore(); });
  await A.waitForTimeout(400);
  const B = await okno('B');
  const otevrit = async (P, tab) => P.evaluate(async (tab) => { otevritZpravu(0); await new Promise(r => setTimeout(r, 700));
    if (tab) { const b = aktivniTabBar().querySelector('.tab-btn[data-tab="' + tab + '"]'); if (b) switchTab(tab, b); } }, tab);
  const pristiA = async (hodnota) => A.evaluate(async (h) => { const fp = document.getElementById('f_pristi'); fp.value = h; fp.dispatchEvent(new Event('input', { bubbles: true })); saveToArchiv(); }, hodnota);
  const tabB = () => B.evaluate(() => { const a = aktivniTabBar().querySelector('.tab-btn.active'); return a && a.getAttribute('data-tab'); });

  // 1) B má zprávu otevřenou (bez úprav), A doplní termín a uloží
  await otevrit(B, 'stroje-mereni'); const tabPred = await tabB();
  await otevrit(A);
  await pristiA('2028-10-05');
  await B.waitForTimeout(900);
  const b1 = await B.evaluate(() => ({ form: document.getElementById('f_pristi').value, dirty: !!window.__formDirty }));
  check('okno B se samo načte znovu — formulář ukazuje termín z okna A', b1.form === '2028-10-05', b1.form);
  check('…a zůstane na stejné záložce', (await tabB()) === tabPred, tabPred + ' → ' + (await tabB()));
  check('…a zpráva není označená jako neuložená', b1.dirty === false);
  // 2) B vygeneruje náhled PDF — nesmí nic přepsat
  await B.evaluate(async () => { generujPDFAsk(); await new Promise(r => setTimeout(r, 1500)); });
  await A.waitForTimeout(800);
  const a2 = await A.evaluate(() => ({ data: archiv[0].data.pristi, chybi: (planRadky().find(r => r.nazev === 'Lis T') || {}).bezTerminu }));
  check('náhled PDF v okně B termín z archivu nesmaže', a2.data === '2028-10-05', a2.data);
  check('plán v okně A nehlásí „chybí termín"', a2.chybi && a2.chybi.length === 0, JSON.stringify(a2.chybi));

  // 3) Pojistka v uložení: okno B propásne ohlášení (starší formulář) a uloží
  await B.evaluate(async () => { await new Promise(r => setTimeout(r, 300)); window.__openZpravaVerze = 'starsi-verze'; saveToArchiv(); });
  const b3 = await B.evaluate(() => ({ data: archiv[0].data.pristi, form: document.getElementById('f_pristi').value }));
  check('pojistka: neupravený starší formulář zprávu nepřepíše, jen se načte znovu', b3.data === '2028-10-05' && b3.form === '2028-10-05', JSON.stringify(b3));

  // 4) B má NEULOŽENÉ úpravy a A mezitím uloží — B se zeptá
  await B.evaluate(() => { const p = document.getElementById('f_misto'); p.value = 'Hala T – upraveno v B'; p.dispatchEvent(new Event('input', { bubbles: true })); });
  await pristiA('2029-01-01');
  await B.waitForTimeout(900);
  const b4 = await B.evaluate(() => ({ misto: document.getElementById('f_misto').value, dirty: !!window.__formDirty,
    toast: Array.from(document.querySelectorAll('[class*="toast"], #toast')).map(e => e.textContent).join(' | ') }));
  check('rozepsané změny v okně B se při synchronizaci nezahodí', b4.misto === 'Hala T – upraveno v B' && b4.dirty);
  check('…a okno B upozorní, že zprávu změnilo jiné okno', /Než ji tady uložíte/.test(b4.toast), b4.toast.slice(0, 80));
  odpovedB = false;  // „Zrušit" = ponechat verzi z okna A
  dotazy.B.length = 0;
  const b5 = await B.evaluate(() => { const v = saveToArchiv(); return { v, data: archiv[0].data.pristi, misto: archiv[0].data.misto, form: document.getElementById('f_pristi').value }; });
  check('při uložení v okně B se program zeptá, kterou verzi ponechat', dotazy.B.some(x => /JINÉM OKNĚ/.test(x)), dotazy.B.join(' | ').slice(0, 80));
  check('„Zrušit" = verze z okna A zůstane, formulář B ji ukáže', b5.data === '2029-01-01' && b5.misto === 'Hala T' && b5.form === '2029-01-01', JSON.stringify(b5));
  // 5) OK = přepsat
  odpovedB = true;
  await B.evaluate(() => { const p = document.getElementById('f_misto'); p.value = 'Hala T – B vyhrává'; p.dispatchEvent(new Event('input', { bubbles: true })); });
  await pristiA('2030-02-02');
  await B.waitForTimeout(900);
  const b6 = await B.evaluate(() => { saveToArchiv(); return { misto: archiv[0].data.misto }; });
  check('„OK" = verze z okna B se uloží', b6.misto === 'Hala T – B vyhrává', b6.misto);

  // 6) Jedno okno: opakované ukládání se na nic neptá
  dotazy.A.length = 0;
  await A.waitForTimeout(900);
  await A.evaluate(async () => { otevritZpravu(0); await new Promise(r => setTimeout(r, 600));
    for (let i = 0; i < 3; i++) { const p = document.getElementById('f_misto'); p.value = 'Hala T ' + i; p.dispatchEvent(new Event('input', { bubbles: true })); saveToArchiv(); await new Promise(r => setTimeout(r, 50)); } });
  check('v jednom okně se opakované uložení na nic neptá', !dotazy.A.some(x => /JINÉM OKNĚ/.test(x)), dotazy.A.join(' | ').slice(0, 80));
  // 7) dokončená zpráva zůstane po znovunačtení jen pro čtení
  await A.evaluate(() => { archiv[0].stav = ''; STORE.archiv = archiv; saveStore(); });
  await B.waitForTimeout(600);
  await otevrit(B);
  await A.evaluate(async () => { archiv[0].timestamp = new Date().toISOString(); archiv[0].data.pristi = '2031-03-03'; STORE.archiv = archiv; saveStore(); });
  await B.waitForTimeout(900);
  const b7 = await B.evaluate(() => ({ form: document.getElementById('f_pristi').value, ro: !!window.__formReadOnly }));
  check('dokončená zpráva se načte znovu a zůstane jen pro čtení', b7.form === '2031-03-03' && b7.ro, JSON.stringify(b7));
  check('bez chyb v konzoli', chyby.length === 0, chyby.slice(0, 3).join(' | '));
  await br.close(); res.forEach(x => console.log(x));
  process.exit(res.some(x => x.startsWith('❌')) ? 1 : 0);
})();
