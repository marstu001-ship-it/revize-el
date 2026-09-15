# CLAUDE.md — pravidla pro tento repozitář

Revize EL je single-page PWA (HTML + JS + service worker). Obsah se cachuje
v prohlížeči přes `sw.js`, takže uživatel nevidí změny, dokud se neinvalidně
cache.

**Aktuální verze: v9.52 · 2026-09-15**

## Povinné při každé změně kódu před commitem

**Pokud v commitu měníte `index.html`, `sw.js`, `manifest.json` nebo cokoliv
jiného, co prohlížeč cachuje, vždy taky:**

1. **Bumpněte `CACHE_NAME` v `sw.js`** na nový řetězec ve formátu
   `revize-el-vMAJOR.MINOR-YYYYMMDD` (datum = dnešní datum; minor bumpni
   o 1 oproti předchozí, major jen když je to velká změna).
2. **Bumpněte verzi v topbaru v `index.html`** na stejné MAJOR.MINOR a datum:
   `<span class="ver">vMAJOR.MINOR · YYYY-MM-DD</span>` — ať uživatel pozná
   vizuálně, že běží nová verze.

Obě změny dělejte v jednom commitu společně se změnou kódu. Uživatel se
tím nemusí zabývat — dělejte to automaticky, pokaždé.

**Bez bumpu cache uživatel neuvidí vaše úpravy** a bude si myslet, že
jste nic neudělali.

3. **Nová uživatelská funkce = karta v Novinkách** (`#screen-novinky`,
   nová karta nahoru). **Datum ber ze systémového data session**
   (`currentDate` v kontextu), NE odhadem podle předchozích karet —
   dřív se tím do Novinek dostalo chybné datum. Karta MUSÍ mít datum:
   `<div class="scard" data-nov-datum="YYYY-MM-DD">` a v titulku
   `<span class="nov-datum">D. M. YYYY</span>`. Z max. `data-nov-datum`
   se automaticky odvozuje pulsování tlačítka 📰 Novinky (localStorage
   `revize_el_novinky_seen`) — bez data se uživatelé o novince nedozví.

   **⚠️ VŽDY SE UŽIVATELE NEJDŘÍV ZEPTEJ, jestli kartu do Novinek
   přidat** (pokyn uživatele 2026-08-11). Nikdy ji tam nedávej
   automaticky — ani když ti to připadá jako zjevná nová funkce.
   Napiš, co bys do karty napsal, a nech ho rozhodnout.

   **Do Novinek patří JEN nové funkce, ne opravy chyb.** Kdo chybu
   nahlásil, ví o opravě; komu program fungoval, je informace o ní
   k ničemu (rozhodnutí uživatele 2026-08-11 — bugfixové karty se
   z Novinek smazaly). Pozor: „chybí popisek / ukazuje se špatný
   text / špatně se to zalomilo" je **oprava chyby**, i když se to
   týká něčeho, co uživatel vidí. Tedy:
   - **ANO:** nové pole, nové tlačítko, nový typ revize, nová nápověda,
     nová volba v nastavení, změna chování, kterou musí uživatel znát,
     aby program ovládal jinak než dřív.
   - **NE:** „už se neořezává PDF", „vrácený smazaný seznam příloh se
     už nevrací", „nadpis nezůstane viset na konci stránky", opravené
     překlepy, opravená gramatika v generovaném textu, opravené
     stránkování a podobné věci, které uživatel nijak neovládá.
   - Míchá-li commit funkci i opravu, do karty napiš **jen tu funkci**.
   - Oprava chyby sama o sobě = žádná karta (verzi v topbaru a
     `CACHE_NAME` bumpni normálně).

## Datace norem u strojů — ČSN EN 60204-1 má ČTYŘI verze (v9.51)

Uživatel se zeptal (2026-09-15): „U ed.2 je jen od roku 2007 — neměla by tam
být ještě ed.1? Když mám stroj z roku 2004?" Měl pravdu. **Stroj se posuzuje
podle verze normy, která platila, když byl uveden do provozu**, takže
v seznamu musí být i verze před ed.2. České verze ČSN EN 60204-1 (33 2200):

**Datace je z karet norem na `csnonline.agentura-cas.cz` — uživatel je poslal
jako snímky 2026-09-15 (v9.52). Je to primární zdroj, tohle už se nehádá:**

| verze | kat. č. | vydána | zrušena |
|---|---|---|---|
| **ČSN EN 60204-1** (Elektrická zařízení **pracovních** strojů) | 17916 | 01.10.1995 | **01.04.2000** |
| **ČSN EN 60204-1** (Elektrická zařízení strojů) | 57568 | 01.03.2000 | **01.06.2009** |
| **ed.2** | 78751 | 01.06.2007 | **14.09.2021** |
| **ed.3** | 506756 | 01.02.2019 (účinnost 01.03.2019) | platná |

**Verze se PŘEKRÝVAJÍ** — v březnu 2000 vyšla nová, ale ta z roku 1995 platila
až do 1. 4. 2000; ed.2 vyšla 2007, ale verze z roku 2000 dojela až 2009.
Test proto kontroluje jen chronologii, ne že konec jedné = začátek druhé.

Starší dvě verze nemají v označení „ed.", jsou to prostě další vydání téže
ČSN — v seznamu se proto rozlišují textem `(vyd. 03/2000)` / `(vyd. 10/1995)`.

Opravená datace (v9.51 z vyhledávání, v9.52 doladěno podle karet ČSN online):

- **ed.3** `od 06/2019` → **`od 02/2019`** (vydání únor 2019, účinnost 1. 3. 2019)
- **ed.2** `2007 – 06/2019` → **`06/2007 – 09/2021`** (ed.3 ji nahradila až
  14. 9. 2021, do té doby platily souběžně)
- **verze 10/1995** — ve v9.51 zapsaná jako „– 03/2000" podle vydání
  nástupkyně; správně **`– 04/2000`** podle data ukončení platnosti
- **ČSN EN ISO 13849-1 ed.2** `od 10/2023` → **`od 09/2024`** (vydání 09/2024,
  účinnost 10/2024)
- **ČSN EN ISO 13850** — mělo chybně v názvu „ed.2", **žádné ed.2 v ČSN
  neexistuje**; datace `od 02/2016` → **`od 01/2017`** (vydání 05/2016 platilo
  jen do ledna 2017)

Ověřeno a **ponecháno beze změny**: NV 378/2001 (od 01/2003),
ČSN 33 2000-4-41 ed.3 (vydání 01/2018, účinnost 02/2018), ČSN EN ISO 12100
(2011), a celá skupina LPS 62305 ed.2/ed.3 včetně souběžné platnosti
do 31. 10. 2027.

**Neověřeno** (chybí spolehlivý zdroj, datace ponechána): ČSN EN 60529
„od 1993", ČSN EN IEC 60445 ed.6 „od 11/2018", ČSN EN 61140 ed.3 „od 04/2016",
ČSN 33 2000-6 ed.2 „od 06/2017", ČSN 33 1500 „od 1990 · Z4 2007" a drobné
elektro položky. **Nevymýšlet — když se má datum změnit, musí být ověřené.**

- Sandbox Claude Code **na csnonline.agentura-cas.cz ani normy.biz nesmí**
  (egress proxy). `WebSearch` dá dobrý odhad, ale na **datum ukončení
  platnosti** nestačí — to je v kartě normy a rozchází se s vydáním
  nástupkyně. **Když jde o datum do zprávy, vyžádat si snímek karty.**
- **ed.3 má od 3/2026 změnu A1** (kat. č. 523430, platná). V názvu normy
  zatím není — uživatel rozhodne, jestli se má psát „ed.3 +A1".
- Test: `test-normy-datace.js` (42 kontrol — název, datace a příznak
  „neplatná" u devíti norem, návaznost čtyř verzí 60204-1 bez díry,
  a že se zakliknutá starší verze opravdu vytiskne do PDF).

## U kontroly stroje se necitují normy o REVIZÍCH (v9.50)

Uživatel se zeptal (2026-09-15): „Nemáme v kontrole strojů zbytečně normy
o revizích? Například 1500?" Měl pravdu a bylo to nekonzistentní s v9.43:
nadpis říkal *kontrola*, ale program u toho citoval **ČSN 33 1500 — Revize
elektrických zařízení** a **NV 190/2022 Sb. — vyhrazená technická zařízení**,
a celkový posudek dokonce začínal „**Revize** byla provedena…". Podklad
kontroly stroje je **NV č. 378/2001 Sb.** + **ČSN EN 60204-1 ed.3**.

Změněná tři místa (na pokyn uživatele „udělej všechny tři body"):

1. **Celkový posudek** (`magicZaver` **i** `TYPY_TEXTU.f_zhodnoceni` — dvě
   kopie téhož textu, musí se měnit obě): „Kontrola byla provedena v souladu
   s požadavky NV č. 378/2001 Sb. … a ČSN EN 60204-1 ed.3 …", „zprávy
   o kontrole" a **vypuštěná věta** „Slovní zhodnocení bylo provedeno dle
   požadavků NV č. 190/2022 Sb. § 10 písmeno l)" — to je požadavek na revizní
   zprávu vyhrazeného zařízení. **Pozor:** větu „Podpisem převzetí zprávy
   o revizi…" mají i elektro a LPS, tam zůstává; hledat se musí celá věta
   s „elektrického zařízení stroje", ne jen ten začátek.
2. **Výchozí zaškrtnutí norem** — `csn331500str` a `nv190str` mají `c: false`.
   Ze seznamu se **nemažou**, takže si je technik u konkrétní zprávy zaklikne.
   Zaškrtnuté zůstávají NV 378/2001, ČSN EN 60204-1 ed.3 a ČSN 33 2000-4-41 ed.3.
3. **Citace pod nadpisem + odůvodnění lhůty** — „Kontrola provedena v souladu
   s NV č. 378/2001 Sb., ČSN EN 60204-1 ed.3, ČSN 33 2000-4-41 ed.3" a
   u lhůty „(dle NV č. 378/2001 Sb. a ČSN EN 60204-1 ed.3)".

- **Poznámka drobným písmem pod popiskem** („dle ČSN 33 1500 č.3.9 + NV
  190/2022 příloha č.4" u pole Termín příští revize) je **nový mechanismus
  `data-term-pozn`** v `aplikovatPojmy()`. Na rozdíl od `data-term` přepisuje
  **celý obsah** prvku — je to samostatný `<span>`, ne první textový uzel.
- **`POJMY.*.uvodniVeta` zrušeno** — citace norem pod nadpisem se skládá pro
  každý typ zvlášť a klíč už nikdo nečetl.
- **Názvy norem se pořád nesmí měnit** — ČSN 33 1500 se opravdu jmenuje
  „Revize elektrických zařízení". Test si ji proto zaškrtne ručně a ověří,
  že se název nezměnil.
- **Uložené zprávy se nemění** — posudek i seznam norem si nesou v datech,
  program je při načtení nepřepisuje.
- Elektro i LPS beze změny: `porovnani2.js` vychází znak po znaku stejně
  a `test-normy-stroje.js` to kontroluje i zvlášť (citace pod nadpisem,
  poznámka u termínu, posudek).
- Test: `test-normy-stroje.js` (30 kontrol).

## Stroje — měření a kontroly POHROMADĚ, jedna kapitola (v9.49)

Do v9.48 to byly dvě kapitoly (nejdřív měření všech strojů, pak kontroly všech
strojů), takže u souboru strojů se výsledky jednoho stroje rozpadly na dvě
vzdálená místa. Uživatel to odmítl (2026-09-15): „1. stroj = výsledek měření
a za to hned provedená kontrola. 2. stroj = …". Teď je to **jedna kapitola**
`secBase.` „Naměřené hodnoty, zkoušky a provedené kontroly", uvnitř
podkapitoly `secBase.1`, `secBase.2` … a v každé obě tabulky za sebou.

- **Sloučení posouvá číslo kapitoly Závady a Závěru o jedna dolů**, a to by
  rozbilo **zprávy uložené dřív** — jejich závěr odkazuje „v kapitole N".
  Proto je to **příznak uložený ve zprávě `D.stroje.spolu`**: nová zpráva ho
  dostane v `initStroje()`, zpráva z archivu bez něj se tiskne postaru (obě
  větve jsou v kódu vedle sebe). Stejná pojistka jako `D.rozvStrom`.
- **`cisloKapitolyZavady()` a `generujPDF()` musí sedět.** Funkce čte globál
  `__strojeSpolu` (plní ho `initStroje()` a `restoreStrojeData()`), PDF čte
  `D.stroje.spolu`. Rozejdou-li se, závěr odkáže na kapitolu, která
  neexistuje. Hlídá to `test-stroje-spolu.js`.
- **`dveKapitoly` se na číslování NEPOUŽÍVÁ.** Drží slučování stránek na konci
  `generujPDF()` a to pro stroje platí pořád; číslo dává `kapMereni`.
- **Odkaz z kapitoly Prohlídka** („podrobný výčet kontrolovaných bodů … v
  kapitole N") míří u sloučené podoby na `secBase`, u staré na `secBase + 1`.
- **Nadpis stroje + řádek s údaji je JEDEN blok `stroj-hlavicka-pdf`**
  a `jeNadpis()` ho bere jako nadpis. Bez toho zůstalo jméno stroje viset na
  konci stránky a jeho tabulka začala na další — dělič hledal jen `.sec-head`
  a řádek s údaji za nadpisem ho zastavil.
- **Sloučení platí i pro režim „jeden stroj"** — schválně: kdyby záviselo na
  přepínači rozsahu, přehodilo by se číslo kapitoly Závady při každém
  přepnutí. U jednoho stroje jsou to prostě dva popsané bloky pod sebou.
- Test: `test-stroje-spolu.js` (13 kontrol — pořadí stroj → měření →
  kontroly → další stroj, shoda `cisloKapitolyZavady()` s PDF, oba režimy
  rozsahu a **zpráva bez příznaku, která se musí tisknout postaru**).

**Past při testování:** `innerText` respektuje CSS `text-transform`, takže
nadpisy vyjdou VELKÝMI PÍSMENY — porovnávat bez ohledu na velikost. A nadpis
kapitoly sám obsahuje „provedené kontroly", takže výskyty se počítají až od
prvního stroje dál.

## Stroj — jištění a připojení (v9.48)

Sedm kolonek doplněných podle vzoru od kolegy (pokyn uživatele 2026-09-15,
žlutě vyznačené řádky ve snímku): **hlavní jištění stroje** (typ + proudová
hodnota), **předřazené jištění síťového přívodu** (typ + proudová hodnota),
**napětí řídicích obvodů**, **napájeno z rozváděče** a **přívodní kabel**.
Řádek „izolační odpor přívodu" byl ve vzoru **přeškrtnutý — nedělat.**

- **Bydlí to na kartě stroje** (`addStroj`), ne v samostatném bloku titulky.
  Je to údaj o stroji, takže u režimu „soubor strojů" ho má každý stroj svůj,
  a u režimu „jeden stroj" se to na titulní stranu dostane samo — `#stroje-blok`
  se tam stěhuje celý.
- **Nový klíč = i `STROJ_POLE_MAPA`**, jinak se hodnota posbírá do formuláře,
  ale neuloží se do dat (a po načtení z archivu zmizí).
- **Jednotku „A" doplňuje `strojJisteni()` přes `stromProud()`** — z hodnoty
  „25A" nevyjde „25A A". Chybí-li typ nebo proud, vypíše se ta druhá půlka.
- **Prázdná kolonka se do PDF netiskne** (`radek()` vrátí prázdno) — jinak by
  u každé zprávy visely prázdné řádky.
- **PDF je na DVOU místech a musí se měnit obě**: pravý sloupec „Technické
  specifikace" na titulní straně (jeden stroj) a `strojHlavickaHtml()`
  v podkapitole (soubor strojů).
- Nápovědy: `dl_stroj_jisteni` (jistič / pojistka / …) a `dl_stroj_ridici`
  (24 V DC z oddělovacího transformátoru / 230 V ze sítě / …) jsou nové;
  proudové hodnoty jedou přes stávající `dl_proud_A`, rozváděč přes
  `dl_nazev_rozvadec`, kabel přes `dl_kabel`.
- Elektro i LPS se nezměnily (`porovnani2.js` — klíč `stroje` je z porovnání
  dat vyňatý, text PDF vychází znak po znaku stejně).
- Test: `test-stroj-jisteni.js` (15 kontrol — formulář, data, návrat
  z archivu, PDF u jednoho stroje i u souboru, prázdné kolonky, „A A").

## Archiv — u stroje se ukazuje NÁZEV a TYP (v9.47)

Sloupec „Místo" nesl u zprávy o stroji jen umístění, z něhož v areálu
s desítkami strojů nepoznáte, o který stroj jde (pokyn uživatele 2026-09-15,
přeškrtal to ve snímku). Teď jsou v buňce **tři řádky: název stroje (tučně,
největší) → typ → umístění (drobně, šedě)**.

- **Údaje se berou z `z.data.stroje.seznam`, nikam se neukládají znovu.**
  Projeví se to proto samo i u zpráv uložených dřív; `saveToArchiv()` se
  nemusel měnit, takže nehrozí, že by se položka archivu rozešla s daty.
- **Týká se to JEN typu `stroje`** (`strojeHlavicka()` vrátí `null` jinak).
  Elektro i LPS vypadají přesně jako dřív.
- **Nevyplněný stroj = chová se jako dřív** — když není ani název, ani typ,
  vypíše se samotné místo. Prázdné řádky se nekreslí.
- **Režim „soubor strojů"**: první stroj + „+ N dalších".
- Kreslí to `archivMistoBunka(z, maly)` — jedno místo pro **tři** výpisy:
  hlavní řádek archivu, vnořený řádek řetězu starších revizí a kartu
  v „Naposledy otevřené / Připnuté". Dřív to byly tři kopie `z.misto`.
- **Fulltext hledá i podle stroje** — název, typ, výrobce, výrobní číslo,
  ev. číslo stroje a jeho umístění. Bez toho by šlo jméno stroje ve výpisu
  přečíst, ale ne podle něj hledat.
- Hlavní řádek archivu tiskl `z.misto` **bez `esc()`**; nová buňka escapuje
  všechno.
- Test: `test-archiv-stroj.js` (13 kontrol).

## Kontrolní otisky knihoven — SRI (v9.46)

Obě knihovny z cdnjs (`index.html` ř. 14–26) mají `integrity` + `crossorigin`.
Prohlížeč soubor spustí, **jen když sedí bajt po bajtu** — kdyby někdo cdnjs
podvrhl, skript se nenačte. Odpověď na otázku uživatele na bezpečnost
(2026-09-15): repozitář je veřejný a program se sám aktualizuje, takže cesta,
kudy by mohl přijít cizí kód, stojí za utěsnění.

- **PŘI ZMĚNĚ VERZE KNIHOVNY SE MUSÍ PŘEPOČÍTAT OTISK.** Jinak se knihovna
  nenačte a program **přijde o generování PDF** — tedy o svou hlavní funkci.
  Verze jsou v URL připíchnuté napevno, takže se obsah sám od sebe nezmění.
- **Otisk se počítá ze SPRÁVNÉHO zdroje.** cdnjs si soubory tahá sám a
  u každé knihovny odjinud — je to v `cdnjs/packages` na GitHubu
  (`packages/<písmeno>/<název>.json`, klíč `autoupdate`):
  - **jspdf** → `source: git`, repozitář MrRio/jsPDF, složka `dist`, tedy
    `raw.githubusercontent.com/MrRio/jsPDF/v<verze>/dist/jspdf.umd.min.js`,
  - **html2canvas** → `source: npm`, tedy `dist/` z balíčku na
    registry.npmjs.org.

  Výpočet: `openssl dgst -sha384 -binary SOUBOR | openssl base64 -A`.
  (Sandbox Claude Code na cdnjs nesmí, proto ta oklika. Kdo na cdnjs dosáhne,
  ať si stáhne rovnou tu URL, co je v `index.html`.)
- **U písem z `fonts.googleapis.com` otisk NEJDE** — Google vrací každému
  prohlížeči jiné CSS, otisk by nikdy neseděl.
- **Offline varianta v ZIPu otisk NESMÍ mít.** `zipBezOtisku()` ho
  z `index-offline.html` vyhazuje u skriptů mířících do `knihovny/`: otevře-li
  se soubor rovnou z disku (`file://`), prohlížeč kontrolu neprojde a skript
  nespustí — a offline běh je přesně to, kvůli čemu ZIP existuje.
- **Test `test-zip-kodu.js` nesmí porovnávat řádek proti řádku podle pořadí.**
  Odstraněním atributů se tag smrskne a všechno pod ním se posune; kontrola
  jede přes `diff` a ptá se „změnily se JEN odkazy na knihovny?".
- Service worker měl `mode: 'cors'` u `URLS_OPTIONAL` už dřív a neukládá
  odpovědi se `status !== 200`, takže v cache nikdy neleží neprůhledná
  (opaque) odpověď, na které by otisk selhal. **Při zásahu do `sw.js` to
  nechat tak.**
- Test: `test-sri.js` (10 kontrol — se správnými bajty se knihovna načte,
  po změně **jediného bitu** se nenačte, offline varianta otisk nemá).

**Veřejný repozitář:** `index.html` ř. 1745 měl jako náznak skutečnou
Tailscale adresu uživatelova Mac mini. Nahrazeno obecným
`https://muj-pocitac.example/…`. **Do náznaků a příkladů nepatří nic
skutečného** — repozitář je veřejný a `CLAUDE.md` se nasazuje s ním.

## AI funkce — stav

AI funkce (rozpoznávání závad z fotky, skenování štítku rozváděče) jsou
**implementovány ale vizuálně skryty** přes CSS třídu `ai-feature`:

```css
/* AI features hidden — remove next line to re-enable */
.ai-feature{display:none!important}
```

Toto pravidlo je v `index.html` hned za `.scard { ... }` blokem (~řádek 179).

- **Schovat AI:** třída `ai-feature` + výše uvedený CSS řádek
- **Znovu zapnout:** smazat řádek `.ai-feature{display:none!important}`
- Všechen JS kód AI zůstává nedotčen, tlačítka v závadách a rozváděčích
  se stejně zobrazují jen pokud má uživatel nakonfigurovaný API klíč.

## Kde hledat

- `sw.js` řádek 1: `var CACHE_NAME = '...';`
- `index.html`: `<span class="ver">...</span>` v topbaru

## Při změně AI modelu / providera ZKONTROLOVAT

Aplikace volá 3 AI providery (Gemini / Claude / OpenAI) ze 2 míst
(`buildAIPrompt` pro foto závady, `buildAIPromptPanel` pro štítek
rozváděče). Každá změna AI kódu se musí ověřit pro **všechny tři**
providery a **oba** use-casy. Časté pasti:

1. **Deprecated model** — Google/Anthropic/OpenAI občas odpojí starý
   model. Symptom: 404 NOT_FOUND. Aktuální modely (k 2026-04):
   - Gemini: `gemini-2.5-flash` (2.0-flash byl odpojen pro nové uživatele)
   - Claude: `claude-haiku-4-5-20251001`
   - OpenAI: `gpt-4o-mini`

2. **Token limit** — `max_tokens` musí být vysoký dost na dlouhé JSON
   odpovědi (panel scan vrací ~30 obvodů = 3-4k tokenů). Aktuálně 8192
   pro všechny tři. Symptom při nízkém limitu: useknutý JSON, chyba
   parsování. Záchrana je `salvageTruncatedPanelJson()`, ale lepší
   nedostat se tam vůbec.

3. **Gemini thinking mode** — `gemini-2.5-flash` má default zapnuté
   thinking, které sežere většinu token limitu před výstupem. **Vždy**
   nastavit `thinkingConfig: { thinkingBudget: 0 }`.

4. **Browser CORS** — Anthropic API vyžaduje header
   `'anthropic-dangerous-direct-browser-access': 'true'`. Bez něj 403.
   Klíč uživatele se NIKDY neposílá přes náš server (žádný server
   nemáme), jde přímo z prohlížeče k API.

5. **JSON ve markdown bloku** — všechny modely občas obalí výstup
   ` ```json ... ``` `. `parseAIResponse[Panel]` to ostraňuje, ale
   pokud model vrátí jiný formát (volný text, YAML, …), prompt
   to musí zakázat („vrať POUZE čistý JSON").

6. **Rate limiting / 503** — Gemini Flash často vrací 503 „high demand"
   v exponovaných hodinách. `aiFetchWithRetry` to řeší, ale uživateli
   doporučte přepnout na Claude nebo zapnout billing.

**Při bumpu modelu vždy commit + push + nechat uživatele vyzkoušet
panel scan + závada scan u všech 3 providerů, ke kterým má klíč.**

## Struktura projektu

- `index.html` — hlavní SPA (≈4000 řádků, HTML + embedovaný JS)
- `revize_el_v10.html` — starší verze, needitovat
- `sw.js` — service worker (network-first pro HTML, stale-while-revalidate
  pro fonty a CDN)
- `manifest.json` — PWA manifest
- `literatura/` — odborné podklady (vzory zpráv Macháček/Dolenský,
  normy ČSN) — read-only reference pro implementaci, neměnit

## 📌 ODSOUHLASENÝ NÁVRH — čeká na "udělej to" od uživatele

**Vlastní číslování zpráv + převzaté zprávy od kolegů** (návrh schválen
k zapamatování 2026-07-15, uživatel se k němu vrátí):

1. **Šablona čísla zprávy v profilu technika** (`STORE.technik.cislo_format`):
   značky `{RR}` (rok 2cif.), `{RRRR}` (rok 4cif.), `{NNNN}` (pořadové
   číslo, počet N = šířka s nulami), okolo volný text. Výchozí
   `RE-{RR}-{NNNN}` (dnešní stav). V Nastavení živá ukázka
   „Příští číslo: …".
2. **Nová zpráva dostane číslo automaticky** — scan archivu přes regex
   ze šablony, max+1, doplnit nuly. Obsahuje-li šablona rok → roční
   reset řady. Malé tlačítko ⟳ u pole ev. čísla = přidělit další číslo.
3. **Navázat** používá šablonu místo natvrdo `RE-YY-NNNN`
   (v `navazatZpravu`, regex `^RE-' + rok + '-(\d{4})$`).
4. **Import jedné zprávy (Načíst / drag&drop) se ptá**: „Zpráva od
   kolegy?" → entry.puvod='import', štítek 📥 převzatá, uloží se jako
   dokončená (read-only), číslo se NIKDY nemění (byla vydaná).
   „Moje zpráva?" (přesun mezi zařízeními) → normální vlastní.
5. **Číselná řada ignoruje převzaté zprávy** (entry.puvod === 'import')
   — kolegova čísla ve stejném formátu řadu neposunou.
6. **Navázání na převzatou** → nové číslo z MÉ řady dle MÉ šablony;
   převzatá se vnoří do řetězu (predchudce_uid, už funguje).
7. Štítek 📥 v archivu půjde přepnout (překlik při importu).

## 📌 ZAPAMATOVÁNO NA POZDĚJI — Správa budov (karta objektu)

Návrh z 2026-08-19, uživatel si ho nechal odložit ve prospěch **Plánu revizí**
(ten je hotový, viz níže). Až na to dojde, detail budovy měl obsahovat:

1. **Hlavička** — název, adresa, typ objektu, odběratel z knihovny, foto.
2. **Kontakt na místo** — kdo pouští dovnitř, telefon, kde je hlavní rozvaděč
   (nejcennější a nejlevnější položka celého seznamu).
3. **Revize k budově** — časová osa zpráv + „Nová revize této budovy"
   (použije stávající `navazatZpravu`).
4. **Termíny** — elektro / hromosvod / vnější vlivy + *cizí* termíny, které
   technik nedělá (plyn, komín, hasicí přístroje) jen pro přehled.
5. **Závady, které se táhnou** — neodstraněné závady napříč zprávami budovy.
6. **Technická karta** — síť, hlavní jistič, uzemnění, EAN/EIC, distributor,
   LPS a třída, rok instalace. Smysl: **předvyplnění nové zprávy**.
7. **Rozváděče** — seznam přenositelný do nové zprávy (schůdek k hierarchii
   měřicích míst a NFC štítkům).
8. **Dokumentace** — projekt, schémata, protokoly. Past: kam soubory uložit
   (databáze poroste vs. odkaz na složku nefunguje na mobilu). Řešit nakonec.
9. **Protokoly** — hlavně protokol o určení vnějších vlivů.
10. **Deník budovy** — datované poznámky.

Nedávat: ekonomiku (ceny, faktury, km), mapu (patří na dashboard).

## Strom rozváděčů — provázání podle zapojení (v9.36)

Rozváděče se dají provázat podle skutečného zapojení: u jističe se řekne,
který podružný rozváděč napájí, a z toho se odvodí strom.

- **Vazba bydlí na řádku obvodu** (`tr.dataset.napaji` = uid cílového
  rozváděče, `napajiNazev` pro rozváděč, který ve zprávě ještě není).
  Je to **jediný zdroj pravdy** — pole „Napájen z" na kartě rozváděče píše
  do téhož řádku, jen se zadává z druhé strany.
- **Rozváděč má vlastní `uid`** (`genRozvUid()`), který se ukládá do dat.
  **Nevázat na `data-rozvadec-id`** (`rozv-N` je běžící čítač a při načtení
  z archivu se přiděluje znovu) **ani na název** (přejmenovává se).
- **Strom se nikde neukládá**, počítá se z vazeb (`rozvStromData()` z DOM pro
  obrazovku, `stromZDat(D)` z dat zprávy pro PDF). Obojí má pojistku proti
  zacyklení; nabídka v dialogu cyklus ani nedovolí vytvořit
  (`stromByVzniklCyklus()`).
- **Dvě pojistky, aby se nezměnily staré zprávy** (pokyn uživatele):
  1. zpráva z archivu **bez klíče `D.rozvStrom`** má funkci vypnutou
     (nová zpráva zapnutou),
  2. blok se do PDF tiskne, **jen když existuje aspoň jedna vazba**.
  Ověřeno porovnáním PDF staré verze a nové: u všech čtyř podtypů elektro
  i tří variant LPS vychází text **znak po znaku stejně**; v datech přibyly
  jen klíče `napaji`, `napajiNazev`, `hlavniJistic`, `uid`, `rozvStrom`.
- **PDF**: strom je **úvodní blok kapitoly „Naměřené hodnoty"**, ne vlastní
  číslovaná kapitola — jinak by se posunulo číslování a rozjel odkaz
  „v kapitole N" v závěru.
- **Kontroly** (upozornění, ne chyby): rozváděč bez zaznamenaného napájení
  (varuje se **jen u kořene BEZ potomků** a s prázdným polem Přívod — kdo
  něco napájí, je zjevně hlavní rozváděč), vazba na neexistující rozváděč,
  nesoulad jmenovitých proudů, zacyklení, napájení ze dvou míst.
- **„🔍 Najít napojení"** hledá název rozváděče v názvu obvodu.
  **Název obvodu a označení se prohledávají zvlášť** — po slepení dohromady
  dá „vývod pro RM10" + označení „1" řetězec „…rm101" a pojistka proti
  záměně RM1/RM10 nález zahodí. Zapisují se jen odsouhlasené nálezy.
- **Kopie rozváděče** dostane nové `uid` a **nepřebírá příchozí vazbu**
  (nadřazený jistič napájí pořád jen originál); odchozí vazby v řádcích se
  kopírují.
- **Překreslení po načtení z archivu musí být odložené** (`setTimeout 0`) —
  `addRozvadec()` si strom překresluje průběžně, tehdy ještě bez vyplněných
  názvů, a bez odloženého překreslení zůstane v panelu „(bez názvu)".
- **Vazba je SEZNAM, ne jedna hodnota** (v9.38) — jedno jištění může napájet
  víc podružných rozváděčů paralelně. V `dataset` čárkou oddělené uid,
  v datech pole. Vše prochází přes `napajiSeznam(tr)` / `napajiZapsat(tr, uidy,
  nazvy)` a `naSeznam(x)`. **`naSeznam` musí přijmout i řetězec** — zprávy
  uložené ve v9.36 mají `napaji` jako jedinou hodnotu a jinak by o vazby
  přišly (hlídá `test-v936-compat.js`).
- **Vazbu má i „jiný řádek"** (`rowtype: 'info'`) — v reálné zprávě je
  napájení podružného rozváděče popsané právě jím („Pojistky 3x80A SPH 00",
  „Vývod kabelem CYKY 4Bx6mm2 do rozváděče RMS2"). Popisek ve stromu je jeho
  text z obou sloupců; **jmenovitý proud nemá, takže se u něj kontrola
  nesouladu proudů neprovede** — `stromCislo('')` vrátí `null` a program si
  nic nedomýšlí z textu (rozhodnutí uživatele 2026-09-10).
- **„Najít napojení" nedělá `break` po první shodě** — jeden řádek může vést
  k víc rozváděčům (info řádek „…do rozváděče RMS2 a RMS3" najde oba).
  Prohledávají se čtyři texty zvlášť: název obvodu, označení a oba sloupce
  jiného řádku.
- Varování **„napájen z více míst"** platí jen pro dva RŮZNÉ řádky mířící na
  týž rozváděč. Jeden řádek s víc cíli je legitimní paralelní napájení.
- **`rozvStromData()` NESMÍ zapisovat do DOM** (v9.39). Do v9.38 při kreslení
  překlápěla čekající názvy na uid — a protože odložené překreslení
  v `nacistData` běží až po `setFormReadOnly(true)`, měnila data
  i **dokončené (zamčené) zprávě**, aniž by se to označilo jako neuložené.
  Překlopení dělá `stromDopnoutNazvy()`, které se volá **jen z akcí
  uživatele** (uložení dialogu, „Najít napojení", přidání/smazání rozváděče)
  a hned na začátku má `if (window.__formReadOnly) return;`.
- **Nedohledaný název se nesmí zahodit.** Existuje-li rozváděč toho jména,
  ale je napájený odjinud, zůstane text v řádku a vyleze jako upozornění —
  dialog slibuje „až rozváděč vznikne, program si je sám propojí".
- **Smazaný rozváděč nechává v řádcích své uid** (aby šlo vzetí zpět), ale
  `stromZajistitTlacitka()` počítá **jen živé cíle** — jinak tlačítko lže
  („Napájí 1 rozváděč") a řádek zůstane modrý. Strom hlásí `mrtvy-cil`.
- **`setFormReadOnly` do v9.38 vynechával `<select>`.** `readOnly` na nich
  nefunguje a CSS `pointer-events:none` neblokuje Tab + šipky, takže přes
  rozbalovátka „Napájen z" šlo zamčenou zprávu rozbít z klávesnice (a rovnou
  se to autosavlo). Musí být `disabled` + `data-ro-lock-sel` pro ty, které
  jsou zamčené už z výroby.
- **Tlačítka, která jen čtou** (🖨️ Schéma rozváděčů, sbalit panel), mají
  třídu `ro-ok` — CSS pravidlo `#screen-form.form-readonly .tab-panel button
  {display:none}` je jinak schová i u dokončené zprávy.
- **`rozvNapajenZ` nesmí odpojovat předem.** Výběr rozváděče jen naplní
  nabídku jističů; vazba se přepíše, teprve až je jistič vybraný. Výjimka je
  „— není zadáno —", to je vědomé odpojení.
- **Po smazání řádku a po přetažení mezi rozváděči** se musí zavolat
  i `stromNaplnitNapajenZ()` — jinak selecty ukazují starého rodiče.
  V `deleteRowsWithUndo` to jede přes `jeTabulkaObvodu(tbody)`, aby se to
  netýkalo dokumentace, přístrojů ani strojů.
- **Popisek „hlavní rozváděč" jen když existuje aspoň jedna vazba**
  (`d.pocetVazeb`) — u čerstvé zprávy jinak svítí u každé karty.
- **`stromPrepnout` se volá jen z `change`**, ne i z click delegace — checkbox
  posílá obojí a strom se přepočítával dvakrát na jedno kliknutí.
- Testy: `test-strom-rozvadecu.js` (41 kontrol), `test-strom-model.js` (11),
  `test-v936-compat.js` (6), `test-strom-oprava.js` (33 — opravy v9.39),
  `test-schema-kresba.js` (34 — kresba v9.40 a v9.41).

## Přepsání textů, které program skládá sám (v9.44)

**Smysl (pokyn uživatele 2026-09-11):** „kdyby tam bylo něco špatně jako
třeba ten nadpis zprávy u strojů, ať to uživatel vyřeší sám a nemusí mi psát,
ať opravím kód." Je to **pojistka**, ne kosmetika.

V panelu nastavení tisku (vlevo v náhledu) je skupina **„Texty ve zprávě"**
se třemi poli: **nadpis zprávy**, **citace norem pod ním**, **celkový
posudek**. Náhled se překresluje živě.

- **Panel není třetí úložiště** — píše do POLÍ ZPRÁVY
  (`f_nadpis_vlastni`, `f_podnadpis_vlastni`, `f_posudek_vlastni`, ta dvě
  poslední jsou nová a jsou i v tabu 6). Tím se ukládání, archiv, zálohy
  i načtení z archivu řeší samy a formulář se s panelem nemůže rozejít.
- **Prázdné pole = program si text složí sám.** Co program složil, se ukazuje
  jako **náznak v poli** (`window.__pdfVychoziTexty`, plní ho `generujPDF()`
  ještě PŘED aplikací přepisů), takže je vidět, co se vlastně přepisuje.
- **Text se tiskne PŘESNĚ tak, jak ho uživatel napsal.** Do v9.43 se
  `nadpis_vlastni` převáděl na VELKÁ PÍSMENA — uživatel to odmítl.
- **Psaní se překresluje se zpožděním 500 ms.** `generujPDF()` je drahé
  a volá `saveToArchiv()`, takže překreslovat na každý znak nejde.
  Po překreslení se **vrací focus i pozice kurzoru** (`tiskTextyPrekresli`),
  protože panel se překresluje taky.
- **„📌 Použít i pro příští zprávy — <typ>"** uloží texty do
  `STORE.tisk.textyTyp[typ]` a `novaZprava()` je předvyplní
  (`vlozitTextyTypu`). **Per typ schválně** — špatný nadpis u strojů nemá co
  dělat u elektro revize. Prázdná pole nastavení zruší.
- **Přidat čtvrtý přepisovatelný text** = jeden řádek do `TISK_TEXTY`
  + nové pole zprávy + jeho naplnění do `window.__pdfVychoziTexty`.
- Test: `test-texty-pdf.js` (19 kontrol).

### Podbarvení okének je od v9.44 VYPNUTÉ

`VYCHOZI_TISK.barevneKolonky` je `false` (pokyn uživatele) — zaškrtnutý
zůstává jen **„Místo revize tučně"**. Kdo měl podbarvení uložené jako svoje
výchozí v profilu, dostal by ho dál, takže je tu **jednorázová migrace**
`migraceKolonky()`: smaže ten jeden klíč z `STORE.tisk` a poznamená si to do
`STORE.tisk_migrace_kolonky` (nový klíč → doplněn do `STORE_KEYS`,
`STORE_VYCHOZI`, `buildZalohaBlob()` i `obnovZeZalohy()` podle pravidla výš).
Nastavení uložené u konkrétní zprávy se nemění.

## Stroj se KONTROLUJE, nerevidují se (v9.43)

U pracovního stroje se podle **NV č. 378/2001 Sb.** a **ČSN EN 60204-1 ed.3**
dělá **kontrola**, ne revize — slovo „revize" patří vyhrazeným elektrickým
zařízením (NV 190/2022 Sb.). Uživatel to doložil vzorem od kolegy
(2026-09-11): *ZPRÁVA O PRAVIDELNÉ KONTROLE…*, *Objednatel kontroly*,
*Kontrolní technik*, *Termín další kontroly*. Týká se to **jen typu `stroje`**;
elektro a LPS zůstávají u revize.

- **Je to jedna tabulka `POJMY`, ne šedesát podmínek `aktTyp === 'stroje'`
  po kódu** — přesně ta past, kterou popisuje oddíl „Typy revizních zpráv".
  Sadu vybírá klíč `pojmy` v `TYPY_ZPRAV` (`'revize'` / `'kontrola'`),
  čte ji `pojmy(typ)`.
- **Texty jsou celé, ne skládané z kořenů.** Čeština se neohýbá strojově:
  „revize / revizi / revizí" vs. „kontrola / kontrolu / kontroly". Každý
  popisek je v tabulce napsaný celý pro obě sady.
- **Formulář:** popisky nesou `data-term="klíč"` (placeholder `data-term-ph`)
  a přepisuje je `aplikovatPojmy(typ)`. Mění se **jen první textový uzel**
  prvku — za ním v HTML bývá `<span>` s poznámkou pod čarou, o který se nesmí
  přijít.
- **`aplikovatPojmy()` musí v `novaZprava()` běžet AŽ ZA vyčištěním
  formuláře.** Reset dělá `el.value = el.defaultValue`, takže dřív nastavený
  rozdělovník by se vrátil na elektro znění. Volá se i z `nacistData()`.
- **Rozdělovník je HODNOTA, ne popisek** — přepíše se, jen když v poli stojí
  výchozí text jedné ze sad. Co si uživatel napsal sám, zůstane.
- **PDF:** `generujPDF()` si na začátku vezme `var PJ = pojmy(D.typ)` a všechny
  popisky bere z něj. Elektro i LPS proto vycházejí **znak po znaku stejně**
  (ověřeno `porovnani2.js`).
- **Názvy norem se NEMĚNÍ.** ČSN 33 1500 se opravdu jmenuje „Revize
  elektrických zařízení" — přejmenovat by znamenalo uvést špatný název normy.
  Stejně tak zůstává výchozí text „Předmětem kontroly není: … (součást
  **revize** elektroinstalace objektu)" — tam se o revizi mluví správně.
  Přejmenoval se jen **nadpis skupiny norem** u strojů
  („Revize a ochrana před úrazem" → „Elektrická bezpečnost a ochrana před
  úrazem"), protože to je náš vlastní text, ne název normy.
- **Zprávy uložené před v9.43** mají v datech uložený svůj starý rozdělovník
  („Výtisk č. 2: Revizní technik"). Program ho při načtení **nepřepisuje** —
  uložená data se za zády uživatele nemění. Popisky formuláře i PDF už
  správné jsou.
- Prefix evidenčního čísla zůstal **RS** (kolega má RZMs) — uživatel o změnu
  nežádal.
- Test: `test-pojmy-stroje.js` (43 kontrol — formulář, PDF, přepínání typů
  tam a zpět, zpráva z archivu, neplechu s rozdělovníkem).

## Záloha zdrojového kódu do ZIPu (v9.42)

Tlačítko **úplně dole v Nastavení** („📦 Záloha programu") stáhne celý program
v ZIPu. Uživatel ho chtěl pro případ, že by spadl GitHub, odkud se program
načítá — aby si ho mohl rozjet jinde.

- **ZIP se skládá VLASTNÍM kódem, nikdy knihovnou z CDN.** Je potřeba přesně
  ve chvíli, kdy síť nefunguje, takže stahovat si kvůli němu knihovnu je
  nesmysl. `zipVytvor()` píše hlavičky ručně (local `PK\x03\x04`, central
  `PK\x01\x02`, EOCD `PK\x05\x06`), komprimuje vestavěný
  **`CompressionStream('deflate-raw')`** (metoda 8); když ho prohlížeč nemá
  (starší iOS Safari), uloží se nekomprimovaně (metoda 0) — ZIP je větší,
  ale platný. Vše je pod 4 GB, takže žádné ZIP64.
- **Přes Pages se nasazuje CELÝ repozitář** (`.github/workflows/pages.yml`),
  takže si aplikace umí `fetch()`em stáhnout i `CLAUDE.md`, `pages.yml`
  a `.nojekyll`. Service worker je drží v cache → **záloha jde pořídit
  i offline**, což je celý smysl.
- **Externí zdroje se berou Z DOM**, ne z ručního seznamu: `script[src]`
  a `link[rel=stylesheet][href]` s absolutní URL, a uvnitř staženého CSS
  všechny absolutní `url(...)` (písma). Nikde se nejmenuje konkrétní doména,
  takže výměna knihovny ZIP nerozbije. Do `index-offline.html` se cesty
  přepíšou na `knihovny/`; originální `index.html` zůstává v ZIPu nedotčený.
- **`zipStahni()` MUSÍ mít časový limit** (`AbortController`, 15 s).
  Nedostupná síť (firemní proxy, odpojený tunel) umí `fetch` **zaseknout**
  místo toho, aby vrátila chybu — bez limitu by balení viselo napořád.
  Zjištěno při testech 2026-09-11.
- **Bundlovat jde jen zdroj, který posílá CORS hlavičku.** cdnjs
  i fonts.gstatic.com ji posílají; `<script src>` by se načetl i bez ní,
  ale `fetch()` ne. Při výměně knihovny to ověřit.
- Neúspěch jedné položky ZIP neshodí — vynechá se, zapíše se do
  `JAK-TO-ROZJET.txt` a řekne uživateli. Záloha kódu nesmí padnout kvůli
  jednomu fontu, ale taky se nesmí tvářit jako plně offline, když není.
- **Data v ZIPu nejsou** (rozhodnutí uživatele) — ta má vlastní tlačítko
  „⬇️ Stáhnout zálohu". Návod na to výslovně upozorňuje.
- Testy: `test-zip-kodu.js` (28 kontrol — včetně rozbalení a **reálného
  spuštění programu s odstřiženou sítí**) a `test-ulozit-typy.js` (7).

**Pasti při testování** (stály hodinu, ať je to příště rychlejší):
1. `page.evaluate(() => stahnoutKodZip())` **spadne** — Playwright čeká na
   vrácený slib a stažení mu zabije kontext. Musí být `() => { stahnoutKodZip(); }`.
2. Service worker si po převzetí kontroly stránku sám reloadne (PWA
   auto-update). V testu se musí vypnout jeho **registrace**
   (`navigator.serviceWorker.register = () => new Promise(() => {})` přes
   `addInitScript`), ne stahování `sw.js` — ten musí do ZIPu jít.
3. `showSaveFilePicker` v headless bez uživatelského gesta **nikdy
   nedoresolvuje** → v testu ho smazat, ať se jede cestou stažení.
4. Sandbox nepouští cdnjs. Knihovny se nasimulují lokálním serverem, který
   **posílá `Access-Control-Allow-Origin`** (`corsserver.py`) — obyčejný
   `python3 -m http.server` ne, a fetch by selhal na CORS.

## Kresba stromu — JEDNA ČÁRA = JEDEN KABEL (v9.41)

**Nejdůležitější pravidlo celé kresby.** Ve v9.40 se kreslila **jedna společná
svislice** a potomci z ní odbočovali. Uživatel to odmítl jako elektrotechnickou
chybu: „jsou to dva kabely z RH a nakreslená je jen jedna čára." Společná
svislice je obrázek **sběrnice** — jako by z rozváděče šel jeden kabel, který
se teprve pak rozvětví. Ve skutečnosti jde z každého jističe vlastní kabel,
takže **z dolní hrany rámečku vychází tolik svislic, kolik je vývodů**.

- **Pořadí kabelů je zprava doleva**: potomek 0 dostane nejpravější (nejkratší
  čáru), poslední nejlevější (nejdelší). Jen tak se **žádné dvě čáry
  nezkříží** — kabel pozdějšího sourozence leží vlevo od veškerého obsahu
  těch dřívějších a hlubší úrovně jsou vždycky vpravo od průběžných čar
  mělčích. Obrácené pořadí by vedlo čáru přes rámečky sourozenců.
- **Průchody stromem vrací `rodic` / `poradi` / `deti`**, ne původní booleany
  `cesta`. Jsou to údaje **bez jednotek** — geometrii z nich počítá až
  `stromGeometrie()`, takže obrazovka jede v px a tisk v mm ze stejného
  modelu. V DFS pořadí je rodič vždycky dřív než potomek, takže index stačí.
- Rozteče: **`off`** (levá hrana rámečku → nejlevější kabel), **`rozestup`**
  (mezi rovnoběžnými kabely), **`mezera`** (nejpravější kabel → obsah
  potomka). Pro rodiče s N vývody a `vejir = (N-1)*rozestup`:
  `drop_i = P.lx + off + (vejir - i*rozestup)`, `lx_i = P.lx + off + vejir + mezera`.
- **Pojistka `maxLx`**: rozváděč s deseti vývody by vytlačil rámečky mimo
  stránku, proto `stromGeometrie()` jede dvakrát — napoprvé změří, kam to
  uteče, a když přeleze, zmenší všechny rozteče společným poměrem
  (dolní mez 40 %, ať čáry nesplynou v jednu šmouhu).
- **Odsazení dělá `margin-left` obsahu, ne `padding-left` řádku** — absolutní
  čáry se tak měří od levé hrany řádku a pořád ze stejné nuly.
- **Paralelní napájení z jednoho jističe = dvě čáry** se stejným popiskem
  (rozhodnutí uživatele 2026-09-11). Vyjde to samo: dva potomci napájení
  z téhož řádku jsou ve stromu dva uzly.
- **Značka jističe na čáře se nekreslí** — stačí text (rozhodnutí uživatele).
- **Popisek propoje je jen `kabel · označení (jištění)`** — bez názvu obvodu
  (pokyn uživatele 2026-09-14, přeškrtal ho v snímku). U vývodu do podružného
  rozváděče jen opakuje jméno, které stojí hned pod ním v rámečku
  („FU5 — Rozváděč 31RM3 – vlevo" → rámeček „31-RM3"), a u většího stromu se
  kvůli němu kresba nevejde na šířku A4. Zkrátilo to popisky zhruba o dvě
  třetiny. **Když označení chybí, zaskočí název obvodu** — jinak by u jističe
  nebylo vůbec nic. „Jiný řádek" si dál nese svůj vlastní text.
  Test: `test-popisek-propoje.js` (10 kontrol).

## Kresba stromu — rámečky a popsané propoje (v9.40)

Strom byl do v9.39 odsazený **textový seznam**. Uživatel poslal náčrt tužkou
a chce **blokové schéma**: rozváděč = rámeček, propoj = čára a **u každého
propoje typ kabelu a hodnota jištění** („nakreslil jsem to jen u jednoho jako
ukázku"). Kreslí se tak na **všech třech místech** — panel v programu, blok
v PDF zprávy i samostatné schéma.

- **Kreslí se na JEDNOM místě: `stromKresba(radky, o)`.** Dřív to byly tři
  kopie téhož odsazení (`renderRozvStrom`, `stromProPdf`, `schemaRadekHtml`),
  které se pomalu rozcházely. Rozměry drží tři sady voleb — `STROM_PANEL`
  (px), `STROM_TISK` (mm, blok ve zprávě), `STROM_SCHEMA` (mm, samostatné
  schéma, navíc `umisteni: true`).
- **Strom se kreslí z PLOCHÉHO seznamu**, takže stránkování ve
  `schemaVykreslit()` zůstává netknuté. (Podklad pro čáry se ve v9.41 změnil
  z `cesta` na `rodic`/`poradi`/`deti` — viz oddíl výš.)
- **Vějíř kabelů k potomkům musí být blok POD rámečkem** (ve v9.41 už s N
  absolutními spany uvnitř), ne span umístěný podle rámečku. Ten by musel
  znát jeho výšku (mění se s délkou názvu i s fontem) a čáry by od rámečku
  odskakovaly. Průběžné čáry absolutní spany (`top:0;bottom:0`) být můžou —
  leží vlevo od obsahu řádku, takže rámeček nepřeškrtnou.
- **Kabel se do vazby musel doplnit** — do v9.39 ho žádná cesta nenesla,
  přestože v datech je. Tři místa: `stromRadkyKarty()` (`inp[15]` u obvodu,
  **`inp[14]` u hlavičky chrániče** — Ch. je `<select>`, proto ten posun),
  `vazbaProCil()` v `rozvStromData()` a `stromZDat()` (`m.kabel`).
- **Záloha z „Přívodu"** řeší až kreslení (`stromKabelVazby`), ne data: když
  je sloupec Kabel prázdný, vezme se pole „Přívod" **cílového** rozváděče.
  Text se **nijak nerozebírá** — je to celá věta („CYKY 4B×16 mm² ukončen
  v RMS 1 na svorkách…"), jen se zkrátí. Program si z ní nic nedomýšlí.
- **Jednotka „A" se nepřidává, když si ji uživatel napsal sám**
  (`stromProud()`) — z hodnoty `3x40A` dřív vyšlo „3x40A A".
- **U kořene je propojem jeho „Přívod"** — vypíše se nad rámečkem jako
  „přívod: …". Prázdný přívod = nic (pak se ukáže „hlavní rozváděč").
- **V rámečku je JEN název** (pokyn uživatele — „přesně jak je můj náčrt").
  Umístění je drobným šedým textem **vedle** rámečku, ne pod ním: pod ním
  by leželo u páteře a pletlo by se s popiskem dalšího propoje.
- Zlom stránky uprostřed větve svislou čáru přeruší — ponecháno vědomě,
  alternativa (nedělit větve) by u velkého areálu nechávala půl stránky
  prázdné.

## Samostatný tisk schématu rozváděčů (v9.39)

**Samostatný výtisk NESMÍ jít přes `generujPDF()`.** Ta má tři vedlejší
účinky: zapíše zprávu do archivu, přepne na `screen-pdf` a vysype
`#pdf-pages`. Do v9.38 to tak „🖨️ Tisk schématu" dělal — bez ptaní uložil
soubor a nechal uživatele stát v náhledu celé revize. Navíc je strom vsazený
do kapitoly „Naměřené hodnoty", takže vyfiltrovaná stránka s sebou vždycky
přinesla i tabulku měření prvního rozváděče.

Schéma se proto kreslí samo, do vlastní obrazovky **`#screen-schema-pdf`**
(lišta ← Zpět · 🖨️ Tisk přímo · 💾 Uložit PDF, kontejner
`#schema-pdf-pages`) — přesně podle vzoru náhledu Plánu revizí.

- `stromTisk()` → `schemaVykreslit(D, stromZDat(D))`; kontroluje
  i `stromZapnut()`, ne jen existenci vazeb.
- **`showScreen('schema-pdf')` musí předcházet měření výšky** — ve skryté
  obrazovce mají prvky nulovou velikost a dělení stránek vyjde mimo
  (stejná past jako u plánu).
- Stránka se měří s `min-height:0`, jinak by každá „naměřila" 297 mm a
  nikdy by se nic nerozdělilo. **Po dělení se `min-height` vrací**, ať list
  v náhledu vypadá jako papír. Do PDF stejně `renderPagesToPDF` velikost
  natvrdo přepíše.
- Obsah listu: **hlavička** (místo revize, adresa, ev. číslo, datum revize
  = `ukonceni` nebo `vypracovani`, technik) **+ strom + umístění** u každého
  rozváděče. Popis jističe ve stromu tam patří — je to ta informace, odkud
  rozváděč vede; celá tabulka měření ne.
- **Zpět** vrací tam, odkud se přišlo — `showScreen` žádnou historii nevede,
  takže se aktivní obrazovka zapamatuje do `__schemaZpet` PŘED přepnutím.
- `pdfProgressShow(total, proTisk)` — u tisku overlay hlásí „Připravuji tisk",
  ne „Ukládám PDF" (nic se neukládá).

## Rozváděče — kopie a přesun obvodů mezi nimi (v9.35)

- **`copyRozvadec(el)`** klonuje kartu rozváděče i s obvody a vkládá ji hned
  pod originál. `cloneNode(true)` přenáší hodnoty `<input>` a zaškrtnutí, ale
  **NE výběr `<select>`** — ten se dopisuje ručně podle originálu (stejná past
  jako v `copyRcdGroup`). RCD skupiny v kopii dostanou **nová `data-rcd-group`**,
  jinak by mazání chrániče sáhlo do obou rozváděčů. Posluchače se klonováním
  neberou, takže se po vložení znovu navazuje drag&drop i změna typu chrániče.
- **Tlačítko „✕ Odebrat rozváděč" se generuje vždycky** a schovává ho
  `renumberRozvadece()`, když je rozváděč jediný. Dřív se u prvního rozváděče
  negenerovalo vůbec — jeho kopie by pak nešla smazat.
- **Obvod jde přetáhnout i do jiného rozváděče.** V `initRowDnd()` se cíl
  zjišťuje z `tr.parentNode` **až při události**, ne z closure — jinak by řádek
  po přesunu (nebo po kopii) pouštěl do své původní tabulky. Povolení dropu
  řeší `smiSemPustit()`: stejná tabulka vždy, cizí jen mezi tabulkami obvodů
  (`jeTabulkaObvodu()` = uvnitř `#rozvadece-container`). Dokumentace, přístroje,
  LPS zemniče i seznamy strojů tak zůstávají uzavřené samy do sebe.
  Po přesunu se přečíslují **obě** tabulky, zdrojová i cílová.
- **`rcdTypZmenen(sel)`** je společná obsluha změny typu chrániče — tabulku,
  řádek i skupinu si zjistí z DOM. Dřív to byla closure nad `tbody`/`trMain`,
  takže po přesunu chrániče do jiného rozváděče přibývaly podřádky ve starém.
- Testy: `test-kopie-rozvadec.js` (12) a `test-presun-obvod.js` (15, včetně
  přesunu celé RCD skupiny i s podřádky). **Tažení v testu potřebuje po
  `mouse.down()` nejdřív drobný pohyb**, jinak prohlížeč tažení nezahájí,
  a zdroj i cíl se musí vejít do okna — jinak drop spadne mimo.

## Záloha databáze — zápis a čtení musí sedět (v9.34)

`buildZalohaBlob()` (~ř. 12061) a `obnovZeZalohy()` (~ř. 12292) mají **každá
vlastní ruční výčet klíčů**. Když se přidá nový klíč do STORE, musí se doplnit
do OBOU — jinak se buď neuloží, nebo se tiše zahodí při obnově.

**Co se stalo (nahlášeno 2026-09-09):** `plan` se do zálohy zapisoval od
v9.206 (2026-08-20), ale řádek, který ho čte zpět, **nikdy neexistoval**.
Uživatel přišel o všechno, co v plánu není odvozené z archivu — ručně přidané
objekty, ruční termíny v buňkách roku, složky, techniky, štítky, EX.
Na stejném zařízení se chyba neprojeví (STORE.plan v paměti přežije a obnova
ho jen nepřepíše), udeří přesně ve chvíli, kdy je záloha k něčemu — po ztrátě
dat nebo na jiném počítači.

Pravidla, která z toho plynou:

1. **Nový klíč = tři místa**: `STORE_KEYS`, `STORE_VYCHOZI`, `buildZalohaBlob()`
   **a** `obnovZeZalohy()`. (`STORE_KEYS` sám o sobě do zálohy nestačí —
   dřív to tvrdila i tahle dokumentace a nebyla to pravda.)
2. **Fallback z localStorage v `loadStore()` jede přes `STORE_KEYS`**, ne přes
   ruční výčet — dřív v něm chyběly `strojeMereni`, `strojeKontroly`
   a `auto_zaloha_*`. Na iOS je to jediná cesta načtení (IDB je tam vypnutá),
   takže chybějící klíč se po prvním dalším `saveStore()` z disku ztratil.
3. **Obnova nesmí mlčky přepsat plán**: potvrzovací dialog ukazuje počet
   objektů v záloze i varování, když je současný plán větší. Chybí-li v záloze
   klíč `plan` úplně (zálohy před v9.206), stávající plán se nechá být.
4. **Formát `revize-el-plan` musí poznat každá cesta importu** — drag&drop
   (~ř. 3950), `importDatabaze()` a **taky `zpracovatZpravuData()`** (hlavní
   tlačítko „Načíst"), kde chyběl a soubor plánu propadl do `nacistData()`
   jako by to byla zpráva.
5. **Test `test-zaloha-plan.js`** ve scratchpadu hlídá celé kolečko
   plán → záloha → vyčištěný prohlížeč → obnova → restart.

## Typy revizních zpráv (elektro / LPS / stroje)

Program umí **tři typy zpráv** — `aktTyp` ∈ `elektro` | `lps` | `stroje`.
Typ **nebyl nikde centralizovaný**: byla to zhruba šedesátka binárních testů
`aktTyp === 'lps'` / ternárů `… ? 'LPS' : 'Elektro'`, takže třetí hodnota by se
všude tiše chovala jako elektro. Proto vznikla tabulka **`TYPY_ZPRAV`**
(hned za `var aktTyp`) + `typInfo(t)`:

```js
TYPY_ZPRAV.stroje = { label:'Stroje', badge:'badge-stroje', bar:'tab-bar-stroje',
                      planDruh:'T', prefix:'RS', pdfNadpis:'…', planPopis:'stroje' };
```

**Přidáváte-li čtvrtý typ** (roadmapa #10 jich má ještě osm — spotřebiče,
trafo, osvětlení…), sáhněte na tahle místa:

1. `TYPY_ZPRAV` — nový záznam. Tím se rovnou spraví štítek v archivu,
   filtr, breadcrumb, fulltext, „naposledy otevřené", značka do plánu,
   předmět e-mailu, rozpoznání souboru zprávy, obnova draftu i číselná řada
   v `navazatZpravu` (všechna tahle místa už jedou přes `typInfo()`).
2. `aktivniTabBar()` funguje sama — projde `TYPY_ZPRAV` a najde viditelný bar.
3. HTML: nový `tab-bar-<typ>` + panely `tab-<typ>-*`, karta na `screen-podtyp`
   (pokud typ patří pod elektro) nebo dlaždice na hlavní straně.
4. `novaZprava()` — větev pro inicializaci a skrývání nehodících se karet.
   **Pozor:** podmínky jsou psané jako `(typ === 'elektro') ? '' : 'none'`,
   ne `(typ === 'lps') ? 'none' : ''`, právě aby nový typ nespadl do elektra.
5. `collectXData()` / `restoreXData()` + volání v `getData()` a `nacistData()`.
6. `NORMY.<typ>` + tab v editoru norem (`normy-tab-<typ>`),
   `TYPICKE_ZAVADY_<TYP>` + větev v `getTypickeZavady()`, `magicPopis()`,
   `magicZaver()`, `TYPY_TEXTU` + `TYPY_TEXTU_FILTRY`.
7. **PDF a `cisloKapitolyZavady()` současně** — číslování kapitol je na dvou
   místech a musí sedět, jinak závěr odkazuje „v kapitole N", která neexistuje.
   U LPS i strojů platí `secZavady = secBase + 2` (proměnná `dveKapitoly`).

### Stroje — ČSN EN 60204-1 ed.3 (v9.30)

- Vstup: **pátá karta na `screen-podtyp`** (`pt-stroje`), ne dlaždice na hlavní
  straně — pokyn uživatele 2026-09-02 („aby nám nenabyly dlaždice"). Ev. číslo
  má prefix **RS**.
- Taby: `1. Titulní strana | 2. Stroj | 3. Přístroje | 4. Měření | 5. Kontroly
  | 6. Závěr & Závady`.
- **Přepínač rozsahu** `f_stroje_rozsah`: *jeden stroj* (identifikace je na
  titulce) nebo *soubor strojů* (karty jako rozváděče, každý stroj má vlastní
  seznam měření i kontrol, v PDF podkapitoly `secBase.1`, `secBase.2`…).
- **Měření a Kontroly nejsou mřížka obvodů, ale plochý editovatelný seznam**
  (tak to má i konkurence): řádky `data-rowtype="stroj-nadpis"` (členicí řádek
  s článkem normy) a `stroj-polozka`. Měření = text / hodnota / jednotka,
  Kontroly = text / `<select>` výsledek. Sloupec **poznámky se do PDF netiskne**.
  Řádky jde přidávat, kopírovat, mazat i přetahovat — `mkDelTd()` a
  `initRowDnd()` fungují beze změny. `renumberRows()` se jich záměrně netýká
  (seznam nemá sloupec s číslem).
- **Nápověda k hodnotám**: položka měření může mít `ph` (šedý náznak v poli
  Hodnota — mezní hodnota dle normy) a `tip` (bublina s celým vysvětlením
  a článkem normy). Do dat se ukládají jako `napoveda` / `popis`, aby
  nezmizely po načtení zprávy z archivu. **Nikdy to nejsou hodnoty** —
  placeholder se do PDF nedostane, pole zůstává prázdné.
- **Levý padding textu řádku musí být inline** (`padding:.3rem .4rem .3rem 17px`).
  CSS pravidlo `td.dnd-num-cell input{padding-left:15px}` je slabší než
  inline styl, takže bez toho úchyt ⠿ leze do textu (nahlásil uživatel).
- Výchozí sady `STROJE_MERENI_VYCHOZI` (čl. 18.2–18.6) a
  `STROJE_KONTROLY_VYCHOZI` (16 bodů). Tlačítko **„Uložit jako výchozí pro
  příští zprávy"** je ukládá do `STORE.strojeMereni` / `STORE.strojeKontroly`
  (jsou v `STORE_KEYS`, tedy i v záloze) — ukládá se **jen kostra**, ne
  naměřené hodnoty.
- **Identifikace stroje je u režimu „jeden stroj" na titulní straně**
  (pokyn uživatele 2026-09-02, tak to má konkurence) — `#stroje-blok`
  se přesouvá mezi `#stroje-titulka-host` (titulka) a `#tab-stroje-objekt`
  (soubor strojů). **Přepínač rozsahu do přesouvaného bloku nepatří** —
  změna jeho hodnoty by odstěhovala sám přepínač pryč z obrazovky
  (a Playwright na tom zacyklí „element is not visible").
- U strojů se **neptáme na adresu objektu** (`#f-adresa-wrap` skryté) —
  adresa je v poli Provozovatel.
- Karty `scard-rozsah-popis` (předmět revize je/není, popis),
  `scard-ochrana-char` a `scard-dokumentace` **bydlí v elektro tabu
  `#tab-popis` a přesouvají se podle typu**. Přesun **musí být obousměrný**,
  jinak po otevření zprávy o stroji chybí u elektro revize. Bez toho přesunu
  se pole vytisknou do PDF, ale ve formuláři na ně uživatel nedosáhne —
  přesně tuhle chybu měla v9.30–v9.32.
- Data: `D.stroje = { rozsah, seznam: [{ …hlavička…, mereni: [], kontroly: [] }] }`.
- `POPIS_STROJE` je definovaný **jednou** a používá ho magic tlačítko
  i knihovna typických textů, ať se ty dva texty nemůžou rozejít.
- V **Plánu revizí** se stroje počítají jako značka **T**.
- Lhůta příští revize: volba „Stroje a technologická zařízení (2 roky)"
  v modálu se vybírá přes `option[data-pro="stroje"]`, ne přes `value` —
  hodnotu „2" má i volba pro divadla a kina.

## Už implementované (neřešit jako nový nápad)

- ✅ **Odběratelé (zákaznická knihovna)** — scard na hlavní straně,
  modal pro CRUD (název, adresa, IČO, DIČ, telefon, e-mail, IBAN,
  poznámka), tlačítko 🔍 „Načíst z ARES" v modálu. Ve formuláři zprávy
  dropdown „Vybrat z knihovny odběratelů" + tlačítko „💾 Uložit jako
  odběratele". Počítadlo zpráv v archivu přes `odberatel_id`.
- ✅ **ARES API lookup podle IČO** — u Provozovatele, Objednatele
  i v modálu Odběratele. Volá
  `https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/{ico}`,
  vyplní název, adresu, DIČ. Funkce `lookupIcoFromAres` se dá
  znovupoužít (přes `targetCallback` pro rozhoz do více polí).
- ✅ **Záloha/obnovení databáze** — scard „💾 Záloha a obnovení",
  export do JSON souboru (celé STORE), import s potvrzením.
- ✅ **„Nová – kopie označené"** — v archivu tlačítko 🔗 Navázat:
  hluboká kopie staré zprávy, nové ev. číslo, dnešní data, druh
  revize se přehodí na Pravidelná pokud byl Výchozí, vyčistí
  naměřené hodnoty a závady. Funkce `navazatZpravu(i)`.
- ✅ **Datalisty s typickými hodnotami** — Ochrana před úrazem,
  Typ zemniče, Zdroj el. proudu (ČEZ / EG.D / PRE…), Název obvodu,
  Typ kabelu, Proud jističe, Charakteristika, IΔn RCD, Název
  rozváděče. Všechny mají `autocomplete="off"`.
- ✅ **Auto-číslování řádků měření** — `renumberRows(tbody)`.
  Funguje pro obvody, RCD hlavičky (podřádky RCD číslo nemají)
  a LPS-row. Aktualizuje se při copyRow, delRow, addMereniRowTo,
  addRcdRow, copyRcdGroup.
- ✅ **Magic tlačítka pro popis a závěr** — `magicPopis` má 4 varianty
  (dum / byt / prumysl / lps / lps1390); `magicZaver` vybírá dle
  aktTyp + celkový_výsledek + LPS norma.
- ✅ **Typické závady s normou** — `TYPICKE_ZAVADY` (elektro, 20×),
  `TYPICKE_ZAVADY_LPS` (62305, 16×), `TYPICKE_ZAVADY_LPS_1390`
  (ČSN 34 1390, 16×). Dropdown v každé závadě filtrovaný přes
  `getTypickeZavady()`.
- ✅ **LPS kompletní podpora** — vlastní taby (Objekt & LPS,
  Prohlídka LPS, Měření zemničů), sběr do `D.lps`, restore přes
  `restoreLpsData`, vlastní PDF stránka (sekce 5+6), přepínač
  ČSN EN 62305 vs ČSN 34 1390 synchronizovaný mezi titulní
  checkboxem a Prohlídka LPS dropdownem, dynamický label Třída LPS
  (I–IV vs kategorie obyčejný/zesílený/zvláštní), skrytí
  62305-specifických polí (mřížka, Typ A/B, LPZ zóny, SPD)
  pro 1390, dynamický PDF obsah dle volby normy.
- ✅ **Plán revizí — přívlastky, sdílení, vlastní nadpis PDF** (2026-08-20):
  `STORE.plan.stitky` = vlastní kategorie objektů (kotelna, rozvodna nn,
  výbušný prostor), objekt má `stitky: [id]`, filtr má volbu `stitek:<id>`
  a lišta hromadné přidělení. Objekt bez zprávy v archivu = **fialový řádek**
  (`tr.plan-rucni`). U provozovatele se počítají budovy i objekty.
  **Naplánované termíny** se dopočítají z `objekt.cyklus`, když zpráva nemá
  vyplněnou doporučenou lhůtu (dřív u takových objektů nebylo žluté nic).
  Plán jde uložit jako `_format: 'revize-el-plan'` (📤 Soubor pro kolegu)
  a načíst zpátky (📥) — načtení vždy **přepíše** plán a ptá se.
  `buildZalohaBlob()` **nově obsahuje `plan`** — dřív se plán do zálohy
  vůbec nedostal. Ve zprávě přibyla pole `f_nadpis_vlastni`
  a `f_nadpis_doplnek` pro použití zprávy jako přílohy.
  **Pozor na CSS:** program používá `var(--surface)` a `html.dark`,
  ne `var(--card)` / `[data-theme="dark"]` — na tom se první verze stylů
  plánu tiše rozbila.
- ✅ **Plán revizí — hromadné úpravy** (2026-08-20): zaškrtávátko na začátku
  řádku (`__planVybrane`, Shift označí úsek podle `__planPoradi`, checkbox
  u složky označí vše uvnitř). Lišta `#plan-hromadne` umí: do složky, technik,
  EX, lhůty, **sloučit** duplicity (`planVybraneSloucit` — termíny se vlijí
  do prvního objektu) a **odebrat z plánu** (ptá se; objekty odvozené
  z archivu se jen skryjí do `STORE.plan.skryte`, tlačítko 🚫 Skryté je vrátí).
- ✅ **Plán revizí — doplnění historie mimo program** (2026-08-20): tři cesty,
  jak do plánu dostat revize, které nejsou v archivu.
  **📋 Vložit z Excelu** (`planRozborVlozeni` + `planVlozitPotvrdit`) rozebere
  TSV ze schránky: hlavička s roky, značky S/H/T i EL/LPS/T, měsíce z řádku
  pod objektem, dvojice „leden+září" (každý druh svůj měsíc), „zrušeno"
  a pomlčky, oddíly (KOTELNY) volitelně jako budovy, pokračovací řádky názvu,
  zopakované hlavičky se přeskočí. Barvy schránka nepřenáší → EX a technik
  ručně. **Ruční termín** klepnutím na buňku. **🔢 Dopočítat řadu**
  (`planDopocitat`) z poslední revize a lhůty — **vždy se ptá a ukazuje,
  co zapíše** (pokyn uživatele: předchozí technik mohl mít termíny jinak),
  a nikdy nepřepíše už vyplněný rok.
  Buňka roku drží položky po druzích (`polozky: [{druh, mesic, stav}]`), takže
  EL může být v lednu a LPS v září — `planSkupinyBunky` je pro zobrazení spojí.
- ✅ **Plán revizí — značky druhů**: **EL** = elektroinstalace,
  **LPS** = hromosvod, **T** = technologie a zařízení (rozhodnutí uživatele
  2026-08-20; původní S/H se převádí přes `planMigraceZnacek`).
  Plán je **jen pro uživatele a jednoho kolegu — do Novinek nepatří**.
- ✅ **Plán revizí — strom složek** (2026-08-20): uspořádání
  **🏢 provozovatel → 🏠 budova → 📄 objekt** jako v Průzkumníku, tlačítko
  `+`/`−` u složky, přesouvání myší (`planPresunout`, pravidla i pro tažení
  i pro okno objektu), provozovatel se vybírá z knihovny odběratelů.
  Objekty se ve složce řadí **podle data příští revize** (`planPristiRadku`),
  ne podle data provedení. **Sbalená složka shrne termíny všech objektů uvnitř
  do sloupců podle roku** (`planSouhrnSlozky`) — to je ten pohled „vidím celou
  budovu najednou". Do PDF jde přesně to, co je vidět (`planTiskoveRadky`).
  Nezařazené objekty spadnou do složky „📦 Nezařazené objekty".
  Data: `STORE.plan.slozky`, `objekt.rodic`, `STORE.plan.otevrene`.
  Původní ploché „skupiny" se jednorázově převedly na budovy (`planMigraceSkupin`).
- ✅ **Plán revizí** (vstup: třetí karta na hlavní straně) —
  víceletá tabulka objekt × rok podle Excelu, který si uživatel vede jako
  správce areálu (MPBP příloha 7). Objekty se odvozují z archivu podle
  **„Místa provádění revize"** (`planKlicZpravy`), hotové revize se plní
  z data zprávy (elektro → S, LPS → H), příští termín **výhradně** z `D.pristi`
  (pole „Termín příští revize" na titulní straně) — `planPristiTermin`.
  **Odhad z textu doporučené lhůty se úmyslně nepoužívá** (pokyn uživatele
  2026-08-20: v plánu, podle kterého se objíždí areál, vypadá odhad jako
  fakt). Chybí-li datum, řádek dostane červený štítek `⚠ CHYBÍ TERMÍN`,
  buňka roku červený rámeček s otazníkem, nad tabulkou je souhrnné varování
  s tlačítkem „Ukázat jen tyto" a ve filtru je volba `chybi`.
  Řadu dopředu lze dopočítat z `objekt.cyklus` (⏱ Lhůty). Vlastní objekty se přidávají ručně;
  archivní objekt se stane vlastním záznamem, teprve když se u něj něco
  vyplní (`planZajistitObjekt`). Umí: označení **EX** (nutné oprávnění pro
  prostředí s nebezpečím výbuchu), přidělení technika s barvou, skupiny
  (oddíly jako „Kotelny"), ruční termíny, filtry, hledání a **export do PDF
  na šířku**: `planExport` otevře okno s nadpisem dokumentu
  (`STORE.plan.tisk` = nadpis, podnadpis, bezDatumu — kvůli použití plánu
  jako přílohy MPBP), pak se ukáže **náhled** (`screen-plan-pdf`) s tlačítky
  Tisk přímo / Uložit PDF / Nadpis dokumentu. Dělení stránek podle naměřené
  výšky — **obrazovka náhledu se musí ukázat dřív, než se měří**, jinak mají
  prvky nulovou velikost. Data v `STORE.plan` (v STORE_KEYS i v záloze).
- ✅ **Automatické rolování při přetahování** (2026-08-20) — táhne-li se řádek
  měření, rozváděč nebo objekt v plánu k okraji, posouvá se samo: nejdřív
  posouvatelný rámeček pod kurzorem (`.plan-scroll`), a když je na konci,
  celá stránka. Past, na kterou jsme narazili: **`dragover` se během
  skutečného tažení skoro nespouští** (v testu 1× za celé tažení), kdežto
  událost `drag` chodí spolehlivě — polohu proto bereme z obou. rAF během
  nativního tažení běží normálně. Konec tažení hlásí prohlížeč jako (0,0),
  což se musí ignorovat, jinak seznam vystřelí nahoru.
- ✅ **PWA auto-reload po update** — network-first pro HTML,
  listener `controllerchange` → `location.reload()`. Uživatel
  nemusí hard-reloadovat; cache bump v sw.js stačí.

- ✅ **Knihovna textů — ukládání části a vkládání na kurzor** (2026-08-20):
  `ulozitDoKnihovny` uloží **jen označený úsek** textarey, když v ní nějaký
  je (jinak celé pole); takový snippet má `cast: true` a v seznamu štítek
  ČÁST. `vlozitSnippet` má tři režimy: `append` (na konec), **`kurzor`**
  (na pozici zapamatovanou v `__snipPozice` při otevření knihovny, doplní
  mezery kolem) a `replace`.

- ✅ **Formátovaný text jako ve Wordu** (2026-08-31): pole s prózou
  (`textarea[data-rich]`: popis, závěr, předmět je/není, důvod mimořádné,
  seznam příloh, popis závady) se doplní o `div.rich-edit`
  (`contenteditable`), původní textarea zůstane skrytá jako držitel hodnoty
  — proto ukládání, archiv, zálohy, diktování i AI fungují beze změny.
  Zápis do `.value` je odchycený přes `Object.defineProperty`, takže
  programové nastavení hodnoty se hned projeví v editoru. Ukládá se text
  s povolenými značkami (`<strong> <em> <s> <u> <span style="color">`),
  `richSanitizuj()` nic jiného nepustí, `richHtml()` ho vkládá do PDF.
  Formátování dělá `document.execCommand` (styleWithCSS jen pro barvu).
  **První podoba s textovými značkami (`**tučně**`) byla špatně** —
  uživatel to odmítl („nemůže to fungovat jako ve Wordu?"), převod starých
  značek ale zůstal kvůli zprávám uloženým ve v9.211.
- ✅ **Lišta nad textovým polem — Ω a formátování** (2026-08-20):
  plovoucí `#txt-lista` se ukáže **jen nad poli `.rich-edit`** (souvislý text).
  V tabulce měření, v dialozích, v nastavení ani v jednořádkových polích se
  neukazuje — uživatel to výslovně odmítl (2026-08-31: „zobrazuje se to skoro
  všude a pěkně mě to štve"). Symboly Ω µ ° ± ² Δ + **B / I / S̶ / barva /
  zrušit**; lišta mizí na `focusin` jinam i na `mousedown` mimo pole.
  Formátování se do textu zapisuje **značkami** (`**tučné**`, `__kurzíva__`,
  `~~škrtnuté~~`, `{{#c0392b|barevné}}`) — data zůstávají obyčejný text,
  takže archiv, zálohy i staré zprávy fungují beze změny. Do PDF to
  převádí `richHtml()` (použité v `odstavceHtml`, u předmětu revize,
  důvodu mimořádné, závad a seznamu příloh), `richText()` značky odstraní.
  Tlačítka reagují na `mousedown` s `preventDefault` — na `click` by pole
  ztratilo označený text dřív, než se stihne přečíst.

## Roadmapa — co zbývá udělat (wishlist z DM Revize)

Uživatel má placený program **DM Revize** (https://elektro.dmrevize.cz)
a poslal fotky funkcí, které chce i u nás. **Tento seznam berte jako
wishlist** — nerealizovat automaticky, ale **když se uživatel zeptá
„udělejme funkci X"**, vědět, co X znamená.

Pořadí podle **hodnota/pracnost**. Čísla jsou historická (pro
dohledání v předchozích diskuzích), nepřerovnávám je.

### 🔥 Nejvyšší priorita — velká hodnota, realizovatelné

1. **Knihovna textových bloků** („Rychlé vložení textů" v DM) —
   snippety pro odstavce, aby revizak nepsal opakující se texty
   (poučení provozovatele, typické závěry, popisy). Rozdělit na
   `od autorů` (přednastavené) a `vlastní` (uživatel si přidá).
   Realizace: localStorage + panel s vyhledáváním.

4. **Filtry v archivu + recenty** — podle odběratele / typu /
   stavu (aktivní/ukončená) / roku. Panel „Naposledy otevřené"
   s pin funkcí.

6. **QR kódy na titulní stranu** — vlevo vCard revizního technika,
   vpravo info o zprávě (URL/hash pro ověření). Knihovna:
   `qrcode.js` (~15 kB). Generuje se client-side do PDF.

### ⚙️ Střední priorita

7. **Nastavení tisku** (levý panel v DM Revize):
   - Razítko technika (obrázek nahraný v profilu → render na konec PDF)
   - Malé razítko na každé straně
   - Vodoznak
   - Barevné pozadí titulní strany
   - Závady – každá na vlastní stránku (toggle)
   - Závady – tisknout jen neodstraněné (toggle)
   - Fotek závad na řádek: 0 / 1 / 2 / 3
   - Tisknout přílohy PDF (merge přes `pdf-lib`)

8. **Fotografie u závad** — upload obrázků k jednotlivým závadám,
   render v PDF podle nastavení fotek na řádek.

9. **Rich text editor pro popisy/závěr** — contenteditable +
   toolbar (B / I / U / seznamy / zarovnání / tabulka / obrázek).
   Alt: lightweight knihovna (Quill ~100 kB).

10. **Další typy revize** (DM jich má 11): **Spotřebiče, Stroje,
    Trafo, Osvětlení, Podlahy, Nouzové osvětlení, VN, Zdroje pro
    svařování, Zdravotní přístroje, Univerzální.** Momentálně
    máme jen Elektro + LPS. Každý typ = vlastní workflow (jiné
    taby, jiné PDF). Nejdřív zvážit **Spotřebiče** (časté) a
    **Stroje**.

11. **Hierarchie měřicích míst v rozváděči** — teď máme ploché
    obvody pod rozváděčem; DM má **rozváděč → místo měření →
    obvody**. Přidat vrstvu „Místo měření" (např. „kuchyně",
    „koupelna") se seznamem obvodů uvnitř. + tlačítka „Kopírovat
    celé místo" a „Kopírovat obvod".

12. **PDF přílohy merge** — drag & drop PDF souborů ke zprávě,
    mergnout s generovaným PDF. Knihovna: `pdf-lib.js` (~200 kB).

### 💡 Nižší priorita

13. **Tisk faktur s QR platbami** — nepřímo související s revizí,
    ale DM to má. QR kód platebního příkazu (SPAYD formát).
14. **Tisk formulářů pro distributory** — ČEZ / EG.D (D9) /
    E.ON (E1) oznamování revize. Nutná přesná specifikace formátu.
15. **Plán nadcházejících revizí** — kalendář + tisk dopisů
    upozorňujících zákazníky, že se blíží termín pravidelné revize.
16. **Poslat mailem přímo z PDF náhledu** — v PWA jen přes
    `mailto:` nebo `navigator.share()` (Web Share API).
17. **Import měření z multimetru** — CSV/Excel import měření
    z přístrojů typu Metrel/Chauvin Arnoux.
19. **Databáze závad 5000+ vázaných na články ČSN** — DM má 5113
    závad. Máme začátek (20 elektro + 16 LPS 62305 + 16 LPS 1390).
    Postupně rozšiřovat pro jednotlivé obory (svařování, stroje…).
20. **Dark mode** — `prefers-color-scheme` + ruční toggle v topbaru.

### 📝 Drobnosti

21. **Prostředí A/B/C** (běžné / výbušné / hornické) — radio na
    titulce.
22. **Zdroje el. proudu typologie** (vlastní / cizí / jiné + kVA).
23. **Spotřebiče členění v kW** (motory/svářečky, tepelné, svítidla,
    jiné, CELKEM) — table s auto-součtem.
25. **Alternativní nadpis / norma** — pokud zpráva nespadá do
    standardu.
26. **Interní název (netiskne se)** — pracovní label pro sebe.
27. **Tab Poznámky netiskne se** — poznámky do archivu, ne do PDF.
28. **Kontrola checkbox** na titulce (zpráva byla zkontrolovaná
    kolegou).
29. **Stav revize**: aktivní / ukončená + „vrátit mezi aktivní".
30. **Typy pravidelnosti revize** — série (zatřídit zprávu do
    série opakujících se revizí stejného objektu).
31. **spellcheck="true"** na všech textových polích (browser-native
    kontrola překlepů; zdarma).
32. **Magic tlačítka na jednotlivých polích** (ne jen globální
    „Magic popis") — každé pole má svůj 🔮 s kontextově
    relevantními texty.
33. **Přednastavení spotřebičů** — knihovna zařízení (myčka XY +
    výkon + třída ochrany) pro rychlé vložení do tabulky
    spotřebičů.

## 🚀 22. století — futuristické nápady

Odlišné od roadmapy DM Revize — nápady, jak aplikaci posunout
nad rámec konkurence. Většinou vyžadují víc práce nebo externí
služby (API klíče, hardware), ale značně by zvedly „wow" faktor.
Berte jako **inspirační seznam**, ne plán k automatické realizaci.

### 🤖 AI / chytrá automatizace

35. **Foto závady → AI popis + kategorie** *(nejvyšší wow/práce)*
    Vyfotí se závada, obrázek se pošle na Claude API
    (anthropic.com), AI vrátí: popis závady, kategorii C1/C2/C3,
    odkaz na ČSN. Klik „Použít" vloží do závad. Vyžaduje uživatel
    vlastní API klíč (Anthropic Console). Cena ~5 Kč / zpráva.
    Realizace: file input + fetch na API + parser response.

36. **Hlasový diktát do textových polí** *(rychlé, zdarma)*
    Web Speech API (built-in v Chrome/Safari). Tlačítko 🎤 vedle
    každého textarea → uživatel nadiktuje, přepíše se do pole.
    Zlatý důl pro práci na střeše s rukavicemi nebo ve špíně.

37. **OCR z fotky displeje měřidla**
    Tesseract.js (~2 MB, offline OCR). Foto multimetru →
    extrahované číslo se vloží do správné buňky tabulky měření.
    Konec přepisování čísel z displeje.

38. **Anomaly detection v měřeních** — strojové učení nenutné,
    stačí porovnat naměřené hodnoty proti limitům normy a flagnout
    out-of-range (např. RCD vybavovací čas > 0,3 s u typu A).

### 📡 Hardware integrace

39. **Bluetooth import z měřicích přístrojů**
    Web Bluetooth API. Moderní Metrel / Chauvin Arnoux přístroje
    umí přenášet měření přes BT. Pickup hodnoty live → automatický
    zápis do tabulky. Vyžaduje znalost protokolu konkrétního přístroje.

40. **NFC štítky na rozvaděčích** *(2 Kč za štítek)*
    Web NFC API (Android Chrome). Uživatel přiloží telefon
    k NFC tagu na rozvaděči → aplikace načte ID → otevře poslední
    revizi pro tento rozvaděč. Použitelné jen na Androidu, iOS Safari
    Web NFC API neumí.

41. **AR overlay na rozvaděči** *(experimentální)*
    Camera API + WebXR. Telefon ukáže rozvaděč přes kameru, na
    jednotlivých jističích jsou „přilepené" minulé naměřené
    hodnoty. Náročné, ale efektní.

42. **Drone foto hromosvodů** — pro LPS revize mít možnost nahrát
    fotografie z dronu, přidat anotace.

### 📊 Data & vhled

43. **Dashboard s grafy a statistikami**
    Hlavní strana místo seznamu archivu má grafy: počet revizí
    /měsíc, podíl elektro vs LPS, % „neschopno provozu", průměrná
    částka, kategorie závad. Chart.js (~200 kB) zdarma.

44. **Mapa zákazníků**
    Pin za každého odběratele, klik → historie. Plánování trasy,
    geografická diverzifikace zakázek. Leaflet.js + OpenStreetMap
    (zdarma) nebo Mapy.cz API (zdarma do limitu).

45. **Dashboard zákazníka** — public link s heslem, kde si zákazník
    sám stáhne PDF jeho zprávy, vidí historii revizí.

### 🔔 Notifikace

46. **Push notifikace na termín revize**
    PWA Push API (Service Worker + Notification API). 30 dní před
    plánovaným termínem revize push: „Za měsíc končí revize
    u Nováka". Klik → otevře profil zákazníka. iOS Safari
    nepodporuje push v PWA stejně dobře jako Android.

47. **Email reminder pro klienta** — 30 dní před koncem revize
    se odešle (přes vlastní mail klient) e-mail upozornění
    s link na novou objednávku. Wallet pass / kalendář invite.

### ☁️ Cloud sync

48. **Reálná synchronizace mezi zařízeními** *(potřebuje backend)*
    Firebase Firestore nebo Supabase free tier zvládne 1000+ revizí.
    Real-time sync mezi PC, telefonem, tabletem. Konec ručního
    exportu/importu. Náklad: cca 0–500 Kč/měsíc dle objemu.

49. **End-to-end encryption** — data zašifrovat klientskou stranou
    klíčem odvozeným z hesla, server vidí jen šifrované. Pro citlivé
    revize (zdravotnictví, výroba).

### 🔐 Bezpečnost a integrita

50. **Kvalifikovaný el. podpis přes ID kartu (eIDAS)**
    Občanka.cz API → PDF dostane právní platnost. Nutná
    integrace s eIDAS poskytovateli (PostSignum, I.CA). Velký zásah,
    ale plná digitalizace.

51. **Blockchain timestamping** *(buzzword check)*
    OpenTimestamps — hash PDF se zapíše do Bitcoin blockchain,
    nezpochybnitelný důkaz, že existoval k danému datu. Užitečné
    při soudních sporech. Zdarma.

### 🎨 UI / UX

52. **Dark mode** *(už v roadmapě jako #20)* + auto-přepínání
    podle systému / času.

53. **Gesta**: swipe mezi taby, dlouhý stisk → kontextové menu
    na řádku tabulky.

54. **Apple Watch / Wear OS companion** — start/stop měření,
    rychlá fotka závady, push notifikace.

55. **Kolaborace v reálném čase** — víc revizních techniků na
    stejné zprávě (jako Google Docs). Vyžaduje cloud sync.

### Pořadí implementace dle wow/cena

| # | Wow | Cena |
|---|---|---|
| 36 Hlasový diktát | Vysoký | Velmi nízká |
| 35 AI foto závady | Velmi vysoký | Střední |
| 43 Dashboard | Střední | Nízká |
| 40 NFC štítky | Vysoký (jen Android) | Nízká |
| 46 Push notifikace | Střední | Vyšší |
| 39 Bluetooth měřidla | Vysoký | Vysoká (per-device) |
| 48 Cloud sync | Velmi vysoký | Střední (backend) |

## Nastavení tisku — živý panel v náhledu (2026-08-31)

Panel `#pdf-nastaveni` je **stálý** (nesbaluje se) vlevo v `#screen-pdf`,
`position:sticky`; na úzkém okně se přesune nad stránky. Volby: **barva
titulní strany** — paleta šesti vzorků (`TISK_BARVY`) + vlastní barva; ukládá
se jako `--pdf-bg` na `#pdf-pages`, ale používá ji **jen `.a4-titulni
.a4-content`** — tedy blok s obsahem, ne celý papír. (v9.225 barvila všechny
strany od kraje ke kraji, uživatel to po porovnání s konkurencí odmítl:
„vypadá líp, když není ta stránka celá obarvená"). **Vlastní barva překresluje až na `change`** (puštění myši) —
při `input` se tažení ignoruje, jinak náhled poskakuje. Kapátko v systémovém
dialogu uživatele mátlo, proto ta paleta. Podbarvení kolonek je od **v9.44
VYPNUTÉ** ve výchozím stavu (`pbox-tint` na kontejneru, odstín z
`pboxOdstin()` = **85 % bílé** — jen náznak; okénka i podpisové rámečky
`.podp-inner` jsou jinak **bílá**, aby na barevném bloku vynikla jako
u konkurence),
**místo revize tučně** (`.pbox-tucne`, zapnuto ve výchozím stavu — u konkurence
se to jmenuje „Předmět revize tučně"), každá
závada na vlastní stránku (`rozdelZavadyNaStranky()` běží před
`rozdelPortraitStranky()`), fotek na řádek 0–3 (0 = netisknout), razítko
a podpis (přesunuty ze starého modalu).

Dvě úrovně: `STORE.tisk` = výchozí v profilu (v STORE_KEYS i v záloze),
`D.tisk` / `window.__tiskZpravy` = odchylka konkrétní zprávy (ukládá se
s ní do archivu). Slévá je `tiskNastaveni(D)`. Tlačítka „Uložit jako
výchozí" a „Zpět na výchozí".

**Konkurence (DM Revize) vybírá barvu ve vyskakovacím okně — uživatel to
odmítl** („až pak uvidím jak to vypadá je dost divný"), proto živý náhled.
Pozor: `generujPDF()` volá `saveToArchiv()`, takže každé překreslení náhledu
zprávu uloží — testy nesmí předpokládat pořadí v archivu.

## Kvalita PDF — dvě různá nastavení

- **Uložené PDF** (Uložit zprávu PDF, e-mail, plán do souboru):
  `scale: 1.5`, JPEG `0.85` — kvůli velikosti souboru (archiv, přílohy mailů,
  zálohy). Tohle se **nezvyšuje**, bylo to vědomé rozhodnutí uživatele.
- **Tisk přímo** (`tiskZpravuPrimo`, `planNahledTisk` → `opts.kvalita: 'tisk'`):
  `scale: 2.6`, JPEG `0.95`. Soubor se nikam neukládá, jde rovnou do tiskárny,
  takže velikost nevadí a písmo i fotky závad jsou ostřejší (2026-08-31).

## Technické principy pro další Claude session

- **Je to PWA, nikoli web s backendem.** Vše ukládat do
  `localStorage` (STORE.technik, STORE.pristroje, STORE.archiv,
  STORE.odberatele).
- **Jediný soubor `index.html`** (~4000 řádků), `sw.js`,
  `manifest.json`.
- **Datalisty** (rozbalovací nápovědy) preferovat před `<select>`,
  ať uživatel může přepsat vlastním textem. Všechny musí mít
  `autocomplete="off"`, jinak si prohlížeč přidává historii.
- **Nikdy nepředvyplňovat `value`** u polí s datalistem —
  filtrovalo by dropdown. Jen `placeholder`.
- **Po každé změně cachovaných souborů bumpnout `CACHE_NAME`
  v `sw.js` + verzi v topbaru.** Viz pravidlo nahoře.
- **Barevná paleta:** `--accent: #b5291c` (červená), `--accent2:
  #2B579A` (Word modrá). Hlavičky malých tabulek (`.data-table
  th`) používají tmavší `#1F497D` kvůli kontrastu drobného textu.
- **Pro LPS je klíčová funkce `updateLpsMereniTexts()`** —
  centrálně sladí všechny normou-podmíněné texty (Prohlídka,
  Měření zemničů, Třída LPS, Seznam příloh defaults, dropdown
  options).
- **Uživatel bydlí v Kyjově**, pracuje zejména na rodinných
  domech a bytech. Průmyslové revize a LPS dělá méně často.
