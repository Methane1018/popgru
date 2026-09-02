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
  const w = store.match(/const p = \{\s*lastSeen: F\.serverTimestamp\(\),(.*?)\.\.\.set,/s);
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
    const W = new Set([...(store.match(/const p = \{\s*lastSeen: F\.serverTimestamp\(\),(.*?)\.\.\.set,/s) || ['',''])[1]
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
  // 這些函式都不該 await Firestore 寫入：離線時寫入會被排隊而不是失敗，
  // await 下去整個函式卡住，呼叫端的重畫也不會執行。
  for (const fn of ['setNick', 'setGruName', 'setHat', 'setSkin', 'buySkin', 'buyForSelf']) {
    const m = store.match(new RegExp('function ' + fn + '\\([^)]*\\) \\{([\\s\\S]*?)\\n\\}', 'm'));
    check(`${fn} 不 await Firestore 寫入`,
          !m || !/await\s+(fb\.)?F\.setDoc/.test(m[1]));
  }
  // 登入當下還不知道暱稱（個人資料快照未到），那時寫 ownerName 會把暱稱蓋掉
  check('onSignedIn 不寫 ownerName',
        !/setDoc\(gruRef\(uid\),\s*\{ ownerName/.test(store));
  check('有 syncOwnerName 且載入後才對齊', /function syncOwnerName\(\)/.test(store)
        && /!state\.me\.loaded\) return;[\s\S]{0,200}state\.myGru\.ownerName === want/.test(store));
  // 預覽時商店必須收起來，否則面板會把企鵝整個遮住，等於看不到預覽
  check('預覽會收起商店面板', /\$\('sheet'\)\.classList\.remove\('open'\);[\s\S]{0,200}previewVeil/.test(app));
  check('預覽罩點任何地方都能結束', /\$\('previewVeil'\)\.onclick = \(\) => exitPreview\(\)/.test(app));
  // 帽子存在 gru.hat 而不是 gru.skin，所以套用外觀一定要走 wornSkin()，
  // 直接傳 .skin 會讓帽子（和手持物的預設值）被填成 none 而消失
  check('applySkin 不直接吃 .skin',
        !/applySkin\((?:S\.)?state\.viewing\.skin\)|applySkin\(v\.skin\)/.test(app));
  check('關閉面板會收掉預覽罩',
        /function closePanel\(\) \{[\s\S]{0,200}?exitPreview\(false\)/.test(app));
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

// 3b) 面板／子畫面函式不能被呼叫卻沒有定義。
//     v0.8 刪 showHatPicker 時連著把 showGivePicker 一起刪掉，
//     「送人」整整壞了兩個版本沒人發現 —— 按下去只是靜靜地丟 ReferenceError。
{
  const defined = new Set([...app.matchAll(/function (\w+)\s*\(/g)].map(m => m[1]));
  const used = new Set([...app.matchAll(/\b((?:show|panel|draw)[A-Z]\w*)\s*\(/g)].map(m => m[1]));
  const missing = [...used].filter(n => !defined.has(n));
  check('沒有呼叫不存在的面板函式', !missing.length, String(missing));
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

// FieldValue（increment / arrayUnion）只能在 flush() 裡面組出來。
//
// 之前是在各處先做好 FieldValue 再丟進 pendPatch，而 pendPatch 是用物件展開合併的：
// 同一個 key 的第二筆會把第一筆整個蓋掉。症狀是「重壓學會了，熟練卻沒有」，
// 以及連買兩個寶物只扣到後面那一筆的錢。
// 待寫入的東西要記「意圖」（加多少、加哪些），FieldValue 等到要寫的時候才組。
{
  check('沒有殘留的 queuePatch', !/\bqueuePatch\s*\(/.test(store),
        '改用 queueInc / queueUnion / queueSet');

  // 排進佇列的一定要是「意圖」（數字、字串），不能是已經做好的 FieldValue ——
  // 那正是會被覆蓋掉的東西。（直接 b.set() 的地方用 FieldValue 沒問題。）
  const queued = [...store.matchAll(/queue(?:Inc|Set|Union)\(([^;]*?)\);/g)].map(m => m[1]);
  const bad = queued.filter(a => /F\.(increment|arrayUnion|serverTimestamp)/.test(a));
  check('排進佇列的不是 FieldValue', !bad.length, String(bad));

  // 累加型的佇列不能用覆蓋的方式合併
  check('queueInc 是相加不是覆蓋', /pendInc\[f\] = \(pendInc\[f\] \|\| 0\) \+ n/.test(store));
  check('queueUnion 用 Set 取聯集', /pendUnion\[f\] \|\|= new Set\(\)/.test(store));

  // 缺前置的技能要補得回來
  check('有 repairSkills 修補既有壞資料', /export function repairSkills/.test(store));
  check('載入後會呼叫 repairSkills', /repairStreak\(\);\s*\n\s*repairSkills\(\);/.test(store));
}

// 用 arrayUnion 寫出去的欄位，是「只增不減」的持有清單。
// 快照處理絕對不能照抄伺服器的值：從按下按鈕到 flush 真的寫進去之間最長 20 秒，
// 中間任何一次快照回音都會把剛拿到的東西抹掉。
// （v0.10.2 的症狀：學會「熟練」之後那個節點又變成可以點。）
{
  // 每次 flush 都整份送上去的持有清單。這些欄位在快照那邊一定要取聯集。
  const unioned = [...new Set(
    [...store.matchAll(/p\.(\w+)\s*=\s*F\.arrayUnion\(\.\.\.me\./g)].map(m => m[1]))];
  check('讀得到整份 union 的欄位', unioned.length > 0, String(unioned));

  const snap = (store.match(/Object\.assign\(state\.me, \{(.*?)\n    \}\);/s) || ['',''])[1];
  const clobbered = unioned.filter(f =>
    new RegExp(`${f}:\\s*Array\\.isArray\\(d\\.${f}\\)`).test(snap));
  check('持有清單不會被快照照抄覆蓋', !clobbered.length,
        `${clobbered} 應該用 mergeOwned() 取聯集`);

  const merged = unioned.filter(f => new RegExp(`${f}:\\s*mergeOwned\\(`).test(snap));
  check('持有清單都用 mergeOwned 合併', merged.length === unioned.length,
        `少了 ${unioned.filter(f => !merged.includes(f))}`);
}

// 開頁時 prefillFromMirror() 會把會員的累計數字填進 state.me（免得畫面閃 0），
// 但那時候 Firebase 認證還沒回來，mode 還是 'guest'。
// 少了 mirroredMe 這道閘，那個空檔裡的任何一次 saveGuest() 都會把
// 會員的數字存成訪客進度 —— 認證一回來就被當成新玩家的成果補算，
// 每次重整白拿 guestMaxClaim 下（真的發生過，小圈子總數被灌到十萬）。
{
  check('有 mirroredMe 旗標', /let mirroredMe = false/.test(store));
  check('prefill 之後會標記', /mirroredMe = true/.test(store));
  check('saveGuest 會擋掉會員數字', /if \(mirroredMe\) return;/.test(store));
  check('回訪客身分會清掉標記',
        /function applyGuest\(\) \{\s*\n\s*mirroredMe = false/.test(store));
  // 就算上面全破了，一個帳號也只能補算一次
  check('補算前會檢查有沒有蓋過章', /claimedGuestAt/.test(store)
        && /if \(u\.exists\(\) && u\.data\(\)\.claimedGuestAt\)/.test(store));
  check('補算時會蓋章', /claimedGuestAt: F\.serverTimestamp\(\)/.test(store));
}

// 彩蛋只能靠人手動做出來。自動液壓機會一直壓，
// 如果它也會觸發彩蛋，「一鏡到底」之類的條件就自己完成了。
{
  check('自動壓不會觸發彩蛋', /if \(!auto\) checkEggs\(/.test(app));
  check('checkEggs 只有一個呼叫點',
        (app.match(/checkEggs\(/g) || []).length === 2, '一個定義一個呼叫');
  check('自動壓走的是 press(null, true)', /press\(null, true\)/.test(app));

  // 每個彩蛋都要寫得出「拿到之後怎麼來的」，不然不知不覺解鎖的人會一頭霧水
  const block = (cfg.match(/export const TREASURES = \[(.*?)\n\];/s) || ['',''])[1];
  const eggs = block.split(/(?=\{ id:')/).filter(b => /source:'egg'/.test(b));
  const noHow = eggs.filter(b => !/how:'/.test(b)).map(b => (b.match(/id:'(\w+)'/) || [])[1]);
  check('每個彩蛋都有 how', !noHow.length, String(noHow));

  // 彩蛋自成一級，畫面上的級別一律走 tagOf()。
  // 直接讀 RARITY[...].name / .color 就會漏掉彩蛋 ——
  // 只要有一個地方忘了換，彩蛋的難度就從那裡洩漏出去。
  check('彩蛋有專用標記', /export const EGG_TAG/.test(cfg));
  check('有 tagOf 統一畫面上的級別', /export const tagOf/.test(cfg));
  const leaks = [...app.matchAll(/RARITY\[[^\]]+\]\.(name|color)/g)].map(m => m[0]);
  check('畫面上的級別都走 tagOf', !leaks.length, `直接讀了 ${[...new Set(leaks)]}`);
}

// nav 的按鈕是「圖示 <i> ＋ 標籤 <em>」兩層。
// 對它們直接寫 .textContent 會把兩個 span 一起洗掉，按鈕就只剩一個字，
// 而且只有在「有未讀信」或「按了靜音」之後才看得到 —— 典型的靜默故障。
{
  const nav = (html.match(/<nav class="nav">(.*?)<\/nav>/s) || ['',''])[1];
  const ids = [...nav.matchAll(/id="(\w+)"/g)].map(m => m[1]);
  check('讀得到 nav 按鈕', ids.length > 0, String(ids.length));

  const parts = nav.split(/(?=<button)/).filter(x => x.includes('<button'));
  const noSpans = parts.filter(b => !/<i>/.test(b) || !/<em>/.test(b))
                       .map(b => (b.match(/id="(\w+)"/) || [])[1]);
  check('每個 nav 按鈕都有圖示與標籤', !noSpans.length, String(noSpans));

  const clobbered = ids.filter(id =>
    new RegExp(`\\$\\('${id}'\\)\\.textContent\\s*=`).test(app));
  check('沒有人直接覆寫 nav 按鈕的 textContent', !clobbered.length,
        `${clobbered} 會把圖示和標籤一起洗掉`);
}

// 每個 MIRROR_FIELDS 欄位都必須在 blankMe() 有預設值，也必須出現在 srv。
// 少了預設值，舊裝置的鏡像就會缺那個鍵 → state.me 收到 undefined
// → Firestore 整批拒絕 → 所有寫入停擺，而畫面上完全看不出來。
// （v0.10.0 的 magicDay 就是這樣把所有人的寫入卡住的。）
{
  const mf = ((store.match(/const MIRROR_FIELDS = \[(.*?)\];/s) || ['',''])[1]
              .match(/'(\w+)'/g) || []).map(x => x.replace(/'/g, ''));
  const blank = (store.match(/const blankMe = \(\) => \(\{(.*?)\}\);/s) || ['',''])[1];
  const srv   = (store.match(/const srv = \{(.*?)\};/s) || ['',''])[1];

  check('讀得到 MIRROR_FIELDS', mf.length > 0, String(mf.length));
  const noDefault = mf.filter(f => !new RegExp('\\b' + f + '\\s*:').test(blank));
  check('鏡像欄位都在 blankMe 有預設值', !noDefault.length, String(noDefault));
  const noSrv = mf.filter(f => !new RegExp('\\b' + f + '\\s*:').test(srv));
  check('鏡像欄位都在 srv 有對應', !noSrv.length, String(noSrv));

  // 挑選鏡像欄位時一定要擋 undefined，不能直接 mir[f]
  check('pickMirror 有擋 undefined',
        /export function pickMirror/.test(store) && /=== undefined/.test(store));
  // flush 的保險絲：寫出去之前把 undefined 清掉
  check('flush 寫出前會清掉 undefined',
        /是 undefined，這次先跳過它/.test(store));
}

// ── 技能樹 ──────────────────────────────────────────────────────────────
{
  const block = (cfg.match(/export const SKILLS = \[(.*?)\n\];/s) || ['',''])[1];
  const nodes = [...block.matchAll(
    /id:'(\w+)',\s*axis:'(\w+)',\s*tier:(\d+),\s*cost:(\d+)/g)]
    .map(m => ({ id:m[1], axis:m[2], tier:+m[3], cost:+m[4] }));

  check('讀得到技能節點', nodes.length > 0, String(nodes.length));

  // 每個節點一定要有效果。沒有的話按下去什麼都不會發生，
  // 而且畫面上看不出來 —— 這正是「送人」按鈕壞掉兩個版本的那一類故障。
  const bodies = block.split(/(?=\{ id:')/).filter(x => x.includes("id:'"));
  const noEffect = bodies.filter(b => !/buff:\s*\{/.test(b) && !/grants:'/.test(b))
                         .map(b => (b.match(/id:'(\w+)'/) || [])[1]);
  check('每個技能都有效果（buff 或 grants）', !noEffect.length, String(noEffect));

  // grants 是「權限」字串，一定要有程式碼真的去問它。
  // 少了這條，就會出現一個點得下去、但什麼也不會發生的大招。
  const granted = [...block.matchAll(/grants:'(\w+)'/g)].map(m => m[1]);
  const asked = new Set([
    ...[...(app + store).matchAll(/grants\(['"](\w+)['"]\)/g)].map(m => m[1]),
    ...[...cfg.matchAll(/needs:'(\w+)'/g)].map(m => m[1]),
  ]);
  const dead = granted.filter(g => !asked.has(g));
  check('每個 grants 都真的有程式碼在用', !dead.length, `沒人問過：${dead}`);

  // 反過來也要成立：問了一個沒有任何技能給得出來的權限 = 永遠拿不到
  const askedOnly = [...asked].filter(a => !granted.includes(a));
  check('問到的權限都有技能給得出來', !askedOnly.length, `沒有技能給：${askedOnly}`);

  // 稀有度的 needs 必須對得上某個技能的 grants，
  // 否則那一級寶物就是「永遠不會掉」而不是「後期解鎖」
  const needs = [...cfg.matchAll(/needs:'(\w+)'/g)].map(m => m[1]);
  check('稀有度的門檻都有技能解得開',
        needs.every(n => granted.includes(n)), String(needs.filter(n => !granted.includes(n))));

  // 每軸的層級要是連續的 1..N，中間缺一層就會永遠卡住點不下去
  const axes = [...new Set(nodes.map(n => n.axis))];
  for (const a of axes) {
    const t = nodes.filter(n => n.axis === a).map(n => n.tier).sort((x,y) => x-y);
    check(`技能軸 ${a} 的層級連續`, t.every((v,i) => v === i+1), t.join(','));
  }

  // 三條軸花費相同，才不會有哪一條先天划算
  const costs = axes.map(a => nodes.filter(n => n.axis === a).reduce((s,n) => s+n.cost, 0));
  check('每條軸的總花費相同', new Set(costs).size === 1, costs.join('/'));

  // 每個軸都要在 AXES 裡有定義（名稱、顏色、說明），否則面板會畫出 undefined
  const axDef = (cfg.match(/export const AXES = \{(.*?)\n\};/s) || ['',''])[1];
  const missing = axes.filter(a => !new RegExp('\\b' + a + ':').test(axDef));
  check('每條軸都有 AXES 定義', !missing.length, String(missing));

  // 「壓出來的」技能點不該夠點滿整棵樹 —— 要走哪條路必須是一個真的選擇。
  // （金魚換點是後期的加速閥，刻意不算在這條裡面。）
  const steps = ((cfg.match(/export const SP_STEPS = \[(.*?)\];/s) || ['',''])[1]
                 .match(/\d+/g) || []).length;
  const miles = ((cfg.match(/export const MILESTONES = \[(.*?)\n\];/s) || ['',''])[1]
                 .match(/at:/g) || []).length;
  const treeCost = nodes.reduce((s,n) => s+n.cost, 0);
  check('壓出來的技能點不夠點滿整棵樹', steps + miles < treeCost, `${steps + miles} vs ${treeCost}`);

  // 技能的 buff.kind 要真的有人查詢，不然那個數值是白寫的
  const kinds = [...block.matchAll(/buff:\s*\{ kind:'(\w+)'/g)].map(m => m[1]);
  const queried = new Set([...store.matchAll(/buffOf\('(\w+)'\)/g)].map(m => m[1]));
  const unused = [...new Set(kinds)].filter(k => !queried.has(k));
  check('技能的 buff kind 都有人查詢', !unused.length, String(unused));
}

console.log(bad ? `\n${bad} 項沒過` : '\n全部通過');
process.exit(bad ? 1 : 0);
