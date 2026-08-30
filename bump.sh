#!/bin/bash
# 把所有 import 的 ?v= 同步成「更新紀錄最上面那筆」的版本。
#
# 要發新版：先在 js/config.js 的 CHANGELOG 最上面加一筆（版本 + 這次改了什麼），
# 再跑這支。沒加日誌就升不了版 —— 這是刻意的。
set -e
cd "$(dirname "$0")"

NEW=$(node -e "
  const s=require('fs').readFileSync('js/config.js','utf8');
  const m=s.match(/CHANGELOG = \[\s*\{\s*v:\s*'([^']+)'/);
  if(!m){ console.error('讀不到 CHANGELOG 最上面的版本'); process.exit(1); }
  process.stdout.write(m[1]);
")
CUR=$(grep -o "app\.js?v=[0-9A-Za-z.\-]*" index.html | sed 's/.*v=//')

if [ "$CUR" = "$NEW" ]; then
  echo "版本已經是 $NEW（要發新版請先在 CHANGELOG 最上面加一筆）"
else
  # . 在 sed 裡是萬用字元，要跳脫，否則 0.4.0 會誤配到 0x4y0
  E=$(printf '%s' "$CUR" | sed 's/[.[\*^$]/\\&/g')
  sed -i '' "s/app\.js?v=$E/app.js?v=$NEW/"       index.html
  sed -i '' "s/store\.js?v=$E/store.js?v=$NEW/"   js/app.js
  sed -i '' "s/config\.js?v=$E/config.js?v=$NEW/" js/app.js js/store.js
  echo "版本 $CUR → $NEW"
fi
echo
node check.mjs
