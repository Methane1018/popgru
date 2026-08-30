#!/bin/bash
# 把所有 import 路徑上的 ?v=N 加一。
# 推之前跑一次，朋友重新整理就一定拿到整套新檔案，不會出現
# 「新的 HTML 配舊的 JS」這種半新半舊的壞掉狀態。
set -e
cd "$(dirname "$0")"
CUR=$(grep -o 'app\.js?v=[0-9]*' index.html | grep -o '[0-9]*$')
NEW=$((CUR + 1))
sed -i '' "s/app\.js?v=$CUR/app.js?v=$NEW/"       index.html
sed -i '' "s/store\.js?v=$CUR/store.js?v=$NEW/"   js/app.js
sed -i '' "s/config\.js?v=$CUR/config.js?v=$NEW/" js/app.js js/store.js
echo "版本 $CUR → $NEW"
grep -o '\.js?v=[0-9]*' index.html js/app.js js/store.js
