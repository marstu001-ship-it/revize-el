// v9.45 — popisek propoje ve stromu: kabel · označení jističe (jištění).
// Název obvodu se vynechává, protože jen opakuje jméno z rámečku pod ním
// a u většího stromu by se kresba nevešla na šířku A4.
const { chromium } = require('/opt/node22/lib/node_modules/playwright/node_modules/playwright-core');
const res = []; const check = (n, ok, d) => res.push((ok?'✅':'❌')+' '+n+(d?' — '+d:''));
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await b.newPage({ viewport: { width: 1500, height: 1100 } });
  const err = []; p.on('pageerror', e => err.push(e.message));
  await p.addInitScript(() => { try { navigator.serviceWorker.register = () => new Promise(() => {}); } catch (e) {} });
  await p.goto('http://127.0.0.1:8901/index.html', { waitUntil: 'load' });
  await p.waitForTimeout(900);

  const popisky = await p.evaluate(() => ({
    bezne:      stromPopisJistice({ oznaceni:'FU5', nazevObvodu:'Rozváděč 31RM3 - vlevo',
                                    ch:'Gg', a:'3x40A', kabel:'AYKY 4B x 6' }, ''),
    bezKabelu:  stromPopisJistice({ oznaceni:'FA1', nazevObvodu:'Hlavní jistič ČOV',
                                    ch:'', a:'3x90A', kabel:'' }, ''),
    bezOznaceni: stromPopisJistice({ oznaceni:'', nazevObvodu:'vývod pro RM2',
                                    ch:'B', a:'32', kabel:'CYKY 4B×16' }, ''),
    prazdny:    stromPopisJistice({ oznaceni:'', nazevObvodu:'', ch:'', a:'', kabel:'' }, ''),
    zPrivodu:   stromPopisJistice({ oznaceni:'FU2', nazevObvodu:'Rozváděč BSK45 - vpravo',
                                    ch:'Gg', a:'3x63A', kabel:'' }, 'AYKY 4B x 16 ukončen ve svorkovnici'),
    jinyRadek:  stromPopisJistice({ jinyRadek:true, oznaceni:'3', nazevObvodu:'Pojistky 3x80A SPH 00',
                                    doplnek:'Vývod kabelem CYKY 4Bx6mm2 do RMS2' }, '')
  }));

  check('popisek je kabel · označení (jištění)',
    popisky.bezne === 'AYKY 4B x 6 · FU5 (Gg 3x40A)', popisky.bezne);
  check('název obvodu v popisku NENÍ',
    popisky.bezne.indexOf('Rozváděč 31RM3') === -1 && popisky.bezne.indexOf('—') === -1,
    popisky.bezne);
  check('bez kabelu zůstane označení a jištění',
    popisky.bezKabelu === 'FA1 (3x90A)', popisky.bezKabelu);
  check('bez označení zaskočí název obvodu',
    popisky.bezOznaceni === 'CYKY 4B×16 · vývod pro RM2 (B 32 A)', popisky.bezOznaceni);
  check('úplně prázdný řádek nezmizí beze stopy',
    popisky.prazdny === 'jistič', popisky.prazdny);
  check('kabel se pořád doplní z Přívodu cíle',
    /^AYKY 4B x 16 ukončen/.test(popisky.zPrivodu) && /FU2 \(Gg 3x63A\)$/.test(popisky.zPrivodu),
    popisky.zPrivodu);
  check('jiný řádek si dál nese svůj vlastní text',
    popisky.jinyRadek === 'Pojistky 3x80A SPH 00 · Vývod kabelem CYKY 4Bx6mm2 do RMS2',
    popisky.jinyRadek);

  // ══ KRESBA JE UŽŠÍ ═══════════════════════════════════════════════
  const sirka = await p.evaluate(async () => {
    localStorage.clear(); archiv.length = 0; STORE.archiv = archiv;
    aktTyp='elektro'; aktPodtyp='prumysl'; novaZprava('elektro');
    await new Promise(r=>setTimeout(r,400));
    const karty=()=>document.querySelectorAll('#rozvadece-container [data-rozvadec-id]');
    while(karty().length<3) addRozvadec();
    ['RH','RIS','31-RM3'].forEach((n,i)=>{ karty()[i].querySelector('.rozv-nazev').value=n; });
    const nastav=(ki,ri,oz,nz,kab)=>{
      const tr=karty()[ki].querySelectorAll('tbody tr[data-rowtype="obvod"]')[ri];
      const inp=tr.querySelectorAll('input');
      inp[0].value=oz; inp[1].value=nz; inp[3].value='Gg'; inp[4].value='3x40A'; inp[15].value=kab;
      return tr;
    };
    const a=nastav(0,0,'FA1','Hlavní jistič ČOV','AYKY 4B x 50');
    const c=nastav(1,0,'FU5','Rozváděč 31RM3 - vlevo, dlouhý popis navíc','AYKY 4B x 6');
    napajiZapsat(a,[karty()[1].dataset.rozvUid],[]);
    napajiZapsat(c,[karty()[2].dataset.rozvUid],[]);
    renderRozvStrom();
    await new Promise(r=>setTimeout(r,250));
    const telo = document.getElementById('rozv-strom-telo');
    const texty = Array.from(telo.querySelectorAll('div'))
      .map(d => d.childNodes.length === 1 && d.firstChild.nodeType === 3 ? d.textContent.trim() : '')
      .filter(t => t && /·|\(/.test(t));
    return { texty: texty, nejdelsi: Math.max.apply(null, texty.map(t => t.length)) };
  });
  check('žádný popisek neobsahuje název obvodu',
    !sirka.texty.some(t => /Rozváděč 31RM3|Hlavní jistič/.test(t)), sirka.texty.join(' | '));
  check('nejdelší popisek se vešel pod 40 znaků', sirka.nejdelsi < 40, String(sirka.nejdelsi));

  check('bez chyb stránky', err.length === 0, err.join(' | '));
  console.log(res.join('\n'));
  await b.close();
  process.exit(res.some(r => r.startsWith('❌')) ? 1 : 0);
})().catch(e => { console.error('CRASH:', e.message); process.exit(2); });
