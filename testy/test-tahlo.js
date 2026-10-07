// v9.96 — táhlo pro kopírování hodnot nesmí zůstat viset po kopii řádku.
const { chromium } = require('/opt/node22/lib/node_modules/playwright/node_modules/playwright-core');
const PORT = process.env.PORT || '8901';
const res = []; const check = (n, ok, d) => res.push((ok ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));
(async () => {
  const br = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await br.newContext({ viewport: { width: 1500, height: 1000 } });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:' + PORT });
  await ctx.addInitScript(() => { navigator.serviceWorker.register = () => new Promise(() => {}); });
  const p = await ctx.newPage();
  const chyby = []; p.on('pageerror', e => chyby.push(e.message));
  await p.goto('http://127.0.0.1:' + PORT + '/index.html'); await p.waitForTimeout(1500);
  await p.evaluate(async () => {
    window.confirm = () => true;
    aktTyp = 'elektro'; aktPodtyp = 'dum'; novaZprava('elektro'); await new Promise(r => setTimeout(r, 800));
    document.querySelector('.tab-btn[data-tab="mereni"]').click();
    const tb = document.querySelector('#rozvadece-container tbody');
    addRcdRow(document.querySelector('#rozvadece-container [data-action="addRcdRow"]'));
    [...tb.querySelectorAll('tr[data-rowtype="obvod"]')].forEach((tr, i) => { fillCilovyInput(tr, 1).value = 'Obvod ' + (i + 1); });
  });
  await p.waitForTimeout(300);
  const tahla = () => p.evaluate(() => {
    const vse = [...document.querySelectorAll('.fill-handle')];
    return { pocet: vse.length, videt: vse.filter(x => x.offsetHeight > 0 && getComputedStyle(x).display !== 'none').length,
      id: document.querySelectorAll('#fill-handle').length };
  });
  const fokus = async (sel) => {
    const el = await p.$(sel); await el.evaluate(x => x.scrollIntoView({ block: 'center' }));
    const b = await el.boundingBox(); await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2); await p.waitForTimeout(120);
  };
  // 1. ⧉ u řádku, když je v něm táhlo
  await fokus('#rozvadece-container tr[data-rowtype="obvod"] td:nth-child(8) input');
  let t = await tahla();
  check('po kliknutí do buňky je vidět právě jedno táhlo', t.videt === 1, JSON.stringify(t));
  await p.evaluate(() => document.querySelector('#rozvadece-container tr[data-rowtype="obvod"] [data-action="copyRow"]').click());
  await p.waitForTimeout(200);
  t = await tahla();
  check('⧉ kopie řádku táhlo nezkopíruje', t.pocet <= 1 && t.id <= 1, JSON.stringify(t));
  // 2. kopie chrániče
  await fokus('#rozvadece-container tr[data-rowtype="rcd-mereni"] td:nth-child(3) input');
  await p.evaluate(() => document.querySelector('#rozvadece-container [data-action="copyRcdGroup"]').click());
  await p.waitForTimeout(200);
  t = await tahla();
  check('kopie chrániče táhlo nezkopíruje', t.pocet <= 1, JSON.stringify(t));
  // 3. kopie rozváděče
  await fokus('#rozvadece-container tr[data-rowtype="obvod"] td:nth-child(9) input');
  await p.evaluate(() => { const b = document.querySelector('#rozvadece-container [data-action="copyRozvadec"]'); if (b) b.click(); });
  await p.waitForTimeout(400);
  t = await tahla();
  check('kopie rozváděče táhlo nezkopíruje', t.pocet <= 1, JSON.stringify(t));
  // 4. Ctrl+C / Ctrl+V řádku s táhlem
  await fokus('#rozvadece-container tr[data-rowtype="obvod"] td:nth-child(10) input');
  await p.evaluate(() => {
    const tr = document.querySelector('#rozvadece-container tr[data-rowtype="obvod"]');
    mrKopirovat([tr], false); mrVlozit(tr);
  });
  await p.waitForTimeout(200);
  t = await tahla();
  check('Ctrl+C / Ctrl+V táhlo nezkopíruje', t.pocet <= 1, JSON.stringify(t));
  // 5. úklid kopií, které už v otevřené zprávě visí (starší verze)
  await p.evaluate(() => {
    const td = document.querySelectorAll('#rozvadece-container tr[data-rowtype="obvod"]')[2].children[5];
    const k = document.getElementById('fill-handle').cloneNode(true); k.style.display = ''; td.appendChild(k);
  });
  await fokus('#rozvadece-container tr[data-rowtype="obvod"] td:nth-child(8) input');
  t = await tahla();
  check('visící kopie z dřívějška se uklidí při dalším kliknutí do buňky', t.pocet === 1 && t.videt === 1, JSON.stringify(t));
  // 6. táhlo dál funguje
  const funguje = await p.evaluate(async () => {
    const rows = [...document.querySelectorAll('#rozvadece-container tr[data-rowtype="obvod"]')];
    const inp = fillCilovyInput(rows[0], 7); inp.value = '0,77'; inp.focus();
    return { ma: !!document.querySelector('#fill-handle').__srcInput, stejne: document.querySelector('#fill-handle').__srcInput === inp };
  });
  await p.waitForTimeout(150);
  const h = await p.$('#fill-handle'); const hb = await h.boundingBox();
  const cil = await (await p.evaluateHandle(() => fillCilovyInput([...document.querySelectorAll('#rozvadece-container tr[data-rowtype="obvod"]')][2], 7))).boundingBox();
  await p.mouse.move(hb.x + 4, hb.y + 4); await p.mouse.down();
  await p.mouse.move(hb.x + 4, cil.y + cil.height / 2, { steps: 8 }); await p.mouse.up();
  await p.waitForTimeout(200);
  const hodn = await p.evaluate(() => [...document.querySelectorAll('#rozvadece-container tr[data-rowtype="obvod"]')].slice(0, 3).map(tr => fillCilovyInput(tr, 7).value).join(','));
  check('táhlo dál kopíruje hodnotu dolů', funguje.stejne && hodn === '0,77,0,77,0,77', hodn);
  check('žádné chyby', chyby.length === 0, chyby.join(' | '));
  console.log(res.join('\n')); console.log('\n' + res.filter(x => x[0] === '✅').length + '/' + res.length + ' prošlo');
  await br.close(); process.exit(res.some(x => x[0] === '❌') ? 1 : 0);
})();
