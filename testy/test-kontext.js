// v9.91 — pravý klik = kontextové menu. Tlačítka ⧉ ✕ 📄 v řádku ZŮSTÁVAJÍ
// (pokyn uživatele 2026-09-23: „technici jsou už na to zvyklí").
const { chromium } = require('/opt/node22/lib/node_modules/playwright/node_modules/playwright-core');
const res = []; const check = (n, ok, d) => res.push((ok ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));

(async () => {
  const br = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await br.newContext({ viewport: { width: 1500, height: 1000 } });
  await ctx.addInitScript(() => { navigator.serviceWorker.register = () => new Promise(() => {}); });
  const p = await ctx.newPage();
  const chyby = []; p.on('pageerror', e => chyby.push(e.message));
  await p.goto('http://127.0.0.1:8901/index.html', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);
  await p.evaluate(() => { window.confirm = () => true; window.prompt = () => 'x'; });

  // Pravý klik doprostřed prvku, případně s odstupem od levé hrany.
  const pravyKlik = async (sel, opt) => {
    const el = await p.$(sel);
    if (el) await el.evaluate(x => x.scrollIntoView({ block: 'center' }));
    await p.waitForTimeout(120);
    const b = await el.boundingBox();
    const x = b.x + ((opt && opt.dx) !== undefined ? opt.dx : b.width / 2);
    const y = b.y + b.height / 2;
    if (opt && opt.shift) await p.keyboard.down('Shift');
    await p.mouse.click(x, y, { button: 'right' });
    if (opt && opt.shift) await p.keyboard.up('Shift');
    await p.waitForTimeout(220);
    return { x, y };
  };
  // U čehokoli, co se ukazuje a schovává, se musí měřit VIDITELNOST,
  // ne obsah (poučení z v9.90).
  const menu = () => p.evaluate(() => {
    const m = document.querySelector('.kt-menu');
    if (!m) return null;
    const r = m.getBoundingClientRect();
    return {
      vidi: m.offsetHeight > 0 && getComputedStyle(m).display !== 'none',
      polozky: [...m.querySelectorAll('.kt-pol')].map(b => b.textContent),
      pata: (m.querySelector('.kt-pata') || {}).textContent || '',
      r: { l: r.left, t: r.top, p: r.right, d: r.bottom }
    };
  });
  const klikPolozka = (text) => p.evaluate((t) => {
    const b = [...document.querySelectorAll('.kt-menu .kt-pol')].filter(x => x.textContent.includes(t))[0];
    if (!b) return false;
    b.click();
    return true;
  }, text);
  const zavri = async () => { await p.keyboard.press('Escape'); await p.waitForTimeout(150); };

  const novaElektro = async () => {
    await p.evaluate(async () => {
      localStorage.clear(); archiv.length = 0; STORE.archiv = archiv;
      STORE.technik = { jmeno: 'M. Technik' };
      aktTyp = 'elektro'; aktPodtyp = 'dum'; novaZprava('elektro');
      await new Promise(r => setTimeout(r, 800));
      document.querySelector('.tab-btn[data-tab="mereni"]').click();
    });
    await p.waitForTimeout(400);
  };

  // ══ 1. Řádek obvodu ══════════════════════════════════════════════
  await novaElektro();
  await pravyKlik('#rozvadece-container tr[data-rowtype="obvod"]', { dx: 18 });
  let m = await menu();
  check('pravý klik na řádku obvodu otevře menu a je VIDĚT', !!m && m.vidi, m ? String(m.vidi) : 'není');
  check('nabízí kopii i smazání řádku',
    !!m && m.polozky.some(x => x.includes('Kopírovat řádek')) && m.polozky.some(x => x.includes('Smazat řádek')),
    m ? m.polozky.join(' | ') : '');
  check('nabízí vložení nad i pod (to tlačítko v řádku nemá)',
    !!m && m.polozky.some(x => x.includes('Vložit řádek nad')) && m.polozky.some(x => x.includes('Vložit řádek pod')));
  check('patička říká, jak se dostat k nabídce prohlížeče',
    !!m && /Shift/.test(m.pata), m ? m.pata : '');
  await zavri();
  check('Esc menu zavře', (await menu()) === null);

  // ══ 2. TLAČÍTKA V ŘÁDKU ZŮSTALA ══════════════════════════════════
  const tl = await p.evaluate(() => {
    const tr = document.querySelector('#rozvadece-container tr[data-rowtype="obvod"]');
    const b = [...tr.querySelectorAll('button[data-action]')];
    const vidi = (a) => { const x = b.filter(y => y.dataset.action === a)[0]; return !!(x && x.offsetHeight > 0); };
    return { kopie: vidi('copyRow'), smaz: vidi('delRow'),
      texty: b.map(x => x.textContent.trim()).join('') };
  });
  check('⧉ v řádku měření zůstalo a je vidět', tl.kopie, tl.texty);
  check('✕ v řádku měření zůstalo a je vidět', tl.smaz);

  // ══ 3. Akce z menu jede přes SKUTEČNÉ tlačítko řádku ═════════════
  const pred = await p.evaluate(() => document.querySelectorAll('#rozvadece-container tr[data-rowtype="obvod"]').length);
  await pravyKlik('#rozvadece-container tr[data-rowtype="obvod"]', { dx: 18 });
  await klikPolozka('Kopírovat řádek');
  await p.waitForTimeout(250);
  const po = await p.evaluate(() => ({
    radku: document.querySelectorAll('#rozvadece-container tr[data-rowtype="obvod"]').length,
    menu: !!document.querySelector('.kt-menu')
  }));
  check('„Kopírovat řádek" z menu opravdu zkopíruje', po.radku === pred + 1, pred + ' → ' + po.radku);
  check('po výběru se menu zavře', !po.menu);

  // ══ 4. Vložit nad / pod, včetně přečíslování ═════════════════════
  await novaElektro();
  await p.evaluate(() => {
    const tb = document.querySelector('#rozvadece-container tbody');
    addMereniRowTo(tb); addMereniRowTo(tb);
    [...tb.querySelectorAll('tr[data-rowtype="obvod"]')].forEach((tr, i) => {
      tr.querySelectorAll('input')[1].value = 'obvod-' + (i + 1);
    });
  });
  const nazvy = () => p.evaluate(() => [...document.querySelectorAll('#rozvadece-container tr[data-rowtype="obvod"]')]
    .map(tr => tr.querySelectorAll('input')[1].value + '#' + tr.querySelectorAll('input')[0].value));
  const predN = await nazvy();
  await pravyKlik('#rozvadece-container tr[data-rowtype="obvod"]:nth-of-type(2)', { dx: 18 });
  await klikPolozka('Vložit řádek nad');
  await p.waitForTimeout(250);
  let poN = await nazvy();
  check('„Vložit řádek nad" vloží prázdný řádek nad ten, na kterém se stálo',
    poN.length === predN.length + 1 && poN[1].startsWith('#') && poN[2].startsWith('obvod-2'), poN.join(' '));
  check('a čísla řádků se přečíslují 1,2,3…',
    poN.map(x => x.split('#')[1]).join(',') === poN.map((_, i) => i + 1).join(','), poN.join(' '));
  await pravyKlik('#rozvadece-container tr[data-rowtype="obvod"]:nth-of-type(1)', { dx: 18 });
  await klikPolozka('Vložit řádek pod');
  await p.waitForTimeout(250);
  poN = await nazvy();
  check('„Vložit řádek pod" vloží pod první řádek',
    poN[0].startsWith('obvod-1') && poN[1].startsWith('#'), poN.join(' '));
  check('vložení označí zprávu jako neuloženou',
    await p.evaluate(() => window.__formDirty === true));

  // ══ 5. Chránič: vkládá se k CELÉ skupině, ne mezi podřádky ═══════
  await novaElektro();
  await p.evaluate(() => {
    addRcdRow(document.querySelector('#rozvadece-container .add-row'));
  });
  await p.waitForTimeout(250);
  await pravyKlik('#rozvadece-container tr[data-rowtype="rcd-header"]', { dx: 18 });
  m = await menu();
  check('menu u chrániče nabízí kopii i smazání CELÉHO chrániče',
    !!m && m.polozky.some(x => x.includes('Kopírovat celý chránič')) && m.polozky.some(x => x.includes('Smazat celý chránič')),
    m ? m.polozky.join(' | ') : '');
  await klikPolozka('Vložit řádek pod');
  await p.waitForTimeout(250);
  const poradiRcd = await p.evaluate(() => [...document.querySelectorAll('#rozvadece-container tbody tr')]
    .map(tr => tr.dataset.rowtype).join(','));
  check('nový řádek sedne AŽ ZA podřádky chrániče, ne mezi ně',
    /rcd-header,(rcd-mereni,)+obvod/.test(poradiRcd) && !/rcd-header,obvod/.test(poradiRcd), poradiRcd);

  // ══ 6. Řádek „jiný řádek" (info) ═════════════════════════════════
  await novaElektro();
  await p.evaluate(() => { addInfoRow(document.querySelector('#rozvadece-container .add-row')); });
  await p.waitForTimeout(250);
  await pravyKlik('#rozvadece-container tr[data-rowtype="info"]', { dx: 18 });
  await klikPolozka('Vložit řádek nad');
  await p.waitForTimeout(250);
  check('u „jiného řádku" se vloží zase „jiný řádek", ne obvod',
    await p.evaluate(() => document.querySelectorAll('#rozvadece-container tr[data-rowtype="info"]').length === 2));

  // ══ 7. Dokončená (zamčená) zpráva ════════════════════════════════
  await novaElektro();
  await p.evaluate(() => { setFormReadOnly(true); });
  await p.waitForTimeout(200);
  await pravyKlik('#rozvadece-container tr[data-rowtype="obvod"]', { dx: 18 });
  // Od v9.95 jde z dokončené zprávy řádky ZKOPÍROVAT do schránky (jen se
  // čte). Nic, co by zapisovalo, se ale nabídnout nesmí.
  m = await menu();
  check('u dokončené zprávy menu nabídne JEN kopírování do schránky',
    !!m && m.polozky.length === 1 && /Kopírovat do schránky/.test(m.polozky[0]), m ? m.polozky.join(' | ') : 'menu není');
  await zavri();
  await p.evaluate(() => { setFormReadOnly(false); });

  // ══ 8. Shift a psací pole nechávají nabídku prohlížeči ═══════════
  await novaElektro();
  await pravyKlik('#rozvadece-container tr[data-rowtype="obvod"]', { dx: 18, shift: true });
  check('Shift + pravý klik naše menu neotevře', (await menu()) === null);
  await p.evaluate(() => { document.querySelector('.tab-btn[data-tab="popis"]').click(); });
  await p.waitForTimeout(300);
  const maRich = await p.evaluate(() => {
    const r = [...document.querySelectorAll('#screen-form .rich-edit')].filter(x => x.offsetHeight > 0)[0];
    if (r) r.dataset.ktTest = '1';
    return !!r;
  });
  if (maRich) {
    await pravyKlik('.rich-edit[data-kt-test]');
    check('nad polem s prózou zůstane nabídka prohlížeče (vložit, pravopis)',
      (await menu()) === null);
  } else check('nad polem s prózou zůstane nabídka prohlížeče', false, 'pole nenalezeno');

  // ══ 9. Archiv ════════════════════════════════════════════════════
  await p.evaluate(() => {
    localStorage.clear(); archiv.length = 0;
    archiv.push({ uid: 'a1', typ: 'elektro', ev_cislo: 'RE-26-0001', misto: 'Dům', datum: '2026-05-05',
      stav: 'aktivni', data: { typ: 'elektro' } });
    archiv.push({ uid: 'a2', typ: 'lps', ev_cislo: 'RE-26-0002', misto: 'Hala', datum: '2026-06-06',
      data: { typ: 'lps' } });
    STORE.archiv = archiv; saveStore();
    showScreen('home'); renderArchiv();
  });
  await p.waitForTimeout(400);
  await pravyKlik('.archiv-table tbody tr[data-idx="0"]', { dx: 120 });
  m = await menu();
  check('menu nad zprávou v archivu nabízí Otevřít, Navázat i Smazat',
    !!m && m.polozky.some(x => x.includes('Otevřít zprávu')) &&
    m.polozky.some(x => x.includes('Navázat')) && m.polozky.some(x => x.includes('Smazat zprávu')),
    m ? m.polozky.join(' | ') : '');
  check('a Dokončit u rozpracované zprávy',
    !!m && m.polozky.some(x => x.includes('Dokončit')), m ? m.polozky.join(' | ') : '');
  await klikPolozka('Smazat zprávu');
  await p.waitForTimeout(400);
  check('„Smazat zprávu" z menu opravdu smaže tu, na které se stálo',
    await p.evaluate(() => archiv.length === 1 && archiv[0].uid === 'a2'),
    await p.evaluate(() => archiv.map(z => z.uid).join(',')));

  // ══ 10. Postranní archiv ve formuláři ════════════════════════════
  await p.evaluate(async () => {
    archiv.length = 0;
    archiv.push({ uid: 'b1', typ: 'elektro', ev_cislo: 'RE-26-0009', misto: 'Dům', datum: '2026-05-05',
      data: { typ: 'elektro' } });
    STORE.archiv = archiv; saveStore();
    aktTyp = 'elektro'; aktPodtyp = 'dum'; novaZprava('elektro');
    await new Promise(r => setTimeout(r, 700));
    document.getElementById('btn-form-archiv').click();
  });
  await p.waitForTimeout(400);
  await pravyKlik('#fa-seznam .fa-radek', { dx: 40 });
  m = await menu();
  check('menu nad řádkem postranního archivu nabízí Otevřít, kopii i smazání',
    !!m && m.polozky.some(x => x.includes('Otevřít zprávu')) &&
    m.polozky.some(x => x.includes('Kopírovat do nové zprávy')) &&
    m.polozky.some(x => x.includes('Smazat zprávu')), m ? m.polozky.join(' | ') : '');
  const faTl = await p.evaluate(() => {
    const r = document.querySelector('#fa-seznam .fa-radek');
    return [...r.querySelectorAll('.fa-kopie')].map(b => b.textContent).join('');
  });
  check('a tlačítka ⧉ ✕ v postranním archivu zůstala', /⧉/.test(faTl) && /✕/.test(faTl), faTl);
  await zavri();

  // ══ 11. Protokol spotřebičů ══════════════════════════════════════
  await p.evaluate(async () => {
    aktTyp = 'spotrebice'; novaZprava('spotrebice');
    await new Promise(r => setTimeout(r, 900));
  });
  await p.waitForTimeout(300);
  const spSel = '#spotrebice-list .spotr-tab tbody tr';
  const maSp = await p.evaluate((s) => !!document.querySelector(s), spSel);
  if (maSp) {
    await pravyKlik(spSel, { dx: 30 });
    m = await menu();
    check('menu nad spotřebičem nabízí kopii, smazání i jeho protokol',
      !!m && m.polozky.some(x => x.includes('Kopírovat řádek')) &&
      m.polozky.some(x => x.includes('Smazat řádek')) &&
      m.polozky.some(x => x.includes('Protokol jen pro tento spotřebič')), m ? m.polozky.join(' | ') : '');
    const spTl = await p.evaluate((s) => {
      const r = document.querySelector(s);
      return [...r.querySelectorAll('.sp-x')].filter(b => b.offsetHeight > 0).map(b => b.textContent).join('');
    }, spSel);
    check('a tlačítka ⧉ ✕ 📄 u spotřebiče zůstala všechna tři', spTl === '⧉✕📄', spTl);
    await zavri();
  } else {
    check('menu nad spotřebičem nabízí kopii, smazání i jeho protokol', false, 'řádek nenalezen');
    check('a tlačítka ⧉ ✕ 📄 u spotřebiče zůstala všechna tři', false, 'řádek nenalezen');
  }

  // ══ 12. Plán revizí ══════════════════════════════════════════════
  await p.evaluate(() => {
    localStorage.clear(); archiv.length = 0; STORE.plan = {};
    archiv.push({ uid: 'p1', typ: 'elektro', ev_cislo: 'RE-26-0100', misto: 'Kotelna K1',
      datum: '2026-03-03', data: { typ: 'elektro', pristi: '2031-03-03' } });
    STORE.archiv = archiv; saveStore();
    otevritPlan();
  });
  await p.waitForTimeout(600);
  await pravyKlik('tr.plan-objekt-radek td.plan-objekt', { dx: 90 });
  m = await menu();
  check('menu nad objektem v plánu nabídne úpravu údajů',
    !!m && m.polozky.some(x => x.includes('Upravit údaje objektu')), m ? m.polozky.join(' | ') : '');
  await zavri();
  const rok = await p.evaluate(() => {
    const b = document.querySelector('tr.plan-objekt-radek td.plan-bunka[data-rok]');
    return b ? b.dataset.rok : '';
  });
  await pravyKlik('tr.plan-objekt-radek td.plan-bunka[data-rok]');
  m = await menu();
  check('nad buňkou roku nabídne termín právě toho roku',
    !!m && m.polozky.some(x => x.includes('Termín v roce ' + rok)), m ? m.polozky.join(' | ') : '');
  await zavri();

  // ══ 13. Dlouhý stisk prstem = pravý klik ═════════════════════════
  await novaElektro();
  await p.evaluate(() => {
    const tr = document.querySelector('#rozvadece-container tr[data-rowtype="obvod"]');
    const r = tr.getBoundingClientRect();
    const ev = (t) => tr.dispatchEvent(new PointerEvent(t, { bubbles: true, pointerType: 'touch',
      clientX: r.left + 18, clientY: r.top + r.height / 2 }));
    ev('pointerdown');
  });
  await p.waitForTimeout(800);
  m = await menu();
  check('dlouhý stisk prstem otevře totéž menu', !!m && m.vidi && m.polozky.length > 1,
    m ? m.polozky.join(' | ') : 'menu není');
  await zavri();
  await p.evaluate(() => {
    const tr = document.querySelector('#rozvadece-container tr[data-rowtype="obvod"]');
    const r = tr.getBoundingClientRect();
    const ev = (t, dx) => tr.dispatchEvent(new PointerEvent(t, { bubbles: true, pointerType: 'touch',
      clientX: r.left + 18 + (dx || 0), clientY: r.top + r.height / 2 }));
    ev('pointerdown'); ev('pointermove', 60);
  });
  await p.waitForTimeout(800);
  check('posunutý prst (rolování) menu neotevře', (await menu()) === null);

  // ══ 14. „Otevřít zprávu" z menu zprávu opravdu otevře ════════════
  await p.evaluate(() => {
    archiv.length = 0;
    archiv.push({ uid: 'c1', typ: 'elektro', ev_cislo: 'RE-26-0777', misto: 'Chata', datum: '2026-07-07',
      data: { typ: 'elektro', ev_cislo: 'RE-26-0777' } });
    STORE.archiv = archiv; saveStore();
    window.__formDirty = false;
    showScreen('home'); renderArchiv();
  });
  await p.waitForTimeout(400);
  await pravyKlik('.archiv-table tbody tr[data-idx="0"]', { dx: 120 });
  await klikPolozka('Otevřít zprávu');
  await p.waitForTimeout(900);
  check('„Otevřít zprávu" z menu otevře formulář s tou zprávou',
    await p.evaluate(() => document.getElementById('screen-form').classList.contains('active') &&
      document.getElementById('f_ev_cislo').value === 'RE-26-0777'),
    await p.evaluate(() => document.getElementById('f_ev_cislo').value));

  // ══ 15. Menu se vejde do okna i u pravého dolního rohu ═══════════
  await p.evaluate(() => { showScreen('home'); renderArchiv(); });
  await p.waitForTimeout(300);
  await p.evaluate(() => {
    const r = document.querySelector('.archiv-table tbody tr');
    if (r) r.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true,
      clientX: window.innerWidth - 6, clientY: window.innerHeight - 6 }));
  });
  await p.waitForTimeout(250);
  m = await menu();
  const okno = await p.evaluate(() => ({ w: window.innerWidth, h: window.innerHeight }));
  check('menu se u pravého dolního rohu překlopí dovnitř okna',
    !!m && m.r.p <= okno.w && m.r.d <= okno.h && m.r.l >= 0 && m.r.t >= 0,
    m ? JSON.stringify(m.r) + ' okno ' + okno.w + '×' + okno.h : 'menu není');
  // Klik jinam menu zavře.
  await p.mouse.click(300, 300);
  await p.waitForTimeout(200);
  check('klepnutí jinam menu zavře', (await menu()) === null);

  check('žádné chyby v konzoli', chyby.length === 0, chyby.join(' | '));

  console.log(res.join('\n'));
  console.log('\n' + res.filter(x => x[0] === '✅').length + '/' + res.length + ' prošlo');
  await br.close();
  process.exit(res.some(x => x[0] === '❌') ? 1 : 0);
})();
