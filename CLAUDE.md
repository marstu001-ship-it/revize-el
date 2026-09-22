# CLAUDE.md — pravidla pro tento repozitář

Revize EL je single-page PWA (HTML + JS + service worker). Obsah se cachuje
v prohlížeči přes `sw.js`, takže uživatel nevidí změny, dokud se neinvalidně
cache.

**Aktuální verze: v9.85 · 2026-09-23**

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
   - **Ani POHODLNOST, která nemění ovládání, kartu nedostane**
     (rozhodnutí uživatele 2026-09-18 u našeptávání místa: „zásadně to
     neovlivňuje funkcionalitu, je to jen příjemné překvapení"). Zkouška:
     *musí se uživatel kvůli tomu naučit něco nového, aby program ovládal?*
     Když ne — žádná karta, i když je to milé a pracné.

## Protokol jen pro JEDEN spotřebič (v9.78)

Nápad uživatele 2026-09-18 podle **ILLKO Studia** (poslal snímek jejich
protokolu): „technik vyplňuje ten seznam spotřebičů, ten se tiskne
a podepisuje, a elektronickou formou je tento protokol… není tam nic navíc
z doplněných hodnot oproti té seznamové verzi, tak mě napadlo, že bychom
mohli přidat tlačítko, které by z toho seznamu vygenerovalo pdf jen pro ten
jeden spotřebič z toho řádku."

**Ověřeno kolonku po kolonce a měl pravdu** — všechny naměřené hodnoty už
v řádku jsou. Tlačítko **📄** u řádku (vedle ⧉ a ✕) vykreslí protokol
**na výšku** do téhož náhledu (`#screen-spotrebice-pdf`); lišta, tisk
i ukládání jsou společné, liší se jen `__spotrRezim` (`'seznam'` /
`'jeden'`) a z něj odvozený název souboru.

### Sedm proudů ILLKA = naše dvojice metoda + I [mA]

`SPOTR_PROUDY` mapuje kód metody na řádek protokolu (V→IdirEq, VR→IdifEq,
D→IdirTouch, DR→IdifTouch, U→IaltEq). **Hodnota se vytiskne JEN na řádek
odpovídající zvolené metodě**, ostatní zůstanou prázdné — přesně jako ve
vzoru. Nic se tím neztrácí a nemusel se přidávat ani jeden sloupec.

### Výsledek se bere z POSLEDNÍHO sloupce

Rozhodnutí uživatele 2026-09-18: „výsledek prohlídky kladně nebo záporně si
vezme z našeho posledního sloupce vyhovuje/nevyhovuje ve zjištěných
závadách." `spotrVyhovuje(r)`:

1. **Výslovné `N` v „Celkovém hodnocení" přebíjí všechno.** Vytisknout
   „vyhovuje" u spotřebiče, který technik označil jako nevyhovující, je to
   nejhorší, co se tu může stát — proto tahle pojistka navíc.
2. jinak se kouká na text posledního sloupce: **prázdný = bez závad**,
   „Vyhovuje" = vyhovuje, **jakýkoli jiný text = NEVYHOVUJE** (technik tam
   popsal závadu).

Test hlídá všechny tři větve včetně kombinace „závady = Vyhovuje,
hodnocení = N".

### Co se dopočítá a co zůstalo prázdné

- **„Připojení"** se skládá ze `sestava` + `un` (`SPOTR_PRIPOJENI`) —
  „Pevně připojeným přívodem, 230 V".
- **„Umístění"** se bere z místa protokolu (`f_misto`) — protokol pokrývá
  jedno místo, takže platí pro každý spotřebič v něm.
- Technik (jméno, ev. číslo, telefon, e-mail, IČO, DIČ, razítko, podpis)
  i přístroj (název, výr. číslo, kalibrace, **platnost do**) jsou z profilu.
  V seznamu se platnost kalibrace netiskne, tady ano.
- **„Druh" (držený v ruce / přenosný / nepřenosný) v programu NENÍ** a nedá
  se odvodit — `sestava` popisuje připojení přívodu, ne způsob držení.
  Na protokolu proto **řádek chybí úplně** (lepší než trvale prázdná
  kolonka). Uživatel na dotaz neodpověděl; **až si řekne, patří to jako
  sloupec do tabulky, nebo do malého okna „podrobnosti" u řádku.**
- Čárový kód vedle ID se **nedělá** — je na štítky, ne na protokol,
  a vyžádal by si knihovnu.

**Rozsah: jen jeden spotřebič z řádku** (rozhodnutí uživatele). ILLKO umí
i všechny naráz do jednoho souboru („Strana 1 z 5"), nabízel jsem to,
uživatel to zatím nechtěl.

Test: `test-jeden-spotrebic.js` (40 kontrol — strana na výšku, údaje z řádku,
proud na správném řádku a ostatní prázdné, údaje z profilu, všechny tři
větve výsledku, prázdný řádek, návrat k seznamu na šířku, název souboru).

## „Zdroj el. proudu" a „Ochrana před úrazem" u stroje (v9.85)

Dotaz uživatele 2026-09-23 se snímkem titulky zprávy o stroji, obě kolonky
zakroužkované: „tyhle okénka asi u kontrole stroje nemají být, ne?"

**Měl pravdu a bylo to horší, než jak to vypadalo.** Obě pole (`f_zdroj`,
`f_ochrana`) bydlí v kartě **`scard-vtez`**, kterou `novaZprava()` u strojů
i u LPS **schovává** (`(typ === 'elektro') ? '' : 'none'`). Technik je tedy
neměl kde vyplnit — a titulka je přesto tiskla, takže na zprávě o stroji
zůstávaly **navždy prázdné kolonky**. Program tiskl okénka pro údaje, které
sám nenabízí.

Věcně to sedí taky:

- **Zdroj el. proudu** (ČEZ / EG.D / vlastní trafostanice) je údaj
  o **budově**, ne o stroji. Odkud je stroj napájený, říká „napájeno
  z rozváděče", „předřazené jištění přívodu" a „přívodní kabel" o kus výš
  v Technických specifikacích.
- **Ochrana před úrazem** se u stroje popisuje v **kapitole 3** (technický
  popis — automatické odpojení, pospojování) a je i mezi zaškrtávacími
  volbami v kartě `scard-ochrana-char`, kterou stroje mají. Krátká kolonka
  na titulce k tomu nic nepřidává.

Obojí se proto **netiskne, když `isStrojePdf`**. „Síť", „Použité normy"
a „Datum kontroly" zůstávají; bez kolonky nad sebou nesmí „Síť" začínat
odsazením `margin-top:1mm`, jinak se srovná špatně s levým sloupcem.

**Elektro ani LPS se nedotklo** — `porovnani2.js` znak po znaku, LPS má
vlastní větev.

Test: 5 kontrol v `test-normy-stroje.js` (35) — karta se u stroje vůbec
nenabízí, ani jedna kolonka se netiskne, „Síť"/normy/datum zůstaly, a **že
u elektro revize obě kolonky dál jsou**.

### Fixtura v test-titulka-podpis.js přestala přetékat

Odebráním dvou kolonek se na titulce stroje uvolnilo místo, takže
„přeplněná titulka" z v9.82 **už nepřetekla** a kontrola na zmenšení spadla.
**Nebyla to chyba programu.** Při opravě vyšlo najevo, že fixtura beztak
netestovala, co si myslela: sypala dlouhý text do **`f_zhodnoceni`**, jenže
do titulky jde **`f_posudek_vlastni`** (přepsání posudku z panelu tisku) —
`f_zhodnoceni` si program skládá sám a delší text v něm výšku titulky
nezměnil. Přetékání tedy dělal jen dlouhý seznam norem. Opraveno na
`f_posudek_vlastni`; zmenšování teď opravdu nastane u strojů i u elektro.

## Filtr typu nad archivem se skládá z TYPY_ZPRAV (v9.84)

Pokyn uživatele 2026-09-22 („dodělej filtr typu nad archivem"). Filtr měl
`<option>` **napsané ručně v HTML** — Elektro / LPS / Stroje — a při přidání
čtvrtého typu (spotřebiče, v9.67) se na ně zapomnělo. Technik si je proto
nemohl vyfiltrovat, přestože je archiv normálně ukazuje.

`refreshArchivTypOptions()` je teď generuje **z `TYPY_ZPRAV`**, takže pátý typ
se doplní sám. **Přesně to říká oddíl „Typy revizních zpráv": co se nevygeneruje
z tabulky, to se dřív nebo později zapomene.** Postranní archiv to tak dělá už
od v9.59; hlavní archiv to dohnal až teď.

- **Pořadí se bere z tabulky, ne z archivu** — jinak by se volby přeskládaly
  podle toho, jaké zprávy zrovna existují.
- Zvolený typ **přežije překreslení** (zachová se jako u filtru let).
- Test: 4 kontroly v `test-hromadne.js` (nabídka i pořadí proti `TYPY_ZPRAV`,
  že výběr opravdu zúží seznam, a že se volba překreslením neztratí).

## Karta v Novinkách k hromadným operacím (v9.84)

Uživatel schválil 2026-09-22 („dej do novinek"). Karta k **v9.83** —
zaškrtávátka v archivu, tisk jednostranně/oboustranně s prázdnou zadní stranou,
hromadné dokončení a mazání se ZPĚT, Shift pro úsek. Zmiňuje i doplněný filtr
typu.

**Dvě kontroly v `test-novinky.js` byly zastaralé a nebyla to chyba programu:**
pinovaly kartu ke spotřebičům jako „mezi dnešními" (`index <= 1`) a tvrdily, že
nejnovější datum v Novinkách je 2026-09-17. Nová karta obojí posunula. Přepsáno
na **skutečný nárok**, který přežije i příští kartu:

- nad kartou ke spotřebičům nesmí stát nic staršího a pod ní nic novějšího,
- maximum přes všechny karty musí sedět **s kartou na čele** (z toho maxima se
  odvozuje pulsování 📰, takže je to ta vlastnost, na které záleží).

Je to potřetí tatáž past (v9.58, v9.71, teď): **v Novinkách se nikdy nesmí
pinovat pozice ani konkrétní datum.**

## Hromadné operace v archivu — tisk, dokončení, smazání (v9.83)

Přání uživatele 2026-09-22: „v seznamu by bylo dobré mít zaškrtávací políčko
a po zaškrtnutí více zpráv by byla nahoře možnost na výběr → jednostranný /
oboustranný tisk (při oboustranném se musí předlohy připravit tak, aby nebyly
dvě různé zprávy na jednom listu). Potom hromadné uzavření vybraných zpráv
nebo vymazání s možností vzít smazané zpět."

Vzor je **výběr v Plánu revizí** (`__planVybrane`) — stejná mechanika i stejná
lišta (`.plan-hromadne` a `.archiv-hromadne` sdílejí jedno CSS pravidlo), aby
se technik neučil dvoje ovládání.

### Oboustranně = každá zpráva začíná na NOVÉM LISTU

To je jádro celé věci. Má-li zpráva **lichý počet stran**, doplní se za ni
**prázdná zadní strana** — jinak by na jednom papíře skončil konec jedné
zprávy a začátek druhé, což u revizních zpráv nejde (každá se předává
a podepisuje zvlášť).

- Prázdná strana **přebírá orientaci** poslední strany zprávy (`a4-landscape`
  u seznamu spotřebičů), jinak by se list nespároval.
- **Je na ní napsané „(záměrně prázdná strana)"** — čistě prázdný list vypadá
  jako chyba tisku. Test to hlídá.
- Test nekontroluje počty od oka: rozdělí náhled podle titulních stran
  a ověří, že **každý blok má sudý počet stran**.

### Tisk si zprávy půjčuje DO FORMULÁŘE

Jiná cesta není: `generujPDF()` skládá stránky z `getData()`, tedy z toho, co
je právě ve formuláři. Dávka proto pro každou vybranou zprávu zavolá
`nacistData()`, vykreslí ji a **naklonuje hotové stránky** do vlastní obrazovky
`#screen-hromadny-pdf`. Z toho plynou tři věci:

1. **`saveToArchiv()` se po dobu dávky NESMÍ spustit.** `generujPDF()`
   i `spotrebiceNahled()` na konci ukládají — archiv by se kvůli pouhému tisku
   přeskládal a každá zpráva by dostala nový čas uložení. Řeší to jediný řádek
   **přímo v `saveToArchiv()`** (`if (window.__hromadnyTisk) return true;`), ne
   hlídání na pěti místech. Test to ověřuje počtem i čísly zpráv v archivu.
2. **Stránkování běží až v `requestAnimationFrame`**, takže se na ně musí
   počkat — na konci toho bloku je jednorázové ohlášení `__pdfHotovoCb`. Hádat
   časovačem, za jak dlouho to doběhne, by u dlouhé zprávy selhalo; pojistka
   15 s je jen proti zaseknutí, ne čekání nadarmo.
3. **Jde to přes `attemptLeaveForm()`** — rozpracovaná zpráva musí projít
   dialogem Zůstat / Zahodit / Uložit, protože ji tisk ve formuláři přepíše.

Spotřebiče mají vlastní renderer (`spotrebiceNahled`), takže se v dávce větví
podle `D.typ` — jinak by se nevykreslily vůbec.

### Výběr se drží přes `uid`, ne přes index

Index se mazáním posouvá. Starší záznamy uid nemají, ty mají náhradní klíč
`#pořadí` — **data se kvůli výběru nepřepisují** (uid dostanou až při otevření
zprávy; zápis do archivu za zády uživatele je past z v9.39). Klíč se na záznam
přeloží **až při akci**, ne při zaškrtnutí.

- **Mazání jde OD NEJVYŠŠÍHO INDEXU** — jinak by se po prvním smazání ostatní
  indexy posunuly a zmizelo by něco jiného. Vracení ZPĚT naopak od nejnižšího,
  ať každá sedne na své místo (test porovnává celé pořadí).
- **Otevřenou zprávu hromadné mazání vynechá** a řekne to — formulář ji drží
  v paměti a první další uložení by ji vrátilo (totéž pravidlo jako ✕
  v postranním archivu, v9.66).
- **Zaškrtávátko v hlavičce označí jen PRÁVĚ ZOBRAZENÉ řádky**, ne celý archiv
  — v něm může být stovka zpráv, které technik nevidí.
- Starší revize v rozbaleném řetězu zaškrtávátko nemají (jen prázdná buňka, ať
  sedí sloupce) — vybírá se z hlavního seznamu.
- Výběr **přežije překreslení archivu** (filtr, uložení jiné zprávy) a ruší se
  až po provedené akci.

### Vzít zpět jde i u dokončení

Uživatel chtěl ZPĚT u mazání; dostalo ho **i hromadné dokončení**, protože
vracet dvacet zpráv ručně tlačítkem 🔨 je stejná otrava jako je mazat. Je-li
mezi dokončenými **právě otevřená zpráva**, zamkne se i formulář
(`setFormReadOnly`) — jinak by archiv tvrdil „dokončená" a technik do ní dál psal.

### Sloupec navíc rozbil test, který si buňky počítal

`test-archiv-stroj.js` sahal na `tr.children[2]` a `children[3]` (ev. číslo
a místo). Zaškrtávátko je posunulo o jedna a spadlo 11 kontrol — **nebyla to
chyba programu**, je to táž past jako s kartami v Novinkách hledanými podle
indexu (v9.58). Buňky proto dostaly **`data-archiv-ev` a `data-archiv-misto`**
a test je hledá podle nich. Příští sloupec už nic nerozbije.

Test: `test-hromadne.js` (25 kontrol — zaškrtávátka, lišta, označit vše,
přežití překreslení, obojí tisk včetně sudých bloků a popisu prázdné strany,
že tisk nepřepíše archiv, dokončení i mazání včetně ZPĚT a vynechané otevřené
zprávy).

~~Známý nedodělek: filtr typu nemá volbu Spotřebiče.~~ **Doděláno ve v9.84**
— viz oddíl výš.

## Titulní strana přetékala přes patičku a uřízla PODPISY (v9.82)

Nahlásil Jiří Roubalík 2026-09-21 („chyba zobrazení, první strana"): na
titulce zprávy o stroji byla podpisová okénka uříznutá a popisky
**„podpis provozovatele" / „podpis kontrolního technika" zmizely pod čarou
patičky**.

**Příčina: titulka se jako jediná NIKDY nedělí** (`a4-titulni` — dělit
titulní stranu nemá smysl). Ostatní strany rozdělí stránkovač, ale titulce
dá `.a4-content{flex:1}` **jen zbylé místo** — a je-li obsahu víc (víc
zaškrtnutých norem, delší celkový posudek), prostě přeteče **přes patičku**.
Stránka se nezvětší, protože flexová výška obsahu se nepočítá z jeho
skutečné výšky.

Řeší to **`titulkaVejit()`**: po stránkování změří, kolik místa nad patičkou
zbývá, a když obsah přetečá, **zmenší ho v poměru** (`transform: scale`,
`width` se o tentýž poměr zvětší, takže šířka vyjde zpátky na 100 %) —
stejná technika jako u protokolu spotřebičů (v9.69).

- **Radši o procento menší písmo než chybějící podpis.** Bez podpisu je
  revizní zpráva neplatný papír; zmenšení o pár procent nikdo nepozná.
- **Volá se až na KONCI `requestAnimationFrame` bloku** v `generujPDF()` —
  přečíslování stran mění text v hlavičce i „Počet listů", takže výška
  titulky je známá teprve pak. A musí to být po `showScreen('pdf')`, jinak
  vrátí měření nuly (stará past).
- **Když se obsah vešel, nesahá se na nic** — `transform` se vůbec
  nenastaví, takže běžná zpráva vypadá na chlup stejně jako dřív
  (`porovnani2.js` znak po znaku).
- **Ověřeno, že to projde i přes `html2canvas`** — zmenšený obsah se do PDF
  vykreslí správně (canvas vyexportován a prohlédnut, ne jen změřené DOM).
- Dolní mez zmenšení je **70 %** — pojistka proti nesmyslu, tolik obsahu se
  na titulku nikdy nedostane.

Test: `test-titulka-podpis.js` (10 kontrol — běžná titulka se nezmenšuje,
přeplněná ano, oba popisky zůstanou celé nad patičkou, šířka se nezuží,
u elektro revize totéž). **Ověřeno, že na kódu před opravou spadne.**

### Pole zprávy zmizelá u strojů — STARÁ VERZE, ne nová chyba

Jiří současně hlásil, že po zkopírování stroje nejde editovat ev. číslo,
místo provádění, zahájení ani vypracování. Je to **přesně chyba opravená
ve v9.75** (protokol spotřebičů si půjčil pole a nevrátil je). Ověřeno
pokusem: na commitu v9.74 se symptom **reprodukuje na všech cestách**
(otevření stroje z archivu, ⧉ kopie stroje, ⧉ kopie zprávy, 🔗 navázání),
na aktuálním kódu ani na jedné. **Kolega měl v prohlížeči starší build.**

Proto přibyla **záchranná síť, ne další oprava**: `switchTab()` u každého
přepnutí záložky zavolá `spotrPrenosPoli(false)`, pokud otevřená zpráva
není o spotřebičích. Kdyby se pole do protokolu dostala jakoukoli budoucí
cestou, technik je dostane zpátky **jedním klepnutím**, ne až po načtení
stránky. Hlídá to kontrola v `test-spotrebice.js` (118 kontrol), která si
staré chování nasimuluje násilím.

## Popis zmizel u strojů i u elektro revize (v9.81)

Nahlásil uživatel 2026-09-21 se snímkem kapitoly 3 zprávy o stroji:
„v záložce 2. stroj nelze žádný popis editovat" — přitom PDF tiskne
**„Doplňte v záložce 2. Stroj."**, takže program posílal technika na místo,
kde nic nebylo.

**Karta „A. Rozsah a popis" a „Dokumentace" se schovávaly JEDNOSMĚRNĚ.**
U spotřebičů se do nich napsalo `display:none` (v protokolu dle
ČSN 33 1600 ed.2 nejsou) a **nikdo je už nevracel**. Stačilo tedy jednou
otevřít zprávu o spotřebičích a od té chvíle chyběl popis:

- u **strojů** v záložce 2. Stroj (odtud hlášení),
- a stejně tak **u ELEKTRO revize** v záložce „A. Popis" — tam si toho
  uživatel ještě nevšiml.

Po načtení stránky se to samo spravilo (formulář se staví z HTML znovu),
takže se to chovalo jako záhada. **Data se neztrácela** — pole jen nebylo
vidět; co už bylo napsáno, se dál tisklo.

Ostatní karty (`scard-napetova`, `scard-ochrana-char`, `scard-vtez`,
`scard-d1/d2/d3`) mají **vlastní předpis pro každý typ**, takže se samy
vracely. Ty dvě ne, proto jsou teď ve vlastním cyklu s **oběma větvemi**
(`(typ === 'spotrebice') ? 'none' : ''`).

**Poučení — totéž už bylo ve v9.75:** cokoli, co se u jednoho typu zprávy
schová nebo přestěhuje, **musí mít i cestu zpátky**. „Schovej u X" bez
„ukaž u ostatních" je vždycky chyba, protože formulář je jeden pro všechny
typy a přežije přepnutí.

**Test hlídal jen `scard-napetova` a `scard-vtez`** — tedy právě ty karty,
které svůj předpis měly. `test-spotrebice.js` (116 kontrol) proto nově
kontroluje i popis a dokumentaci, a to **u obou typů** (elektro i stroje)
a včetně toho, že je pole opravdu **editovatelné** (vidí se `.rich-edit`,
ne jen `<textarea>` držící hodnotu). Ověřeno, že test na starém kódu
**spadne** — jinak by to byla jen další kontrola, která nic nehlídá.

### Nápověda v poli zůstávala od elektro revize

Vyšlo najevo při prohlížení opravené karty: v poli „Popis elektrického
zařízení stroje" svítila šedá nápověda **„Přívod pro elektroinstalaci je
proveden kabelem…"**. `richZapniPole()` si `placeholder` **jen jednou opísala**
do `data-placeholder` editoru, takže pozdější změna podle typu zprávy se
do něj nedostala — popisek už byl správně („Popis elektrického zařízení
stroje"), ale nápověda uvnitř ne.

Opraveno **stejně jako u `.value`**: `placeholder` je na té `<textarea>`
odchycený přes `Object.defineProperty` a přepisuje i `data-placeholder`
editoru. Týká se to **všech rich polí naráz** (`data-term-ph`
v `aplikovatPojmy`, nápovědy podle podtypu v `nováZpráva`), takže to není
záplatka na jedno pole.

**Popis u stroje smýsl má** (uživatel se ptal): je to kapitola 3
„Technický popis elektrického zařízení stroje" — hlavní vypínač, ochrana
před úrazem, ovládací obvody, kryty a blokování, motory, značení. Celý
text umí vložit magické tlačítko jedním klepnutím (`POPIS_STROJE`).

## Všechny protokoly do jednoho PDF + tlačítko na kraji řádku (v9.80)

Pokyn uživatele 2026-09-18 (se snímkem se žlutou šipkou): „to generování mi hoď
na kraj, jak jsem znázornil. Kam dáme tlačítko na vygenerování všech do jednoho
pdf?"

### 📄 patří až za ⧉ a ✕

Pořadí v řádku je teď **⧉ ✕ … 📄** — úpravy seznamu vlevo, generování
protokolu až na kraji, oddělené mezerou (`.sp-del .sp-x-pdf{margin-left:.5rem}`,
sloupec `<col>` 68 → 84 px). Je to **jiný druh akce** než úprava řádku, takže
nemá sedět mezi nimi. Test měří skutečné souřadnice (nejpravější tlačítko
+ mezera), ne jen pořadí v HTML.

### Hromadný protokol je TŘETÍ REŽIM téhož náhledu

`__spotrRezim` má nově tři hodnoty: `seznam` (na šířku) · `jeden` · **`vsechny`**
(každý spotřebič jedna strana na výšku, všechny v jednom souboru — vzor ILLKO
Studio „Strana 1 z 5"). Kreslí to **táž `spotrJedenHtml()`**, takže se
jednotlivý a hromadný protokol nemůžou rozejít; lišta, tisk i ukládání jsou
společné a liší se jen název souboru (`Protokoly_spotrebicu_…`).

**Tlačítko je v liště nad náhledem, ne ve formuláři** — tam už jsou 🖨️ a 💾,
které pro hromadný protokol platí beze změny, a je hned vidět, co se vlastně
uloží. **Je to JEDNO tlačítko, ne dvě:** ze seznamu nabízí „📄 Protokoly po
jednom", odkudkoli jinud „📋 Zpět na seznam" (`spotrebiceRezimBtn()`). Tim se
zároveň **spravila cesta zpátky z protokolu jednoho spotřebiče** — dosud se
z něj dalo odejít jen do formuláře.

- **`spotrZpetZapamatovat()`** — `__spotrZpet` se přepíše jen tehdy, když se
  přichází odjinud než z `screen-spotrebice-pdf`. Bez té podmínky by přepnutí
  režimu nastavilo návrat na tentýž náhled a šipka „Zpět do formuláře" by
  přestala fungovat. Test to hlídá po každém přepnutí.
- Patička **„Strana i / N"** je jen u hromadného režimu — u jediného protokolu
  by „Strana 1 / 1" byla šum. Sedí absolutně u spodní hrany (`position:relative`
  na straně), ne v toku textu: obsah protokolu je kratší než strana.

**Do Novinek NEJDE** — uživatel kartu 2026-09-18 odmítl („ne"). Nabídl jsem mu
znění, rozhodl se proti; **příště to už znovu nenabízet.**

Test: `test-jeden-spotrebic.js` (53 kontrol) — nově pořadí i souřadnice tlačítek,
strana na spotřebič, každý proud na svém řádku i v hromadném režimu, číslování
stran, název souboru, přepnutí tam i zpět a že se šipka Zpět nerozbila.

## Kolonka „Dodavatel" v protokolu spotřebiče (v9.79)

Dotaz uživatele 2026-09-18: „tady v okénku dodavatel si nejsem jistý, jestli
tam mám být revízák, jestli to není pro někoho jiného — Jirka to okénko měl
prázdné."

**„Dodavatel" = kdo revizi DODAL, tedy kdo ji fakturuje — ne dodavatel
spotřebiče.** Proto je u něj IČO a DIČ a proto stojí vedle kolonky „Revizi
provedl a protokol vystavil". Kolega ho má prázdný, protože je **zaměstnanec**
a spotřebiče reviduje vlastní firmě — nikdo nikomu nic nedodává.

Do v9.78 se tam psálo `t.firma || t.jmeno`, takže **jméno technika se vypsalo
vždycky** — i tomu, kdo nefakturuje.  `spotrJedenHtml()` se proto ptá na obojí:

1. vyplněná **firma** z profilu („Název firmy, pokud fakturujete přes firmu"),
2. jinak **jméno technika, ale JEN když má v profilu IČO** — OSVČ fakturuje
   na sebe, takže dodavatelem je on sám,
3. jinak **prázdno** — zaměstnanec. Popisky IČO / DIČ zůstanou, aby šlo
   okénko dopsat rukou.

**Prázdná kolonka je lepší než vymyšlený dodavatel** — je to údaj
o obchodním vztahu, ne o technikovi, a ten je v protokolu vedle v kolonce
„Revizi provedl". Týká se to **jen protokolu jednoho spotřebiče**; seznam
ani ostatní typy zpráv tuhle kolonku nemají.

Test: `test-jeden-spotrebic.js` (40 kontrol) — všechny tři větve a k tomu, že
jméno technika zůstává v kolonce „Revizi provedl" i tehdy, když je dodavatel
prázdný.

## Znaky, které se na klávesnici nenapíšou — ≤ ≥ Δ (v9.77)

Pokyn uživatele 2026-09-18: „u strojů a spotřebičů technici nevědí, jak se
píše na klávesnici menší, větší, nebo rovno, delta In." Nápovědy v buňkách
ty znaky ukazují (`≤ IΔn (např. 18)`, `≥ 1`, `>19,9`), ale technik je neumí
napsat.

**Plovoucí lišta `#txt-lista` se na to použít NESMĚLA.** Má Ω µ ° ± ² Δ, ale
uživatel ji 2026-08-31 výslovně odmítl mimo souvislý text („zobrazuje se to
skoro všude a pěkně mě to štve"). Řešení proto nesmí nic překrývat.

Dvě cesty, každá pro jiného člověka:

1. **Pevný proužek POD tabulkou** (`symbolyProuzekHtml()`), u tlačítek, která
   tam už jsou: `≤ ≥ > Δ Ω ± °`. Nikde nepřekáží, nic nepřekrývá a hlavně
   **je vidět** — technik se nemusí ptát, jak se ten znak píše. Je
   u **měření strojů** a u **protokolu spotřebičů**; u kontrol strojů ne,
   tam je výsledek rozbalovátko.
2. **Psaní zkratkou** — `<=` → `≤`, `>=` → `≥`, `+-` → `±`. Kdo nechce sahat
   po myši, prostě píše.
   - **Jen interpunkce, nikdy písmena.** V číselné buňce se `<=` jinak
     vyskytnout nemůže, takže se nedá nic pokazit; kdyby se přepisovalo
     třeba `Idn` → `IΔn`, hrozilo by, že to sežere legitimní text.
   - **Samotné `>` se NEPŘEPISUJE** — `>19,9` je běžný zápis přesahu rozsahu
     měřáku a je i ve vzoru od kolegy. Test to hlídá.
   - Kouká se **jen na dva znaky před kurzorem**, takže se zbytek pole
     nikdy nezmění.

- **Platí to JEN v těch dvou tabulkách** (`symboleVhodne()` = `<input
  type=text>` uvnitř `#stroje-mereni-hosty` nebo `#spotrebice-list`).
  V elektro revizi ani v běžných polích se nic nepřepisuje a proužek tam
  není — test obojí kontroluje.
- **Znak se vkládá NA KURZOR, ne na konec.** Tlačítka proto reagují na
  `mousedown` s `preventDefault` — na `click` by buňka ztratila kurzor dřív,
  než se stihne zjistit, kam znak patří, a vložil by se na začátek. Stejná
  past jako u lišty nad textovým polem (2026-08-20).
- Bez vybrané buňky se nic nestane potichu — program **poradí**
  („Klepněte nejdřív do buňky, kam se má znak vložit.").
- **Funkce na hlášky se jmenuje `showToast()`, ne `toast()`** — první verze
  na tom spadla.

Test: `test-symboly.js` (20 kontrol — obě tabulky, vložení na kurzor
i doprostřed textu, všechny tři zkratky, že `>19,9` přežije, že se mimo
tabulky nic nepřepisuje, že v PDF proužek není).

## Protokol spotřebičů kradl pole jiným zprávám (v9.75)

Nahlásil uživatel 2026-09-18: „jen u rozpracované zprávy elektro mi zmizelo
okénko pro místo revize, zahájení a vypracování zprávy." Na snímku chybělo
i **ev. číslo** a **termín příští revize** — u obou zůstalo jen tlačítko.

**Byla to přesně pole ze `SPOTR_PRENOS`.** Nezničila se — **odstěhoval si je
protokol spotřebičů**, který zůstal viset ve skrytém tabu `#tab-spotrebice`
z dřív otevřené zprávy o spotřebičích. `spotrObnovitOkoli()` na konci volá
`spotrPrenosPoli(true)` a to se ptalo jen na to, jestli přihrádky existují —
ne na to, jestli je otevřená zpráva o spotřebičích. Stačilo pak v elektro
revizi sáhnout na datum: delegovaný `change` zavolal `spotrLhutaZmena()` →
`spotrObnovitOkoli()` → a pole odletěla do skrytého tabu.

**Data se přitom NEZTRATILA** — `gv()` čte pole podle `id`, ať visí kdekoli,
takže uložená zpráva byla pořád v pořádku. Technik je ale neviděl a nemohl
je vyplnit. Po načtení stránky se to samo spravilo, protože se formulář
staví z HTML znovu.

Opraveno na čtyřech místech, schválně víc než jedním:

1. **`spotrPrenosPoli(true)` odmítne stěhovat, když `aktTyp !== 'spotrebice'`.**
   To je ta vlastní invarianta: pole smí v listu bydlet jen po dobu, co je
   otevřená zpráva o spotřebičích.
2. **`spotrObnovitOkoli()` se u jiného typu hned vrátí.**
3. **`spotrListZahodit()`** — při přepnutí na jiný typ se list **vyhodí**,
   takže nemá co krást. Pojistka uvnitř: zbylo-li v něm nějaké pole zprávy,
   list se nezahodí (radši ať visí, než aby se pole zničilo).
4. Delegovaný `change` u `f_sp_lhuta` dostal **stejnou podmínku na typ**,
   jakou už měl `f_zahajeni`.

Test: `test-spotrebice.js` (110 kontrol) — nově celé kolečko spotřebiče →
elektro → práce v elektro zprávě → otevření zprávy z archivu, pokaždé
s kontrolou, **kde pole fyzicky jsou** a že jsou vidět. Volá i
`spotrObnovitOkoli()` a `spotrPrenosPoli(true)` **napřímo**, aby chyba
neprošla jinou cestou, než jakou se na ni přišlo.

**Poučení pro další stěhování prvků:** `#stroje-blok` i protokol spotřebičů
stěhují skutečné prvky mezi místy. Takové stěhování **musí být podmíněné
aktivním typem zprávy na OBOU koncích** — „přihrádka existuje" není důvod
prvek přesunout.

## Našeptávání místa provádění z archivu (v9.74)

Pokyn uživatele 2026-09-18: „u kontroly strojů na titulní straně vyplňujeme
místo provádění kontroly — chtělo by to našeptávání místa z uložených kontrol
z archivu, **celého místa**."

**`f_misto` je `<textarea>`, takže nativní `<datalist>` NEJDE** (ten umí jen
`<input>`) — a jít to ani nemá: místo bývá víceřádkové („Hala 3 – lisovna /
SO 12") a nabídnout se má celé. Proto vlastní nabídka, stejný mechanismus
jako u voleb ve spotřebičích (v9.73), sdílí i CSS `.sp-volby`.

- **Dělá se to pro VŠECHNY typy zpráv, ne jen pro stroje.** Zprávy **téhož
  typu jdou první** (dělám-li kontrolu stroje, chci vidět haly, ne rodinné
  domy), uvnitř od nejnovější; zpráva jiného typu má u sebe štítek typu.
- **U každého místa se ukazuje i adresa** — dvě haly téhož jména v různých
  areálech se jinak nerozeznají. Hledat jde podle obojího.
- **`mistoKlic()` zahazuje diakritiku, mezery, pomlčky i tečky**, takže
  „hala3", „Hala 3" i „HALA-3" jsou totéž. Slouží k hledání **i k vyřazení
  duplicit** — stejné místo se nenabídne dvakrát. (Že „hala3" najde „Hala 3",
  napoprvé NEPLATILO a slíbil to jen komentář — našel to test.)
- **Prázdná adresa se doplní z téže zprávy, vyplněná se NEPŘEPÍŠE.** Patička
  nabídky to říká nahlas, ať to není překvapení.
- **Posluchače jsou DELEGOVANÉ na dokumentu**, ne navázané na pole —
  `f_misto` se u spotřebičů stěhuje do protokolu (`SPOTR_PRENOS`) a přímo
  navázaný posluchač by se s ním rozešel. Test to zkouší i v přestěhovaném
  poli.
- **Výběr jede přes `mousedown`, ne `click`** — než by klik doběhl, pole by
  ztratilo fokus, `blur` by nabídku zavřel a nevybralo by se nic.
- **Enter vybere jen s otevřenou nabídkou.** Bez ní musí v textarea dál dělat
  nový řádek — místo je víceřádkové. Test hlídá obojí.
- Nabídka se neotevře u **dokončené (zamčené) zprávy** ani při prázdném
  archivu.

**Do Novinek NEJDE** — rozhodnutí uživatele 2026-09-18: „zásadně to
neovlivňuje funkcionalitu, je to jen příjemné překvapení." Je to **užitečné
zpřesnění pravidla** z úvodu tohohle souboru: do Novinek nepatří jen opravy
chyb, ale ani **pohodlnosti, které nemění, jak se program ovládá**. Kdo pole
vyplňoval ručně, vyplňuje ho ručně dál; nabídka se sama objeví.

### Rolování kolečkem nabídku zavíralo (v9.76)

Nahlásil uživatel 2026-09-18: „když chci v tom nabídnutém seznamu zaskrolovat
kolečkem, tak zmizne, šipky fungují." Posluchač `scroll` je v **zachytávací
fázi** (`capture: true`), takže mu chodí i rolování z nabídky samé — a ta je
rolovatelná (`max-height:60vh; overflow:auto`). Zavírat se má **jen při
rolování stránky**, kdy by nabídka odjela od pole.

- Řeší to `rolovaniUvnitr(e, selektor)` — u rolování dokumentu je `e.target`
  **`document`, ne prvek**, takže se musí hlídat i existence `closest`.
- **Stejnou chybu měla i nabídka voleb ve spotřebičích** (v9.73) — vznikla
  kopií téhož posluchače. Opraveny obě naráz.
- Test to zkouší **skutečným kolečkem myši** (`mouse.wheel`), ne jen
  vyvolanou událostí, a ověřuje, že se obsah opravdu posunul.

Test: `test-misto-napoveda.js` (36 kontrol), `test-spotrebice.js` (112).

## Nápověda u voleb ve spotřebičích (v9.73)

Pokyn uživatele 2026-09-17: „jsem hlava děravá a potřebuju, aby u rozbalovacího
okénka namířil myší na jednotlivé třídy, aby se tam zobrazila nápověda, jaké
spotřebiče jsou jaká třída, ať vím, co tam dát, stejně tak u skupiny atd."

### Nativní `<option title>` na to NESTAČÍ

Bublinu u položky **rozbaleného** seznamu kreslí operační systém, ne stránka —
Chrome ji na Linuxu ani na Macu nezobrazí. Ověřeno, než se cokoli psalo.
Proto **vlastní nabídka** (`.sp-volby`), která u KAŽDÉ volby rovnou ukáže
vysvětlení: nic se nemusí hledat myší a funguje to i na dotykovém displeji.

- **`<select>` v DOM ZŮSTÁVÁ** a je pořád jediným držitelem hodnoty. Nativní
  popup se jen nepustí ke slovu (`preventDefault` na `mousedown`), takže sběr
  dat, Ctrl+D, procházení klávesnicí i tisk fungují **beze změny**.
- Nabídka bydlí v `document.body`, ne v listu — `overflow:hidden` na
  `.sp-sheet-wrap` (kvůli zmenšení listu) by ji jinak uřízl. Umísťuje se
  podle `getBoundingClientRect()` a **při nedostatku místa se překlopí nad
  buňku**.
- Zavírá se klepnutím jinam, Escapem i rolováním; šipky vybírají, Enter
  potvrdí. **Fokus je na nabídce**, takže se šipky neperou se `spotrKlavesa`
  (ta reaguje jen na `.sp-pole`).
- **`title` na `<select>`** říká, co v buňce je teď — tam nativní bublina
  funguje, protože visí nad prvkem, ne nad položkou popupu.
- Selecty mimo tabulku (lhůta v hlavičce, odběratel v liště) nemají třídu
  `sp-pole`, takže si nativní rozbalovátko drží.

**Past, kterou našel až test:** `spotrNabidkaOtevrit()` zapomněla přiřadit
`__spotrNabidka = box`, takže `spotrNabidkaZavrit()` neměla co zavřít —
nabídka nešla zavřít vůbec a při každém dalším otevření by v `body` přibyla
další. Testy na zavírání jsou proto tři (výběr, Esc, klepnutí jinam).

### Odkud se berou texty

- **Sestava, metoda, zkouška chodu a celkové hodnocení se PARSUJÍ Z LEGENDY
  protokolu** (`spotrLegendaMapa()` nad `SPOTR_VYSVETLIVKY`, položky 4) 5) 6)).
  Jeden zdroj pravdy: kdyby se text legendy upravil, nápověda se veze s ním
  a nemůžou se rozejít. Metoda se skládá **ze dvou položek „6)"** — vzor je
  má dvě, protože legenda pokračuje do dalšího sloupce.
- **Třída ochrany** (`SPOTR_TRIDY`) — I / II / III podle ČSN EN 61140,
  poznámka o prodlužovacích přívodech je z legendy, položka 8).
- **Skupina A–E** (`SPOTR_SKUPINY_VOLBY`) — ČSN 33 1600 ed.2 kap. 4.
  ⚠️ **Znění NENÍ opsané z normy** — sandbox na `csnonline.agentura-cas.cz`
  nesmí (viz oddíl u v9.51). Je to popis podle obecné znalosti té tabulky;
  vzor od kolegy ho potvrzuje jen zčásti (kancelářská technika = E,
  trafopáječka = C). **Uživatel byl upozorněn, ať si znění ověří** —
  skupina určuje lhůtu, takže špatný popis by vedl ke špatnému termínu.
- **Test hlídá, že žádná nabízená volba nezůstala bez vysvětlení** — přidat
  volbu do `SPOTR_SLOUPCE` a zapomenout na nápovědu tedy neprojde.

Test: `test-spotrebice.js` **103 kontrol**.

## Výrobní číslo přístroje se do protokolu nedostalo (v9.72)

Nahlásil uživatel 2026-09-17: „při vyplňování zprávy na spotřebiče se
nepropisuje výrobní číslo měřáku, který má technik uložený v nastavení."

`spotrPristrojeHtml()` sahala po **`p.vyrobni`**, ale klíč se jmenuje
**`vyrCislo`** (`collectPristroje()`, `STORE.pristroje`). Platilo to od v9.67.
Dvě škody, ne jedna:

1. sloupec „Výrobní číslo" zůstal prázdný, i když měl technik přístroj
   v profilu vyplněný,
2. **stejný překlep byl i ve filtru** `p.nazev || p.vyrobni || p.kalibrace`,
   takže přístroj zapsaný **jen výrobním číslem** se do protokolu nedostal
   vůbec.

Hlídají to čtyři kontroly v `test-spotrebice.js` (číslo na obrazovce, číslo
v PDF, číslo kalibračního listu, a že přístroj jen s výrobním číslem
nezmizí). **Nehlídat to jen na obrazovce** — formulář a PDF kreslí táž
funkce, ale filtr se projeví až na počtu řádků.

## Karta v Novinkách k číslování zpráv (v9.72)

Uživatel schválil 2026-09-17. Karta k **v9.62–v9.68** (předlohy, automatika,
tlačítko ⟳, řada per typ, roční reset, živá ukázka) — dosud žádnou neměla,
přestože je to nová volba v Nastavení, kterou bez upozornění nikdo nenajde.

**Karta výslovně říká „nic dělat nemusíte"** — to je celý smysl výchozí
hodnoty a uživatel na tom trval („defaultně to bude jak to je teď, ať není
nikdo překvapen"). Poznámka pod čarou upozorňuje na jedinou věc, která se
komu s pětimístnými čísly opravdu změnila: **„Navázat" na ně nově naváže.**

## Karty v Novinkách ke spotřebičům a k archivu (v9.71)

Uživatel schválil 2026-09-17 („novinky ano"). Dvě věci:

1. **Nová karta „🔌 Revize elektrických spotřebičů"** (`data-nov-datum`
   **2026-09-17**) — nový typ zprávy, lhůty, ovládání z klávesnice, ⧉ kopie
   řádku, podbarvení, místo vystavení.
2. **Karta k postrannímu archivu (v9.58) se OPRAVILA a doplnila.** Tvrdila
   „seznam začíná rozpracovanými, pak připnuté, naposledy otevřené a nakonec
   zprávy po rocích" — **od v9.64 to tak není** (uživatel oddíly odmítl), takže
   karta lhala. Přibyly k ní filtr typu, roztažení myší, ⧉ kopie a ✕ smazání.
   **Datum se nechalo 2026-09-16** — je to doplnění existující karty, ne nová
   funkce; posouvat ho dopředu by vypadalo, že archiv je nový.

**Dva testy spadly a nebyla to chyba programu** — `test-form-archiv.js`
a `test-ai-sken.js` hlídaly svou kartu **napevno podle indexu** a novější
karta je posunula. Přesně past popsaná u v9.58. Opraveno tak, aby se to
nemohlo opakovat:

- karta se hledá **podle titulku**, ne podle indexu,
- pořadí se ověřuje **skutečným nárokem**: nad kartou nesmí stát nic
  staršího a pod ní nic novějšího (ne „je druhá" — karet se stejným datem
  může být víc),
- **pulsování 📰 se porovnává přes `>=`, ne `===`**. `getNovinkyLatest()`
  vrací **maximum přes všechny karty**, takže rovnost s datem konkrétní
  karty platí jen do první novější.

Test: `test-novinky.js` (21 kontrol — karta nahoře, datum v atributu
i v titulku, čelo seznamu seřazené, karet bez data nepřibylo, obsah obou
karet, rozsvícené tlačítko 📰).

## Spotřebiče — vyplňování jako v Excelu a vzhled podle vzoru (v9.70)

**Zadání uživatele 2026-09-17** (k v9.69): „V tabulce chybí zkopírovat řádek,
chybí funkce z excelu pro snažší vyplňování — například kopírování hodnot pod
sebou, posun šipkami nebo enterem v okénkách. Nemožnost přepsat, že jsem dělal
zprávu někde jinde, třeba u zákazníka, ne podle adresy technika. Naše zpráva
z programu je vizuálně hnusná, vzor od Jirky z Illka je pěknější — to by
z části vyřešila funkce barevného pozadí, co máme jinde."

### Ovládání z klávesnice

`spotrKlavesa()` na **hostiteli listu** (ne na tabulce — ta se překresluje
a posluchač by se s ní ztratil):

| klávesa | co dělá |
|---|---|
| **Enter** / **↓** | stejný sloupec, další řádek |
| **Shift+Enter** / **↑** | o řádek zpět |
| **← →** | vedlejší sloupec — **jen když je kurzor na konci textu** |
| **Ctrl+D** | převezme hodnotu z buňky NAD kurzorem (vyplnění sloupce) |
| **⧉ u řádku** | kopie řádku i s hodnotami hned pod originál |

- **Šipky ← → nesmí přeskakovat buňky bezpodmínečně.** V Excelu ano, ale tady
  jsou to textová pole — jinak by nešlo opravit překlep uprostřed slova.
  Proto se kouká na `selectionStart/End`. U `<select>` se do nich nesahá
  vůbec, tam si je bere prohlížeč na přepínání voleb.
- **Enter na posledním řádku založí další**, aby šlo psát spotřebič za
  spotřebičem bez sahání po myši. **Prázdnota řádku se pozná JEN z psaných
  polí, ne z rozbalovátek** — nový řádek má předvyplněnou sestavu, metodu,
  chod i hodnocení (P/V/V/V), takže „má aspoň jednu hodnotu" je vždycky
  pravda a Enter by zakládal řádky donekonečna. (Našel to test.)
- **Sloupec s tlačítky ⧉ ✕ musí mít vlastní `<col>` v `<colgroup>`** —
  `table-layout:fixed` dá buňce bez něj nulovou šířku a tlačítka se
  poskládají pod sebe. `spotrTabulkaHlavicka(o)` ho přidává jen při `o.edit`.

### Místo vystavení je pole zprávy

V podpisu „v ……… dne: ………" bylo město z **profilu technika**. Revize se ale
dělá u zákazníka. Použije se proto stávající pole **`f_predano_misto`**
(„Předáno v (město)"), které se stěhuje do listu jako ostatní —
`SPOTR_PRENOS`. Prázdné pole spadne zpátky na `STORE.technik.mesto`, takže
komu to dosud vyhovovalo, nic se nemění.

### Vzhled

1. **Písmo je bezpatkové.** `.a4` má `font-family: Courier Prime…` pro
   všechny typy zpráv a vedle sázeného vzoru od kolegy vypadal protokol jako
   výpis z jehličkové tiskárny. Přepisuje to **`.sp-sheet, .a4.a4-spotrebice`**
   → `var(--sans)`. **Dvě třídy schválně:** `.a4` stojí v souboru NÍŽ, takže
   při shodné specificitě vyhrává a PDF by se tisklo psacím strojem, i když
   na obrazovce ne. **Elektro, LPS ani stroje se nezměnily** (`porovnani2.js`
   znak po znaku).
2. **Podbarvení hlaviček a vysvětlivek** ze **stejného nastavení jako
   u ostatních zpráv** (`tiskNastaveni` → `pozadiTisku`), takže nevzniká
   druhé úložiště barev a volba se se zprávou uloží do archivu.
   - **Barva se bere PŘÍMO, ne přes `pboxOdstin()`.** Ten ji míchá na 85 %
     bílé (u ostatních zpráv má být podbarvení jen náznak) — po předlohách
     z `TISK_BARVY`, které jsou samy o sobě světlé, by nezbylo nic.
   - Paleta šesti vzorků je **v liště nad protokolem**, ne ve vyskakovacím
     okně — mění se živě v tom, co se tiskne.
   - **`SPOTR_BARVA_VYCHOZI = '#f2f2f2'`** — nová zpráva o spotřebičích má
     podbarvení rovnou, aby vypadala jako vzor. Je to jen výchozí hodnota:
     kdo klikne na „bílá", tomu u té zprávy bílá zůstane (`pozadiTisku: ''`).
   - Kolonky s údaji zůstávají **bílé**, ať se v nich čte — stejný princip
     jako `pbox-tint` jinde.
3. `--sp-tint` dědí z `--pdf-bg`, které se nastavuje na **kontejneru** stránek
   (podědí ho i strany vzniklé až při stránkování) a na `.sp-sheet`.

Test: `test-spotrebice.js` **78 kontrol** (nově: kopie řádku, všech pět
kláves, past s předvyplněnými rozbalovátky, místo vystavení ve zprávě
i v PDF, že protokol není monospace na obrazovce ani v PDF, podbarvení
shodné na obou místech, zrušení barvy i výběr jiné).

## Spotřebiče — FORMULÁŘ JE PROTOKOL (v9.69)

**Zadání uživatele 2026-09-17** (po kritice v9.67): „v pdf má být podpis…
u ostatních revizí je dobrý, jak člověk vyplňuje po krocích a pak se z toho
poskládá pdf, ale tady u spotřebičů to je zmatečné. Ta výsledná karta je
jednoduchá a chtělo by to, aby vizuál výsledného pdf byl stejný jako to, co
vyplňuju v programu. Navíc to, že si technik musí posouvat sliderem tabulku
v tab 2., je strašný. Udělej to pořádně… nešetři si práci."

Měl pravdu ve všech třech bodech. v9.67 byla jen kopie mechaniky od strojů
(šest tabů → sběr dat → PDF), která k jednolistovému protokolu nesedí.

### Jedna sada stavebníků pro obrazovku i pro papír

`spotrHlavickaHtml` · `spotrTabulkaHlavicka` · `spotrRadekHtml` ·
`spotrPristrojeHtml` · `spotrVysvetlivkyHtml` · `spotrPodpisHtml` berou
volbu **`o.edit`**: `true` → buňky jsou pole a kolonky hlavičky jsou
přihrádky, `false` → text do PDF. **Neexistují dvě verze rozvržení**, takže
se nemůžou rozejít — to je celý smysl.

- **Jediný tab „Protokol"** místo šesti. Přístroje se půjčí do překryvu
  (`#modal-sp-pristroje`), lhůta a data se nastavují přímo v hlavičce listu.
- **`novaZprava()` aktivuje panel PRVNÍHO TLAČÍTKA daného typu**, ne natvrdo
  `tab-titulni`. Spotřebičům by titulka nechala prázdnou obrazovku a protokol
  by měl **nulovou šířku** (a tím i nulové měřítko).

### Pole zprávy se STĚHUJÍ do listu, nekopírují

`SPOTR_PRENOS` = `f_provozovatel`, `f_ev_cislo`, `f_zahajeni`, `f_pristi`,
`f_misto`, `f_sp_lhuta`, `f_vypracovani`. `spotrPrenosPoli(doListu)` je
přestěhuje do přihrádek `.sp-slot` a zpátky; domov si každý prvek pamatuje
v `el.__spotrDomov`. Vzor `#stroje-blok` z v9.30 — ukládání, archiv, zálohy
i načtení z archivu tím fungují beze změny, protože **zdroj pravdy zůstává
jeden**.

**Past, na kterou to najelo dvakrát:** cokoli, co přepíše `innerHTML` nebo
`outerHTML` části listu, **ta přestěhovaná pole zničí** — a program pak
`f_vypracovani` nikde nenajde. Proto `renderSpotrebiceList()` i
`spotrObnovitOkoli()` volají **nejdřív `spotrPrenosPoli(false)`** (pole domů)
a až pak překreslují; `spotrObnovitOkoli()` je na konci vrací zpět.
**Přesun musí zůstat obousměrný** — jinak u elektro revize pole na titulní
straně chybí (test to hlídá při přepnutí typu).

### Šířka: A4 a zmenšení, ne posuvník

`.sp-sheet` je **přesně 281 mm** (297 − 2×8 mm padding), tedy obsah tištěné
strany. Na užší okno se **celý list zmenší** (`spotrPrizpusobit()` →
`transform: scale`), místo aby se posouval vodorovně — vodorovný posuvník je
to, co uživatel odmítl.

- Obal `.sp-sheet-wrap` musí dostat **dopočítanou výšku**
  (`výška × měřítko`), jinak pod zmenšeným listem zůstane díra —
  `transform` rozvržení nemění.
- Výška listu roste s každým spotřebičem → **`ResizeObserver`** na listu.
- **Ve skrytém panelu má list nulové rozměry**, takže `spotrPrizpusobit()`
  se musí volat AŽ po `showScreen`/přepnutí tabu (stejná past jako u všech
  tří náhledů PDF). Volá se z `novaZprava()`, `switchTab()`,
  `formArchivAktualizovat()` a `formArchivSirkaNastav()`.
- **Postranní archiv odsouvá formulář** (`--fa-sirka`), takže přeměření patří
  přímo do `formArchivSirkaNastav()` — ne jen na `pointerup`, ať to platí
  i pro dvojklik a obnovení uložené šířky.
- `#tab-spotrebice` má **vlastní `max-width` 1160 px** (běžný tab má 960) —
  jinak by se list zmenšoval i na velkém monitoru.

### Podpis v PDF (to, co chybělo)

`spotrPodpisHtml()` kreslí **čáru**, nad ní razítko a podpis technika, pod ní
vlevo „Jméno a příjmení revizního technika" + ev. č. osvědčení a vpravo
„podpis". Ve v9.67 podpisové místo **nebylo vůbec** — u revizní zprávy je to
zásadní chyba, ne kosmetika. Datum „v … dne:" je v editaci přihrádka pro
`f_vypracovani`, v PDF text.

### Ostatní

- **`collectPristroje()` je nová funkce** vytažená z `getData()` — protokol
  potřebuje seznam přístrojů za běhu, ne až při skládání PDF.
- Test: `test-spotrebice.js` (nově: jediný tab, pole opravdu
  bydlí v listu a vrací se domů, nikde vodorovný posuvník, list široký
  přesně 281 mm, měřítko na úzkém okně i s roztaženým archivem, karta
  přístrojů se půjčí a vrátí, podpisová čára a oba popisky v PDF).

## Revize elektrických spotřebičů — ČSN 33 1600 ed.2 (v9.67)

**Zadání uživatele 2026-09-17** (poslal čtyři snímky protokolů kolegy Jiřího
Roubalíka): „Vytvoř novou kartu pro revize elektrických spotřebičů. Máme volné
místo vedle nových strojů… Možnost zvolit, každý spotřebič se dělá v jiném
intervalu — 6, 12, 24 měsíců. Nápovědy, šedě předvyplněné hodnoty. Jednoduché
vyplňování. Udělej to kompletně s generováním pdf, tiskem, náhledem."

Je to **čtvrtý typ zprávy** (roadmapa #10). Vstup: **šestá karta na
`screen-podtyp`** vedle Strojů, ne dlaždice na hlavní straně — stejné
rozhodnutí jako u strojů (2026-09-02).

### NETISKNE SE PŘES `generujPDF()`

**To je to hlavní, co tenhle typ odlišuje.** Vzor není zpráva členěná do
číslovaných kapitol, ale **jednolistový protokol**: hlavička s kolonkami,
jedna široká tabulka na šířku papíru, pod ní tabulka měřicího přístroje,
vysvětlivky a podpis. Má proto **vlastní obrazovku `#screen-spotrebice-pdf`**
a vlastní renderer (`spotrebiceVykreslit`) — vzor `#screen-teren-pdf` (v9.53)
a `#screen-schema-pdf` (v9.39). `generujPDFAsk()` na to odbočí hned na
začátku podle `TYPY_ZPRAV.spotrebice.vlastniPdf`.
Elektro, LPS ani stroje se tím vůbec nedotklo (`porovnani2.js` znak po znaku).

### Sloupce a vysvětlivky

- **`SPOTR_SLOUPCE`** — 20 sloupců přesně podle vzoru, každý s klíčem v datech,
  hlavičkou, **šířkou v mm** a buď nápovědou (`ph`), nebo výčtem voleb.
  Součet šířek **musí zůstat pod 281 mm** (297 − 2×8 mm padding).
- **`SPOTR_SKUPINY`** skládá sloučenou hlavičku („Inventární údaje", „údaje
  o spotřebiči", „jmenovité hodnoty", „Podmínky měření", „Izolační stav",
  „Výsledek zkoušek a měření").
- **`SPOTR_VYSVETLIVKY`** = doslovné znění legendy ze vzoru ve čtyřech
  sloupcích. **Texty norem se nemění** — včetně toho, že vzor má dvakrát
  položku „6)" (je to pokračování do dalšího sloupce).
- **Nápověda je POUZE `placeholder`**, nikdy hodnota — do dat ani do PDF se
  nedostane (stejné pravidlo jako u nápověd u strojů, v9.30). Test to hlídá
  tím, že hledá text nápovědy ve vygenerovaném protokolu.
- Prázdná buňka se v PDF tiskne jako **`---`**, jako ve vzoru.

### Tři pasti, na které to najelo

1. **`obsah.querySelector('tbody')` chytal ŠPATNOU tabulku.** Hlavička
   protokolu (`spotrHlavickaHtml`) je taky `<table><tbody>`, takže všechny
   řádky spotřebičů spadly do ní a tabulka se vykreslila prázdná pod nimi.
   Musí to být **`.spotr-tab tbody`**.
2. **Šířky sloupců patří do `<colgroup>`, ne do buněk.** První řádek hlavičky
   má sloučené buňky (colspan) a `table-layout:fixed` z nich šířky
   jednotlivých sloupců neodvodí — druhý řádek hlavičky se pak s daty
   nezarovná.
3. **`.pdf-meas th` má `white-space:nowrap`** a v souboru stojí **ZA** novými
   pravidly, takže při shodné specifičnosti vyhrává. Hlavičky proto přetékaly
   přes sousední sloupce. Řeší to selektor **`table.spotr-tab th`**
   (o jeden typ navíc) + `white-space:normal`.

Navíc: **úzké sloupce mají hlavičku otočenou na výšku** (`th.sv > span`
s `writing-mode:vertical-rl`) — přesně jako vzor. Bez toho se dvacet sloupců
na šířku A4 čitelně nevejde.

### Lhůta je JEDNA pro celý protokol

Uživatel psal „každý spotřebič se dělá v jiném intervalu". Ve vzoru je ale
lhůta **společná pro celý protokol** („Všechny spotřebiče zde uvedené mají
lhůty 1x za N měsíců") a kolega má na každou lhůtu samostatný protokol
(000013 = 24 měsíců, 000009 = 12, 000001 = 6). Je to tedy **volba 6/12/24
na titulní straně**, ne sloupec v tabulce — per-řádek by si odporoval
s větou, která se tiskne pod tabulku.

- **Datum příští revize se dopočítá** z data revize a lhůty. **Ručně zapsaný
  termín se nepřepisuje** — pozná se podle `dataset.spocitano`.

### Ostatní

- `planDruh: 'T'` — v Plánu revizí se spotřebiče počítají jako technologie.
  Čtvrtá značka by si vyžádala migraci celého plánu, na to uživatel nežádal.
- Prefix ev. čísla **`RSP`**. Kolega má v protokolech holé `000013`; kdo to
  chce taky, nastaví si v Nastavení → Číslování zpráv **šablonu jen pro
  spotřebiče** (`{NNNNNN}`) — od v9.68 jde šablona nastavit per typ, takže
  se tím elektro revize nedotkne.
- „+ Přidat prodlužovací přívod" předvyplní třídu II, skupinu C a sestavu PP
  (`SPOTR_PRIVOD`) — ve vzoru mají všechny přívody stejný tvar.
- Test: `test-spotrebice.js` — typ, karta, 20 sloupců, nápověda jako
  placeholder, lhůty a dopočet termínu, kolečko archivem, protokol proti
  vzoru včetně vysvětlivek, stránkování 40 spotřebičů, a že elektro zůstalo
  nedotčené. **Ve v9.69 rozšířeno na 62 kontrol** — viz oddíl výš.

**Pozor při čtení tohohle oddílu:** rozvržení formuláře (šest tabů, tabulka
s vodorovným posuvníkem, karta `#scard-spotrebice-lhuta`) **platilo jen ve
v9.67–v9.68**. Od v9.69 je formulář jeden list; sloupce, vysvětlivky, lhůta
a rozhodnutí kolem nich dál platí beze změny.

## Vlastní číslování zpráv (v9.62, předlohy v9.63, per typ v9.68)

Pokyn uživatele 2026-09-16: „ať si každý technik nastaví vlastní styl
číslování zpráv, **defaultně to bude jak to je teď, ať není nikdo
překvapen**, a ostatní ať si to nastaví — například zaškrtne políčko, každá
nová zpráva bude další poslední číslo." Je to bod 1–3 odsouhlaseného návrhu
z 2026-07-15; **body 4–7 (převzaté zprávy od kolegů) se NEDĚLALY** a čekají
dál.

Karta **🔢 Číslování zpráv** v Nastavení, hned pod profilem technika.

- **Šablona je v `STORE.technik.cislo_format`, ne ve vlastním klíči STORE** —
  veze se tím se zálohou i s obnovou a **pravidlo „nový klíč = čtyři místa"
  se neuplatní**. Totéž `cislo_auto` (zaškrtávátko).
- **Šablona jde nastavit ZVLÁŠŤ PRO KAŽDÝ TYP** (v9.68, pokyn uživatele
  2026-09-17 „můžeš šablonu per typ"). Kolega má u spotřebičů holé `000013`,
  ale u elektro revizí `RE-26-0001`.
  - `cislo_format` = **společná výchozí** šablona, `cislo_format_typ[typ]` =
    **odchylka** konkrétního typu. Pořadí v `cisloSablona(typ)` je
    **odchylka → společná → `CISLO_VYCHOZI`**, takže komu stačila jedna
    šablona pro všechno, nic se nezměnilo.
  - **`cisloSlozit` i `cisloRegex` musí volat `cisloSablona(typ)`, ne
    `cisloSablona()`** — jinak by se číslo sice složilo podle typu, ale
    hledalo by se v archivu podle společné šablony (nebo naopak) a řada by
    se rozešla.
  - V Nastavení je nad předlohami **přepínač rozsahu** (`rt_cislo_rozsah`):
    „Výchozí pro všechny" + jeden za každý typ. **Typ s vlastní šablonou má
    u sebe •**, ať je odchylka vidět bez proklikávání.
  - U konkrétního typu je **první volbou „jako výchozí pro všechny typy"**
    (`cisloPredlohaDedit`) — tím se odchylka zruší. Bez toho by nešlo
    jednou nastavenou odchylku vzít zpět.
  - **Živá ukázka vypisuje řádek za KAŽDÝ typ** (dřív jen elektro + stroje).
    Když může mít každý typ svou šablonu, jinak by nebylo poznat, která kde
    platí; u typu s odchylkou se píše „vlastní šablona".
  - `cislo_auto` (automatické přidělení) zůstává **společné** — na to se
    uživatel neptal.
- Prefix typu pro `{TYP}`: **RE** elektro i LPS, **RS** stroje,
  **RSP** spotřebiče.
- **Výchozí `{TYP}-{RR}-{NNNN}` + automatika vypnutá dává BAJT PO BAJTU to,
  co program dělal do v9.61** — `novaZprava()` nabídne `RE-26-0001`. To je
  celý smysl výchozí hodnoty; hlídají to první tři kontroly testu.
- Značky: `{TYP}` (prefix z `TYPY_ZPRAV` — RE / RS), `{RR}`, `{RRRR}`,
  `{N…}` (kolik N, tolik míst). Kolem nich libovolný text.
- **Styl se vybírá kliknutím z předloh, ne psaním značek** (v9.63, pokyn
  uživatele „to se ale blbě píše"). Pět hotových stylů v `CISLO_PREDLOHY`
  + šestá volba **✏️ Vlastní**, která teprve odkryje pole se šablonou.
  **První předloha MUSÍ být `CISLO_VYCHOZI`** — `cisloPredlohyRender()` ji
  označuje popiskem „jako dosud".
  - **U předlohy se ukazuje PRVNÍ číslo řady, ne příští volné.** Příští
    volné by u archivu s `RE-26-10005` vyšlo u čtyř- i pětimístné předlohy
    stejně (`RE-26-10006`, protože `{NNNN}` chytá i delší čísla) a seznam by
    nabízel dva na pohled shodné řádky. Takhle je vidět TVAR čísla; příští
    volné číslo pro vybraný styl říká ukázka pod seznamem. **Test to hlídá**
    („všech pět předloh je navzájem různých") — na tohle se přišlo až testem.
  - Napíše-li uživatel ve „Vlastní" text shodný s některou předlohou,
    `blur` seznam přerovná a označí ji.
  - **`.teren-radek` CSS muselo dostat i `input[type=radio]`** — pravidlo
    zneškodňující `.f input{width:100%}` znalo jen `checkbox` a přepínač by
    se roztáhl přes celou kartu. Přesně ta past z v9.53.
- **Rok v šabloně = roční reset řady.** `cisloRegex()` dosazuje za rok
  dnešek natvrdo, takže loňská čísla do letošní řady nespadnou. Šablona bez
  roku = řada běží dál. Vyplývá to samo, není to zvláštní větev.
- **`{NNNN}` musí chytat i DELŠÍ čísla (`\d{4,}`, ne `\d{4}`).** Jinak by se
  řada po 9999 zasekla — a hlavně: uživatel má pětimístná čísla
  (`RE-26-10001`), kterým by program svou vlastní řadu vůbec neviděl.
  **Tím se mění, co nabídne „Navázat"** (dřív regex `^RE-rr-(\d{4})$` jeho
  řadu ignoroval a nabízel `RE-26-0001`) — uživatel byl upozorněn.
- **Šablona bez `{N…}` nic nevymýšlí** — `cisloDalsi()` vrátí `null`,
  „Navázat" nechá číslo staré zprávy a ukázka v Nastavení varuje.
- **Živá ukázka (`cisloUkazka()`) je ta pojistka proti překvapení** —
  ukazuje příští číslo obou řad, kolik zpráv v archivu do řady spadá,
  a co dostane nová zpráva. Překresluje se při psaní i při zaškrtnutí.
- **Tlačítko ⟳ u pole Ev. číslo** přidělí další volné číslo na vyžádání,
  i s vypnutou automatikou. **Nemá `ro-ok`** — zapisuje, takže se
  u dokončené zprávy musí schovat; `cisloPridelit()` navíc kontroluje
  `window.__formReadOnly`.
- Elektro a LPS **sdílejí řadu** (obojí má prefix RE), stroje mají vlastní —
  je to tak i dnes a vyplývá to ze `{TYP}`.
- **`pocetZprav(n)`** — skloňování („1 zpráva / 2 zprávy / 5 zpráv") na
  jednom místě pro archiv i ukázku. Dřív to byl inline ternár v `renderArchiv`.
- Test: `test-cislovani.js` (55 kontrol — výchozí chování beze změny,
  automatika, vlastní šablony, roční reset, pětimístná řada, tlačítko ⟳,
  zamčená zpráva, „Navázat", živá ukázka, předlohy, restart).

## U kontroly stroje není „výchozí" ani „výchozí souhrnná" (v9.61)

Uživatel si všiml (2026-09-16): „u strojů nám visí možnost druh kontroly —
výchozí, pravidelná, to by u kontroly asi nemělo být." Měl pravdu.
**„Výchozí" a „Výchozí souhrnná" jsou pojmy ČSN 33 1500 pro REVIZI**
vyhrazeného el. zařízení. Kontrola pracovního stroje jede podle
**NV č. 378/2001 Sb. § 4** (ověřeno ve znění předpisu, ne odhadem):

- **odst. 1** — kontrola bezpečnosti provozu zařízení **před uvedením
  do provozu**, podle průvodní dokumentace výrobce,
- **odst. 2** — **následná** kontrola **nejméně jednou za 12 měsíců**
  v rozsahu dle místního provozního bezpečnostního předpisu.

Nabídka se proto vybírá podle klíče `pojmy` v `TYPY_ZPRAV`, stejně jako
slovník `POJMY` — tabulka **`DRUHY_ZPRAVY`**:

| sada | volby | výchozí |
|---|---|---|
| `revize` (elektro, LPS) | Výchozí · Výchozí souhrnná · Pravidelná · Mimořádná | Pravidelná |
| `kontrola` (stroje) | Pravidelná · Před uvedením do provozu · Mimořádná | Pravidelná |

- **Nabídku přestavuje `aplikovatPojmy()`**, a jen při SKUTEČNÉ změně sady
  (hlídá `data-sada` na `<select>`). Elektro a LPS sdílejí `revize`, takže
  se u nich rozbalovátko nesahá vůbec — `porovnani2.js` vychází znak
  po znaku stejně.
- **`normalizujDruh(typ, druh)` je nutnost, ne kosmetika.** Přiřazení
  hodnoty, kterou `<select>` v nabídce nemá, ho nechá **PRÁZDNÝ**
  (`selectedIndex === -1`) a zpráva by se vytiskla bez druhu v nadpisu
  („ZPRÁVA O KONTROLE…" místo „…O PRAVIDELNÉ KONTROLE…"). Volá se
  ve `nacistData()` u `f_druh` a při přestavbě nabídky.
- **Staré zprávy o strojích s „Výchozí" se překlápějí na „Pravidelná"**
  (rozhodnutí uživatele 2026-09-16 — upozorňoval jsem, že to mění nadpis
  už vydané zprávy, a přesto to tak chtěl). Překlopení se děje **při
  načtení do formuláře**, ne hromadnou migrací archivu: pouhé otevření
  zprávy uložená data nepřepíše, projeví se to až uložením. Elektro a LPS
  si „Výchozí souhrnnou" drží dál.
- **„Před uvedením do provozu" nejde do nadpisu PŘED podstatné jméno.**
  Česky to je „ZPRÁVA O KONTROLE … PRACOVNÍHO STROJE **PŘED UVEDENÍM
  DO PROVOZU**", ne „ZPRÁVA O PŘED UVEDENÍM DO PROVOZU KONTROLE".
  Řeší to tabulka **`DRUH_ZA`** + `druhZaNadpisem()` / `druhZaVeVete()` —
  předsádka (`druhVNadpisu`) pro takový druh vyjde prázdná a text se
  přilepí dozadu. U všech druhů elektro i LPS vracejí prázdno, takže
  se jejich PDF nezměnilo.
- Pole **„důvod mimořádné revize"** se pořád ukazuje jen u „Mimořádná" —
  po přestavbě nabídky se proto volá `updateDuvodMimoradne()`.
- Test: `test-druh-stroje.js` (23 kontrol — obě sady, přepínání typů tam
  a zpět, nadpis i věta o předmětu pro všechny tři druhy, stará zpráva
  s „Výchozí", že elektro zůstalo nedotčené).

**Past v testu:** věta „Předmětem … bylo…" **NENÍ na titulní straně** —
vymezení předmětu je ve vlastní kapitole. Kontrola se musí dívat na celý
`#pdf-pages`, ne na `.a4-titulni`.

## Postranní archiv ve formuláři — jako seznam pošty (v9.57–v9.66)

**Zadání uživatele (2026-09-16, snímek Outlooku):** „píšu zprávu a překliknu
si to na druhou zprávu a zároveň ten archiv mohu schovat, komu by vadil na
noťasu." Tlačítko **📚 Archiv** v drobečkové navigaci formuláře otevře vlevo
sloupec se zprávami; **klik zprávu rovnou otevře** (rozhodnutí uživatele —
nabízel jsem náhled s potvrzením, chtěl chování Outlooku) a **«** panel sbalí.

- **Panel bydlí MIMO `#screen-form`, a to je zásadní.** Delegovaní posluchači
  `input` a `change` na `#screen-form` nastavují `__formDirty` a spouští
  `autoSave()` — psaní do hledacího pole uvnitř by rozepsanou zprávu
  značkovalo jako změněnou a nabízelo ji k uložení. Hledání proto má vlastní
  větev v globálním `input` posluchači (`e.target.id === 'fa-hledat'`).
- **Přepíná se přes `attemptLeaveForm()`** — dialog Zůstat / Zahodit / Uložit.
  Nikdy nesmí vzniknout cesta, která rozepsanou zprávu zahodí potichu.
- **Zůstává se na tomtéž tabu.** `novaZprava()` natvrdo přepíná na
  `tab-titulni`, takže otevření zprávy tě dřív vždycky vyhodilo na titulku.
  `formArchivObnovitTab()` krok vrátí — ale **jen když ho cílová zpráva má**:
  elektro, LPS a stroje mají různé sady tabů, a `tab-popis` u zprávy o stroji
  neexistuje. Nenajde-li se tlačítko ve `aktivniTabBar()`, zůstane se na
  titulce; jinak by visela prázdná obrazovka.
- **Adresuje se přes `uid`, ne přes index do `archivu`** (ten se mění s
  řazením i filtrem). `data-idx` je jen záloha pro staré záznamy bez `uid` —
  ty ho dostanou až v `otevritZpravu()`.
- **Sbalení se pamatuje v `localStorage` (`revize_el_form_archiv`), NE ve
  `STORE`.** Je to vlastnost konkrétního zařízení: na velkém monitoru panel
  nevadí, na notebooku zabírá obrazovku. Přenášet tuhle volbu zálohou na
  druhý počítač by bylo špatně — proto se pravidlo „nový klíč = čtyři místa"
  neuplatňuje.
- **Překreslení se veze na `renderArchiv()`** (první řádek funkce, před
  všemi `return`). Tím se panel sveze s uložením, připnutím, dokončením
  i smazáním a nemusí se to hlídat na deseti místech.
- **Pod 1400 px leží panel PŘES obsah**, nad ním obsah odsune
  (`body.fa-open #screen-form{padding-left:280px}`). Tabulka měření má
  šestnáct sloupců — ukousnout jí 280 px by ji rozsypalo.
- Tlačítko i panel jsou **mimo `.tab-panel`**, takže je pravidlo
  `#screen-form.form-readonly .tab-panel button{display:none}` neschová
  u dokončené zprávy. Třídu `ro-ok` tedy nepotřebují (test to hlídá).
- **`archivHay(z)`** — text, ve kterém se fulltextově hledá, je vytažený
  z `renderArchiv()` do vlastní funkce. Archiv na hlavní straně i panel
  hledají přes ni, aby se dvě kopie nerozešly.
- **Seznam je PLOCHÝ a seřazený podle ev. čísla sestupně — žádné oddíly**
  (v9.64). Do v9.63 tu byly skupiny „Rozpracované / Připnuté / Naposledy
  otevřené / po rocích" a **klik na zprávu ji přesunul mezi naposledy
  otevřené**: zmizela ze svého místa a všechno pod ní poskočilo. Uživatel to
  odmítl (2026-09-16): „extrémně nepřehledné a nepříjemné… ať jsou seřazené
  podle čísel a nemění se, člověk si je vyfiltruje přece sám, a poslední
  otevřené bych z tohoto postranního archivu odebral."
  - **Rozpracovanou zprávu pozná zlatý proužek a štítek 🔨, připnutou 📌** —
    informace zůstala, jen se s ní nehýbe. Špendlík se do řádku musel
    doplnit, když oddíl „Připnuté" zmizel.
  - **`last_opened_at` se pořád zapisuje** — panel „Naposledy otevřené"
    na hlavní straně na něm stojí a ten zůstává.
  - **`cisloPorovnat(a, b)`** řadí „jak by to udělal člověk": číselné úseky
    porovnává jako čísla, takže `RE-26-9` stojí před `RE-26-10`. Zpráva bez
    čísla padá nakonec.
  - **Test hlídá, že se po kliknutí pořadí nezmění** — to je jádro celé
    stížnosti, ne kosmetika.
  Řetězy revizí se v panelu **neschovávají** — vnořenou historii má archiv
  na hlavní straně.
- U zprávy o stroji se ukáže **název a typ stroje** (`archivMistoBunka`
  z v9.47), ne jen umístění.
### ⧉ Kopírovat → nová zpráva (v9.65)

Pokyn uživatele 2026-09-16: „potřebuji, aby v postranním archivu bylo
tlačítko zkopírovat / vytvořit jako novou zprávu — **pro navázání slouží
hlavní archiv**, tady se to rovnou zkopíruje a založí nová zpráva
s číslováním, jak má technik nastaveno."

- **Kopie NENÍ „Navázat".** `navazatZpravu()` dělá NÁSTUPCE: nastaví
  `__predchudceUid` (stará zpráva se vnoří do řetězu revizí objektu),
  zapíše `predchozi` = datum ukončení staré a překlopí výchozí revizi
  na pravidelnou. `formArchivKopirovat()` **žádný řetěz nedělá** — je to
  samostatná zpráva pro JINÝ objekt, která si půjčuje jen rozpis obvodů,
  přístroje a texty. `predchozi` i `pristi` se proto **mažou**.
- **Naměřené hodnoty a závady se vyprazdňují stejně jako u Navázat.**
  Vydat zprávu s hodnotami naměřenými na jiném objektu je to nejhorší, co
  se tu může stát. Dělá to **`vycistitNamerene(D)`** — **jedno místo pro obě
  cesty schválně**; kdyby se rozešly, jedna z nich by cizí měření pustila
  ven. (Vytaženo z `navazatZpravu()`, která ho teď volá taky.)
- **Číslo se bere ze šablony technika** (`cisloDalsi()` → v9.62), takže
  kopie zapadne do jeho řady. Fallback na první číslo řady, kdyby šablona
  neměla `{NNNN}`.
- **Ptá se a ukazuje, co udělá** — dialog jmenuje zdrojovou zprávu, nové
  číslo i to, že hodnoty budou prázdné. Tlačítko sedí těsně vedle řádku,
  na který se kliká kvůli otevření; bez potvrzení by překlep zakládal
  zprávy do archivu.
- **`e.stopPropagation()` v delegaci je nutnost** — bez něj by klik na ⧉
  zprávu zároveň otevřel (řádek má vlastní `data-action`). Test to hlídá.
- Jde i přes `attemptLeaveForm()`, takže rozdělaná zpráva projde dialogem.
- Kopie se rovnou uloží do archivu (jako u Navázat), aby nezmizela při
  návratu na hlavní stranu.
- CSS `.fa-kopie`: v klidu jen slabě naznačené, po najetí na řádek
  zvýrazní. **Neschovává se úplně** — na dotykovém displeji `:hover` není.

### ✕ Smazat zprávu (v9.66)

- **Otevřenou zprávu smazat NEJDE** a tlačítko se u ní ani nenabízí.
  Formulář by ji dál držel v paměti a první další uložení (Ctrl+S,
  generování PDF) by ji do archivu vrátilo — vypadalo by to, že mazání
  nefunguje. `formArchivSmazat()` to navíc odmítne i kdyby se tlačítko
  někde objevilo.
- **`smazatZpravu(i)` je pořád jedna funkce pro obě místa** (hlavní archiv
  i panel) — panel si jen přeloží `uid` na index. Při té příležitosti
  dostala dvě věci, ze kterých těží i hlavní archiv:
  1. **dotaz zprávu JMENUJE** (dřív holé „Smazat zprávu?", u kterého
     člověk nevěděl kterou),
  2. **8 vteřin nabídka ZPĚT** v toastu, která ji vrátí na původní index.
     U vydané revizní zprávy je omyl drahý a ✕ sedí hned vedle řádku,
     na který se kliká.
- `e.stopPropagation()` jako u ⧉.

### Rozvržení řádku — co smí ustoupit (v9.66)

Dvě tlačítka v 280px sloupci ubrala místo a **ev. číslo se začalo ořezávat
(„RE-26-…")** — při řazení PODLE ČÍSLA ta nejhorší věc, co se může uříznout.
První řádek má proto čtyři části a jen jedna z nich se smí smrsknout:

| část | chování |
|---|---|
| štítek typu, `<b>` s ev. číslem | `flex:0 0 auto` — nikdy neustoupí |
| `.fa-datum` | `flex:0 1 auto; overflow:hidden` — **jediné, co se ořízne** |
| `.fa-vysl` (✅/❌) | `flex:0 0 auto` — proto je MIMO `.fa-datum` |
| `.fa-akce` (⧉ ✕) | `flex:0 0 auto; margin-left:auto` |

Test tři z toho měří přímo (`scrollWidth > clientWidth`, pravá hrana
tlačítek proti hraně řádku) — na pohled to vypadá dobře i když se ořezává.

### Roztažení panelu myší (v9.60)

Pokyn uživatele: „aby šla oddělovací čára jako v Outlooku uchopit a roztáhnout
si ho doprava." Úchyt `.fa-resize` na pravé hraně, tažení mění šířku,
**dvojklik vrátí výchozích 280 px**.

- **Šířku drží CSS proměnná `--fa-sirka` na `documentElement`** — sdílí ji
  panel i `padding-left` formuláře, takže se při tažení přepisuje na jednom
  místě a obsah se veze s ním.
- **`setPointerCapture` je nutnost, ne ozdoba.** Bez něj se tažení utrhne,
  jakmile kurzor přejede nad formulář (události pak chytají pole pod ním).
  Test proto myší schválně přejíždí přes formulář.
- **Do `localStorage` se zapisuje až na `pointerup`**, ne na každý pixel
  pohybu.
- **Horní mez se počítá z okna** (`window.innerWidth - 320`, strop 760),
  ne napevno — formuláři musí vždycky zbýt kus obrazovky. Na `resize` okna
  se šířka osekne, ale **uložená hodnota se nepřepíše**: po návratu
  na velký monitor se panel roztáhne zpátky.
- `body.fa-tahne` vypíná označování textu a drží kurzor `col-resize`.
- Zóna úchytu (7 px) **přesahuje přes okraj na obě strany** (`right:-3px`),
  aby se trefila i nepřesnou myší.

### Filtr typu v panelu (v9.59)

Pokyn uživatele: „když mám otevřenou kartu stroje, potřeboval bych filtr,
abych si ukázal jen ty stroje." Řádek tlačítek pod hledáním —
**Vše 7 · Elektro 4 · LPS 2 · Stroje 1**, jeden klik zúží, druhý klik na týž
typ zruší. Kombinuje se s hledáním.

- **Pořadí tlačítek se bere z `TYPY_ZPRAV`, NE z pořadí v archivu** — jinak
  by se přeskládala, kdykoli přibude zpráva jiného typu, a člověk by musel
  pokaždé hledat, kde je které. Test to hlídá **fixturou, kde je stroj
  v archivu první** — se seřazeným archivem by kontrola prošla i u vadného
  kódu.
- **Počty se počítají z CELÉHO archivu, ne z vyfiltrovaného seznamu.** Jinak
  by kliknutím na Stroje ostatní volby zmizely a nebylo by se jak vrátit.
- **Je-li v archivu jediný typ, řádek se vůbec nekreslí** — v úzkém sloupci
  nemá smysl nabízet volbu, která nic nedělá.
- **Filtr se drží jen v paměti (`__faTyp`), NE v localStorage.** Zúžení „jen
  stroje" dává smysl, dokud se na strojích pracuje; uložené natrvalo by po
  týdnu vypadalo, jako by v archivu zprávy chyběly.
- Prázdný výsledek pojmenuje **obojí** („Nic neodpovídá hledání a filtru
  Stroje."), ať je jasné, co seznam vyprázdnilo.

- Test: `test-form-archiv.js` (96 kontrol — hledání neoznačí zprávu jako
  změněnou, zachování tabu, spadnutí na titulku u jiného typu, dialog
  u neuložených změn, panel mimo formulář, sbalení přes restart, zamčená
  zpráva, překryv na úzkém okně, karta v Novinkách).

**Karta v Novinkách** (v9.58, schváleno uživatelem) leží nad kartou
k měřicímu listu a má **stejné datum 2026-09-16** — na pulsování 📰 to nemá
vliv, bere se maximum. Dvě věci, na které při psaní testů narazit:

1. **Karty se v testu nesmí hledat podle indexu.** `test-ai-sken.js` čekal
   měřicí list na `karty[0]` a nová karta ho posunula. Hledá se **podle
   titulku**.
2. **Hlouběji v Novinkách (kolem 05–06/2026) mají dvě staré karty datum mimo
   pořadí.** Je to tak odjakživa a nijak nevadí; kontrola „karty jdou od
   nejnovější" proto kouká **jen na čelo seznamu**. Rovnat cizí staré karty
   při přidávání nové do toho nepatří.

## AI sken štítku psal kabel do špatného sloupce (v9.56)

`addMereniRowFromData()` a `addRcdRowFromData()` počítaly **pořadí `<input>`**
a komentář u toho **vynechával `Isc` a `Rpe`** — kabel proto padal o dva
sloupce vedle, do **„5×IΔn tvyp. ms"**. Latentní chyba: AI funkce jsou
schované přes `.ai-feature` a tlačítka se ukazují jen s API klíčem, takže se
na to nepřišlo. Našlo se to při průzkumu k měřicímu listu.

- Opraveno **stejně jako v9.55** — přes **vizuální sloupec**
  (`vyplnSloupec(tr, sloupec, hodnota)` → `fillCilovyInput`), ne přes pořadí
  polí. Tím je celá třída téhle chyby pryč: řádek obvodu má 16 polí, hlavička
  chrániče 15 (Ch./Typ je `<select>`).
- **Číslo řádku přepíše `renumberRows()`** — značka z AI („FA1") se do sloupce
  Č. neudrží, pokud má rozváděč zapnuté auto-číslování. **Je to správné
  chování**, ne chyba; test to tak i kontroluje.
- Test: `test-ai-sken.js` (19 kontrol — kam padne kabel u obvodu i u hlavičky
  chrániče, že se nic nevlije do měřených sloupců, a karta v Novinkách).

**Karta v Novinkách k měřicímu listu** (v9.56, schváleno uživatelem): dvě
staré karty k AI funkcím `data-nov-datum` **nemají odjakživa** — datum mají
jen v titulku a je nejstarší, takže pulsování 📰 neovlivní. Test proto hlídá,
aby jich nepřibývalo, místo aby vyžadoval nulu.

## Rychlé zadávání hodnot z papíru (v9.55)

Druhá půlka měřicího listu: v terénu se píše tužkou, doma se to musí dostat
do programu. Hledat buňky v sedmnáctisloupcové tabulce je otrava, proto
tlačítko **„⌨️ Rychlé zadávání"** v tabu Měření — projde **jen měřené buňky**
v tomtéž pořadí jako vytištěný list, velké pole, **Enter** skočí na další,
**Shift+Enter** zpět, **Esc** konec. U kontrol stroje **klávesy 1/2/3**.

- **Buňky se adresují přes `fillCilovyInput(tr, vizualniSloupec)`, NIKDY přes
  `querySelectorAll('input')[i]`.** Řádek obvodu má 16 polí, hlavička chrániče
  15 (Ch./Typ je `<select>`, proto ten posun) a řádky `rcd-mereni` a `info`
  mají sloučené buňky. `fillCilovyInput` počítá **vizuální** sloupec, u
  sloučené buňky vrátí `null` a **readonly pole taky přeskočí** — takže se
  procházka sama vyhne „jinému řádku" i sloupci Fáze. Nic se nemuselo
  vymýšlet, jen správně použít.
- **`RZ_JEN_RCD`** — vybavovací proud, časy a dotykové napětí se nabízejí
  **jen u chrániče**. U běžného jističe se chránič neměří a bez tohohle by to
  bylo osm stisků na obvod místo čtyř. (Vyšlo najevo až z testu.)
- Sloupce se dají vypnout stejně jako u listu; předvolba se bere ze
  `STORE.teren.sloupce`, ať papír a zadávání sedí.
- Tlačítko **NEMÁ `ro-ok`** — na rozdíl od měřicího listu zapisuje, takže se
  u dokončené zprávy musí schovat (dělá to CSS pravidlo
  `#screen-form.form-readonly .tab-panel button {display:none}`). Navíc
  `rychleZadaniOtevrit()` na začátku kontroluje `window.__formReadOnly`.
- Zápis jde přes `inp.value` + `dispatchEvent(new Event('input'))`, ať se
  nastaví `__formDirty` a rozjede autosave; u `<select>` i `change`.
- Test: `test-rychle-zadani.js` (20 kontrol — kam hodnoty opravdu spadnou
  u obvodu, u hlavičky chrániče i u podřádku, že „jiný řádek" zůstane
  nedotčený, Shift+Enter, Esc, zamčená zpráva, klávesy u strojů).

**Past v testu:** číslo řádku u „jiného řádku" vyplňuje `renumberRows`, ne
zadávání — kontrola „řádek zůstal nedotčený" se proto nesmí dívat na první
sloupec.

## Měřicí list do Excelu — vlastní zapisovač .xlsx (v9.54)

Kolega chtěl list i „exportovaný v Excelu pro případné úpravy". **`.xlsx` je
ZIP s XML uvnitř**, takže na něj stačí `zipVytvor()` z v9.42 — žádná knihovna
z CDN, funguje to i offline.

- **`zipVytvor(polozky, mime)`** — volitelný druhý parametr. Bez něj Blob dál
  vychází jako `application/zip` (hlídá `test-zip-kodu.js`).
- **`[Content_Types].xml` MUSÍ být první položka** v poli — některé starší
  čtečky soubor jinak odmítnou. `zipVytvor` pořadí zachovává.
- **Řetězce jdou do buněk jako `inlineStr`** → odpadá `sharedStrings.xml`
  a celý sešit je jeden průchod bez tabulky řetězců.
- **Číslo musí do Excelu jít jako ČÍSLO** (`xlsxJeCislo`), jinak u každé buňky
  svítí zelený roh „číslo uložené jako text" a nejde s ním počítat. Česká
  desetinná čárka se přepisuje na tečku.
- **Název listu**: Excel zakazuje `: \ / ? * [ ]`, max 31 znaků a **dva listy
  téhož jména sešit rozbijí** — dva rozváděče „RD" jsou běžná věc, proto
  `xlsxNazevListu()` duplicity přečísluje na `RD~2`.
- **Výplň 0 musí být `none` a výplň 1 `gray125`** — to OOXML vyžaduje, i když
  je nepoužiješ.
- **Řídicí znaky se z textu musí vyhodit** (`XLSX_RIDICI`) — v XML 1.0 jsou
  nepřípustné a Excel by soubor odmítl otevřít.
- `_xlnm.Print_Titles` = hlavička se opakuje na každé tištěné straně,
  `<pane state="frozen">` ji drží při rolování, `fitToWidth` ji vejde na šířku.
- **`TEREN_KOLONKY`** drží sloupce na jednom místě (vizuální index + klíč
  v datech + šířka + zda je měřený). Test hlídá, že sedí s `TEREN_MERENE`.
  V Excelu stačí jednořádková hlavička — sloučené „Jmenovité hodnoty jištění"
  by v tabulce, kde se filtruje a řadí, jen překážely.
- **`ulozitSoubor` — nový typ souboru = NOVÝ ŘÁDEK v `TYPY_SOUBORU`.** Dřív to
  byl ternár, který znal jen JSON a ZIP a **všechno ostatní nabídl jako
  `.pdf`** — Chrome by u sešitu navrhl `mericilist.pdf`.
- Test: `test-xlsx.js` (28 kontrol — soubor se **otevírá přes openpyxl**,
  ne jen rozbaluje: názvy listů, zmrazený panel, šířky, prázdné měřené buňky,
  čísla jako čísla).

**LibreOffice jako druhá čtečka nefunguje** — v kontejneru neotevře ani
referenční soubor vyrobený openpyxl (chybí Java a filtr pro xlsx). Test si to
proto **nejdřív ověří na referenčním souboru** a když LibreOffice selže i tam,
kontrolu přeskočí. Bez té kalibrace by test hlásil vadu našeho sešitu, i když
je v pořádku.

### Název souboru s háčky prohlížeč ZAHODÍ (opraveno u příležitosti v9.54)

Ověřeno v Chromiu 2026-09-16: u odkazu `<a download="Zpráva.pdf">` prohlížeč
**název zahodí celý** a soubor uloží jako `download` — **bez přípony**, takže
ho pak nic neotevře. Týká se to `Plán_revizí….pdf`, `RZ_…_Rodinný_dům_….pdf`
i JSON zprávy — všeho, co má v názvu diakritiku.

- **Projeví se to jen na náhradní cestě** `stahnoutSoubor()` — tedy na
  **telefonu, ve Firefoxu a v Safari**. Systémový dialog „Uložit jako"
  (`showSaveFilePicker`, Chrome/Edge na PC) diakritiku zvládne, tam se hezký
  název nechává.
- Opraveno v `stahnoutSoubor()` přes **`bezpecnyNazevSouboru()`** — jedno
  místo, kterým procházejí všechna stažení. Odháčkuje přes
  `normalize('NFD')` a odstranění diakritických znamének.
- **Nové názvy souborů proto nemusí řešit diakritiku** — ale ani se na to
  nesmí spoléhat u `showSaveFilePicker`, ten dostává původní název.

## Měřicí list do terénu (v9.53)

**Smysl (kolega Jiří Roubalík přes uživatele, 2026-09-15):** technici chodí
měřit s tužkou a papírem a všechny okruhy si vypisují ručně. Program tabulku
vygeneruje za ně — s vyplněnými okruhy a **prázdnými buňkami na naměřené
hodnoty**. „Stačí do programu vepsat nejdřív všechny okruhy a potom si
vygenerovat a vytisknout tabulku a jít do terénu měřit."

- **Nic se nekreslí znovu.** List je **tatáž tabulka, kterou už tiskne
  „🖨️ Tisk měření samostatně"** — `renderTiskRows()` dostala volitelný druhý
  parametr `o`. **Bez `o` musí vracet BAJT PO BAJTU totéž**, jinak se rozbije
  stávající tisk měření; hlídá to první kontrola v `test-teren-list.js`.
- `o.prazdne` = `TEREN_MERENE` (`isc, zsm, riso, rpe, vyp, cas, t5idn, ut`).
  **`faze` mezi nimi NENÍ** — polarity `A+`/`A−` se předtisknou, ať technik ví,
  co má měřit. **Pozor na `riso`:** program ho předvyplňuje hodnotou `>20`
  (ř. 7157 a 7371), takže se na listu MUSÍ vyprázdnit — jinak by technik
  přetiskl falešnou hodnotu jako naměřenou.
- `o.skryte` = vizuální indexy sloupců (0–15) k vynechání. **Colspany u řádků
  `info` (1+11+4) a `rcd-mereni` (10+5+1) se musí dopočítat**, jinak se tabulka
  rozjede. Řeší to `radek()` + `ubrat()` uvnitř funkce; test počítá šířku
  každého řádku a čeká u všech stejné číslo.
- **Nejde přes `generujPDF()`** (ta ukládá do archivu, přepíná obrazovku
  a vysype `#pdf-pages`) — vlastní obrazovka `#screen-teren-pdf` podle vzoru
  schématu rozváděčů. `showScreen('teren-pdf')` **PŘED měřením**, stránky
  s inline `min-height:0`, jinak se nikdy nic nerozdělí.
- **Stránkuje se greedy, ne odhadem počtu řádků**: řádek se přidá, změří se
  výška a když přeteče, založí se nová strana a **hlavička tabulky se
  zopakuje**. U rozváděčů je stránka na šířku (limit 190 mm uvnitř paddingu),
  u strojů na výšku (276 mm).
- U strojů se vybírá, **které stroje jde technik měřit** a jestli měření,
  kontroly, nebo obojí. **U kontrol je prázdný čtvereček ☐** místo výsledku —
  to bylo výslovné přání.
- **Minulé hodnoty** (volba, výchozí vypnuto) se berou z řetězu revizí přes
  `predchudce_uid`. Rozváděč se páruje **přes `uid`**, řádek přes
  `rowtype|název|číslo|fáze`. **Nesejde-li se to, nevytiskne se nic** — radši
  prázdno než cizí číslo.
- **Nový klíč `STORE.teren`** = čtyři místa (`STORE_KEYS`, `STORE_VYCHOZI`,
  `buildZalohaBlob()`, `obnovZeZalohy()`). Pamatuje si volby, ne výběr
  rozváděčů.
- Tlačítka mají třídu **`ro-ok`**, jinak je CSS pravidlo
  `#screen-form.form-readonly .tab-panel button {display:none}` schová
  i u dokončené zprávy.
- Test: `test-teren-list.js` (34 kontrol).

**Dvě pasti v CSS, na které to najelo:**
1. **`.f label` platí i na VNOŘENÉ popisky** (mono, VELKÁ PÍSMENA, prostrkané).
   Zaškrtávací řádky v dialogu proto mají vlastní třídu `.teren-radek`.
2. **`.f input` dává VŠEM polím `width:100%` + padding + rámeček** — ze
   zaškrtávátka se stalo pole přes celý dialog a text vytlačilo mimo. Proto
   `.teren-radek input[type=checkbox]{width:auto!important;…}`.
3. **`display` v `.teren-radek` NESMÍ mít `!important`** — přebilo by inline
   `style.display='none'`, kterým se schovává volba „minulé hodnoty".
   A test na schovanou volbu musí číst `getComputedStyle`, ne `style.display`
   (atribut se nastaví, i když prvek zůstane vidět).

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

**Převzaté zprávy od kolegů.** ⚠️ **Body 1–3 (vlastní číslování) jsou
HOTOVÉ ve v9.62** — viz oddíl „Vlastní číslování zpráv" výš. Zbývají
body 4–7, které řeší import cizí zprávy; uživatel si je nechal na potom.
Původní znění návrhu (schválen 2026-07-15):

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

10. **Další typy revize** (DM jich má 11). ✅ **Stroje hotové (v9.30),
    ✅ Spotřebiče hotové (v9.67, přepracované v9.69).** Zbývají: **Trafo, Osvětlení,
    Podlahy, Nouzové osvětlení, VN, Zdroje pro svařování,
    Zdravotní přístroje, Univerzální.** Každý typ = vlastní workflow
    (jiné taby, jiné PDF).

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
