// v9.95 — výběr víc řádků v tabulce měření + Ctrl+C / Ctrl+X / Ctrl+V / Delete.
const { chromium } = require('/opt/node22/lib/node_modules/playwright/node_modules/playwright-core');
const res = []; const check = (n, ok, d) => res.push((ok ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));

(async () => {
  const br = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await br.newContext({ viewport: { width: 1500, height: 1000 } });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:8901' });
  await ctx.addInitScript(() => { navigator.serviceWorker.register = () => new Promise(() => {}); });
  const p = await ctx.newPage();
  const chyby = []; p.on('pageerror', e => chyby.push(e.message));
  await p.goto('http://127.0.0.1:8901/index.html', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);
  await p.evaluate(() => { window.confirm = () => true; });

  // Zpráva: rozváděč RD se čtyřmi pojmenovanými obvody, volitelně druhý RM1.
  const zprava = async (druhy) => {
    await p.evaluate(async (druhy) => {
      localStorage.clear(); archiv.length = 0; STORE.archiv = archiv;
      aktTyp = 'elektro'; aktPodtyp = 'dum'; novaZprava('elektro');
      await new Promise(r => setTimeout(r, 800));
      document.querySelector('.tab-btn[data-tab="mereni"]').click();
      if (druhy) { addRozvadec(); await new Promise(r => setTimeout(r, 250)); }
      const karty = document.querySelectorAll('#rozvadece-container [data-rozvadec-id]');
      karty[0].querySelector('.rozv-nazev').value = 'RD';
      const tb = karty[0].querySelector('tbody');
      while (tb.querySelectorAll('tr[data-rowtype="obvod"]').length < 4) addMereniRowTo(tb);
      [...tb.querySelectorAll('tr[data-rowtype="obvod"]')].forEach((tr, i) => {
        fillCilovyInput(tr, 1).value = ['Světla', 'Zásuvky', 'Myčka', 'Trouba'][i];
      });
      if (druhy) {
        karty[1].querySelector('.rozv-nazev').value = 'RM1';
        [...karty[1].querySelectorAll('tbody tr[data-rowtype="obvod"]')].forEach((tr, i) => {
          fillCilovyInput(tr, 1).value = ['Dílna', 'Garáž'][i];
        });
      }
      window.__formDirty = false;
    }, druhy);
    await p.waitForTimeout(300);
  };
  const nazvy = (n) => p.evaluate((n) => {
    // Pole s nabídkou (datalist) se při fokusu dočasně vyprázdní, aby se
    // ukázala celá nabídka, a po odchodu se vrátí — číst až po odchodu.
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    const tb = document.querySelectorAll('#rozvadece-container .meas-table tbody')[n || 0];
    return [...tb.querySelectorAll('tr[data-rowtype="obvod"],tr[data-rowtype="rcd-header"],tr[data-rowtype="info"]')]
      .map(tr => { const i = tr.children[1] && tr.children[1].querySelector('input'); return i ? i.value : ''; });
  }, n);
  const cisla = (n) => p.evaluate((n) => {
    const tb = document.querySelectorAll('#rozvadece-container .meas-table tbody')[n || 0];
    return [...tb.querySelectorAll('tr[data-rowtype="obvod"],tr[data-rowtype="rcd-header"],tr[data-rowtype="info"]')]
      .map(tr => tr.querySelector('input').value).join(',');
  }, n);
  // Klik doprostřed buňky „Název obvodu" v řádku podle názvu, s klávesou.
  const klik = async (nazev, klavesa, tabulka) => {
    const el = await p.evaluateHandle(([nz, t]) => {
      const tb = document.querySelectorAll('#rozvadece-container .meas-table tbody')[t || 0];
      const pole = r => r.children[1] && r.children[1].querySelector('input');
      const tr = [...tb.querySelectorAll('tr[data-rowtype]')].find(r => { const i = pole(r); return i && i.value === nz; });
      return tr ? pole(tr) : null;
    }, [nazev, tabulka]);
    await el.evaluate(x => x.scrollIntoView({ block: 'center' }));
    const b = await el.boundingBox();
    if (klavesa) await p.keyboard.down(klavesa);
    await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    if (klavesa) await p.keyboard.up(klavesa);
    await p.waitForTimeout(120);
  };
  const vybrane = () => p.evaluate(() => mrVybraneHlavy().map(h => {
    const i = h.children[1] && h.children[1].querySelector('input'); return i ? i.value : '?';
  }));
  const toastZpet = () => p.evaluate(() => {
    const b = [...document.querySelectorAll('#toast-wrap button')].filter(x => x.textContent.includes('ZPĚT')).pop();
    if (b) b.click(); return !!b;
  });
  const vycistitToasty = () => p.evaluate(() => { const w = document.getElementById('toast-wrap'); if (w) w.innerHTML = ''; });

  // ══ 1. Výběr myší jako v Excelu ══════════════════════════════════
  await zprava(false);
  await klik('Zásuvky', 'Control');
  await klik('Trouba', 'Control');
  check('Ctrl+klik vybírá jednotlivé řádky', JSON.stringify(await vybrane()) === '["Zásuvky","Trouba"]', JSON.stringify(await vybrane()));
  check('kurzor po Ctrl+kliku v buňce NENÍ (jinak by Ctrl+C kopírovalo text)',
    await p.evaluate(() => document.activeElement === document.body || !document.activeElement.closest('td')));
  await klik('Trouba', 'Control');
  check('druhý Ctrl+klik řádek z výběru ubere', JSON.stringify(await vybrane()) === '["Zásuvky"]');
  // Úsek se počítá od naposledy kliknutého řádku — jako v Excelu.
  await klik('Zásuvky', 'Control'); await klik('Zásuvky', 'Control');
  await klik('Trouba', 'Shift');
  check('Shift+klik označí celý úsek', JSON.stringify(await vybrane()) === '["Zásuvky","Myčka","Trouba"]', JSON.stringify(await vybrane()));
  const vzhled = await p.evaluate(() => {
    const tr = mrVybraneHlavy()[0];
    const td = tr.children[1];
    const neTr = [...document.querySelectorAll('#rozvadece-container tr[data-rowtype="obvod"]')][0];
    return { vyb: getComputedStyle(td).boxShadow, ne: getComputedStyle(neTr.children[1]).boxShadow };
  });
  check('vybrané řádky jsou vidět zvýrazněné, ostatní ne',
    vzhled.vyb && vzhled.vyb !== 'none' && (vzhled.ne === 'none' || !vzhled.ne), vzhled.vyb + ' / ' + vzhled.ne);
  const sr = await p.evaluate(() => document.getElementById('stavovy-radek').innerText);
  check('stavový řádek řekne, kolik je vybráno a co s tím jde',
    /Vybráno: 3 řádky/.test(sr) && /Ctrl\+C/.test(sr) && /Del/.test(sr), sr.replace(/\s+/g, ' '));
  await p.keyboard.press('Escape');
  check('Esc výběr zruší', (await vybrane()).length === 0);
  await klik('Zásuvky', 'Control');
  await klik('Světla');
  check('obyčejný klik do buňky výběr zruší a kurzor jde do buňky',
    (await vybrane()).length === 0 && await p.evaluate(() => document.activeElement.tagName === 'INPUT'));

  // ══ 2. Ctrl+C a Ctrl+V ═══════════════════════════════════════════
  await zprava(false);
  await p.evaluate(() => {
    const tb = document.querySelector('#rozvadece-container tbody');
    const tr = [...tb.querySelectorAll('tr[data-rowtype="obvod"]')][1];
    fillCilovyInput(tr, 4).value = '16'; fillCilovyInput(tr, 7).value = '0,45';
  });
  await klik('Zásuvky', 'Control');
  await klik('Myčka', 'Shift');
  await p.keyboard.press('Control+c');
  await p.waitForTimeout(200);
  const schr = await p.evaluate(async () => ({
    pocet: __mrSchranka && __mrSchranka.pocet,
    sys: await navigator.clipboard.readText()
  }));
  const radkySys = schr.sys.split(/\r?\n/);
  check('Ctrl+C uloží řádky do schránky programu', schr.pocet === 2, String(schr.pocet));
  check('a do systémové schránky jde tabulka pro Excel (16 sloupců, řádek na obvod)',
    radkySys.length === 2 && radkySys[0].split('\t').length === 16 && radkySys[0].split('\t')[1] === 'Zásuvky' &&
    radkySys[0].split('\t')[7] === '0,45', JSON.stringify(radkySys[0]));
  await klik('Trouba');
  await p.keyboard.press('Control+v');
  await p.waitForTimeout(300);
  let n = await nazvy();
  check('Ctrl+V v buňce vloží řádky POD řádek, na kterém se stojí',
    n.join(',') === 'Světla,Zásuvky,Myčka,Trouba,Zásuvky,Myčka', n.join(','));
  check('i s hodnotami', await p.evaluate(() => {
    const tr = [...document.querySelectorAll('#rozvadece-container tr[data-rowtype="obvod"]')][4];
    return fillCilovyInput(tr, 4).value === '16' && fillCilovyInput(tr, 7).value === '0,45';
  }));
  check('čísla řádků se přečíslují', (await cisla()) === '1,2,3,4,5,6', await cisla());
  check('vložené řádky zůstanou vybrané (jako v Excelu)', JSON.stringify(await vybrane()) === '["Zásuvky","Myčka"]' &&
    await p.evaluate(() => mrVybraneHlavy()[0] === [...document.querySelectorAll('#rozvadece-container tr[data-rowtype="obvod"]')][4]));
  check('zpráva je označená jako neuložená', await p.evaluate(() => window.__formDirty === true));
  await toastZpet();
  await p.waitForTimeout(200);
  n = await nazvy();
  check('vložení jde vzít ZPĚT', n.join(',') === 'Světla,Zásuvky,Myčka,Trouba', n.join(','));

  // ══ 3. Do jiného rozváděče ═══════════════════════════════════════
  await zprava(true);
  await klik('Světla', 'Control');
  await p.keyboard.press('Control+c');
  await p.waitForTimeout(150);
  await klik('Dílna', null, 1);
  await p.keyboard.press('Control+v');
  await p.waitForTimeout(300);
  check('řádek jde vložit do jiného rozváděče', (await nazvy(1)).join(',') === 'Dílna,Světla,Garáž', (await nazvy(1)).join(','));
  check('a v původním zůstal', (await nazvy(0)).join(',') === 'Světla,Zásuvky,Myčka,Trouba');

  // ══ 4. Ctrl+X a Delete ═══════════════════════════════════════════
  await zprava(false);
  await klik('Zásuvky', 'Control');
  await klik('Myčka', 'Control');
  await vycistitToasty();
  await p.keyboard.press('Control+x');
  await p.waitForTimeout(250);
  check('Ctrl+X řádky vyjme', (await nazvy()).join(',') === 'Světla,Trouba', (await nazvy()).join(','));
  await klik('Trouba');
  await p.keyboard.press('Control+v');
  await p.waitForTimeout(300);
  check('a Ctrl+V je vloží jinam — přesun', (await nazvy()).join(',') === 'Světla,Trouba,Zásuvky,Myčka', (await nazvy()).join(','));
  await zprava(false);
  await klik('Zásuvky', 'Control');
  await klik('Trouba', 'Shift');
  await vycistitToasty();
  await p.keyboard.press('Delete');
  await p.waitForTimeout(250);
  check('Delete smaže vybrané řádky', (await nazvy()).join(',') === 'Světla', (await nazvy()).join(','));
  await toastZpet();
  await p.waitForTimeout(250);
  check('a ZPĚT je vrátí', (await nazvy()).join(',') === 'Světla,Zásuvky,Myčka,Trouba', (await nazvy()).join(','));
  await klik('Myčka');
  await p.keyboard.press('Delete');
  await p.waitForTimeout(150);
  check('Delete v buňce bez výběru dál maže jen písmena, ne řádek',
    (await nazvy()).length === 4);

  // ══ 5. Chránič je jeden celek ════════════════════════════════════
  await zprava(false);
  await p.evaluate(() => {
    addRcdRow(document.querySelector('#rozvadece-container [data-action="addRcdRow"]'));
    const h = document.querySelector('#rozvadece-container tr[data-rowtype="rcd-header"]');
    fillCilovyInput(h, 1).value = 'Koupelna';
    const sel = h.querySelector('select'); sel.value = 'B'; sel.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await p.waitForTimeout(200);
  // Ctrl+klik na PODŘÁDEK chrániče
  const pod = await p.$('#rozvadece-container tr[data-rowtype="rcd-mereni"] td:last-child');
  if (pod) {
    await pod.evaluate(x => x.scrollIntoView({ block: 'center' }));
    const bb = await pod.boundingBox();
    await p.keyboard.down('Control'); await p.mouse.click(bb.x + 3, bb.y + bb.height / 2); await p.keyboard.up('Control');
  }
  const rcd = await p.evaluate(() => {
    const h = mrVybraneHlavy()[0];
    return { hlava: h && h.dataset.rowtype, clenu: h ? mrClenove(h).length : 0,
      zvyr: document.querySelectorAll('tr.mr-vybrany').length };
  });
  check('Ctrl+klik na podřádek vybere celý chránič', rcd.hlava === 'rcd-header' && rcd.zvyr === rcd.clenu && rcd.clenu >= 2,
    JSON.stringify(rcd));
  await p.keyboard.press('Control+c');
  await klik('Světla');
  await p.keyboard.press('Control+v');
  await p.waitForTimeout(300);
  const kopieRcd = await p.evaluate(() => {
    const hl = [...document.querySelectorAll('#rozvadece-container tr[data-rowtype="rcd-header"]')];
    return { pocet: hl.length, skupiny: hl.map(h => h.dataset.rcdGroup),
      typ: hl.map(h => h.querySelector('select').value),
      pod: hl.map(h => document.querySelectorAll('#rozvadece-container tr[data-rcd-group="' + h.dataset.rcdGroup + '"]').length),
      poradi: [...document.querySelectorAll('#rozvadece-container tbody tr')].map(t => t.dataset.rowtype).slice(0, 4).join(',') };
  });
  check('kopie chrániče dostane vlastní skupinu a typ B zůstane',
    kopieRcd.pocet === 2 && kopieRcd.skupiny[0] !== kopieRcd.skupiny[1] && kopieRcd.typ.join() === 'B,B' &&
    kopieRcd.pod[0] === kopieRcd.pod[1], JSON.stringify(kopieRcd));
  check('a sedne i s podřádky pod řádek, na kterém se stálo',
    /^obvod,rcd-header,rcd-mereni/.test(kopieRcd.poradi), kopieRcd.poradi);
  // smazat kopii přes její ✕ nesmí sáhnout na originál
  await p.evaluate(() => {
    const h = [...document.querySelectorAll('#rozvadece-container tr[data-rowtype="rcd-header"]')][0];
    const b = document.querySelector('#rozvadece-container tr[data-rcd-group="' + h.dataset.rcdGroup + '"] [data-action="delRcdGroup"]');
    if (b) b.click();
  });
  await p.waitForTimeout(250);
  check('✕ u kopie chrániče smaže jen kopii', await p.evaluate(() =>
    document.querySelectorAll('#rozvadece-container tr[data-rowtype="rcd-header"]').length === 1));

  // ══ 6. Vazba „napájí rozváděč" ═══════════════════════════════════
  await zprava(false);
  await p.evaluate(() => {
    const tr = [...document.querySelectorAll('#rozvadece-container tr[data-rowtype="obvod"]')][3];
    napajiZapsat(tr, ['uid-x'], ['RM9']);
  });
  await klik('Trouba', 'Control');
  await p.keyboard.press('Control+c');
  await klik('Světla');
  await p.keyboard.press('Control+v');
  await p.waitForTimeout(250);
  const vazby = await p.evaluate(() => [...document.querySelectorAll('#rozvadece-container tr[data-rowtype="obvod"]')]
    .map(tr => (fillCilovyInput(tr, 1).value) + ':' + (tr.dataset.napaji || '')));
  check('KOPIE vazbu na napájený rozváděč nepřebírá (dva jističe na jeden rozváděč)',
    vazby.join(',') === 'Světla:,Trouba:,Zásuvky:,Myčka:,Trouba:uid-x', vazby.join(','));
  await klik('Trouba', 'Control');
  await p.evaluate(() => { __mrVyber = [[...document.querySelectorAll('#rozvadece-container tr[data-rowtype="obvod"]')][4]]; mrVykreslit(); });
  await p.keyboard.press('Control+x');
  await klik('Světla');
  await p.keyboard.press('Control+v');
  await p.waitForTimeout(250);
  const vazby2 = await p.evaluate(() => [...document.querySelectorAll('#rozvadece-container tr[data-rowtype="obvod"]')]
    .filter(tr => tr.dataset.napaji).map(tr => fillCilovyInput(tr, 1).value));
  check('PŘESUN (Ctrl+X → Ctrl+V) vazbu zachová', vazby2.join(',') === 'Trouba', vazby2.join(','));

  // ══ 7. Mezi zprávami ═════════════════════════════════════════════
  await zprava(false);
  await klik('Myčka', 'Control');
  await p.keyboard.press('Control+c');
  await p.waitForTimeout(150);
  await p.evaluate(async () => {
    novaZprava('elektro'); await new Promise(r => setTimeout(r, 800));
    document.querySelector('.tab-btn[data-tab="mereni"]').click();
  });
  await p.waitForTimeout(300);
  await p.evaluate(() => {
    const tr = document.querySelector('#rozvadece-container tr[data-rowtype="obvod"]');
    fillCilovyInput(tr, 1).value = 'Nová';
  });
  await klik('Nová');
  await p.keyboard.press('Control+v');
  await p.waitForTimeout(300);
  check('zkopírované řádky jde vložit i do JINÉ zprávy', (await nazvy()).indexOf('Myčka') === 1, (await nazvy()).join(','));

  // ══ 8. Cizí tabulka z Excelu při stání na vybraných řádcích ══════
  await zprava(false);
  await klik('Zásuvky', 'Control');
  await p.evaluate(() => {
    const dt = new DataTransfer(); dt.setData('text/plain', 'Název obvodu\tA\nKotel\t10');
    document.body.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  });
  await p.waitForTimeout(250);
  check('cizí blok z Excelu otevře dialog vložení (v9.92), ne slepé vložení',
    await p.evaluate(() => document.getElementById('modal-vlozit-mereni').classList.contains('open')));
  await p.evaluate(() => vlozitMereniZavrit());

  // ══ 9. Obyčejné kopírování textu v buňce zůstalo ═════════════════
  await zprava(false);
  await p.evaluate(() => { fillCilovyInput([...document.querySelectorAll('#rozvadece-container tr[data-rowtype="obvod"]')][2], 1).value = 'Myčka nádobí XY'; });
  await klik('Myčka nádobí XY');
  await p.keyboard.press('Control+a');
  await p.keyboard.press('Control+c');
  await p.waitForTimeout(150);
  check('Ctrl+C v buňce bez výběru řádků kopíruje text buňky jako dřív',
    (await p.evaluate(() => navigator.clipboard.readText())) === 'Myčka nádobí XY');

  // ══ 10. Dokončená zpráva ═════════════════════════════════════════
  await zprava(false);
  await p.evaluate(() => setFormReadOnly(true));
  await p.waitForTimeout(200);
  await klik('Zásuvky', 'Control');
  await p.keyboard.press('Control+c');
  await p.waitForTimeout(150);
  check('z dokončené zprávy jde řádky vybrat a zkopírovat', await p.evaluate(() =>
    mrVybraneHlavy().length === 1 && __mrSchranka && __mrSchranka.pocet === 1));
  await p.keyboard.press('Delete');
  await p.keyboard.press('Control+x');
  await p.waitForTimeout(200);
  check('ale smazat ani vyjmout ne', (await nazvy()).length === 4, (await nazvy()).join(','));
  await p.evaluate(() => mrVlozit(document.querySelector('#rozvadece-container tr[data-rowtype="obvod"]')));
  check('a nic se do ní nevloží', (await nazvy()).length === 4);
  await p.evaluate(() => setFormReadOnly(false));

  // ══ 11. Kontextové menu nad výběrem ══════════════════════════════
  await zprava(false);
  await klik('Zásuvky', 'Control');
  await klik('Myčka', 'Shift');
  const el = await p.evaluateHandle(() => mrVybraneHlavy()[0].children[1]);
  const bb = await el.boundingBox();
  await p.mouse.click(bb.x + 10, bb.y + bb.height / 2, { button: 'right' });
  await p.waitForTimeout(200);
  const menu = await p.evaluate(() => [...document.querySelectorAll('.kt-menu .kt-pol')].map(b => b.textContent));
  check('pravý klik na výběr nabídne kopírovat, vyjmout a smazat vybrané (2)',
    menu.some(x => /Kopírovat vybrané \(2\)/.test(x)) && menu.some(x => /Vyjmout vybrané/.test(x)) &&
    menu.some(x => /Smazat vybrané \(2\)/.test(x)), menu.join(' | '));
  await p.evaluate(() => [...document.querySelectorAll('.kt-menu .kt-pol')].find(b => /Kopírovat vybrané/.test(b.textContent)).click());
  await p.waitForTimeout(150);
  const el2 = await p.evaluateHandle(() => [...document.querySelectorAll('#rozvadece-container tr[data-rowtype="obvod"]')][3].children[1]);
  const bb2 = await el2.boundingBox();
  await p.mouse.click(bb2.x + 10, bb2.y + bb2.height / 2, { button: 'right' });
  await p.waitForTimeout(200);
  const menu2 = await p.evaluate(() => [...document.querySelectorAll('.kt-menu .kt-pol')].map(b => b.textContent));
  check('po kopii nabídne i „Vložit zkopírované pod"', menu2.some(x => /Vložit zkopírované pod \(2 řádky\)/.test(x)), menu2.join(' | '));
  await p.evaluate(() => [...document.querySelectorAll('.kt-menu .kt-pol')].find(b => /Vložit zkopírované/.test(b.textContent)).click());
  await p.waitForTimeout(250);
  check('a vložení z menu funguje', (await nazvy()).join(',') === 'Světla,Zásuvky,Myčka,Trouba,Zásuvky,Myčka', (await nazvy()).join(','));

  check('žádné chyby v konzoli', chyby.length === 0, chyby.join(' | '));
  console.log(res.join('\n'));
  console.log('\n' + res.filter(x => x[0] === '✅').length + '/' + res.length + ' prošlo');
  await br.close();
  process.exit(res.some(x => x[0] === '❌') ? 1 : 0);
})();
