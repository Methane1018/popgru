#!/bin/bash
# 版本加一：更新所有 import 上的 ?v=N，以及 config.js 的 APP_VERSION。
# 推之前跑一次，朋友重新整理就會拿到整套新檔案，不會半新半舊。
set -e
cd "$(dirname "$0")"
CUR=$(grep -o 'app\.js?v=[0-9]*' index.html | grep -o '[0-9]*$')
NEW=$((CUR + 1))
sed -i '' "s/app\.js?v=$CUR/app.js?v=$NEW/"                index.html
sed -i '' "s/store\.js?v=$CUR/store.js?v=$NEW/"            js/app.js
sed -i '' "s/config\.js?v=$CUR/config.js?v=$NEW/"          js/app.js js/store.js
sed -i '' "s/APP_VERSION = $CUR/APP_VERSION = $NEW/"       js/config.js
echo "版本 $CUR → $NEW"
