# CLAUDE.md — pravidla pro tento repozitář

Revize EL je single-page PWA (HTML + JS + service worker). Obsah se cachuje
v prohlížeči přes `sw.js`, takže uživatel nevidí změny, dokud se neinvalidně
cache.

**Aktuální verze: v4.1 · 2026-04-21**

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

## Kde hledat

- `sw.js` řádek 1: `var CACHE_NAME = '...';`
- `index.html`: `<span class="ver">...</span>` v topbaru

## Struktura projektu

- `index.html` — hlavní SPA (≈4000 řádků, HTML + embedovaný JS)
- `revize_el_v10.html` — starší verze, needitovat
- `sw.js` — service worker (network-first pro HTML, stale-while-revalidate
  pro fonty a CDN)
- `manifest.json` — PWA manifest
- `literatura/` — odborné podklady (vzory zpráv Macháček/Dolenský,
  normy ČSN) — read-only reference pro implementaci, neměnit

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
- ✅ **PWA auto-reload po update** — network-first pro HTML,
  listener `controllerchange` → `location.reload()`. Uživatel
  nemusí hard-reloadovat; cache bump v sw.js stačí.

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
