# literature/ — pokyny pro Claude

Tato složka je znalostní bází projektu `revize-el`. Uživatel sem nahrává
skeny odborné literatury (normy ČSN, předpisy, příručky). Tvým úkolem je
tuto literaturu využívat při odpovědích na věcné dotazy z oboru revizí elektro.

## Kategorie

- `normy/` — české technické normy (ČSN)
- `predpisy/` — nařízení vlády, zákony, vyhlášky
- `prirucky/` — příručky, metodiky, odborné publikace

## Struktura jednoho dokumentu

```
<kategorie>/<IDENTIFIKATOR>/
├── index.md          — metadata + shrnutí
├── scans/            — obrazové skeny (01.jpg, 02.jpg, …)
└── transcripts/      — markdown přepisy (01.md ↔ 01.jpg)
```

## Pravidla čtení

1. **Preferuj `transcripts/*.md` před `scans/*.jpg`.**
   Text je výrazně efektivnější pro práci s kontextem a funguje s Grep/Glob.
   Obrázek otevři jen když:
   - přepis neexistuje,
   - potřebuješ ověřit tabulku, schéma nebo detail, který v přepisu chybí,
   - uživatel výslovně chce vizuální ověření.

2. **Při věcném dotazu nejdřív prohledej `literature/`.**
   Použij `Grep` na klíčová slova (např. `Grep pattern:"33 2000-4-41" path:literature/`)
   nebo projdi `index.md` v jednotlivých podsložkách.

3. **Vždy cituj zdroj.** V odpovědi uveď konkrétní cestu, např.
   *"podle ČSN 33 2000-4-41, odd. 411.3.2 (`literature/normy/CSN-33-2000-4-41/transcripts/12.md`)"*.
   Uživatel si tak může ověřit originál.

4. **Když v `literature/` odpověď není**, řekni to explicitně a teprve pak
   odpovídej z obecných znalostí. Neodvozuj věcné údaje tak, aby to vypadalo
   jako citace z nahraných skenů.

5. **Přepisy nejsou právní stanoviska.** Při jakékoli interpretaci pro použití
   v revizní zprávě upozorni uživatele, že platí originální oficiální znění
   normy/předpisu.

## Vytváření přepisů (OCR)

Když tě uživatel požádá o přepis skenů:

1. Načti postupně obrázky `scans/01.jpg`, `02.jpg`, … (tool Read umí obrázky).
2. Pro každý sken vytvoř odpovídající `transcripts/NN.md` — zachovej číslování 1:1.
3. V přepisu zachovej:
   - nadpisy a strukturu (markdown `#`, `##`, seznamy, tabulky),
   - číslování odstavců/článků přesně jako v originále,
   - tabulky v markdown `|` formátu,
   - poznámky / výjimky jako zvláštní odstavce.
4. Pokud je v originále obrázek/schéma, kterému přepis nedá spravedlnost,
   napiš *"[Schéma: stručný popis — viz scans/NN.jpg]"*.
5. Po dokončení aktualizuj `index.md` dokumentu (zejména sekci shrnutí a seznam kapitol).
6. Aktualizuj seznam dokumentů v `literature/README.md`.

## Co NEDĚLAT

- Nepřejmenovávej existující skeny — číslování `NN.jpg` ↔ `NN.md` musí sedět.
- Nemaž originální skeny ani když máš přepis.
- Necituj normu, kterou jsi ve složce nenašel, jen proto, že si ji pamatuješ
  z obecných znalostí. Místo toho řekni: *"tato norma v literature/ zatím není nahrána"*.
