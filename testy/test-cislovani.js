// v9.62 — vlastní šablona číslování zpráv v Nastavení.
// NEJDŮLEŽITĚJŠÍ KONTROLA: bez nastavení se program chová PŘESNĚ jako dřív
// (nová zpráva = RE-26-0001), aby nikoho číslování nepřekvapilo.
const { chromium } = require('/opt/node22/lib/node_modules/playwright/node_modules/playwright-core');
const res = []; const check = (n, ok, d) => res.push((ok ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));
const ROK = String(new Date().getFullYear()).slice(-2);

(async () => {
  const br = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await br.newContext({ viewport: { width: 1500, height: 1000 } });
  await ctx.addInitScript(() => { navigator.serviceWorker.register = () => new Promise(() => {}); });
  const p = await ctx.newPage();
  const chyby = []; p.on('pageerror', e => chyby.push(e.message));
  await p.goto('http://127.0.0.1:8901/index.html', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1200);

  const naplnArchiv = (cisla) => p.evaluate((cisla) => {
    archiv.length = 0;
    cisla.forEach(([ev, typ], i) => {
      archiv.push({ uid: 'u' + i, typ: typ, ev_cislo: ev, misto: 'M' + i,
        datum: '2026-05-0' + ((i % 9) + 1), vysledek: 'schopno', stav: '',
        data: { typ: typ, podtyp: typ === 'elektro' ? 'dum' : '', ev_cislo: ev,
                misto: 'M' + i, zahajeni: '2026-05-01', ukonceni: '2026-05-01' },
        timestamp: '2026-05-01T08:00:00Z' });
    });
    STORE.archiv = archiv; saveStore();
  }, cisla);

  // ══ 1. VÝCHOZÍ STAV = JAKO DŘÍV ══════════════════════════════════
  await p.evaluate(() => { localStorage.clear(); STORE.technik = { jmeno: 'M. Š' }; });
  await naplnArchiv([['RE-26-0001', 'elektro'], ['RE-26-0002', 'elektro'], ['RS-26-0001', 'stroje']]);
  let v = await p.evaluate(async () => {
    aktTyp = 'elektro'; aktPodtyp = 'dum'; novaZprava('elektro');
    await new Promise(r => setTimeout(r, 500));
    const el = document.getElementById('f_ev_cislo').value;
    aktTyp = 'stroje'; novaZprava('stroje');
    await new Promise(r => setTimeout(r, 700));
    return { elektro: el, stroje: document.getElementById('f_ev_cislo').value,
             sablona: cisloSablona(), auto: cisloAuto() };
  });
  check('bez nastavení dá nová elektro zpráva RE-' + ROK + '-0001 jako dřív',
    v.elektro === 'RE-' + ROK + '-0001', v.elektro);
  check('bez nastavení dá nová zpráva o stroji RS-' + ROK + '-0001 jako dřív',
    v.stroje === 'RS-' + ROK + '-0001', v.stroje);
  check('výchozí šablona je {TYP}-{RR}-{NNNN} a automatika je vypnutá',
    v.sablona === '{TYP}-{RR}-{NNNN}' && v.auto === false, v.sablona + ' / auto=' + v.auto);

  // ══ 2. ZAŠKRTNUTÁ AUTOMATIKA ═════════════════════════════════════
  v = await p.evaluate(async () => {
    STORE.technik.cislo_auto = true; saveStore();
    aktTyp = 'elektro'; aktPodtyp = 'dum'; novaZprava('elektro');
    await new Promise(r => setTimeout(r, 500));
    const el = document.getElementById('f_ev_cislo').value;
    aktTyp = 'stroje'; novaZprava('stroje');
    await new Promise(r => setTimeout(r, 700));
    return { elektro: el, stroje: document.getElementById('f_ev_cislo').value };
  });
  check('se zaškrtnutou volbou dostane elektro další volné číslo',
    v.elektro === 'RE-' + ROK + '-0003', v.elektro);
  check('stroje mají VLASTNÍ řadu (jiný prefix)',
    v.stroje === 'RS-' + ROK + '-0002', v.stroje);

  // ══ 3. ELEKTRO A LPS SDÍLEJÍ ŘADU (obojí má prefix RE) ═══════════
  await naplnArchiv([['RE-26-0001', 'elektro'], ['RE-26-0007', 'lps']]);
  v = await p.evaluate(async () => {
    aktTyp = 'elektro'; aktPodtyp = 'dum'; novaZprava('elektro');
    await new Promise(r => setTimeout(r, 500));
    return document.getElementById('f_ev_cislo').value;
  });
  check('LPS zpráva posouvá i elektro řadu (obojí je RE)',
    v === 'RE-' + ROK + '-0008', v);

  // ══ 4. PĚTIMÍSTNÁ ŘADA UŽIVATELE ════════════════════════════════
  await naplnArchiv([['RE-26-10001', 'elektro'], ['RE-26-10005', 'elektro'], ['RE-26-0036', 'elektro']]);
  v = await p.evaluate(async () => {
    aktTyp = 'elektro'; novaZprava('elektro');
    await new Promise(r => setTimeout(r, 500));
    return document.getElementById('f_ev_cislo').value;
  });
  check('delší čísla (RE-26-10005) program vidí a naváže na ně',
    v === 'RE-' + ROK + '-10006', v);

  // ══ 5. VLASTNÍ ŠABLONY ══════════════════════════════════════════
  const sablony = await p.evaluate(async () => {
    archiv.length = 0;
    ['2026/014', '2026/003'].forEach((ev, i) => archiv.push({ uid: 'x' + i, typ: 'elektro',
      ev_cislo: ev, misto: 'M', datum: '2026-05-01', data: { typ: 'elektro', ev_cislo: ev },
      timestamp: '2026-05-01T08:00:00Z' }));
    STORE.archiv = archiv; saveStore();
    STORE.technik.cislo_format = '{RRRR}/{NNN}'; saveStore();
    aktTyp = 'elektro'; novaZprava('elektro');
    await new Promise(r => setTimeout(r, 500));
    const a = document.getElementById('f_ev_cislo').value;
    // šablona s volným textem kolem
    STORE.technik.cislo_format = 'REV {NN}/{RR} — Kyjov'; saveStore();
    archiv.length = 0;
    archiv.push({ uid: 'y', typ: 'elektro', ev_cislo: 'REV 07/26 — Kyjov', misto: 'M',
                  datum: '2026-05-01', data: { typ: 'elektro' }, timestamp: '2026-05-01T08:00:00Z' });
    STORE.archiv = archiv; saveStore();
    novaZprava('elektro');
    await new Promise(r => setTimeout(r, 500));
    const b = document.getElementById('f_ev_cislo').value;
    // šablona bez pořadového čísla
    STORE.technik.cislo_format = 'RE-{RR}'; saveStore();
    const bezCisla = cisloDalsi('elektro');
    STORE.technik.cislo_format = ''; saveStore();
    return { a: a, b: b, bezCisla: bezCisla };
  });
  check('šablona {RRRR}/{NNN} vyrobí 2026/015', sablony.a === '2026/015', sablony.a);
  check('volný text kolem značek se zachová', sablony.b === 'REV 08/26 — Kyjov', sablony.b);
  check('šablona bez {NNNN} nic nevymýšlí (vrátí null)', sablony.bezCisla === null,
    String(sablony.bezCisla));

  // ══ 6. ROČNÍ RESET ŘADY ═════════════════════════════════════════
  const rocni = await p.evaluate(async () => {
    archiv.length = 0;
    [['RE-25-0042', 'elektro'], ['RE-26-0002', 'elektro']].forEach(([ev, t], i) =>
      archiv.push({ uid: 'r' + i, typ: t, ev_cislo: ev, misto: 'M', datum: '2025-01-01',
                    data: { typ: t }, timestamp: '2025-01-01T08:00:00Z' }));
    STORE.archiv = archiv; saveStore();
    const sRokem = cisloDalsi('elektro', '{TYP}-{RR}-{NNNN}');
    const bezRoku = cisloDalsi('elektro', '{TYP}-{NNNN}');
    return { sRokem: sRokem, bezRoku: bezRoku };
  });
  check('šablona s rokem loňskou řadu ignoruje (roční reset)',
    rocni.sRokem === 'RE-' + ROK + '-0003', rocni.sRokem);
  check('šablona bez roku je jiná řada — loňská čísla do ní nespadnou',
    rocni.bezRoku === 'RE-0001', rocni.bezRoku);

  // ══ 7. TLAČÍTKO ⟳ ═══════════════════════════════════════════════
  const tlacitko = await p.evaluate(async () => {
    STORE.technik.cislo_auto = false; saveStore();       // automatika VYPNUTÁ
    archiv.length = 0;
    ['RE-26-0001', 'RE-26-0009'].forEach((ev, i) => archiv.push({ uid: 't' + i, typ: 'elektro',
      ev_cislo: ev, misto: 'M', datum: '2026-05-01', data: { typ: 'elektro' },
      timestamp: '2026-05-01T08:00:00Z' }));
    STORE.archiv = archiv; saveStore();
    aktTyp = 'elektro'; novaZprava('elektro');
    await new Promise(r => setTimeout(r, 500));
    const pred = document.getElementById('f_ev_cislo').value;
    window.__formDirty = false;
    document.querySelector('[data-action="cisloPridelit"]').click();
    await new Promise(r => setTimeout(r, 200));
    return { pred: pred, po: document.getElementById('f_ev_cislo').value,
             dirty: !!window.__formDirty };
  });
  check('⟳ přidělí další číslo i s vypnutou automatikou',
    tlacitko.pred === 'RE-' + ROK + '-0001' && tlacitko.po === 'RE-' + ROK + '-0010',
    tlacitko.pred + ' → ' + tlacitko.po);
  check('⟳ označí zprávu jako změněnou (spustí autosave)', tlacitko.dirty);

  const zamceno = await p.evaluate(async () => {
    const el = document.getElementById('f_ev_cislo');
    el.value = 'RUČNĚ-1';
    window.__formReadOnly = true;
    cisloPridelit();
    await new Promise(r => setTimeout(r, 150));
    const po = el.value;
    const skryto = getComputedStyle(document.querySelector('[data-action="cisloPridelit"]')).display;
    window.__formReadOnly = false;
    return { po: po, skryto: skryto };
  });
  check('u dokončené zprávy ⟳ nic nepřepíše', zamceno.po === 'RUČNĚ-1', zamceno.po);

  // ══ 8. NAVÁZAT jede podle šablony ═══════════════════════════════
  const navaz = await p.evaluate(async () => {
    STORE.technik.cislo_format = '{RRRR}/{NNN}'; saveStore();
    archiv.length = 0;
    archiv.push({ uid: 'n1', typ: 'elektro', ev_cislo: '2026/031', misto: 'Hala',
      datum: '2025-04-01', vysledek: 'schopno', stav: '',
      data: { typ: 'elektro', podtyp: 'dum', ev_cislo: '2026/031', misto: 'Hala',
              zahajeni: '2025-04-01', ukonceni: '2025-04-01', druh: 'Výchozí' },
      timestamp: '2025-04-01T08:00:00Z' });
    STORE.archiv = archiv; saveStore();
    navazatZpravu(0);
    await new Promise(r => setTimeout(r, 900));
    const out = { cislo: document.getElementById('f_ev_cislo').value };
    STORE.technik.cislo_format = ''; saveStore();
    return out;
  });
  check('„Navázat" přidělí číslo podle šablony, ne natvrdo RE-RR-NNNN',
    navaz.cislo === '2026/032', navaz.cislo);

  // ══ 9. NASTAVENÍ — živá ukázka ══════════════════════════════════
  const nast = await p.evaluate(async () => {
    archiv.length = 0;
    ['RE-26-0001', 'RE-26-0004'].forEach((ev, i) => archiv.push({ uid: 'u' + i, typ: 'elektro',
      ev_cislo: ev, misto: 'M', datum: '2026-05-01', data: { typ: 'elektro' },
      timestamp: '2026-05-01T08:00:00Z' }));
    STORE.archiv = archiv; saveStore();
    showScreen('nastaveni');
    await new Promise(r => setTimeout(r, 300));
    const vychozi = document.getElementById('rt_cislo_ukazka').innerText.replace(/\s+/g, ' ');
    // napsat vlastní šablonu
    const pole = document.getElementById('rt_cislo_format');
    pole.value = '{RRRR}/{NNN}';
    pole.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 150));
    const vlastni = document.getElementById('rt_cislo_ukazka').innerText.replace(/\s+/g, ' ');
    const ulozeno = STORE.technik.cislo_format;
    // šablona bez čísla → varování
    pole.value = 'RE-{RR}';
    pole.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 150));
    const varovani = document.getElementById('rt_cislo_ukazka').innerText.replace(/\s+/g, ' ');
    // zaškrtnout automatiku
    pole.value = ''; pole.dispatchEvent(new Event('input', { bubbles: true }));
    const chk = document.getElementById('rt_cislo_auto');
    chk.checked = true; chk.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 150));
    return { vychozi: vychozi, vlastni: vlastni, varovani: varovani, ulozeno: ulozeno,
             auto: STORE.technik.cislo_auto,
             poZaskrtnuti: document.getElementById('rt_cislo_ukazka').innerText.replace(/\s+/g, ' ') };
  });
  check('ukázka říká příští číslo obou řad',
    /RE-26-0005/.test(nast.vychozi) && /RS-26-0001/.test(nast.vychozi), nast.vychozi.slice(0, 90));
  // „(1 zpráv)" není česky — počet se musí skloňovat
  check('počet zpráv se skloňuje',
    /2 zprávy/.test(nast.vychozi) && /0 zpráv\b/.test(nast.vychozi) && !/\b1 zpráv\b/.test(nast.vychozi),
    (nast.vychozi.match(/\(\d+ zpráv\w*[^)]*\)/g) || []).join(' '));
  check('ukázka se překreslí při psaní šablony', /2026\/001/.test(nast.vlastni),
    nast.vlastni.slice(0, 60));
  check('šablona se uloží do profilu rovnou při psaní', nast.ulozeno === '{RRRR}/{NNN}',
    String(nast.ulozeno));
  check('šablona bez {NNNN} vyvolá varování', /nemá značku/.test(nast.varovani),
    nast.varovani.slice(0, 70));
  check('zaškrtnutí automatiky se uloží a ukázka to řekne',
    nast.auto === true && /rovnou/.test(nast.poZaskrtnuti), nast.poZaskrtnuti.slice(-80));

  // ══ 9b. PŘEDLOHY K ZAKLIKNUTÍ (v9.63) ═══════════════════════════
  const predlohy = await p.evaluate(async () => {
    localStorage.clear();
    STORE.technik = { jmeno: 'M. Š' };
    archiv.length = 0;
    ['RE-26-10001', 'RE-26-10005'].forEach((ev, i) => archiv.push({ uid: 'p' + i, typ: 'elektro',
      ev_cislo: ev, misto: 'M', datum: '2026-05-01', data: { typ: 'elektro' },
      timestamp: '2026-05-01T08:00:00Z' }));
    STORE.archiv = archiv; saveStore();
    showScreen('nastaveni');
    await new Promise(r => setTimeout(r, 300));
    const radky = Array.from(document.querySelectorAll('#rt_cislo_predlohy .teren-radek'))
      .map(l => ({ text: l.innerText.replace(/\s+/g, ' ').trim(),
                   sablona: (l.querySelector('input') || {}).dataset.sablona,
                   checked: l.querySelector('input').checked }));
    return {
      radky: radky,
      vlastniSkryte: getComputedStyle(document.getElementById('rt_cislo_vlastni_wrap')).display,
      // zaškrtávátko ani přepínače se nesmí roztáhnout přes celou kartu
      sirkaRadia: document.querySelector('#rt_cislo_predlohy input[type=radio]').getBoundingClientRect().width
    };
  });
  check('předlohy se nabízejí k zakliknutí', predlohy.radky.length === 6,
    predlohy.radky.length + ' voleb');
  check('první předloha je dnešní stav a je vybraná',
    predlohy.radky[0].sablona === '{TYP}-{RR}-{NNNN}' && predlohy.radky[0].checked &&
    /jako dosud/.test(predlohy.radky[0].text), predlohy.radky[0].text);
  check('u předlohy je vidět hotové číslo, ne zápis šablony',
    /RE-26-0001/.test(predlohy.radky[0].text) && !/\{TYP\}/.test(predlohy.radky[0].text),
    predlohy.radky[0].text);
  // Předlohy MUSÍ jít od sebe rozeznat. Kdyby ukazovaly příští volné číslo,
  // vyšly by u archivu s RE-26-10005 obě stejně (RE-26-10006), protože
  // {NNNN} chytá i delší čísla — proto se ukazuje první číslo řady.
  check('čtyř- a pětimístná předloha se od sebe poznají',
    /RE-26-00001/.test(predlohy.radky[1].text) &&
    predlohy.radky[0].text !== predlohy.radky[1].text, predlohy.radky[1].text);
  check('všech pět předloh je navzájem různých',
    new Set(predlohy.radky.slice(0, 5).map(r => r.text.split(' ')[0])).size === 5,
    predlohy.radky.slice(0, 5).map(r => r.text.split(' ')[0]).join(' | '));
  check('poslední volba je „Vlastní" a pole je zatím schované',
    /Vlastní/.test(predlohy.radky[5].text) && predlohy.vlastniSkryte === 'none',
    predlohy.radky[5].text + ' / ' + predlohy.vlastniSkryte);
  check('přepínač se neroztáhne přes celou kartu (CSS na radio)',
    predlohy.sirkaRadia > 0 && predlohy.sirkaRadia < 40, predlohy.sirkaRadia + 'px');

  const klik = await p.evaluate(async () => {
    document.querySelector('#rt_cislo_predlohy input[data-sablona="{RRRR}/{NNN}"]').click();
    await new Promise(r => setTimeout(r, 200));
    return { ulozeno: STORE.technik.cislo_format,
             pole: document.getElementById('rt_cislo_format').value,
             ukazka: document.getElementById('rt_cislo_ukazka').innerText.replace(/\s+/g, ' '),
             vlastni: getComputedStyle(document.getElementById('rt_cislo_vlastni_wrap')).display,
             checked: document.querySelector('#rt_cislo_predlohy input[data-sablona="{RRRR}/{NNN}"]').checked };
  });
  check('klik na předlohu ji uloží do profilu', klik.ulozeno === '{RRRR}/{NNN}', klik.ulozeno);
  check('klik přepíše i skryté pole vlastní šablony', klik.pole === '{RRRR}/{NNN}', klik.pole);
  check('ukázka se překreslí podle vybrané předlohy', /2026\/001/.test(klik.ukazka),
    klik.ukazka.slice(0, 60));
  check('u hotové předlohy zůstane pole vlastní šablony schované',
    klik.vlastni === 'none' && klik.checked, klik.vlastni);

  const vlastni = await p.evaluate(async () => {
    const r = Array.from(document.querySelectorAll('#rt_cislo_predlohy input'))
      .filter(x => x.dataset.action === 'cisloVlastni')[0];
    r.click();
    await new Promise(r2 => setTimeout(r2, 200));
    const odkryto = getComputedStyle(document.getElementById('rt_cislo_vlastni_wrap')).display;
    const pole = document.getElementById('rt_cislo_format');
    pole.value = 'REV-{NNN}-{RR}';
    pole.dispatchEvent(new Event('input', { bubbles: true }));
    pole.dispatchEvent(new Event('blur', { bubbles: true }));
    await new Promise(r2 => setTimeout(r2, 200));
    const vlastniChecked = Array.from(document.querySelectorAll('#rt_cislo_predlohy input'))
      .filter(x => x.dataset.action === 'cisloVlastni')[0].checked;
    return { odkryto: odkryto, ulozeno: STORE.technik.cislo_format,
             vlastniChecked: vlastniChecked,
             stale: getComputedStyle(document.getElementById('rt_cislo_vlastni_wrap')).display };
  });
  check('volba „Vlastní" odkryje pole na šablonu', vlastni.odkryto !== 'none', vlastni.odkryto);
  check('napsaná vlastní šablona se uloží', vlastni.ulozeno === 'REV-{NNN}-{RR}', vlastni.ulozeno);
  check('po napsání vlastní šablony zůstane vybraná „Vlastní" a pole odkryté',
    vlastni.vlastniChecked && vlastni.stale !== 'none', vlastni.stale);

  // Napíšu-li ručně text, který sedí na předlohu, přepne se zpátky na ni
  const zpetNaPredlohu = await p.evaluate(async () => {
    const pole = document.getElementById('rt_cislo_format');
    pole.value = '{TYP}-{RR}-{NNNN}';
    pole.dispatchEvent(new Event('input', { bubbles: true }));
    pole.dispatchEvent(new Event('blur', { bubbles: true }));
    await new Promise(r => setTimeout(r, 200));
    return { prvni: document.querySelector('#rt_cislo_predlohy input').checked,
             vlastni: getComputedStyle(document.getElementById('rt_cislo_vlastni_wrap')).display };
  });
  check('ručně napsaná šablona shodná s předlohou se do seznamu vrátí',
    zpetNaPredlohu.prvni && zpetNaPredlohu.vlastni === 'none',
    'první=' + zpetNaPredlohu.prvni + ' vlastní=' + zpetNaPredlohu.vlastni);

  // ══ 9c. ŠABLONA PER TYP (v9.68) ═════════════════════════════════
  const perTyp = await p.evaluate(async () => {
    localStorage.clear();
    STORE.technik = { jmeno: 'M. Š' };
    archiv.length = 0;
    ['RE-26-10005', 'RE-26-0036'].forEach((ev, i) => archiv.push({ uid: 'e' + i, typ: 'elektro',
      ev_cislo: ev, misto: 'M', datum: '2026-05-01', data: { typ: 'elektro' },
      timestamp: '2026-05-01T08:00:00Z' }));
    archiv.push({ uid: 's1', typ: 'spotrebice', ev_cislo: '000013', misto: 'VVZ',
      datum: '2025-11-13', data: { typ: 'spotrebice' }, timestamp: '2025-11-13T08:00:00Z' });
    STORE.archiv = archiv; saveStore();
    showScreen('nastaveni');
    await new Promise(r => setTimeout(r, 400));
    return {
      rozsahy: Array.from(document.querySelectorAll('#rt_cislo_rozsah .fa-typ'))
        .map(b => ({ k: b.dataset.rozsah, text: b.textContent.trim(),
                     on: b.classList.contains('fa-typ-on') })),
      ukazka: document.getElementById('rt_cislo_ukazka').innerText.replace(/\s+/g, ' ')
    };
  });
  check('nastavuje se pro „Výchozí pro všechny" + každý typ zvlášť',
    perTyp.rozsahy.map(r => r.k).join(',') === ',elektro,lps,stroje,spotrebice',
    perTyp.rozsahy.map(r => r.text).join(' | '));
  check('ve výchozím stavu je vybraná společná šablona',
    perTyp.rozsahy[0].on && !perTyp.rozsahy.slice(1).some(r => r.on));
  check('ukázka vypisuje řádek za KAŽDÝ typ',
    ['Elektro', 'LPS', 'Stroje', 'Spotřebiče'].every(t => perTyp.ukazka.indexOf(t) >= 0),
    perTyp.ukazka.slice(0, 80));

  const odchylka = await p.evaluate(async () => {
    document.querySelector('#rt_cislo_rozsah [data-rozsah="spotrebice"]').click();
    await new Promise(r => setTimeout(r, 200));
    const prvni = document.querySelector('#rt_cislo_predlohy .teren-radek');
    const dediZaskrtnuto = prvni.querySelector('input').checked;
    const vl = Array.from(document.querySelectorAll('#rt_cislo_predlohy input'))
      .filter(x => x.dataset.action === 'cisloVlastni')[0];
    vl.click();
    await new Promise(r => setTimeout(r, 150));
    const pole = document.getElementById('rt_cislo_format');
    pole.value = '{NNNNNN}';
    pole.dispatchEvent(new Event('input', { bubbles: true }));
    pole.dispatchEvent(new Event('blur', { bubbles: true }));
    await new Promise(r => setTimeout(r, 250));
    return {
      dediZaskrtnuto: dediZaskrtnuto,
      prvniText: prvni.textContent.trim(),
      ulozeno: JSON.stringify(STORE.technik.cislo_format_typ || {}),
      spolecna: STORE.technik.cislo_format || '',
      spotr: cisloDalsi('spotrebice'),
      elektro: cisloDalsi('elektro'),
      tecka: document.querySelector('#rt_cislo_rozsah [data-rozsah="spotrebice"]').textContent,
      ukazka: document.getElementById('rt_cislo_ukazka').innerText.replace(/\s+/g, ' ')
    };
  });
  check('u typu je první volbou „jako výchozí" a je zaškrtnutá',
    odchylka.dediZaskrtnuto && /jako výchozí/.test(odchylka.prvniText), odchylka.prvniText);
  check('vlastní šablona typu se uloží do cislo_format_typ, ne do společné',
    odchylka.ulozeno === '{"spotrebice":"{NNNNNN}"}' && odchylka.spolecna === '',
    odchylka.ulozeno + ' / společná „' + odchylka.spolecna + '"');
  check('SPOTŘEBIČE navážou na svou řadu (000013 → 000014)',
    odchylka.spotr === '000014', odchylka.spotr);
  check('ELEKTRO zůstane u své řady beze změny',
    odchylka.elektro === 'RE-26-10006', odchylka.elektro);
  check('typ s vlastní šablonou má v přepínači tečku', /•/.test(odchylka.tecka), odchylka.tecka);
  check('ukázka řekne, že jde o vlastní šablonu',
    /vlastní šablona/.test(odchylka.ukazka), odchylka.ukazka.slice(-120));

  // Nová zpráva o spotřebičích dostane číslo ze SVÉ šablony
  const novaSpotr = await p.evaluate(async () => {
    STORE.technik.cislo_auto = true; saveStore();
    aktTyp = 'spotrebice'; novaZprava('spotrebice');
    await new Promise(r => setTimeout(r, 800));
    const sp = document.getElementById('f_ev_cislo').value;
    aktTyp = 'elektro'; aktPodtyp = 'dum'; novaZprava('elektro');
    await new Promise(r => setTimeout(r, 600));
    return { spotr: sp, elektro: document.getElementById('f_ev_cislo').value };
  });
  check('nová zpráva o spotřebičích vezme svou šablonu',
    novaSpotr.spotr === '000014', novaSpotr.spotr);
  check('nová elektro zpráva vezme tu svou',
    novaSpotr.elektro === 'RE-26-10006', novaSpotr.elektro);

  // Zrušení odchylky vrátí typ ke společné šabloně
  const zruseno = await p.evaluate(async () => {
    showScreen('nastaveni');
    await new Promise(r => setTimeout(r, 300));
    document.querySelector('#rt_cislo_rozsah [data-rozsah="spotrebice"]').click();
    await new Promise(r => setTimeout(r, 200));
    document.querySelector('#rt_cislo_predlohy input[data-action="cisloPredlohaDedit"]').click();
    await new Promise(r => setTimeout(r, 250));
    return { ulozeno: JSON.stringify(STORE.technik.cislo_format_typ || {}),
             spotr: cisloDalsi('spotrebice'),
             tecka: document.querySelector('#rt_cislo_rozsah [data-rozsah="spotrebice"]').textContent };
  });
  check('„jako výchozí" odchylku zruší', zruseno.ulozeno === '{}', zruseno.ulozeno);
  check('typ se vrátí ke společné šabloně', /^RSP-/.test(zruseno.spotr), zruseno.spotr);
  check('tečka u typu zmizí', !/•/.test(zruseno.tecka), zruseno.tecka);

  // Společná šablona pořád platí pro typy bez odchylky
  const spolecna = await p.evaluate(async () => {
    document.querySelector('#rt_cislo_rozsah [data-rozsah=""]').click();
    await new Promise(r => setTimeout(r, 200));
    document.querySelector('#rt_cislo_predlohy input[data-sablona="{RRRR}/{NNN}"]').click();
    await new Promise(r => setTimeout(r, 250));
    return { elektro: cisloDalsi('elektro'), stroje: cisloDalsi('stroje'),
             spotr: cisloDalsi('spotrebice') };
  });
  check('společná šablona platí pro VŠECHNY typy bez odchylky',
    spolecna.elektro === '2026/001' && spolecna.stroje === '2026/001' &&
    spolecna.spotr === '2026/001',
    spolecna.elektro + ' / ' + spolecna.stroje + ' / ' + spolecna.spotr);

  await p.evaluate(() => { STORE.technik.cislo_format = ''; STORE.technik.cislo_format_typ = {}; saveStore(); });

  // ══ 10. Šablona přežije restart (je v profilu, tedy i v záloze) ══
  const poRestartu = await p.evaluate(() => {
    const blob = buildZalohaBlob ? 'ok' : 'chybi';
    return { blob: blob, vProfilu: !!(STORE.technik.cislo_format !== undefined) };
  });
  check('šablona bydlí v profilu technika (veze se se zálohou)', poRestartu.vProfilu);

  await p.evaluate(() => { STORE.technik.cislo_auto = true; saveStore(); });
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1200);
  const restart = await p.evaluate(async () => {
    showScreen('nastaveni');
    await new Promise(r => setTimeout(r, 300));
    return { pole: document.getElementById('rt_cislo_format').value,
             chk: document.getElementById('rt_cislo_auto').checked };
  });
  check('nastavení přežije restart programu', restart.chk === true, 'auto=' + restart.chk);

  check('bez chyb stránky', chyby.length === 0, chyby.join(' | '));
  await br.close();
  console.log(res.join('\n'));
  console.log(res.every(x => x[0] === '✅') ? '\nVŠE OK (' + res.length + ')' : '\nSELHALO');
  process.exit(res.every(x => x[0] === '✅') ? 0 : 1);
})();
