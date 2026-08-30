#!/bin/bash
# 版本加一：更新所有 import 的 ?v=N 與 config.js 的 APP_VERSION。
# 會先跑 check.mjs，沒過就不讓你升版（那些檢查每一條都對應一個真的壞過的 bug）。
set -e
cd "$(dirname "$0")"
echo "檢查中…"
node check.mjs
CUR=$(grep -o 'app\.js?v=[0-9]*' index.html | grep -o '[0-9]*$')
NEW=$((CUR + 1))
sed -i '' "s/app\.js?v=$CUR/app.js?v=$NEW/"          index.html
sed -i '' "s/store\.js?v=$CUR/store.js?v=$NEW/"      js/app.js
sed -i '' "s/config\.js?v=$CUR/config.js?v=$NEW/"    js/app.js js/store.js
sed -i '' "s/APP_VERSION = $CUR/APP_VERSION = $NEW/" js/config.js
node check.mjs > /dev/null
echo "版本 $CUR → $NEW"
