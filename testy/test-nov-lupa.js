// v9.100 — chytrá lupa v Novinkách.
const { chromium } = require('/opt/node22/lib/node_modules/playwright/node_modules/playwright-core');
const PORT = process.env.PORT || 8901;
const res = []; const check = (n, ok, d) => res.push((ok?'✅':'❌')+' '+n+(d?' — '+d:''));
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await b.newPage({ viewport: { width: 1300, height: 950 } });
  const err = []; p.on('pageerror', e => err.push(e.message));
  await p.addInitScript(() => { try { navigator.serviceWorker.register = () => new Promise(() => {}); } catch (e) {} });
  await p.goto('http://127.0.0.1:' + PORT + '/index.html', { waitUntil: 'load' });
  await p.waitForTimeout(900);
  await p.evaluate(() => showScreen('novinky'));
  const stav = () => p.evaluate(() => {
    const k = Array.from(document.querySelectorAll('#screen-novinky .home-wrap > .scard')).filter(x => !x.classList.contains('ai-feature'));
    const vid = k.filter(x => x.offsetHeight > 0);
    return { celkem: k.length, vid: vid.length, tit: vid.map(x => x.querySelector('.scard-title').textContent.trim().slice(0, 50)),
      marks: document.querySelectorAll('#screen-novinky mark.nov-mark').length,
      info: document.getElementById('nov-hledat-info').textContent,
      html: document.querySelector('#screen-novinky .home-wrap').innerHTML.length };
  });
  const hledej = async (t) => { await p.fill('#nov-hledat', t); await p.waitForTimeout(300); return stav(); };
  const zac = await stav();
  check('bez hledání jsou vidět všechny karty', zac.vid === zac.celkem && zac.celkem > 40, zac.vid + '/' + zac.celkem);
  const vid0 = await p.evaluate(() => document.getElementById('nov-hledat').offsetHeight);
  check('pole s lupou je nahoře vidět', vid0 > 0);

  let r = await hledej('rozvadec');
  check('bez háčků: „rozvadec" najde karty s „rozváděč"', r.vid > 0 && r.vid < r.celkem && r.marks > 0, r.vid + ' karet, ' + r.marks + ' zvýraznění');
  const zn = await p.evaluate(() => document.querySelector('#screen-novinky mark.nov-mark').textContent);
  check('zvýrazněný je původní text s háčky', /rozv[aá]d[eě]č/i.test(zn), zn);

  r = await hledej('RCD');
  const rcd = r.vid;
  r = await hledej('chránič');
  check('slovník: „chránič" najde i karty, kde je jen RCD', r.vid >= rcd && r.vid > 0, 'RCD ' + rcd + ', chránič ' + r.vid);

  r = await hledej('excel');
  const ex = r;
  check('„excel" najde kartu o Excelu', ex.tit.some(t => /Excel/.test(t)), ex.tit.join(' | '));
  r = await hledej('excel zpátky');
  check('víc slov = karta musí mít všechna (méně výsledků)', r.vid >= 1 && r.vid <= ex.vid, ex.vid + ' → ' + r.vid);

  r = await hledej('tabulky');
  check('česká koncovka: „tabulky" najde „tabulka/tabulce"', r.vid > 0, String(r.vid));

  // sbalení nesouvisejících odrážek
  const sb = await p.evaluate(async () => {
    const pole = document.getElementById('nov-hledat'); pole.value = 'Ctrl+V'; pole.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 300));
    const k = Array.from(document.querySelectorAll('#screen-novinky .home-wrap > .scard')).find(x => x.offsetHeight > 0 && /Excel ↔/.test(x.textContent));
    if (!k) return null;
    const li = Array.from(k.querySelectorAll('li'));
    return { vse: li.length, vid: li.filter(l => l.offsetHeight > 0).length, prvni: li.find(l => l.offsetHeight > 0).textContent.slice(0, 60) };
  });
  check('v nalezené kartě zůstanou jen odrážky, kterých se hledání týká', sb && sb.vid >= 1 && sb.vid < sb.vse, JSON.stringify(sb));

  r = await hledej('xyzqwv');
  check('nic nenalezeno → řekne to', r.vid === 0 && /Nic nenalezeno/.test(r.info), r.info);

  // Esc vrátí všechno a značky zmizí beze stopy
  await hledej('záloha');
  await p.focus('#nov-hledat'); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  r = await stav();
  check('Esc zruší hledání: všechny karty zpět, žádné značky', r.vid === r.celkem && r.marks === 0, r.vid + '/' + r.celkem + ' marks ' + r.marks);
  check('po zrušení je obsah Novinek stejný jako předtím', r.html === zac.html, zac.html + ' vs ' + r.html);
  const obr = await p.evaluate(() => document.getElementById('screen-novinky').classList.contains('active'));
  check('Esc v poli neodvede z Novinek', obr);

  // Ctrl+F skočí do pole
  await p.evaluate(() => { document.activeElement.blur(); window.scrollTo(0, 3000); });
  await p.keyboard.press('Control+f');
  const fok = await p.evaluate(() => document.activeElement && document.activeElement.id);
  check('Ctrl+F na Novinkách skočí do lupy', fok === 'nov-hledat', fok);

  // krátké slovo ze slovníku jen jako celé slovo
  const kr = await p.evaluate(() => [novObsahuje('vrh domu', ['rh']), novObsahuje('rozvadec rh 2', ['rh'])]);
  check('krátká slova (RH, FI) se hledají jen celá', !kr[0] && kr[1], JSON.stringify(kr));

  // hledá se od začátku slova — „chránič" nesmí trefit „ochranný"
  const zs = await p.evaluate(() => [novObsahuje(novNorm('spojitost ochranného obvodu'), novAlternativy(novNorm('chránič'))),
                                     novObsahuje(novNorm('proudové chrániče'), novAlternativy(novNorm('chránič')))]);
  check('„chránič" netrefí „ochranný", ale najde „chrániče"', !zs[0] && zs[1], JSON.stringify(zs));
  await hledej('chránič');
  const rc = await p.evaluate(() => Array.from(document.querySelectorAll('#screen-novinky mark.nov-mark')).map(m => m.textContent));
  check('zvýrazní se i RCD, ne jen dlouhá slova', rc.some(t => t === 'RCD'), rc.slice(0, 12).join(','));
  check('nezvýrazní se kus slova „ochran"', !rc.some(t => /^chran$/i.test(t)), rc.filter(t => /chran/i.test(t)).join(','));

  // pulsování Novinek to nerozbilo
  const nej = await p.evaluate(() => typeof getNovinkyLatest === 'function' ? getNovinkyLatest() : '');
  check('nejnovější datum Novinek se pořád počítá', /^2026-/.test(nej), nej);

  check('bez chyb stránky', err.length === 0, err.join(' | '));
  console.log(res.join('\n'));
  await b.close();
  process.exit(res.some(r => r.startsWith('❌')) ? 1 : 0);
})().catch(e => { console.error('CRASH:', e.message); process.exit(2); });
