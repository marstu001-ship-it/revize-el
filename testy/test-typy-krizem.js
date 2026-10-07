// v9.104 — PLOŠNÁ POJISTKA proti celé třídě chyb „na obrazovce je něco z jiného
// typu zprávy" (v9.75, v9.81, v9.103). Každý typ zprávy se otevře KAŽDOU cestou
// (nová, z archivu, Navázat, ⧉ kopie, koncept po restartu) PO KAŽDÉM jiném typu
// a obrazovka musí vypadat na chlup stejně jako u čerstvé zprávy téhož typu
// v čisté stránce. Porovnává se, co je VIDĚT: nadpisy karet na každé záložce.
const { chromium } = require('/opt/node22/lib/node_modules/playwright/node_modules/playwright-core');
const PORT = process.env.PORT || 8901;
const res = []; const check = (n, ok, d) => res.push((ok?'✅':'❌')+' '+n+(d?' — '+d:''));
const TYPY = [['elektro','dum'], ['elektro','prumysl'], ['lps','lps'], ['stroje','dum'], ['spotrebice','dum']];
const nazev = t => t[0] + (t[0] === 'elektro' ? '/' + t[1] : '');

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
  // Co je na každé záložce vidět: nadpisy karet (bez čísel a proměnlivých částí).
  const podpis = (p) => p.evaluate(async () => {
    showScreen('form');
    const bar = aktivniTabBar();
    const btns = bar ? Array.from(bar.querySelectorAll('.tab-btn')).filter(x => x.offsetParent !== null) : [];
    const out = [];
    for (const bt of btns) {
      switchTab(bt.getAttribute('data-tab'), bt);
      await new Promise(r => setTimeout(r, 30));
      const panel = document.querySelector('.tab-panel.active');
      const tit = panel ? Array.from(panel.querySelectorAll('.scard-title')).filter(x => x.offsetParent !== null)
        .map(x => x.textContent.replace(/\s+/g, ' ').replace(/\d+/g, '#').trim().slice(0, 45)) : [];
      out.push(bt.getAttribute('data-tab') + ': ' + tit.join(' | '));
    }
    const bl = document.getElementById('stroje-blok');
    out.push('stroj-blok-na-titulce=' + !!(document.getElementById('stroje-titulka-host') || {}).contains?.(bl));
    return { typ: aktTyp, podtyp: aktPodtyp, lista: bar ? bar.id : '-', podpis: out };
  });
  async function zalozit(p, t, misto) {
    await p.evaluate(async ([typ, pt, misto]) => {
      aktPodtyp = pt; novaZprava(typ);
      await new Promise(r => setTimeout(r, 250));
      const m = document.getElementById('f_misto'); if (m) m.value = misto;
      // Každá zpráva vlastní číslo — elektro a LPS jinak dostanou obě
      // RE-26-0001 a uložení se zeptá na přepsání.
      const ev = document.getElementById('f_ev_cislo'); if (ev) ev.value = 'TEST-' + misto + '-' + typ;
      window.__formDirty = false; saveToArchiv();
      window.__testUid = window.__testUid || {};
      const z = archiv.find(z => z.uid === window.__openZpravaUid) || archiv[0];
      window.__testUid[misto] = z && z.uid;
    }, [t[0], t[1], misto]);
  }
  const otevrit = (p, misto) => p.evaluate(async (misto) => {
    const i = archiv.findIndex(z => z.uid === window.__testUid[misto]);
    otevritZpravu(i); await new Promise(r => setTimeout(r, 500));
  }, misto);

  // 1) vzor: čerstvá zpráva každého typu v čisté stránce
  const vzor = {};
  for (const t of TYPY) {
    const p = await stranka();
    await p.evaluate(() => { localStorage.clear(); archiv.length = 0; STORE.archiv = archiv; });
    await zalozit(p, t, 'VZOR');
    vzor[nazev(t)] = await podpis(p);
    await p.close();
  }
  const rozdil = (a, v) => {
    if (a.typ !== v.typ || a.lista !== v.lista) return 'typ/lišta ' + a.typ + '/' + a.lista + ' ≠ ' + v.typ + '/' + v.lista;
    for (let i = 0; i < Math.max(a.podpis.length, v.podpis.length); i++)
      if (a.podpis[i] !== v.podpis[i]) return 'je „' + (a.podpis[i] || '∅') + '"  má být „' + (v.podpis[i] || '∅') + '"';
    return '';
  };

  // 2) každý typ po každém jiném typu, všemi cestami
  const p = await stranka();
  let chyb = 0, kombinaci = 0;
  for (const pred of TYPY) for (const t of TYPY) {
    if (nazev(pred) === nazev(t)) continue;
    await p.evaluate(() => { localStorage.clear(); archiv.length = 0; STORE.archiv = archiv; window.__testUid = {}; });
    await zalozit(p, t, 'CIL');                 // cílová zpráva v archivu
    await zalozit(p, pred, 'PRED');             // předchozí zpráva jiného typu
    const cesty = {
      'nová':      async () => { await otevrit(p, 'PRED'); await p.evaluate(async ([typ, pt]) => { aktPodtyp = pt; novaZprava(typ); await new Promise(r => setTimeout(r, 300)); }, t); },
      'z archivu': async () => { await otevrit(p, 'PRED'); await otevrit(p, 'CIL'); },
      'Navázat':   async () => { await otevrit(p, 'PRED'); await p.evaluate(async () => { navazatZpravu(archiv.findIndex(z => z.uid === window.__testUid.CIL)); await new Promise(r => setTimeout(r, 600)); }); },
      '⧉ kopie':   async () => { await otevrit(p, 'PRED'); await p.evaluate(async () => { formArchivKopirovat(window.__testUid.CIL); await new Promise(r => setTimeout(r, 600)); }); }
    };
    for (const [cesta, jdi] of Object.entries(cesty)) {
      kombinaci++;
      await jdi();
      const s = await podpis(p);
      const r = rozdil(s, vzor[nazev(t)]);
      if (r) { chyb++; check(nazev(pred) + ' → ' + nazev(t) + ' (' + cesta + ')', false, r); }
    }
  }
  check('všechny kombinace typ × předchozí typ × cesta vypadají jako čerstvá zpráva', chyb === 0, kombinaci + ' kombinací, chyb ' + chyb);

  // 3) koncept po restartu stránky (obnova rozepsané zprávy)
  for (const t of TYPY) {
    const q = await stranka();
    await q.evaluate(() => { localStorage.clear(); archiv.length = 0; STORE.archiv = archiv; });
    await zalozit(q, TYPY.find(x => nazev(x) !== nazev(t)), 'PRED');
    await zalozit(q, t, 'CIL');
    await q.evaluate(async () => { const i = archiv.findIndex(z => z.uid === window.__testUid.CIL); otevritZpravu(i); await new Promise(r => setTimeout(r, 400)); });
    const s = await podpis(q);
    const r = rozdil(s, vzor[nazev(t)]);
    check(nazev(t) + ' otevřená po jiném typu v téže stránce', !r, r);
    await q.close();
  }

  check('bez chyb stránky', err.length === 0, err.slice(0, 3).join(' | '));
  console.log(res.join('\n'));
  await b.close();
  process.exit(res.some(r => r.startsWith('❌')) ? 1 : 0);
})().catch(e => { console.error('CRASH:', e.message); process.exit(2); });
