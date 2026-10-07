# Testy programu Revize EL

Automatické testy v prohlížeči (Playwright + Chromium). **Všechna data
v testech jsou vymyšlená** — repozitář je veřejný, skutečné zprávy, jména
zákazníků ani cizí PDF sem nepatří.

## Spuštění

```bash
testy/regrese.sh                    # všechno (~30 min), na konci CELKEM ŠPATNĚ: N
testy/regrese.sh test-xlsx.js       # jen vybrané testy
```

**Vydává se jen při `CELKEM ŠPATNĚ: 0`.** Regrese se čte podle ❌, ne podle
návratového kódu — část starších testů při chybě končí nulou.

`regrese.sh` si nejdřív sám zavolá `servery.sh`, který v `testy/_beh/`
(mimo git) připraví a spustí:

| port | co |
|---|---|
| 8901 | program z pracovní kopie |
| 8902 | stará verze z gitu (`STARA=<commit>`, výchozí `HEAD`) pro `porovnani2.js` |
| 8903 | falešná CDN — `knihovny/` + prázdná písma |
| 8904 | program s odkazy na 8903 (test ZIPu zálohy kódu) |
| 8920 | v9.110 (`test-karta-stroje.js` porovnává formulář stroje) |

Porty **8905–8907** si za běhu berou `test-zip-kodu.js` a `test-sri.js`.
V session Claude Code se servery spouštějí samy (`.claude/settings.json`,
SessionStart).

## Co kde je

- `test-*.js` — jeden soubor = jedna oblast; řádky `✅` / `❌`.
- `porovnani2.js` — A/B: tatáž zpráva ve staré (8902) a nové (8901) verzi,
  text PDF znak po znaku. Hlavní záchranná síť; neodevzdané změny proti HEAD.
- `test-typy-krizem.js` — každý typ zprávy po každém jiném, každou cestou.
  **Povinný před každým vydáním.**
- `knihovny/` — skutečné jspdf a html2canvas (test SRI ověřuje otisky).
- `vstupy/` — vymyšlené sešity pro test načtení `.xlsx`.
- `_beh/` — vše, co testy vyrobí (snímky, sešity, ZIP); necommitovat.

## Prostředí

Testy čekají Playwright v `/opt/node22/lib/node_modules/playwright` a Chromium
v `/opt/pw-browsers/chromium-1194` (cloudové prostředí Claude Code), Python
s `openpyxl` a `unzip`. Jinde stačí cesty v hlavičce testu upravit.

Nový test končí `process.exit(res.some(r => r.startsWith('❌')) ? 1 : 0)`.
Když se záměrně změní chování, oprav ve stejném commitu i testy, které hlídaly
to staré.
