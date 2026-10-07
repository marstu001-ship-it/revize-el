#!/bin/bash
# Spustí všechny test-*.js a nahlásí KAŽDÝ problém — nespoléhá na návratový kód
# (část starších testů při ❌ končí nulou; tak proklouzl test-symboly od v9.99 do v9.104).
# Vydává se jen při „CELKEM ŠPATNĚ: 0". Jeden test: ./regrese.sh test-xlsx.js
cd "$(dirname "$0")"
./servery.sh
spatne=0
testy=${@:-test-*.js}
for t in $testy; do
  r=$(timeout 900 node "$t" 2>&1 | grep -v 'agent-proxy\|connect_rejected\|For details:' )
  ok=$(echo "$r" | grep -c '^✅'); ko=$(echo "$r" | grep -c '^❌')
  if [ "$ko" -gt 0 ] || [ "$ok" -eq 0 ] || echo "$r" | grep -q 'SELHALO\|CRASH\|Error:'; then
    spatne=$((spatne+1)); echo "✖ $t  ✅$ok ❌$ko"; echo "$r" | grep '^❌\|SELHALO\|CRASH\|Error:' | head -5
  else echo "✔ $t  $ok"; fi
done
if [ $# -eq 0 ]; then
  p=$(timeout 200 node porovnani2.js 2>&1 | tail -1); echo "$p"
  echo "$p" | grep -q IDENTICKY || spatne=$((spatne+1))
fi
echo "=== CELKEM ŠPATNĚ: $spatne ==="
exit $spatne
