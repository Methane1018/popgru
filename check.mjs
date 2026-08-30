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
  const w = store.match(/const p = \{\s*lastSeen: F\.serverTimestamp\(\),(.*?)\.\.\.\(patch/s);
  const r = store.match(/const srv = \{(.*?)\};/s);
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
  // 這一條是關鍵：個人資料沒讀到就絕對不能寫，否則會把初始值 0 覆寫上去
  check('flush 會等個人資料載入', /if \(!state\.me\.loaded\) \{[\s\S]{0,320}?scheduleFlush\(\); return;/.test(store));
  check('寫入失敗會大聲報錯', /console\.error\(\s*`POPGRU 寫入失敗/.test(store));
  check('寫入失敗會通知畫面', /emit\('writefail'/.test(store));
  check('載入完會主動放行一次 flush', /state\.me\.loaded = true[\s\S]{0,1400}?\n      flush\(\);/.test(store));
  // 鏡像涵蓋的欄位必須跟 flush 寫回的完全一樣，否則會有欄位無人保護
  const mf = store.match(/const MIRROR_FIELDS = \[(.*?)\];/s);
  if (!mf) check('MIRROR_FIELDS 存在', false);
  else {
    const M = new Set([...mf[1].matchAll(/'(\w+)'/g)].map(m => m[1]));
    const W = new Set([...(store.match(/const p = \{\s*lastSeen: F\.serverTimestamp\(\),(.*?)\.\.\.\(patch/s) || ['',''])[1]
                        .matchAll(/(\w+):/g)].map(m => m[1]));
    const onlyW = [...W].filter(x => !M.has(x));
    const onlyM = [...M].filter(x => !W.has(x));
    check('鏡像欄位與 flush 寫回一致', !onlyW.length && !onlyM.length,
          `只寫不鏡像=${onlyW} 只鏡像不寫=${onlyM}`);
  }
  check('每次 sync 都會存鏡像', /const sync = \(\) => \{ mirrorSave\(\);/.test(store));
  // 送出中的量要記著，否則期間來的快照會用舊的伺服器數字把畫面往回拉
  check('flush 會記錄 inflight', /inflight = \{ n, fish, gold \};/.test(store));
  check('flush 結束會清掉 inflight', /inflight = \{ n:0, fish:0, gold:0 \};[\s\S]{0,120}scheduleFlush/.test(store));
  check('快照會加回未寫出的量',
        /lifetime: \(d\.lifetime\|\|0\) \+ state\.pending \+ inflight\.n/.test(store));
  check('載入時會先用本機備份墊畫面', /if \(prefillFromMirror\(\)\)/.test(store));
  // Firestore 第一份快照可能來自空的本機快取。把它當真就會把資料讀成 0
  // 再寫回伺服器，真資料就沒了 —— 這是連勝歸零的真正原因。
  // 只能擋「空的」快取快照。擋掉所有快取快照會讓正常資料也進不來，
  // 結果 state.viewing.uid 一直是 null，寫入對象變成 null。
  check('個人資料只擋空的快取快照',
        /if \(!state\.me\.loaded && !s\.exists\(\) && s\.metadata\.fromCache\) return;/.test(store));
  check('格魯只擋空的快取快照',
        /if \(!gruLoaded && !s\.exists\(\) && s\.metadata\.fromCache\) return;/.test(store));
  check('在自己家時寫入對象用自己的 uid',
        /const targetUid = v\.isMine \? \(state\.me\.uid \|\| v\.uid\) : v\.uid;/.test(store));
  check('待送匣記的是同一個對象', /outboxAdd\(me\.uid, flushTarget,/.test(store));
  check('待送匣不收空對象', /if \(!uid \|\| !target\) return;/.test(store));
  check('補送會把 null 對象算回自己', /t === 'null' \|\| t === 'undefined'/.test(store));
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
  const V = /\.js\?v=([0-9A-Za-z.\-]+)/g;
  const vs = [
    ...[...html.matchAll(V)].map(m => m[1]),
    ...[...app.matchAll(V)].map(m => m[1]),
    ...[...store.matchAll(V)].map(m => m[1]),
  ];
  const top = (cfg.match(/CHANGELOG = \[\s*\{\s*v:\s*'([^']+)'/) || [])[1];
  check('所有 import 的 ?v= 一致', new Set(vs).size === 1, vs.join(','));
  check('?v= 等於更新紀錄最上面那筆', vs[0] === top, `?v=${vs[0]} 更新紀錄=${top}`);
  check('APP_VERSION 取自更新紀錄', /APP_VERSION = CHANGELOG\[0\]\.v/.test(cfg));
}

// 7) 更新紀錄本身要合法：版本遞減、格式正確、每筆都有寫內容
{
  const entries = [...cfg.matchAll(/\{\s*v:'([^']+)',\s*date:'([^']+)',\s*notes:\[(.*?)\]\s*\}/gs)];
  check('更新紀錄至少一筆', entries.length > 0, String(entries.length));
  const semver = entries.every(e => /^\d+\.\d+\.\d+$/.test(e[1]));
  check('版本號格式都是 x.y.z', semver, entries.map(e => e[1]).join(','));
  const key = v => v.split('.').map(Number).reduce((a, n) => a * 1000 + n, 0);
  const ordered = entries.every((e, i) => i === 0 || key(entries[i - 1][1]) > key(e[1]));
  check('更新紀錄由新到舊排序', ordered, entries.map(e => e[1]).join(' > '));
  const allHaveNotes = entries.every(e => e[3].trim().length > 0);
  check('每個版本都有寫更新內容', allHaveNotes);
}

// 6) 帽子的解鎖門檻要對得上里程碑，不然進度條寫的解鎖品項是騙人的
{
  const ms = [...cfg.matchAll(/\{ at:\s*(\d+)/g)].map(m => +m[1]);
  // 只看 HATS 那一段，別把 SKINS 的 need 也算進來
  const hatsBlock = (cfg.match(/export const HATS = \[(.*?)\];/s) || ['', ''])[1];
  const needs = [...hatsBlock.matchAll(/need:\s*(\d+)/g)].map(m => +m[1]).filter(n => n > 0);
  check('帽子門檻對齊里程碑', JSON.stringify(needs) === JSON.stringify(ms),
        `帽子=${needs} 里程碑=${ms}`);

  // 外觀的門檻也必須是里程碑上真的存在的數字，不然玩家永遠解不開
  const skinsBlock = (cfg.match(/export const SKINS = \{(.*?)\n\};/s) || ['', ''])[1];
  const sNeeds = [...skinsBlock.matchAll(/need:\s*(\d+)/g)].map(m => +m[1]).filter(n => n > 0);
  const bad = [...new Set(sNeeds)].filter(n => !ms.includes(n));
  check('外觀門檻都落在里程碑上', !bad.length, `這些數字不是里程碑：${bad}`);

  // 每一類外觀都要有一款預設（cost 0），否則新玩家沒東西可用
  for (const k of ['bg', 'tint', 'font']) {
    const block = (skinsBlock.match(new RegExp(k + ':\\s*\\[(.*?)\\]', 's')) || ['', ''])[1];
    check(`外觀 ${k} 有預設款`, /cost:\s*0\b/.test(block));
  }
}

console.log(bad ? `\n${bad} 項沒過` : '\n全部通過');
process.exit(bad ? 1 : 0);
