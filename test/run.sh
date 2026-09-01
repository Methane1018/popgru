#!/bin/bash
# 純邏輯測試（不需要瀏覽器）。用法：./test/run.sh
set -e
cd "$(dirname "$0")/.."
TMP=$(mktemp -d)
echo '{"type":"module"}' > "$TMP/package.json"
cp js/config.js "$TMP/config.js"
sed "s|'./config.js?v=[0-9A-Za-z.\-]*'|'./config.js'|" js/store.js > "$TMP/store.js"
sed -e "s|'../js/store.js'|'./store.js'|" -e "s|'../js/config.js'|'./config.js'|" \
    test/logic.test.mjs > "$TMP/logic.test.mjs"
node "$TMP/logic.test.mjs"
rm -rf "$TMP"
