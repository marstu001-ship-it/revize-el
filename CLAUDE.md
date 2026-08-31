# CLAUDE.md — pravidla pro tento repozitář

Revize EL je single-page PWA (HTML + JS + service worker). Obsah se cachuje
v prohlížeči přes `sw.js`, takže uživatel nevidí změny, dokud se neinvalidně
cache.

**Aktuální verze: v9.35 · 2026-05-15**

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
  na šířku** (`planExport` — dělení stránek podle naměřené výšky, ne podle
  počtu řádků). Data v `STORE.plan` (v STORE_KEYS i v záloze).
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
  plovoucí `#txt-lista` se ukáže nad polem, do kterého se píše (`focusin`
  na `textarea` a `input[type=text]`). Symboly Ω µ ° ± × ² ³ Δ → se vloží
  na kurzor; u víceřádkových polí navíc **B / I / S̶ / barva / zrušit**.
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
