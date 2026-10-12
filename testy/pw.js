// Najde Playwright — cesta se mezi prostředími Claude Code liší
// (/opt/node-tools, /opt/node22/…). Testy ho berou přes require('./pw').
const kandidati = [
  '/opt/node-tools/node_modules/playwright-core',
  '/opt/node22/lib/node_modules/playwright/node_modules/playwright-core',
  'playwright-core', 'playwright',
];
let pw = null;
for (const k of kandidati) { try { pw = require(k); break; } catch (e) { /* další */ } }
if (!pw) throw new Error('Playwright nenalezen — doplňte cestu do testy/pw.js');
module.exports = pw;
