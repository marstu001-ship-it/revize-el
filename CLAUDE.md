# CLAUDE.md — pravidla pro tento repozitář

Revize EL je single-page PWA (HTML + JS + service worker). Obsah se cachuje
v prohlížeči přes `sw.js`, takže uživatel nevidí změny, dokud se neinvalidně
cache.

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

- `index.html` — hlavní SPA (≈3100 řádků, HTML + embeded JS)
- `revize_el_v10.html` — starší verze, needitovat
- `sw.js` — service worker (cache-first se stale-while-revalidate)
- `manifest.json` — PWA manifest
- `literatura/` — odborné podklady (vzory zpráv, normy ČSN) — read-only
  reference pro implementaci, neměnit

## Roadmapa inspirovaná DM Revize (konkurenční program)

Uživatel má zakoupený program **DM Revize** (https://elektro.dmrevize.cz)
a postupně poslal fotky funkcí, které by se mu líbily u nás. **Tento
seznam berte jako wishlist** — nerealizovat automaticky, ale **když se
uživatel zeptá „udělejme funkci X"**, vědět, co X znamená, kde přesně
to v DM Revize je, a jak to navrhnout v naší PWA bez backendu.

Pořadí je podle mého odhadu **poměru hodnota / pracnost**. Číslo označuje
prioritu v diskuzi s uživatelem.

### 🔥 Priority 1–6: velká hodnota, realizovatelné v PWA

1. **Knihovna textových bloků** („Rychlé vložení textů" v DM) — snippety
   pro odstavce, ať revizak nepíše opakující se texty (poučení provozovatele,
   typické závěry, popisy). Rozdělit na `od autorů` (přednastavené) a
   `vlastní` (uživatel si přidá). Realizace: localStorage + panel s
   vyhledáváním.

2. **Odběratelé (zákaznická knihovna)** — levý sloupec hlavní strany
   s firmami, každý má `počet akcí`. Při nové zprávě vybere odběratele
   → auto-fill provozovatel/adresa/IČO/kontakt. CRUD přes scard. Zprávy
   linkovat přes ID odběratele. Ohromná úspora u opakovaných zakázek.

3. **„Nová – kopie označené"** — duplikace existující zprávy jako šablona,
   přepíše se jen datum a evidenční číslo. Tlačítko v archivu.

4. **Filtry v archivu + recenty** — podle odběratele / typu / stavu
   (aktivní/ukončená) / roku. Panel „Naposledy otevřené" s pin funkcí.

5. **ARES API lookup podle IČO** — veřejné CZ API (bez klíče, CORS OK):
   `https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/{ico}`
   → vyplní název, sídlo, DIČ. **Velký wow efekt za málo kódu.**

6. **QR kódy na titulní stranu** — vlevo vCard revizního technika,
   vpravo info o zprávě (URL/hash pro ověření). Knihovna: `qrcode.js`
   (~15 kB). Generuje se client-side do PDF.

### ⚙️ Priority 7–12: střední hodnota nebo střední pracnost

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

9. **Rich text editor pro popisy/závěr** — contenteditable + toolbar
   (B / I / U / seznamy / zarovnání / tabulka / obrázek). Alt: lightweight
   knihovna (Quill ~100 kB).

10. **Další typy revize** (DM jich má 11): **Spotřebiče, Stroje, Trafo,
    Osvětlení, Podlahy, Nouzové osvětlení, VN, Zdroje pro svařování,
    Zdravotní přístroje, Univerzální.** Momentálně máme jen Elektro + LPS.
    Každý typ = vlastní workflow (jiné taby, jiné PDF). Nejdřív zvážit
    **Spotřebiče** (časté) a **Stroje**.

11. **Hierarchie měřicích míst v rozváděči** — teď máme ploché obvody
    pod rozváděčem; DM má **rozváděč → místo měření → obvody**. Přidat
    vrstvu „Místo měření" (např. „kuchyně", „koupelna") se seznamem
    obvodů uvnitř. + tlačítka „Kopírovat celé místo" a „Kopírovat obvod".

12. **PDF přílohy merge** — drag & drop PDF souborů ke zprávě, mergnout
    s generovaným PDF. Knihovna: `pdf-lib.js` (~200 kB).

### 💡 Priority 13–20: menší hodnota nebo velká pracnost

13. **Tisk faktur s QR platbami** — nepřímo související s revizí, ale
    DM to má. QR kód platebního příkazu (SPAYD formát).

14. **Tisk formulářů pro distributory** — ČEZ / EG.D (D9) / E.ON (E1)
    oznamování revize. Nutná přesná specifikace formátu.

15. **Plán nadcházejících revizí** — kalendář + tisk dopisů upozorňujících
    zákazníky, že se blíží termín pravidelné revize.

16. **Poslat mailem přímo z PDF náhledu** — v PWA jen přes `mailto:`
    (neumí opravdové přílohy) nebo `navigator.share()` (Web Share API
    na mobilu funguje skvěle, export na desktop méně).

17. **Import měření z multimetru** (exp/imp buttons v DM) — CSV/Excel
    import měření z přístrojů typu Metrel/Chauvin Arnoux.

18. **Zálohování dat** — export celé databáze (archiv + odběratelé +
    snippety + nastavení) do JSON souboru pro backup/migraci.

19. **Databáze závad 5000+ vázaných na články ČSN** — DM má 5113 závad
    s odkazy na konkrétní čl. ČSN. Máme začátek (20 závad v TYPICKE_ZAVADY).
    Postupně rozšiřovat pro jednotlivé obory (svařování, stroje…).

20. **Dark mode** — `prefers-color-scheme` + ruční toggle v topbaru.

### 📝 Priority 21+: drobnosti a pole, která v DM jsou a u nás ne

21. **Prostředí A/B/C** (běžné / výbušné / hornické) — radio na titulce.
22. **Zdroje el. proudu typologie** (vlastní / cizí / jiné + kVA čísla).
23. **Spotřebiče členění v kW** (motory/svářečky, tepelné, svítidla,
    jiné, CELKEM) — table s auto-součtem.
24. **Síť dropdown** — strukturovaně TN / TN-C / TN-C-S / TN-S / TT / IT
    + zvlášť napětí (230 V AC, 3×230/400 V, 12 V DC, 24 V DC).
    **Pozor:** uživatel dřív chtěl, abychom tohle sloučili s Napěťovou
    soustavou checkboxy — zvážit, jestli to ještě platí.
25. **Alternativní nadpis / norma** — pokud zpráva nespadá do standardu.
26. **Interní název (netiskne se)** — pracovní label pro sebe.
27. **Tab Poznámky netiskne se** — poznámky do archivu, ne do PDF.
28. **Kontrola checkbox** na titulce (zpráva byla zkontrolovaná kolegou).
29. **Stav revize**: aktivní / ukončená + „vrátit mezi aktivní".
30. **Typy pravidelnosti revize** — série (zatřídit zprávu do série
    opakujících se revizí stejného objektu).
31. **spellcheck="true"** na všech textových polích (browser-native
    kontrola překlepů; zdarma).
32. **Magic tlačítka na jednotlivých polích** (ne jen globální „Magic
    popis") — každé pole má svůj 🔮 s kontextově relevantními texty.
33. **Přednastavení spotřebičů** — knihovna zařízení (myčka XY + výkon
    + třída ochrany) pro rychlé vložení do tabulky spotřebičů.
34. **Přednastavené texty ve víc úrovních** (rozbalovací / strom) — aby
    knihovna snippetů zvládla kategorie.

### Technické principy pro další Claude session

- **Je to PWA, nikoli web s backendem.** Vše ukládat do `localStorage`.
- **Jediný soubor `index.html`** (~3100 řádků), `sw.js`, `manifest.json`.
- **Datalisty** (rozbalovací nápovědy) preferovat před `<select>`, ať
  uživatel může přepsat vlastním textem. Všechny musí mít
  `autocomplete="off"`, jinak si prohlížeč přidává historii a vypadá
  to jako předvyplněná hodnota.
- **Nikdy nepředvyplňovat `value`** u polí s datalistem — filtrovalo by
  dropdown. Jen `placeholder`.
- **Po každé změně cachovaných souborů bumpnout `CACHE_NAME` v `sw.js`
  + verzi v topbaru.** Viz pravidlo výše.
- **Uživatel bydlí v Kyjově**, pracuje zejména na rodinných domech
  a bytech. Průmyslové revize dělá méně často.
