// v9.108 — program otevřený ve DVOU oknech (karta v Chromu + stažená aplikace).
// Do v9.107 drželo každé okno celá data v paměti a saveStore() zapisovalo
// všechno naráz, takže starší okno při uložení přepsalo novější změny z druhého
// (hlášení uživatele 2026-10-05, paketovací lis: termín ve zprávě byl, plán
// hlásil „chybí termín" a po uložení lhůty termín z dat zmizel). Vymyšlená data.
const { chromium } = require('/opt/node22/lib/node_modules/playwright/node_modules/playwright-core');
const PORT = process.env.PORT || 8901;
const res = []; const check = (n, ok, d) => res.push((ok ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));

(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await br.newContext({ viewport: { width: 1400, height: 900 } });
  await ctx.addInitScript(() => { navigator.serviceWorker.register = () => new Promise(() => {}); });
  const url = 'http://127.0.0.1:' + PORT + '/index.html';
  const chyby = [];
  const okno = async () => { const p = await ctx.newPage(); p.on('pageerror', e => chyby.push(e.message));
    p.on('dialog', d => d.accept()); await p.goto(url); await p.waitForTimeout(1500); return p; };

  // ── výchozí stav: jedna zpráva o stroji BEZ termínu ──
  const A = await okno();
  await A.evaluate(() => {
    archiv.length = 0;
    archiv.push({ uid: 'z1', typ: 'stroje', ev_cislo: 'RS-26-9001', misto: '', datum: '2026-10-05',
      data: { typ: 'stroje', ev_cislo: 'RS-26-9001', pristi: '', stroje: { rozsah: 'jeden',
        seznam: [{ nazev: 'Lis Test', umisteni: 'Hala T', mereni: [], kontroly: [] }] } } });
    STORE.archiv = archiv; STORE.plan = {}; saveStore();
  });
  await A.waitForTimeout(400);

  // Okno A má otevřený plán — svítí „chybí termín"
  await A.evaluate(() => { otevritPlan(); });
  const stitekRadku = () => Array.from(document.querySelectorAll('#screen-plan tbody tr')).some(t => /Lis Test/.test(t.textContent) && t.querySelector('.plan-chybi-stitek'));
  const predA = await A.evaluate(stitekRadku);
  check('výchozí stav: plán v okně A hlásí chybějící termín', predA);

  // ── okno B (stažená aplikace): technik doplní termín a uloží ──
  const B = await okno();
  await B.evaluate(() => { archiv[0].data.pristi = '2028-10-05'; STORE.archiv = archiv; saveStore(); });
  await A.waitForTimeout(900);
  const poB = await A.evaluate(() => ({ pristi: archiv[0].data.pristi,
    stitek: Array.from(document.querySelectorAll('#screen-plan tbody tr')).some(t => /Lis Test/.test(t.textContent) && t.querySelector('.plan-chybi-stitek')),
    roky: (planRadky()[0] || { roky: {} }) }));
  check('okno A se samo dozví o termínu uloženém v okně B', poB.pristi === '2028-10-05', poB.pristi);
  check('otevřený plán v okně A se překreslí a varování zmizí', poB.stitek === false);

  // ── okno A teď uloží plán (lhůta u objektu) — NESMÍ přepsat termín z B ──
  await A.evaluate(() => { const r = planRadky()[0]; const o = planZajistitObjekt(r.id); o.cyklus = { T: 2 }; planUlozit(); });
  await A.waitForTimeout(600);
  const C = await okno();
  const poRestartu = await C.evaluate(() => ({ pristi: archiv[0] && archiv[0].data.pristi,
    cyklus: JSON.stringify(((planData().objekty || [])[0] || {}).cyklus || {}) }));
  check('po restartu je termín z okna B pořád v datech', poRestartu.pristi === '2028-10-05', poRestartu.pristi);
  check('…a lhůta uložená v okně A taky', poRestartu.cyklus === '{"T":2}', poRestartu.cyklus);
  await C.close();

  // ── opačný směr: B založí zprávu, A přidá odběratele ──
  await B.evaluate(() => { archiv.unshift({ uid: 'z2', typ: 'elektro', ev_cislo: 'RE-26-9002', misto: 'Dům T', datum: '2026-10-05',
    data: { typ: 'elektro', ev_cislo: 'RE-26-9002', misto: 'Dům T', pristi: '2031-10-05' } }); STORE.archiv = archiv; saveStore(); });
  await A.waitForTimeout(700);
  const archivA = await A.evaluate(() => ({ pocet: archiv.length,
    radek: Array.from(document.querySelectorAll('#archiv-tbody tr, #archiv-table tbody tr')).some(t => /RE-26-9002/.test(t.textContent)) }));
  check('nová zpráva z okna B je v archivu okna A', archivA.pocet === 2, archivA.pocet + ' zpráv');
  await A.evaluate(() => { odberatele.push({ id: 'o1', nazev: 'Odběratel T' }); STORE.odberatele = odberatele; saveStore(); });
  await A.waitForTimeout(600);
  const D = await okno();
  const oba = await D.evaluate(() => ({ zprav: archiv.length, odb: (STORE.odberatele || []).length }));
  check('po restartu: obě zprávy i odběratel', oba.zprav === 2 && oba.odb === 1, JSON.stringify(oba));
  await D.close();

  // ── rozepsaná zpráva v okně A synchronizace nesmaže ──
  await A.evaluate(async () => { showScreen('home'); novaZprava('elektro'); await new Promise(r => setTimeout(r, 600));
    document.getElementById('f_ev_cislo').value = 'RE-26-9999';
    document.getElementById('f_misto').value = 'Rozepsaná budova';
    document.getElementById('f_misto').dispatchEvent(new Event('input', { bubbles: true })); });
  await B.evaluate(() => { archiv[0].data.misto = 'Dům T – změna'; STORE.archiv = archiv; saveStore(); });
  await A.waitForTimeout(800);
  const rozepsana = await A.evaluate(() => ({ ev: document.getElementById('f_ev_cislo').value,
    misto: document.getElementById('f_misto').value, dirty: !!window.__formDirty,
    form: document.getElementById('screen-form').classList.contains('active') }));
  check('rozepsaná zpráva v okně A zůstala beze změny', rozepsana.ev === 'RE-26-9999' && rozepsana.misto === 'Rozepsaná budova' && rozepsana.form,
    JSON.stringify(rozepsana));
  check('…a pořád je označená jako neuložená', rozepsana.dirty === true);

  // ── okno samo sebe znovu nenačítá ──
  const vlastni = await A.evaluate(async () => { let n = 0; const puv = window.loadStore; window.loadStore = function() { n++; return puv.apply(this, arguments); };
    STORE.technik = STORE.technik || {}; saveStore(); await new Promise(r => setTimeout(r, 700)); window.loadStore = puv; return n; });
  check('okno po vlastním uložení data znovu nenačítá', vlastni === 0, vlastni + '×');

  check('bez chyb v konzoli', chyby.length === 0, chyby.slice(0, 3).join(' | '));
  await br.close();
  res.forEach(x => console.log(x));
  process.exit(res.some(x => x.startsWith('❌')) ? 1 : 0);
})();
