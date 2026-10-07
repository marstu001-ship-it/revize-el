// v9.101 — karty v Novinkách nesmí popisovat chování, které už neplatí.
const { chromium } = require('/opt/node22/lib/node_modules/playwright/node_modules/playwright-core');
const res = []; const check = (n, ok, d) => res.push((ok?'✅':'❌')+' '+n+(d?' — '+d:''));
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await b.newPage();
  await p.addInitScript(() => { try { navigator.serviceWorker.register = () => new Promise(() => {}); } catch (e) {} });
  await p.goto('http://127.0.0.1:' + (process.env.PORT || 8901) + '/index.html', { waitUntil: 'load' }); await p.waitForTimeout(600);
  const k = await p.evaluate(() => {
    const m = {};
    document.querySelectorAll('#screen-novinky .home-wrap > .scard').forEach(x => {
      m[x.querySelector('.scard-title').textContent.trim()] = { text: x.textContent.replace(/\s+/g, ' '), datum: x.getAttribute('data-nov-datum') };
    });
    return m;
  });
  const najdi = (re) => Object.keys(k).find(t => re.test(t));
  const raz = k[najdi(/Razítko a podpis/)];
  check('razítko: program se už neptá, nastavuje se v panelu u náhledu', !/program zeptá/.test(raz.text) && /panelu nastavení tisku/.test(raz.text));
  const cis = k[najdi(/Vlastní číslování obvodů/)];
  check('číslování obvodů: platí pro rozváděč, ne napořád v záloze', !/napořád/.test(cis.text) && /pro ten rozváděč/.test(cis.text));
  const str = k[najdi(/Nový typ revize — Stroje/)];
  check('stroje: kontrola, záložka „2. Stroj a popis", Rozsah kontroly',
    /kontrola elektrického zařízení pracovního stroje/.test(str.text) && /2\. Stroj a popis/.test(str.text) && /Rozsah kontroly/.test(str.text) && !/Rozsah revize/.test(str.text));
  const mim = k[najdi(/Důvod mimořádné revize/)];
  check('důvod mimořádné: tab „A. Popis instalace"', /A\. Popis instalace/.test(mim.text) && !/A\. Rozsah a popis/.test(mim.text));
  // opravené karty si drží původní datum
  check('opravené karty mají původní datum', raz.datum === '2026-05-15' && cis.datum === '2026-07-13' && str.datum === '2026-09-02' && mim.datum === '2026-08-11',
    [raz.datum, cis.datum, str.datum, mim.datum].join(','));
  // tab a přepínač, na které karty odkazují, v programu opravdu jsou
  const real = await p.evaluate(() => ({
    tabEl: Array.from(document.querySelectorAll('#tab-bar-el .tab-btn')).map(b => b.textContent.trim()),
    tabStr: Array.from(document.querySelectorAll('.tab-btn[data-tab^="stroje"]')).map(b => b.textContent.trim()),
    rozsah: (typeof pojmy === 'function' ? pojmy('stroje')['f-rozsah'] : '')
  }));
  check('tab „A. Popis instalace" v programu existuje', real.tabEl.some(t => /A\. Popis instalace/.test(t)), real.tabEl.join(' | '));
  check('tab „2. Stroj a popis" v programu existuje', real.tabStr.some(t => /2\. Stroj a popis/.test(t)), real.tabStr.join(' | '));
  check('u strojů se přepínač opravdu jmenuje „Rozsah kontroly"', real.rozsah === 'Rozsah kontroly', real.rozsah);
  console.log(res.join('\n'));
  await b.close();
  process.exit(res.some(r => r.startsWith('❌')) ? 1 : 0);
})().catch(e => { console.error('CRASH:', e.message); process.exit(2); });
