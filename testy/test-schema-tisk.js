// v9.97 — schéma rozváděčů k tisku: navazování čar, rozvržení na co nejméně
// listů (na šířku ve dvou sloupcích / zmenšení), rámeček přes všechny kabely.
const { chromium } = require('/opt/node22/lib/node_modules/playwright/node_modules/playwright-core');
const postav = require('./schema-fixt.js');
const PORT = process.env.PORT || 8901;
const res = []; const check = (n, ok, d) => res.push((ok?'✅':'❌')+' '+n+(d?' — '+d:''));
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await b.newPage({ viewport: { width: 1500, height: 1100 } });
  const err = []; p.on('pageerror', e => err.push(e.message));
  await p.addInitScript(() => { try { navigator.serviceWorker.register = () => new Promise(() => {}); } catch (e) {} });
  await p.goto('http://127.0.0.1:' + PORT + '/index.html', { waitUntil: 'load' });
  await p.waitForTimeout(900);
  await postav(p);

  // ── rámeček přes všechny kabely (panel v programu) ──
  await p.evaluate(() => { switchTab('mereni'); renderRozvStrom(); });
  await p.waitForTimeout(200);
  const ram = await p.evaluate(() => {
    const telo = document.getElementById('rozv-strom-telo');
    const box = Array.from(telo.querySelectorAll('span')).find(s => s.textContent.trim() === 'RS114');
    const radek = box.closest('div[style*="position:relative"]');
    const pod = radek.lastElementChild;          // vějíř pod rámečkem
    const cary = Array.from(pod.children).map(c => c.getBoundingClientRect().left);
    const r = box.getBoundingClientRect();
    return { levy: r.left, pravy: r.right, cary: cary };
  });
  check('RS114 má 6 kabelů', ram.cary.length === 6, String(ram.cary.length));
  check('všechny kabely vycházejí z dolní hrany rámečku (panel)',
    ram.cary.every(x => x > ram.levy && x < ram.pravy - 3), JSON.stringify(ram));

  // ── schéma: rozvržení ──
  await p.evaluate(() => { stromTisk(); });
  await p.waitForTimeout(500);
  const s = await p.evaluate(() => {
    const str = Array.from(document.querySelectorAll('#schema-pdf-pages .a4'));
    const mm = 96 / 25.4;
    return { navrh: window.__schemaNavrh, stran: str.length,
      vysky: str.map(e => e.getBoundingClientRect().height / mm),
      land: str.map(e => e.classList.contains('a4-landscape')),
      sloupcu: str.map(e => e.querySelectorAll('[data-schema-sloupec]').length),
      text: document.getElementById('schema-pdf-pages').innerText,
      info: document.getElementById('schema-pdf-info').textContent };
  });
  check('strom 19 rozváděčů se vejde na JEDEN list', s.stran === 1, s.info);
  check('rozvržení na šířku ve dvou sloupcích', s.land[0] && s.sloupcu[0] === 2, JSON.stringify(s.navrh));
  check('list nepřetekl', s.vysky.every((h, i) => h <= (s.land[i] ? 210.6 : 297.6)), s.vysky.map(Math.round).join(','));
  check('všech 19 rozváděčů je v náhledu',
    ['RH1','RM 701','R 702.2.2','RS114.2.1','RM-SK1','RS3','EME','RS11'].every(n => s.text.indexOf(n) !== -1));
  check('info v liště říká orientaci', /na šířku/.test(s.info), s.info);

  // Druhý sloupec, který začíná uprostřed stromu, má odsazení a průběžné čáry
  const nav = await p.evaluate(() => {
    const sl = document.querySelectorAll('#schema-pdf-pages [data-schema-sloupec]');
    const druhy = sl[1]; if (!druhy) return null;
    const radky = Array.from(druhy.children).filter(d => d.style.position === 'relative');
    const prvni = radky[0];
    const obsah = prvni.querySelector('div[style*="margin-left"]');
    return { pokrac: (druhy.firstElementChild.textContent || ''),
             odsazeni: parseFloat(getComputedStyle(obsah).marginLeft),
             cary: prvni.querySelectorAll(':scope > span').length };
  });
  check('pokračující sloupec říká, odkud se pokračuje', nav && /pokračování — RH2/.test(nav.pokrac), nav && nav.pokrac);
  check('pokračující sloupec drží odsazení (nezačíná u kraje)', nav && nav.odsazeni > 10, nav && String(nav.odsazeni));
  check('pokračující sloupec má průběžné čáry', nav && nav.cary >= 1, nav && String(nav.cary));

  // ── ruční volba „na výšku": víc listů, ale čáry navazují ──
  const v = await p.evaluate(() => {
    const sel = document.getElementById('schema-rozvrzeni'); sel.value = 'vysku';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    const str = Array.from(document.querySelectorAll('#schema-pdf-pages .a4'));
    const mm = 96 / 25.4;
    const druha = str[1];
    let odsaz = 0, pokr = '';
    if (druha) {
      const sl = druha.querySelector('[data-schema-sloupec]');
      pokr = sl.firstElementChild.textContent;
      const radky = Array.from(sl.children).filter(d => d.style.position === 'relative');
      odsaz = parseFloat(getComputedStyle(radky[0].querySelector('div[style*="margin-left"]')).marginLeft);
    }
    return { stran: str.length, land: str.some(e => e.classList.contains('a4-landscape')), odsaz, pokr,
             vysky: str.map(e => e.getBoundingClientRect().height / mm), navrh: window.__schemaNavrh };
  });
  check('na výšku: bez listu na šířku', !v.land, JSON.stringify(v.navrh));
  check('na výšku: žádný list nepřetekl', v.vysky.every(h => h <= 297.6), v.vysky.map(Math.round).join(','));
  if (v.stran > 1) {
    check('na výšku: druhá strana drží odsazení', v.odsaz > 10, String(v.odsaz));
    check('na výšku: druhá strana říká, odkud pokračuje', /pokračování/.test(v.pokr) || v.odsaz === 0, v.pokr);
  } else check('na výšku se vešlo zmenšené na jeden list', v.navrh.k < 1, JSON.stringify(v.navrh));

  // ── malý strom zůstane na výšku a nezmenšený ──
  await p.evaluate(async () => {
    const karty=()=>document.querySelectorAll('#rozvadece-container [data-rozvadec-id]');
    while (karty().length > 3) karty()[karty().length-1].remove();
    const sel = document.getElementById('schema-rozvrzeni'); sel.value = 'auto';
    showScreen('form'); stromTisk();
  });
  const mal = await p.evaluate(() => window.__schemaNavrh);
  check('malý strom: jeden list na výšku v plné velikosti',
    mal && mal.stran === 1 && !mal.sirka && mal.k === 1, JSON.stringify(mal));

  // ── zmenšení nesahá na tloušťku čar ──
  const m = await p.evaluate(() => stromMeritko({ a: 10, fontBox: '11pt', pad: '1.2mm 3mm', cara: '.5pt solid #666' }, 0.8));
  check('stromMeritko zmenší čísla, písmo i okraje, čáry nechá',
    m.a === 8 && m.fontBox === '8.8pt' && m.pad === '0.96mm 2.4mm' && m.cara === '.5pt solid #666', JSON.stringify(m));

  check('bez chyb stránky', err.length === 0, err.join(' | '));
  console.log(res.join('\n'));
  await b.close();
  process.exit(res.some(r => r.startsWith('❌')) ? 1 : 0);
})().catch(e => { console.error('CRASH:', e.message); process.exit(2); });
