// v9.103 — blok „Předmět revize – stroj" nesmí na titulku elektro ani LPS zprávy.
const { chromium } = require('/opt/node22/lib/node_modules/playwright/node_modules/playwright-core');
const PORT = process.env.PORT || 8901;
const res = []; const check = (n, ok, d) => res.push((ok?'✅':'❌')+' '+n+(d?' — '+d:''));
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await b.newPage({ viewport: { width: 1300, height: 900 } });
  const err = []; p.on('pageerror', e => err.push(e.message));
  p.on('dialog', d => d.accept());
  await p.addInitScript(() => { try { navigator.serviceWorker.register = () => new Promise(() => {}); } catch (e) {} });
  await p.goto('http://127.0.0.1:' + PORT + '/index.html', { waitUntil: 'load' }); await p.waitForTimeout(800);
  const stav = () => p.evaluate(() => {
    switchTab('titulni');
    const bl = document.getElementById('stroje-blok');
    const host = document.getElementById('stroje-titulka-host');
    const titulka = document.getElementById('tab-titulni');
    const txt = titulka ? titulka.innerText : '';
    return { typ: aktTyp, naTitulce: !!(host && host.contains(bl)), vidim: !!(bl && bl.offsetParent !== null),
             textStroj: /Předmět (revize|kontroly)\s*[–-]\s*stroj/i.test(txt) };
  });
  const ok = (s) => s.typ !== 'stroje' ? (!s.naTitulce && !s.vidim && !s.textStroj) : (s.naTitulce && s.vidim);
  const cekej = (ms) => p.waitForTimeout(ms || 400);

  // 1) čerstvá elektro zpráva
  await p.evaluate(() => { localStorage.clear(); archiv.length = 0; STORE.archiv = archiv; novaZprava('elektro'); });
  await cekej(); let s = await stav();
  check('nová elektro zpráva: bez bloku stroje', ok(s), JSON.stringify(s));
  await p.evaluate(() => { document.getElementById('f_misto').value = 'Energoblok - kompresorovna'; saveToArchiv(); });

  // 2) otevřená z archivu (tady to uživatel viděl)
  await p.evaluate(() => { otevritZpravu(archiv.findIndex(z => z.typ === 'elektro')); }); await cekej(600);
  s = await stav(); check('elektro otevřená z archivu: bez bloku stroje', ok(s), JSON.stringify(s));
  const ulozeno = await p.evaluate(() => { saveToArchiv(); const z = archiv.find(x => x.typ === 'elektro'); return z.data.stroje === undefined; });
  check('elektro zpráva už v datech nenese prázdné „stroje"', ulozeno);

  // 3) stará elektro zpráva uložená před opravou (v datech má stroje)
  await p.evaluate(async () => { const D = JSON.parse(JSON.stringify(archiv.find(x => x.typ === 'elektro').data));
    D.stroje = { rozsah: 'jeden', spolu: false, seznam: [{ nazev: '' }] }; nacistData(D); });
  await cekej(600); s = await stav();
  check('stará elektro zpráva s „stroje" v datech: bez bloku stroje', ok(s), JSON.stringify(s));

  // 4) zpráva o stroji — blok na titulce dál je a údaje drží
  await p.evaluate(() => { novaZprava('stroje'); }); await cekej();
  await p.evaluate(() => { document.querySelector('#stroje-container .stroj-nazev').value = 'Soustruh SU 50'; document.getElementById('f_misto').value = 'Dílna'; saveToArchiv(); });
  s = await stav(); check('zpráva o stroji: blok stroje na titulce je', ok(s), JSON.stringify(s));

  // 5) po stroji nová elektro a stroj z předchozí zprávy se do ní neuloží
  await p.evaluate(() => { novaZprava('elektro'); }); await cekej();
  s = await stav(); check('nová elektro po stroji: bez bloku stroje', ok(s), JSON.stringify(s));
  const unik = await p.evaluate(() => JSON.stringify(getData()).indexOf('Soustruh SU 50') === -1);
  check('stroj z předchozí zprávy se do elektro dat nedostane', unik);

  // 6) Navázat elektro a ⧉ kopie z postranního archivu
  await p.evaluate(() => { navazatZpravu(archiv.findIndex(z => z.typ === 'elektro')); }); await cekej(700);
  s = await stav(); check('Navázat elektro: bez bloku stroje', ok(s), JSON.stringify(s));
  await p.evaluate(() => { const z = archiv.find(x => x.typ === 'elektro'); formArchivKopirovat(z.uid); }); await cekej(700);
  s = await stav(); check('⧉ kopie elektro: bez bloku stroje', ok(s), JSON.stringify(s));

  // 7) zpráva o stroji znovu z archivu — stroj i název zpátky
  await p.evaluate(() => { otevritZpravu(archiv.findIndex(z => z.typ === 'stroje')); }); await cekej(700);
  s = await stav();
  const nazev = await p.evaluate(() => (document.querySelector('#stroje-container .stroj-nazev') || {}).value);
  check('stroj z archivu: blok na titulce i s názvem', ok(s) && nazev === 'Soustruh SU 50', JSON.stringify(s) + ' ' + nazev);
  const pdf = await p.evaluate(async () => { generujPDF(); await new Promise(r => setTimeout(r, 1500)); return document.getElementById('pdf-pages').innerText; });
  check('PDF zprávy o stroji dál tiskne stroj', /Soustruh SU 50/.test(pdf));
  await p.evaluate(() => showScreen('form'));

  // 8) soubor strojů — blok v tabu, ne na titulce (beze změny)
  await p.evaluate(() => { const sel = document.getElementById('f_stroje_rozsah'); sel.value = 'soubor'; sel.dispatchEvent(new Event('change', { bubbles: true })); });
  const soubor = await p.evaluate(() => document.getElementById('tab-stroje-objekt').contains(document.getElementById('stroje-blok')));
  check('soubor strojů: blok zůstává v tabu Stroj', soubor);

  // 9) LPS z archivu
  await p.evaluate(() => { novaZprava('lps'); document.getElementById('f_misto').value = 'Hromosvod'; saveToArchiv(); }); await cekej();
  await p.evaluate(() => { otevritZpravu(archiv.findIndex(z => z.typ === 'lps')); }); await cekej(700);
  s = await stav(); check('LPS z archivu: bez bloku stroje', ok(s), JSON.stringify(s));

  check('bez chyb stránky', err.length === 0, err.join(' | '));
  console.log(res.join('\n'));
  await b.close();
  process.exit(res.some(r => r.startsWith('❌')) ? 1 : 0);
})().catch(e => { console.error('CRASH:', e.message); process.exit(2); });
