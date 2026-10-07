// v9.110 — Skryté objekty bez zprávy v archivu jde ZAPOMENOUT NATRVALO.
// Objekty se zprávami ne (vrátily by se do plánu). Vymyšlená data.
const { chromium } = require('/opt/node22/lib/node_modules/playwright/node_modules/playwright-core');
const PORT = process.env.PORT || 8901;
const res = []; const check = (n, ok, d) => res.push((ok ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await br.newContext({ viewport: { width: 1400, height: 950 } });
  await ctx.addInitScript(() => { navigator.serviceWorker.register = () => new Promise(() => {}); });
  const p = await ctx.newPage(); const chyby = []; p.on('pageerror', e => chyby.push(e.message));
  const dotazy = []; p.on('dialog', d => { dotazy.push(d.message()); d.accept(); });
  await p.goto('http://127.0.0.1:' + PORT + '/index.html', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);
  const r = await p.evaluate(async () => {
    const g = id => document.getElementById(id); const out = {};
    const cekej = () => new Promise(r => setTimeout(r, 100));
    localStorage.clear(); archiv.length = 0; STORE.archiv = archiv; STORE.plan = {};
    const zp = (uid, misto, datum) => archiv.push({ uid, typ: 'elektro', ev_cislo: uid, misto, datum, data: { typ: 'elektro', pristi: '2030-01-01' } });
    zp('a', 'Kotelna A', '2025-01-01'); zp('b', 'Sklad B', '2025-01-01'); zp('c', 'Dílna C', '2025-01-01');
    STORE.archiv = archiv; showScreen('plan'); renderPlan();
    const radek = n => planRadky().find(x => x.nazev === n);
    const P = planData();
    // Dílna C dostane vlastní údaje, pak se skryjí všechny tři
    planZajistitObjekt(radek('Dílna C').id).cyklus = { EL: 3 }; planUlozit(); renderPlan();
    __planVybrane = {}; ['Kotelna A', 'Sklad B', 'Dílna C'].forEach(n => __planVybrane[radek(n).id] = true);
    planVybraneSmazat();
    // zprávy Sklad B a Dílna C z archivu zmizí → sirotci
    for (let i = archiv.length - 1; i >= 0; i--) if (archiv[i].uid !== 'a') archiv.splice(i, 1);
    STORE.archiv = archiv; planUlozit(); renderPlan();
    g('plan-btn-skryte').click(); await cekej();
    const cb = n => Array.from(document.querySelectorAll('#plan-skryte-seznam .plan-skryty')).find(l => l.textContent.indexOf(n) >= 0).querySelector('input');
    const zap = g('plan-skryte-zapomenout');
    out.text = Array.from(document.querySelectorAll('#plan-skryte-seznam .plan-skryty')).map(l => l.textContent.replace(/\s+/g, ' '));
    out.disPred = zap.disabled;
    const zaskrtni = n => { const c = cb(n); c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true })); };
    zaskrtni('Kotelna A');
    out.disJenSeZpravou = zap.disabled;
    zaskrtni('Sklad B'); zaskrtni('Dílna C');
    out.textTl = zap.textContent; out.disSirotci = zap.disabled;
    zap.click(); await cekej();
    out.po = { skryte: planData().skryte.slice(), info: Object.keys(planData().skryteInfo || {}),
      otevreno: g('modal-plan-skryte').classList.contains('open'),
      polozky: document.querySelectorAll('#plan-skryte-seznam .plan-skryty').length,
      kotelnaVPlanu: !!radek('Kotelna A') };
    zpetPosledni(); await cekej();
    out.zpet = { skryte: planData().skryte.length, dilnaInfo: !!(planData().skryteInfo['Dílna C'] || Object.values(planData().skryteInfo).some(i => i.objekt && i.objekt.cyklus)) };
    // po restartu (uložení) zůstane zapomenuto
    g('plan-btn-skryte').click(); await cekej();
    ['Sklad B'].forEach(zaskrtni); zap.click(); await cekej();
    out.ulozeno = JSON.parse(JSON.stringify(STORE.plan.skryte));
    return out;
  });
  const dz = dotazy.find(x => /Zapomenout natrvalo/.test(x)) || '';
  const t = n => r.text.find(x => x.indexOf(n) >= 0) || '';
  check('u objektu bez zprávy je napsáno, že jde zapomenout', /jde zapomenout natrvalo/.test(t('Sklad B')), t('Sklad B'));
  check('u objektu se zprávou ne', !/zapomenout/.test(t('Kotelna A')), t('Kotelna A'));
  check('bez výběru je „Zapomenout" vypnuté', r.disPred === true);
  check('jen objekt se zprávou v archivu: „Zapomenout" zůstane vypnuté', r.disJenSeZpravou === true);
  check('se sirotky se zapne a ukazuje jejich počet (ne všech označených)', r.disSirotci === false && /\(2\)/.test(r.textTl), r.textTl);
  check('dotaz jmenuje objekty a varuje před ztrátou vyplněných údajů a o objektu se zprávou',
    /Sklad B/.test(dz) && /Dílna C/.test(dz) && !/Kotelna A/.test(dz) && /lhůty/.test(dz) && /1 označených mají zprávy/.test(dz), dz.replace(/\n/g, ' ').slice(0, 160));
  check('zapomenou se jen sirotci, objekt se zprávou zůstane skrytý', r.po.skryte.length === 1 && r.po.info.length === 1 && !r.po.kotelnaVPlanu, JSON.stringify(r.po));
  check('okno zůstane otevřené se zbytkem', r.po.otevreno && r.po.polozky === 1);
  check('ZPĚT / Ctrl+Z vrátí oba i s vyplněnými údaji', r.zpet.skryte === 3 && r.zpet.dilnaInfo, JSON.stringify(r.zpet));
  check('zapomenutí se uloží do dat', r.ulozeno.length === 2 && !r.ulozeno.some(k => /sklad b/i.test(k)), JSON.stringify(r.ulozeno));
  check('bez chyb v konzoli', chyby.length === 0, chyby.slice(0, 3).join(' | '));
  await br.close(); res.forEach(x => console.log(x));
  process.exit(res.some(x => x.startsWith('❌')) ? 1 : 0);
})();
