// v9.109 — Plán revizí: skryté objekty jde PROHLÉDNOUT a vrátit JEDNOTLIVĚ.
// Pokyn uživatele 2026-10-05: „když za měsíc zapomenu, co jsem skryl, tak nemám
// možnost nahlédnout, co je skryté, jen je můžu vrátit zpět, což nechci, a ještě
// všechny najednou." Navíc se při skrytí ztrácel vlastní záznam objektu
// (složka, technik, lhůty) — vrácený objekt přišel o všechno. Vymyšlená data.
const { chromium } = require('/opt/node22/lib/node_modules/playwright/node_modules/playwright-core');
const PORT = process.env.PORT || 8901;
const res = []; const check = (n, ok, d) => res.push((ok ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));

(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await br.newContext({ viewport: { width: 1400, height: 950 } });
  await ctx.addInitScript(() => { navigator.serviceWorker.register = () => new Promise(() => {}); });
  const p = await ctx.newPage(); const chyby = []; p.on('pageerror', e => chyby.push(e.message));
  p.on('dialog', d => d.accept());
  await p.goto('http://127.0.0.1:' + PORT + '/index.html', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);

  const r = await p.evaluate(async () => {
    const g = id => document.getElementById(id);
    const out = {};
    localStorage.clear(); archiv.length = 0; STORE.archiv = archiv; STORE.plan = {};
    const zp = (uid, typ, misto, datum, stroj) => archiv.push({ uid, typ, ev_cislo: uid.toUpperCase(), misto: stroj ? '' : misto, datum,
      data: Object.assign({ typ, pristi: '2030-01-01' }, stroj ? { stroje: { rozsah: 'jeden', seznam: [{ nazev: stroj, umisteni: misto, mereni: [], kontroly: [] }] } } : {}) });
    zp('re-1', 'elektro', 'Kotelna A', '2025-03-01');
    zp('rs-1', 'stroje', 'Hala X', '2026-02-01', 'Lis X');
    zp('re-2', 'elektro', 'Sklad B', '2024-05-01');
    zp('re-3', 'elektro', 'Sklad B2', '2023-05-01');
    zp('re-4', 'elektro', 'Dílna C', '2022-05-01');
    STORE.archiv = archiv;
    showScreen('plan'); renderPlan();
    const radek = n => planRadky().find(x => x.nazev === n);

    // Kotelna A dostane vlastní údaje: složku, technika, lhůtu
    const P = planData();
    if (!Array.isArray(P.slozky)) P.slozky = [];
    P.slozky.push({ id: 'sl1', typ: 'budova', nazev: 'Budova T', rodic: '' });
    if (!Array.isArray(P.technici)) P.technici = [];
    P.technici.push({ id: 't1', jmeno: 'Technik T', barva: '#123456' });
    const ok = planZajistitObjekt(radek('Kotelna A').id);
    ok.rodic = 'sl1'; ok.technik = 't1'; ok.cyklus = { EL: 3 };
    planUlozit(); renderPlan();

    // skrýt Kotelnu A a Lis X
    __planVybrane = {}; __planVybrane[radek('Kotelna A').id] = true; __planVybrane[radek('Lis X').id] = true;
    planVybraneSmazat();
    // sloučit Sklad B2 do Sklad B
    __planVybrane = {}; __planVybrane[radek('Sklad B').id] = true;
    const b2 = radek('Sklad B2'); __planVybrane[b2.id] = true;
    planVybraneSloucit();
    // skrytí ze starší verze (bez info) — Dílna C
    P.skryte.push(radek('Dílna C').klic); planUlozit(); renderPlan();

    out.tlacitko = g('plan-btn-skryte').textContent;
    g('plan-btn-skryte').click();
    await new Promise(r => setTimeout(r, 100));
    if (window.__snimek) await window.__snimek();
    const modal = g('modal-plan-skryte');
    const polozky = () => Array.from(document.querySelectorAll('#plan-skryte-seznam .plan-skryty')).map(l => l.textContent.replace(/\s+/g, ' ').trim());
    out.otevreno = modal.classList.contains('open');
    out.polozky = polozky();
    out.tlVratitDis = g('plan-skryte-vratit').disabled;

    // vrátit jen Kotelnu A
    const cb = Array.from(document.querySelectorAll('#plan-skryte-seznam .plan-skryty')).find(l => /Kotelna A/.test(l.textContent)).querySelector('input');
    cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true }));
    out.tlVratitText = g('plan-skryte-vratit').textContent; out.tlVratitDis2 = g('plan-skryte-vratit').disabled;
    g('plan-skryte-vratit').click();
    await new Promise(r => setTimeout(r, 100));
    const k = radek('Kotelna A');
    out.kotelna = k ? { rodic: k.rodic, technik: k.technik, cyklus: JSON.stringify(k.o && k.o.cyklus) } : null;
    out.poVraceni = { otevreno: modal.classList.contains('open'), polozky: polozky().length,
      lis: !!radek('Lis X'), skryto: planData().skryte.length };

    // ZPĚT (Ctrl+Z jede přes tutéž obálku) — Kotelna se znovu schová
    zpetPosledni();
    await new Promise(r => setTimeout(r, 100));
    out.zpet = { kotelna: !!radek('Kotelna A'), skryto: planData().skryte.length };

    // Označit vše → vrátit vše
    g('plan-btn-skryte').click(); await new Promise(r => setTimeout(r, 100));
    const vse = g('plan-skryte-vse'); vse.checked = true; vse.dispatchEvent(new Event('change', { bubbles: true }));
    out.vseZaskrtnuto = Array.from(document.querySelectorAll('.plan-skryty-vyber')).every(c => c.checked);
    g('plan-skryte-vratit').click(); await new Promise(r => setTimeout(r, 100));
    out.konec = { otevreno: modal.classList.contains('open'), skryto: planData().skryte.length,
      tlacitkoVidet: g('plan-btn-skryte').style.display !== 'none',
      vsechny: ['Kotelna A', 'Lis X', 'Sklad B2', 'Dílna C'].every(n => !!radek(n)),
      kotelnaSlozka: (radek('Kotelna A') || {}).rodic };
    return out;
  });

  check('tlačítko ukazuje počet skrytých', /Skryté \(4\)/.test(r.tlacitko), r.tlacitko);
  check('klepnutí otevře seznam skrytých (nic se nevrací naráz)', r.otevreno && r.polozky.length === 4, r.polozky.length + ' položek');
  const poradi = ['Dílna C', 'Kotelna A', 'Lis X', 'Sklad B2'];
  check('seznam je seřazený podle názvu', r.polozky.length === 4 && poradi.every((n, i) => r.polozky[i].indexOf(n) === 0), r.polozky.map(t => t.slice(0, 10)).join('|'));
  const pol = n => r.polozky.find(t => t.indexOf(n) === 0) || '';
  check('u stroje je vidět umístění i zprávy v archivu', /Hala X/.test(pol('Lis X')) && /1 zpráva v archivu/.test(pol('Lis X')) && /\(T\)/.test(pol('Lis X')), pol('Lis X'));
  check('u sloučeného je vidět, kam byl sloučen', /sloučeno do „Sklad B"/.test(pol('Sklad B2')), pol('Sklad B2'));
  check('u odebraného je datum skrytí', /skryto \d/.test(pol('Lis X')), pol('Lis X'));
  check('u objektu s vlastními údaji: „vrátí se i složka, technik a lhůty"', /vrátí se i složka/.test(pol('Kotelna A')), pol('Kotelna A'));
  check('skrytí ze starší verze (bez záznamu) se ukáže podle archivu', /Dílna C/.test(pol('Dílna C')) && /1 zpráva v archivu/.test(pol('Dílna C')), pol('Dílna C'));
  check('bez výběru je „Vrátit" vypnuté', r.tlVratitDis === true);
  check('po zaškrtnutí ukazuje počet a zapne se', r.tlVratitText.indexOf('(1)') > 0 && r.tlVratitDis2 === false, r.tlVratitText);
  check('vrátí se JEN vybraný objekt', !!r.kotelna && !r.poVraceni.lis && r.poVraceni.skryto === 3, JSON.stringify(r.poVraceni));
  check('…a okno zůstane otevřené se zbytkem', r.poVraceni.otevreno && r.poVraceni.polozky === 3);
  check('vrácený objekt má zpátky složku, technika i lhůtu', r.kotelna && r.kotelna.rodic === 'sl1' && r.kotelna.technik === 't1' && r.kotelna.cyklus === '{"EL":3}', JSON.stringify(r.kotelna));
  check('ZPĚT / Ctrl+Z vrácení vezme zpátky', r.zpet.kotelna === false && r.zpet.skryto === 4, JSON.stringify(r.zpet));
  check('„Označit vše" zaškrtne všechny', r.vseZaskrtnuto);
  check('vrátit vše: všechny objekty v plánu, okno zavřené, tlačítko zmizí',
    r.konec.vsechny && r.konec.skryto === 0 && !r.konec.otevreno && !r.konec.tlacitkoVidet, JSON.stringify(r.konec));
  check('i po vrácení přes ZPĚT a znovu má Kotelna svou složku', r.konec.kotelnaSlozka === 'sl1', r.konec.kotelnaSlozka);
  check('bez chyb v konzoli', chyby.length === 0, chyby.slice(0, 3).join(' | '));
  await br.close();
  res.forEach(x => console.log(x));
  process.exit(res.some(x => x.startsWith('❌')) ? 1 : 0);
})();
