# Odborná literatura pro revize elektro

Znalostní báze pro projekt `revize-el`. Obsahuje naskenované normy ČSN, předpisy
a příručky, ze kterých Claude čerpá při odpovědích na věcné dotazy z oboru.

## Struktura

```
literature/
├── normy/       — normy ČSN (ČSN 33 2000, 33 1500, 33 1600, 33 2130, 33 2180 …)
├── predpisy/    — nařízení vlády, zákony, vyhlášky
└── prirucky/    — příručky, metodiky, odborné publikace
```

## Konvence pro jeden dokument

Každý dokument má vlastní podsložku pojmenovanou podle čísla / identifikátoru.
Uvnitř:

```
literature/normy/CSN-33-2000-4-41/
├── index.md          — metadata (název, vydání, rozsah, krátké shrnutí)
├── scans/            — originální skeny, číslované 01.jpg, 02.jpg, …
└── transcripts/      — markdown přepisy stránek, 01.md odpovídá 01.jpg, …
```

`index.md` by měl obsahovat:
- oficiální název a číslo dokumentu,
- rok vydání / aktuálnost,
- stručné shrnutí rozsahu (2–5 vět),
- seznam klíčových pojmů / kapitol,
- zdroj (odkud sken pochází, pokud není důvěrné).

## Jak přidat nový dokument

1. Naskenujte stránky v čitelném rozlišení (doporučeno ≥ 200 DPI, JPG nebo PNG).
2. Vytvořte podsložku pod vhodnou kategorií (`normy/`, `predpisy/`, `prirucky/`).
3. Soubory pojmenujte pořadím: `01.jpg`, `02.jpg`, … (max. 2 číslice, doplňte nulou).
4. Do `index.md` doplňte metadata (viz výše).
5. Volitelně požádejte Claude: *"přepiš skeny v literature/normy/XY do transcripts/"* —
   Claude přečte obrázky a vytvoří markdown přepisy. Text v markdownu je pro Claude
   efektivnější než obrázky a umožňuje fulltextové vyhledávání.
6. Commit + push.

## Dostupnost napříč Claude prostředími

- **Claude Code (toto prostředí):** Čte repo přímo. `CLAUDE.md` v kořeni ho upozorní
  na existenci `literature/`. Není potřeba nic dalšího.

- **Claude.ai (web / Projects):** Claude nečte GitHub automaticky. Postup:
  1. Stáhněte repo jako ZIP (nebo jen složku `literature/`).
  2. V Claude.ai otevřete Project → *Project knowledge* → *Add content* → nahrajte soubory.
  3. Zkopírujte obsah root `CLAUDE.md` a `literature/CLAUDE.md` do *Project instructions*.

- **Claude "coworker":** Stejný postup jako web Projects — nahrát jako přílohy /
  project knowledge.

## Aktuálně dostupné dokumenty

- [LPE-vzory-revize-VEZ](prirucky/LPE-vzory-revize-VEZ/index.md) — *Možné vzory zprávy o revizi VEZ* (Macháček, Dolenský / LPE). Skeny 4 šablon: bytová jednotka, rodinný dům, výrobní objekt, LPS.

Jakmile přidáte nový dokument, doplňte do tohoto seznamu řádek ve formátu:
`- [CSN-33-2000-4-41](normy/CSN-33-2000-4-41/index.md) — Ochrana před úrazem elektrickým proudem`

## Právní upozornění

Skeny jsou uloženy jako pracovní reference pro tvorbu revizních zpráv.
Claude z přepisů **neposkytuje právní stanoviska**. Při jakémkoli použití v revizní
zprávě vždy ověřte údaje v originálním oficiálním znění normy či předpisu.
