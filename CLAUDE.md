# CLAUDE.md — pravidla pro tento repozitář

Revize EL je single-page PWA (HTML + JS + service worker). Obsah se cachuje
v prohlížeči přes `sw.js`, takže uživatel nevidí změny, dokud se neinvalidně
cache.

**Aktuální verze: v6.9 · 2026-04-29**

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
