// 出貨前的靜態一致性檢查。
// 這裡每一條都對應一個真的發生過、而且靜悄悄壞掉的 bug。
// 用法：node check.mjs   （bump.sh 會自動跑，沒過就不讓你升版）
import { readFileSync } from 'fs';

const app   = readFileSync('js/app.js', 'utf8');
const store = readFileSync('js/store.js', 'utf8');
const cfg   = readFileSync('js/config.js', 'utf8');
const html  = readFileSync('index.html', 'utf8');

let bad = 0;
const check = (name, ok, detail = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${name}${ok ? '' : '  ← ' + detail}`);
  if (!ok) bad++;
};

// 1) flush() 寫回的絕對欄位，必須跟第一次快照讀進來的欄位一字不差。
//    少一邊就會出現「幫忙額度自己跳回 300」「連續天數歸零」。
{
  const w = store.match(/if \(me\.loaded\) Object\.assign\(p, \{(.*?)\}\);/s);
  const r = store.match(/if \(first\) \{\s*Object\.assign\(state\.me, \{(.*?)\}\);/s);
  if (!w || !r) check('flush 與快照的絕對欄位區塊都存在', false, '找不到其中一段');
  else {
    const W = new Set([...w[1].matchAll(/(\w+):/g)].map(m => m[1]));
    const R = new Set([...r[1].matchAll(/(\w+):/g)].map(m => m[1]));
    const onlyW = [...W].filter(x => !R.has(x));
    const onlyR = [...R].filter(x => !W.has(x));
    check('絕對欄位：寫回與讀入一致', !onlyW.length && !onlyR.length,
          `只寫不讀=${onlyW} 只讀不寫=${onlyR}`);
  }
  const n = (store.match(/state\.me\.loaded = true/g) || []).length;
  check('me.loaded 恰好被設 true 一次', n === 1, `${n} 次`);
}

// 2) 待送匣讀寫格式要對得上（曾經一邊寫舊格式、一邊讀新格式，補送整個失效）
check('待送匣：outboxAdd 用 items', store.includes('o.items[target] = it;'));
check('待送匣：outboxSettle 用 items', store.includes('!o.items[target]'));
check('待送匣：recoverOutbox 用 items', store.includes('Object.keys(o.items || {})'));
check('待送匣：能讀舊格式', store.includes('if (!o.items && o.target)'));

// 3) 從 config 匯入的名稱，config 一定要有匯出（gName 那次就是漏了宣告）
{
  const exported = new Set([...cfg.matchAll(/export const (\w+)/g)].map(m => m[1]));
  for (const [file, src] of [['app.js', app], ['store.js', store]]) {
    const m = src.match(/import \{([^}]+)\} from '\.\/config\.js/s);
    const names = m ? m[1].split(',').map(x => x.trim()).filter(Boolean) : [];
    const missing = names.filter(n => !exported.has(n));
    check(`${file} 匯入的名稱 config 都有匯出`, !missing.length, String(missing));
  }
}

// 4) app.js 取用的每個 DOM id，index.html 都要有
{
  const have = new Set([...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]));
  const want = new Set([...app.matchAll(/\$\('([^']+)'\)/g)].map(m => m[1]));
  const missing = [...want].filter(x => !have.has(x));
  check('app.js 用到的 id 都存在於 index.html', !missing.length, String(missing));
}

// 5) 版本標記四處要一致，否則同一個模組會被載入兩份、各有各的 state
{
  const vs = [
    ...[...html.matchAll(/\.js\?v=(\d+)/g)].map(m => m[1]),
    ...[...app.matchAll(/\.js\?v=(\d+)/g)].map(m => m[1]),
    ...[...store.matchAll(/\.js\?v=(\d+)/g)].map(m => m[1]),
  ];
  const appv = (cfg.match(/APP_VERSION = (\d+)/) || [])[1];
  check('所有 import 的 ?v= 一致', new Set(vs).size === 1, vs.join(','));
  check('APP_VERSION 與 ?v= 相同', vs[0] === appv, `?v=${vs[0]} APP_VERSION=${appv}`);
}

// 6) 帽子的解鎖門檻要對得上里程碑，不然進度條寫的解鎖品項是騙人的
{
  const needs = [...cfg.matchAll(/need:\s*(\d+)/g)].map(m => +m[1]).filter(n => n > 0);
  const ms = [...cfg.matchAll(/\{ at:\s*(\d+)/g)].map(m => +m[1]);
  check('帽子門檻對齊里程碑', JSON.stringify(needs) === JSON.stringify(ms),
        `帽子=${needs} 里程碑=${ms}`);
}

console.log(bad ? `\n${bad} 項沒過` : '\n全部通過');
process.exit(bad ? 1 : 0);
