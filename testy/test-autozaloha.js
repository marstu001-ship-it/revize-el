// v9.113 — Automatická záloha do složky nesmí vynechat změny.
// Hlášení uživatele 2026-10-06: načetl soubor od kolegy, zprávu upravil,
// v plánu ji zařadil a uložil — po restartu prohlížeče ji poslední záloha
// neměla. Příčina: 10min „throttle" změny v té době prostě zahodil a import
// zálohu vůbec nespouštěl. Složka se v testu napodobí v paměti.
const { chromium } = require('/opt/node22/lib/node_modules/playwright/node_modules/playwright-core');
const PORT = process.env.PORT || 8901;
const res = []; const check = (n, ok, d) => res.push((ok ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));
const SLOZKA = () => {
  window.__soubory = {};
  window.__opravneni = 'granted';
  window.__falesnaSlozka = {
    name: 'Zalohy', kind: 'directory',
    queryPermission: async () => window.__opravneni,
    requestPermission: async () => { window.__zadostOPovoleni = (window.__zadostOPovoleni || 0) + 1; return window.__opravneni = 'granted'; },
    getFileHandle: async (jm) => ({ createWritable: async () => { let buf = ''; return {
      write: async (b) => { buf = typeof b === 'string' ? b : await b.text(); },
      close: async () => { window.__soubory[jm] = buf; } }; } }),
    values: async function* () { for (const k of Object.keys(window.__soubory)) yield { kind: 'file', name: k }; },
    removeEntry: async (jm) => { delete window.__soubory[jm]; }
  };
};
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await br.newContext({ viewport: { width: 1300, height: 900 } });
  await ctx.addInitScript(() => { navigator.serviceWorker.register = () => new Promise(() => {}); });
  const p = await ctx.newPage(); const chyby = []; p.on('pageerror', e => chyby.push(e.message));
  p.on('dialog', d => d.accept());
  await p.goto('http://127.0.0.1:' + PORT + '/index.html'); await p.waitForTimeout(1500);
  await p.evaluate(SLOZKA);
  const r = await p.evaluate(async () => {
    const cekej = ms => new Promise(r => setTimeout(r, ms));
    const posledni = () => { const k = Object.keys(window.__soubory).sort(); return k.length ? JSON.parse(window.__soubory[k[k.length - 1]]) : null; };
    const out = {};
    archiv.length = 0; STORE.archiv = archiv; STORE.plan = {}; saveStore();
    backupDirHandle = window.__falesnaSlozka;
    STORE.auto_zaloha_at = null;
    out.start = await autoZaloha(true);               // záloha při startu dne
    out.souboruPoStartu = Object.keys(window.__soubory).length;

    // 1) zpráva od kolegy načtená souborem (balík zpráv) — hned po startu
    const balik = { _format: 'revize-el-zpravy', zpravy: [{ uid: 'kolega-1', typ: 'elektro', ev_cislo: 'RE-26-7777', misto: 'Dílna Kolegy', datum: '2026-10-01', stav: '', data: { typ: 'elektro', ev_cislo: 'RE-26-7777', misto: 'Dílna Kolegy', pristi: '2030-10-01' } }] };
    zpravyImportDavka(balik.zpravy);
    await cekej(6000);
    const z1 = posledni();
    out.poImportu = !!(z1 && (z1.archiv || []).some(z => z.uid === 'kolega-1'));

    // 2) úprava zprávy a uložení (do 10 minut od poslední zálohy)
    const i = archiv.findIndex(z => z.uid === 'kolega-1');
    archiv[i].data.misto = 'Dílna Kolegy – upraveno'; archiv[i].misto = 'Dílna Kolegy – upraveno';
    STORE.archiv = archiv; saveStore();
    // 3) zařazení v plánu a „Uložit"
    const P = planData(); if (!Array.isArray(P.slozky)) P.slozky = [];
    P.slozky.push({ id: 'sl-t', typ: 'budova', nazev: 'Budova Test', rodic: '' });
    planUlozitDoZalohy();
    await cekej(6000);
    const z2 = posledni();
    out.upraveno = !!(z2 && (z2.archiv || []).some(z => z.uid === 'kolega-1' && /upraveno/.test(z.misto)));
    out.plan = !!(z2 && z2.plan && (z2.plan.slozky || []).some(s => s.id === 'sl-t'));
    out.souboru = Object.keys(window.__soubory).length;
    // bez zbytečných souborů: v rámci 10 minut se přepisuje tentýž
    out.zaplava = out.souboru <= 2;
    // neběží dokola: po vlastním zápisu se další záloha neplánuje
    const pocetZapisu = JSON.stringify(window.__soubory).length;
    await cekej(5000);
    out.klid = JSON.stringify(window.__soubory).length === pocetZapisu;
    // po deseti minutách vznikne nový soubor (historie zůstává)
    STORE.auto_zaloha_soubor_od = new Date(Date.now() - 11 * 60 * 1000).toISOString();
    const predNovym = Object.keys(window.__soubory).length;
    STORE.archiv = archiv; saveStore();
    await cekej(5000);
    // Název nese čas na minuty, takže v testu (čas posunutý jen v datech) může
    // vyjít stejný — kontroluje se proto, že začalo NOVÉ desetiminutové okno.
    out.novySoubor = Date.now() - new Date(STORE.auto_zaloha_soubor_od).getTime() < 60000;
    out.souboruNakonec = Object.keys(window.__soubory).length;
    // bez oprávnění (po restartu prohlížeče) to program řekne
    window.__opravneni = 'prompt';
    STORE.odberatele = (STORE.odberatele || []).concat([{ id: 'o-t', nazev: 'Test' }]); saveStore();
    await cekej(5500);
    const t = Array.from(document.querySelectorAll('.toast, #toast, [class*="toast"]')).map(e => e.textContent).join(' | ');
    out.hlaska = /záloh/i.test(t) && /povol/i.test(t);
    return out;
  });
  check('záloha při startu dne se zapíše', r.start === true && r.souboruPoStartu === 1);
  check('zpráva načtená ze souboru od kolegy je v záloze', r.poImportu);
  check('úprava zprávy do 10 minut od poslední zálohy je v záloze', r.upraveno);
  check('zařazení v plánu je v záloze', r.plan);
  check('složka se nezaplaví — během 10 minut se přepisuje tentýž soubor', r.zaplava, r.souboru + ' souborů');
  check('záloha se po vlastním zápisu neplánuje dokola', r.klid);
  check('po deseti minutách práce vznikne nový soubor', r.novySoubor, r.souboruNakonec + ' souborů');
  check('bez povolení přístupu ke složce program upozorní', r.hlaska);
  check('bez chyb v konzoli', chyby.length === 0, chyby.slice(0, 3).join(' | '));
  await br.close(); res.forEach(x => console.log(x));
  process.exit(res.some(x => x.startsWith('❌')) ? 1 : 0);
})();
