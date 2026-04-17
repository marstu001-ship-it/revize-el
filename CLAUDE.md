# revize-el — pokyny pro Claude

## Projekt

PWA (Progressive Web App) pro tvorbu **revizních zpráv elektrických zařízení** dle české legislativy. Generuje PDF s detaily kontrol elektrických instalací.

**Stack:** čistý vanilla JS + HTML + CSS, bez build systému ani závislostí.

**Hlavní soubory:**
- `index.html` — celá aplikace (~170 KB, formuláře + logika + výstup PDF)
- `manifest.json` — PWA manifest
- `sw.js` — service worker (offline podpora)
- `revize_el_v10.html` — starší verze, needituj pokud o to uživatel nepožádá

## Znalostní báze: `literature/`

Složka `literature/` obsahuje odbornou literaturu relevantní pro revize elektro — skeny norem ČSN, předpisů (NV, zákony), příruček a metodik.

**Při jakémkoli věcném dotazu** týkajícím se:
- norem ČSN (33 2000, 33 1500, 33 1600, 33 2130, 33 2180 atd.),
- nařízení vlády, zákonů, vyhlášek o bezpečnosti elektro,
- revizních postupů, lhůt, tříd prostředí,
- terminologie z oboru revizí,

**nejdřív zkontroluj `literature/`** — zda tam není příslušný dokument. Teprve pak odpovídej z obecných znalostí, a vždy uveď, odkud informace čerpáš.

Strukturu `literature/` a jak ji číst popisuje `literature/CLAUDE.md`.

## Styl práce

- Veškeré uživatelsky viditelné texty, komentáře v dokumentaci a commit messages piš **česky**.
- Identifikátory v kódu ponechávej v existující konvenci (směs CZ/EN dle stávajícího kódu).
- Nepřidávej build systém, bundler ani závislosti — projekt je záměrně bez nich.
- Při úpravě `index.html` měř dvakrát, řež jednou — je to monolit.
