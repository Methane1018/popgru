// 純邏輯測試：訪客模式（不碰 Firebase）
const mem = new Map();
globalThis.localStorage = {
  getItem: k => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: k => mem.delete(k),
  clear: () => mem.clear(),
};

// 寶物掉落是整包程式裡唯一用到亂數的地方。不把它固定住，
// 「壓 50 下應該有 50 條魚」這種測試就有大約四成機率
// 因為隨機掉到一個帶魚增益的寶物而變紅 ——
// 這正是它偶爾會失敗、卻怎麼也重現不出來的原因。
let RND = 1;                          // 1 = 永遠不掉寶；要測掉落時再調低
const setRandom = v => { RND = v; };
Math.random = () => RND;

const S = await import('../js/store.js');
const { TUNING } = await import('../js/config.js');
const cfgSync = await import('../js/config.js');

let pass = 0, fail = 0;
const ok = (name, cond, extra='') => {
  (cond ? pass++ : fail++);
  console.log(`${cond ? 'PASS' : 'FAIL'} :: ${name}${cond ? '' : '  ← ' + extra}`);
};
const yesterday = () => { const d = new Date(); d.setDate(d.getDate()-1); return S.dayStr(d); };
const daysAgo   = n => { const d = new Date(); d.setDate(d.getDate()-n); return S.dayStr(d); };

await S.init();
ok('init → 訪客模式', S.state.mode === 'guest', S.state.mode);
ok('預設格魯叫格魯', S.state.myGru.name === '格魯', S.state.myGru.name);
ok('一開始在自己家', S.state.viewing.isMine === true);

// --- 基本計分 ---
const r1 = S.squash();
ok('第一下計分', r1.counted === true);
ok('第一下拿到魚', r1.gained === TUNING.fishPerSquash, String(r1.gained));
ok('連續天數 → 1', S.state.me.streak === 1, String(S.state.me.streak));
ok('自己的格魯 +1', S.state.myGru.squashes === 1, String(S.state.myGru.squashes));
ok('訪客不計入小圈子', S.state.global.squashes === 0, String(S.state.global.squashes));

for (let i = 0; i < 49; i++) S.squash();
ok('壓 50 下累計正確', S.state.me.lifetime === 50, String(S.state.me.lifetime));
ok('魚 = 50', S.state.me.fish === 50, String(S.state.me.fish));
ok('格魯總數 = 50', S.state.myGru.squashes === 50, String(S.state.myGru.squashes));

// --- 存檔 ---
ok('訪客進度有存進 localStorage', JSON.parse(mem.get('popgru.guest')).lifetime === 50);

// --- 連續天數：昨天玩過 → 今天 +1 ---
S.state.me.lastDay = yesterday();
S.state.me.streak = 5;
const r2 = S.squash();
ok('昨天有玩 → 連續天數 +1', S.state.me.streak === 6, String(S.state.me.streak));
ok('回報 continue 事件', r2.streakEvent?.kind === 'continue', JSON.stringify(r2.streakEvent));
ok('跨日後今日計數歸零再累加', S.state.me.todayCount === 1, String(S.state.me.todayCount));

// --- 連續天數：斷了 ---
S.state.me.lastDay = daysAgo(3);
S.state.me.streak = 10;
S.state.me.freezes = 0;
const r3 = S.squash();
ok('中斷 3 天且沒凍結卡 → 重新算', S.state.me.streak === 1, String(S.state.me.streak));
ok('回報 broken 事件', r3.streakEvent?.kind === 'broken', JSON.stringify(r3.streakEvent));

// --- 凍結卡救回 ---
S.state.me.lastDay = daysAgo(3);   // 漏掉 2 天
S.state.me.streak = 10;
S.state.me.freezes = 3;
const r4 = S.squash();
ok('凍結卡保住連續天數', S.state.me.streak === 11, String(S.state.me.streak));
ok('用掉 2 張凍結卡', S.state.me.freezes === 1, String(S.state.me.freezes));
ok('回報 frozen 事件', r4.streakEvent?.kind === 'frozen', JSON.stringify(r4.streakEvent));

// --- 凍結卡不夠 ---
S.state.me.lastDay = daysAgo(5);   // 漏掉 4 天
S.state.me.streak = 20;
S.state.me.freezes = 1;
S.squash();
ok('凍結卡不夠 → 還是斷了，且不亂扣', S.state.me.streak === 1 && S.state.me.freezes === 1,
   `streak=${S.state.me.streak} freezes=${S.state.me.freezes}`);

// --- 雙倍魚 ---
S.state.me.double = 2;
const fishBefore = S.state.me.fish;
S.squash(); S.squash(); S.squash();
ok('雙倍魚：2 下加倍 + 1 下正常 = 5 條', S.state.me.fish - fishBefore === 5,
   String(S.state.me.fish - fishBefore));
ok('雙倍次數用完歸零', S.state.me.double === 0, String(S.state.me.double));

// --- 每日上限（預設關閉） ---
ok('每日上限預設關閉', TUNING.dailyCap === 0);
S.state.me.todayCount = 999999;
ok('關閉時壓再多都計分', S.squash().counted === true);

// --- 每日上限（開啟時） ---
TUNING.dailyCap = 5;
S.state.me.lastDay = yesterday();
S.state.me.todayCount = 0;
let counted = 0;
for (let i = 0; i < 8; i++) if (S.squash().counted) counted++;
ok('上限 5 → 只算 5 下', counted === 5, String(counted));
const capped = S.squash();
ok('超過上限回報 capped', capped.capped === 'daily' && capped.counted === false, JSON.stringify(capped));
TUNING.dailyCap = 0;

// --- 金魚 ---
TUNING.goldfishOdds = 3;
const goldBefore = S.state.me.goldfish;
let gotGold = false;
for (let i = 0; i < 12; i++) if (S.squash().goldfish) gotGold = true;
ok('金魚會依機率掉落', gotGold && S.state.me.goldfish > goldBefore,
   `gold=${S.state.me.goldfish}`);

// --- 幫忙壓（訪客模式下不會寫別人家，但狀態要對） ---
S.state.viewing = { uid:'someone', name:'小明的格魯', ownerName:'小明', squashes:100, isMine:false };
const r5 = S.squash();
ok('幫別人壓標記 helping', r5.helping === true);
ok('幫別人壓也算自己的累計', r5.counted === true);
ok('別人的格魯數字 +1', S.state.viewing.squashes === 101, String(S.state.viewing.squashes));

// --- helpCap ---
// 先清掉寶物：🔥 一週皆勤／🧭 羅盤 會加寬幫忙額度，那是正確行為，
// 但會讓這個「上限 2」的測試失去意義
S.state.me.treasures = [];
TUNING.helpCap = 2;
S.state.me.helpDay = S.dayStr();
S.state.me.helpToday = 0;
let helped = 0;
for (let i = 0; i < 5; i++) if (S.squash().counted) helped++;
ok('helpCap 只限制幫忙的次數', helped === 2, String(helped));
S.state.viewing = { ...S.state.myGru, isMine:true };
ok('回自己家不受 helpCap 限制', S.squash().counted === true);
TUNING.helpCap = 0;

// --- 日期工具 ---
ok('dayDiff 正確', S.dayDiff('2026-08-27','2026-08-30') === 3);
ok('今天玩過 → streak 還活著', S.streakAlive(S.dayStr()) === true);
ok('昨天玩過 → streak 還活著', S.streakAlive(yesterday()) === true);
ok('三天前 → streak 已斷', S.streakAlive(daysAgo(3)) === false);

// ─────────────────────────── 寶物與圖鑑 ───────────────────────────
const { TREASURES, treasureInfo } = await import('../js/config.js');
S.state.me.treasures = [];
S.state.me.helped = {};
S.state.me.giftsReceived = 0;

ok('寶物共 30 個', TREASURES.length === 30, String(TREASURES.length));
ok('每個寶物都有增益', TREASURES.every(t => t.buff && t.buff.kind));
ok('每個寶物都有提示', TREASURES.every(t => t.hint && t.hint.length > 2));
ok('沒有重複的 id', new Set(TREASURES.map(t => t.id)).size === TREASURES.length);

ok('一開始沒有任何寶物', S.buffOf('fish') === 0 && !S.hasTreasure('sweat'));
S.unlockTreasure('sweat', true);
ok('解鎖後有了', S.hasTreasure('sweat'));
ok('增益生效', Math.abs(S.buffOf('fish') - 0.02) < 1e-9, String(S.buffOf('fish')));
ok('重複解鎖沒有副作用', S.unlockTreasure('sweat', true) === false
   && S.state.me.treasures.length === 1);
S.unlockTreasure('shell', true);                       // 貝殼 +5%
ok('同一條軸會相加', Math.abs(S.buffOf('fish') - 0.07) < 1e-9, String(S.buffOf('fish')));
ok('別條軸不受影響', S.buffOf('drop') === 0);
S.unlockTreasure('down', true);                        // 絨毛 掉落 +20%
ok('不同軸各自累積', Math.abs(S.buffOf('drop') - 0.20) < 1e-9);
ok('不存在的 id 不會解鎖', S.unlockTreasure('nope', true) === false);

// 成就用既有欄位判定
S.state.me.treasures = [];
S.state.me.lifetime = 0; S.state.me.streak = 0;
ok('條件沒到不會給', S.checkAchievements().length === 0);
S.state.me.lifetime = 1;
ok('★ 壓第一下解鎖「第一下」', S.checkAchievements().some(t => t.id === 'first'));
S.state.me.lifetime = 1000;
ok('★ 千下解鎖「千錘百鍊」', S.checkAchievements().some(t => t.id === 'k1'));
S.state.me.streak = 7;
ok('★ 連續七天解鎖', S.checkAchievements().some(t => t.id === 'week'));
ok('已解鎖的不會重複給', S.checkAchievements().length === 0);
S.state.me.helped = { a:5, b:5, c:5 };
ok('★ 幫過三個人解鎖「好鄰居」', S.checkAchievements().some(t => t.id === 'nb3'));
ok('helpedCount 正確', S.helpedCount() === 3, String(S.helpedCount()));
S.state.me.helped = { a:5, b:5, c:5, d:5, e:5 };
ok('★ 幫過五個人解鎖「街坊」', S.checkAchievements().some(t => t.id === 'nb5'));
S.state.global.squashes = 100000;
ok('★ 小圈子破十萬解鎖', S.checkAchievements().some(t => t.id === 'mt100k'));

// 幫忙額度會被寶物加寬
S.state.me.treasures = [];
TUNING.helpCap = 100;
ok('沒寶物時額度就是設定值', S.helpCapNow() === 100, String(S.helpCapNow()));
S.unlockTreasure('compass', true);                     // 羅盤 +50
ok('★ 羅盤讓額度變 150', S.helpCapNow() === 150, String(S.helpCapNow()));
S.unlockTreasure('nb3', true);                         // 好鄰居 +40
ok('★ 多個寶物相加 = 190', S.helpCapNow() === 190, String(S.helpCapNow()));
TUNING.helpCap = 0;
ok('額度關閉時寶物不會硬開', S.helpLeft() === Infinity);
S.state.me.treasures = [];

/* ------------------------------------------------------------- 技能樹 -- */
const { SKILLS, AXES, SP_STEPS, RARITY } = await import('../js/config.js');

S.state.me.skills = []; S.state.me.treasures = []; S.state.me.lifetime = 0;
ok('一開始沒有技能點', S.spTotal() === 0, String(S.spTotal()));

S.state.me.lifetime = SP_STEPS[0];
ok('★ 過第一個門檻拿到 1 點', S.spTotal() === 1, String(S.spTotal()));
S.state.me.lifetime = 1000;                    // 門檻 500 + 里程碑 1000
ok('★ 里程碑也給點', S.spTotal() === 2, String(S.spTotal()));

S.state.me.lifetime = 10 ** 9;                 // 全部拿好拿滿
const maxSp = S.spTotal(), treeCost = SKILLS.reduce((n, s) => n + s.cost, 0);
ok('★ 技能點永遠不夠點滿整棵樹', maxSp < treeCost, `${maxSp} vs ${treeCost}`);

// 順序：不能跳級
ok('★ 不能跳過第一層直接學第二層', !S.canLearn('press2'), S.skillBlock('press2'));
S.learnSkill('press1');
ok('學會第一層', S.hasSkill('press1'));
ok('學會後就能學第二層', S.canLearn('press2'));
ok('不能重複學', !S.canLearn('press1'), S.skillBlock('press1'));

// 效果要疊進 buffOf
// learnSkill() 會順手檢查成就，而成就會解鎖有 fish 增益的寶物。
// 量技能效果之前一定要把寶物清掉，不然量到的是成就不是技能。
S.state.me.skills = [];
S.learnSkill('press1');                        // 熟練 +10%
S.state.me.treasures = [];                     // ← 清掉剛剛順手解鎖的成就
ok('★ 技能效果疊進 buffOf', Math.abs(S.buffOf('fish') - 0.10) < 1e-9,
   String(S.buffOf('fish')));
S.state.me.treasures = ['sweat'];              // 汗珠 +2%
ok('★ 技能與寶物相加', Math.abs(S.buffOf('fish') - 0.12) < 1e-9,
   String(S.buffOf('fish')));
S.state.me.treasures = [];

// 幫忙額度
TUNING.helpCap = 100; S.state.me.skills = [];
S.learnSkill('social1');                       // 熱心 +100
S.state.me.treasures = [];                     // 同上：排除成就寶物的 help 增益
ok('★ 熱心讓幫忙額度變 200', S.helpCapNow() === 200, String(S.helpCapNow()));
TUNING.helpCap = 300;

// 權限型技能
S.state.me.skills = [];
ok('沒學深掘就沒有傳說掉落權限', !S.grants('dropEpic'));
ok('★ 傳說級寶物需要權限', RARITY.epic.needs === 'dropEpic');
ok('★ 神話級寶物需要權限', RARITY.myth.needs === 'dropMyth');
S.state.me.skills = ['hunt1','hunt2','hunt3'];
ok('★ 學了深掘才有傳說掉落權限', S.grants('dropEpic'));
ok('學了深掘還是沒有神話權限', !S.grants('dropMyth'));

// 點滿一條軸 → 🌳 專精
S.state.me.skills = []; S.state.me.treasures = [];
ok('沒點滿不給專精', !S.axisDone('hunt'));
S.state.me.skills = SKILLS.filter(s => s.axis === 'hunt').map(s => s.id);
ok('★ 點滿探寶軸', S.axisDone('hunt'));
ok('★ 點滿一條軸解鎖 🌳 專精', S.checkAchievements().some(t => t.id === 'master'));

// 每條軸花費一樣，沒有哪條先天划算
const costs = Object.keys(AXES).map(a =>
  SKILLS.filter(s => s.axis === a).reduce((n, s) => n + s.cost, 0));
ok('三條軸花費相同', new Set(costs).size === 1, costs.join('/'));
ok('每軸都是四層', Object.keys(AXES).every(a =>
  SKILLS.filter(s => s.axis === a).map(s => s.tier).sort().join() === '1,2,3,4'));

// 掉落權限的端對端驗證：把亂數壓到 0（一定掉），看實際掉出什麼等級。
// 這是「後期解鎖」真正的樣子 —— 沒點技能，那些東西根本不在池子裡。
setRandom(0);
S.state.me.treasures = []; S.state.me.skills = [];
const noPerm = [];
for (let i = 0; i < 15; i++) { const r = S.squash(); if (r.treasure) noPerm.push(r.treasure.rarity); }
ok('★ 沒點技能就掉得到寶物', noPerm.length > 0, String(noPerm.length));
ok('★ 沒權限時永遠掉不到傳說', !noPerm.includes('epic'), noPerm.join(','));
ok('★ 沒權限時永遠掉不到神話', !noPerm.includes('myth'), noPerm.join(','));

S.state.me.treasures = []; S.state.me.skills = ['hunt1','hunt2','hunt3'];
const epicPerm = [];
for (let i = 0; i < 15; i++) { const r = S.squash(); if (r.treasure) epicPerm.push(r.treasure.rarity); }
ok('★ 點了深掘就掉得到傳說', epicPerm.includes('epic'), epicPerm.join(','));
ok('點了深掘還是掉不到神話', !epicPerm.includes('myth'), epicPerm.join(','));

S.state.me.treasures = []; S.state.me.skills = ['hunt1','hunt2','hunt3','hunt4'];
const mythPerm = [];
for (let i = 0; i < 15; i++) { const r = S.squash(); if (r.treasure) mythPerm.push(r.treasure.rarity); }
ok('★ 點了神話之眼才掉得到神話', mythPerm.includes('myth'), mythPerm.join(','));

setRandom(1);
S.state.me.treasures = [];
for (let i = 0; i < 30; i++) S.squash();
const dropped = S.state.me.treasures.filter(id => treasureInfo(id).source === 'drop');
ok('★ 亂數在上限時完全不掉寶', dropped.length === 0, dropped.join(','));

S.state.me.skills = []; S.state.me.treasures = []; S.state.me.lifetime = 0;

/* ------------------------------------------- 舊鏡像缺欄位（v0.10.1 的 bug） -- */
// 真實災情：v0.9 寫下的鏡像沒有 magicDay，第一次快照把 undefined 塞進 state.me，
// Firestore 收到 undefined 就整批拒絕 —— 連續九次寫入全部失敗，
// 使用者只看得到主控台在噴，畫面一切正常。
{
  const srv = {
    streak:5, bestStreak:9, lastDay:'2026-09-02', todayCount:3,
    helpToday:10, helpDay:'2026-09-02', freezes:1, double:0, magicDay:null,
  };
  // 舊版本的鏡像：magicDay 這個鍵根本不存在
  const oldMir = {
    streak:7, bestStreak:9, lastDay:'2026-09-02', todayCount:4,
    helpToday:12, helpDay:'2026-09-02', freezes:1, double:0,
  };

  const picked = S.pickMirror(oldMir, srv, true);
  const undef = Object.entries(picked).filter(([, v]) => v === undefined).map(([k]) => k);
  ok('★ 舊鏡像缺欄位時不會產生 undefined', !undef.length, undef.join(','));
  ok('★ 缺的欄位退回伺服器值', picked.magicDay === null, String(picked.magicDay));
  ok('鏡像有的欄位仍然以鏡像為準', picked.streak === 7, String(picked.streak));

  const fromSrv = S.pickMirror(oldMir, srv, false);
  ok('不採用鏡像時全部取伺服器值', fromSrv.streak === 5, String(fromSrv.streak));

  // 完全沒有鏡像（新裝置）也不能炸
  const noMir = S.pickMirror(null, srv, true);
  ok('★ 完全沒有鏡像也不會產生 undefined',
     !Object.values(noMir).some(v => v === undefined), JSON.stringify(noMir));

  // 未來再加新欄位時，這條會直接抓到
  const futureSrv = { ...srv };
  const everyField = S.pickMirror({}, futureSrv, true);
  ok('★ 空鏡像時每個欄位都有值',
     !Object.values(everyField).some(v => v === undefined), JSON.stringify(everyField));
}

/* ------------------------------------ 持有清單不能被快照蓋掉（v0.10.3） -- */
// 真實災情：學會「熟練」之後那個節點又變成可以點。
// 原因是快照處理直接照抄伺服器的 skills 陣列，而剛學的那個還在待送匣裡，
// 伺服器上還沒有 —— 於是每次快照回音都把它抹掉一次。
{
  ok('★ 本機剛學的不會被伺服器蓋掉',
     S.mergeOwned(['press1'], []).includes('press1'),
     JSON.stringify(S.mergeOwned(['press1'], [])));
  ok('★ 別的裝置學的也會收進來',
     S.mergeOwned([], ['hunt1']).includes('hunt1'));
  ok('★ 兩邊都有的只算一次',
     S.mergeOwned(['press1','hunt1'], ['hunt1','social1']).length === 3,
     JSON.stringify(S.mergeOwned(['press1','hunt1'], ['hunt1','social1'])));
  ok('伺服器還沒有這個欄位時不會炸',
     S.mergeOwned(['press1'], undefined).length === 1);
  ok('本機是空的也不會炸', S.mergeOwned(undefined, ['press1']).length === 1);
  ok('兩邊都沒有就是空陣列', S.mergeOwned(undefined, undefined).length === 0);
}

/* ------------------------------------------------- 批量購買（v0.10.3） -- */
{
  const { clampQty, ITEMS, MAX_QTY } = await import('../js/config.js');
  ok('數量下限是 1', clampQty(0) === 1 && clampQty(-5) === 1);
  ok('數量上限是 99', clampQty(1000) === MAX_QTY, String(clampQty(1000)));
  ok('小數會取整', clampQty(3.9) === 3, String(clampQty(3.9)));
  ok('亂打字當作 1', clampQty('abc') === 1 && clampQty(NaN) === 1);
  ok('可以自訂上限', clampQty(50, 7) === 7, String(clampQty(50, 7)));

  // 只有能疊的道具才有數量
  ok('★ 紙條和帽子不能疊', !ITEMS.note.stack && !ITEMS.hat.stack);
  ok('★ 凍結卡、雙倍魚、送魚、金牌可以疊',
     ITEMS.freeze.stack && ITEMS.double.stack && ITEMS.fish.stack && ITEMS.medal.stack);

  S.state.me.treasures = []; S.state.me.skills = [];
  const unit = S.itemCost('freeze');
  S.state.me.fish = unit * 10; S.state.me.freezes = 0;
  await S.buyForSelf('freeze', 3);
  ok('★ 一次買三張凍結卡', S.state.me.freezes === 3, String(S.state.me.freezes));
  ok('★ 扣的是三張的錢', S.state.me.fish === unit * 7, String(S.state.me.fish));

  // 雙倍魚是「加次數」，數量要跟著乘
  S.state.me.fish = S.itemCost('double') * 5; S.state.me.double = 0;
  await S.buyForSelf('double', 2);
  ok('★ 兩張雙倍魚 = 兩倍次數',
     S.state.me.double === (TUNING.doubleClicks + S.buffOf('double')) * 2,
     String(S.state.me.double));

  // 買不起就整筆擋下來，不能只買一部分
  S.state.me.fish = unit * 2; S.state.me.freezes = 0;
  let threw = false;
  try { await S.buyForSelf('freeze', 5); } catch { threw = true; }
  ok('★ 買不起就整筆擋下', threw && S.state.me.freezes === 0 && S.state.me.fish === unit * 2,
     `freezes=${S.state.me.freezes} fish=${S.state.me.fish}`);

  // 數量亂給也不會出事
  S.state.me.fish = unit * 200; S.state.me.freezes = 0;
  await S.buyForSelf('freeze', 99999);
  ok('★ 數量灌爆會被夾到上限', S.state.me.freezes === MAX_QTY, String(S.state.me.freezes));

  S.state.me.fish = 0; S.state.me.freezes = 0; S.state.me.double = 0;
}

/* --------------------------------------- 金魚與後期加速（v0.10.4） -- */
{
  S.state.me.skills = []; S.state.me.treasures = []; S.state.me.spBought = 0;
  S.state.me.goldfish = 0; S.state.me.goldTick = 0; S.state.me.lifetime = 0;

  ok('金魚門檻讀得到', S.goldfishOdds() === TUNING.goldfishOdds, String(S.goldfishOdds()));
  ok('一開始進度是 0', S.goldfishProgress() === 0);

  // 進度會累積，而且掉了之後歸零 —— 這是進度條的資料來源
  TUNING.goldfishOdds = 5;
  S.state.me.goldTick = 0; S.state.me.goldfish = 0;
  for (let i = 0; i < 4; i++) S.squash();
  ok('★ 金魚進度會累積', Math.abs(S.goldfishProgress() - 0.8) < 1e-9, String(S.goldfishProgress()));
  const g0 = S.state.me.goldfish;
  S.squash();
  ok('★ 到門檻就掉一條金魚', S.state.me.goldfish === g0 + 1, String(S.state.me.goldfish));
  ok('★ 掉完進度歸零', S.state.me.goldTick === 0, String(S.state.me.goldTick));

  // 進度存在 me 裡面，所以重整之後不會從頭算（模擬：換一份 state 再放回去）
  S.squash(); S.squash();
  const saved = S.state.me.goldTick;
  ok('★ 進度存在 me 上（重整後才不會歸零）', saved === 2, String(saved));

  // 增益會讓門檻變低
  S.state.me.treasures = ['orb'];            // 🔮 水晶球 gold +20%
  ok('★ 寶物讓金魚更常掉', S.goldfishOdds() < 5, String(S.goldfishOdds()));
  S.state.me.treasures = [];
  TUNING.goldfishOdds = 350;

  // 金魚換技能點
  S.state.me.goldfish = 25; S.state.me.spBought = 0; S.state.me.lifetime = 0;
  ok('沒換之前總點數是 0', S.spTotal() === 0, String(S.spTotal()));
  const per = TUNING.goldPerSkillPoint;
  S.buySkillPoint(2);
  ok('★ 換到兩點', S.spTotal() === 2, String(S.spTotal()));
  ok('★ 扣掉兩點的金魚', S.state.me.goldfish === 25 - per * 2, String(S.state.me.goldfish));
  ok('★ 換來的點數可以拿去學技能', S.canLearn('press1'));

  let threw = false;
  try { S.buySkillPoint(99); } catch { threw = true; }
  ok('★ 金魚不夠就整筆擋下', threw && S.state.me.goldfish === 25 - per * 2,
     String(S.state.me.goldfish));

  // 換來的點數要跟壓出來的相加，不是取代
  S.state.me.lifetime = 1000;               // 門檻 500 + 里程碑 1000 = 2 點
  ok('★ 換來的與壓出來的相加', S.spTotal() === 4, String(S.spTotal()));

  // 快照比本機慢一拍時不能把換來的點數拉回去
  ok('★ spBought 取大值不會倒退', Math.max(S.state.me.spBought, 0) === 2);

  // 📖 線索不再是純 QOL
  const { skillInfo } = await import('../js/config.js');
  ok('★ 線索有附帶效果', !!skillInfo('hunt2').buff, JSON.stringify(skillInfo('hunt2')));
  S.state.me.skills = ['hunt1','hunt2']; S.state.me.treasures = [];
  ok('★ 線索的加成真的生效',
     Math.abs(S.buffOf('drop') - 0.45) < 1e-9, String(S.buffOf('drop')));

  S.state.me.skills = []; S.state.me.treasures = []; S.state.me.spBought = 0;
  S.state.me.goldfish = 0; S.state.me.goldTick = 0; S.state.me.lifetime = 0;
}

/* ------------------------------ 被寫入問題弄丟的技能（v0.10.5） -- */
// 真實災情：使用者的「重壓」是學會的，「熟練」卻顯示還沒學。
// 那不可能靠正常操作發生 —— 學重壓一定要先有熟練。
// 原因是 pendPatch 用物件展開合併，同一個 key 的 arrayUnion 會互相蓋掉：
//   { skills: arrayUnion('press1') } → { skills: arrayUnion('press2') }
// 伺服器只收到後面那一筆。
{
  S.state.me.skills = ['press2']; S.state.me.treasures = [];
  const n = S.repairSkills();
  ok('★ 補回被弄丟的前置技能', S.hasSkill('press1'), S.state.me.skills.join(','));
  ok('★ 回報補了幾個', n === 1, String(n));
  ok('原本就有的不會重複', S.state.me.skills.filter(x => x === 'press2').length === 1);

  ok('★ 已經完整時不會亂動', S.repairSkills() === 0);

  // 第四層被弄丟前三層 → 三個都要補回來
  S.state.me.skills = ['hunt4'];
  ok('★ 補回一整條軸', S.repairSkills() === 3 &&
     ['hunt1','hunt2','hunt3'].every(x => S.hasSkill(x)), S.state.me.skills.join(','));

  // 只補同一條軸，不會亂送別條軸的技能
  S.state.me.skills = ['press2'];
  S.repairSkills();
  ok('★ 不會多送別條軸的技能',
     S.state.me.skills.every(x => x.startsWith('press')), S.state.me.skills.join(','));

  // 空的不會炸
  S.state.me.skills = [];
  ok('沒有技能時不會炸', S.repairSkills() === 0);

  S.state.me.skills = [];
}

/* ------------------------------------------ 魔法手與彩蛋（v0.10.6） -- */
{
  const { treasureInfo, SOURCE_LABEL, EGG_TAG } = await import('../js/config.js');

  // 彩蛋不該洩漏稀有度
  ok('★ 有彩蛋專用標記', EGG_TAG.name === '彩蛋' && !!EGG_TAG.color, JSON.stringify(EGG_TAG));
  ok('★ 追本溯源存在', !!treasureInfo('origin'));
  ok('★ 它是彩蛋', treasureInfo('origin').source === 'egg');
  ok('★ 提示夠隱晦', treasureInfo('origin').hint === '在很久很久以前......',
     treasureInfo('origin').hint);
  ok('★ 拿到之後說得出怎麼拿的', /v0\.1\.0/.test(treasureInfo('origin').how),
     treasureInfo('origin').how);
  ok('★ 好奇心改名叫再看一眼', treasureInfo('curious').name === '再看一眼',
     treasureInfo('curious').name);
  ok('★ id 沒變（已解鎖的人不會掉）', !!treasureInfo('curious'));

  // 每個彩蛋都要有 how，不然不知不覺解鎖的人不知道發生什麼事
  const { TREASURES: TS } = await import('../js/config.js');
  const eggs = TS.filter(t => t.source === 'egg');
  ok('★ 每個彩蛋都寫得出怎麼拿的', eggs.every(t => t.how), eggs.filter(t => !t.how).map(t => t.id).join(','));
  ok('★ 一鏡到底講明不能用液壓機', /自動液壓機不算/.test(treasureInfo('combo').how),
     treasureInfo('combo').how);

  // 魔法手：留下之後，在自己家壓會同時幫朋友壓
  S.state.me.skills = ['social1','social2','social3','social4'];
  S.state.me.treasures = []; S.state.me.magicDay = null;
  S.state.viewing = { ...S.state.myGru, isMine:true };
  ok('學會之後今天還有一次', S.magicHandLeft() === 1);

  S.state.me.magicHand = { uid:'fr', name:'阿明', left:3 };
  const r1 = S.squash();
  ok('★ 在自己家壓會帶動魔法手', !!r1.magic && r1.magic.left === 2, JSON.stringify(r1.magic));
  S.squash(); S.squash();
  ok('★ 用完就收手', S.state.me.magicHand === null, JSON.stringify(S.state.me.magicHand));
  const r4 = S.squash();
  ok('★ 收手之後不再觸發', !r4.magic);

  // 在別人家壓不會觸發（那已經是直接幫忙了）
  S.state.me.magicHand = { uid:'fr', name:'阿明', left:5 };
  S.state.viewing = { uid:'other', name:'別人', ownerName:'小華', squashes:0, isMine:false };
  const r5 = S.squash();
  ok('★ 在別人家壓不會動用魔法手', !r5.magic && S.state.me.magicHand.left === 5,
     String(S.state.me.magicHand.left));
  S.state.viewing = { ...S.state.myGru, isMine:true };

  // 不能留給自己
  S.state.me.magicHand = { uid: S.state.me.uid || 'me', name:'我', left:5 };
  S.state.me.uid = 'me';
  const r6 = S.squash();
  ok('★ 不會對自己用魔法手', !r6.magic, JSON.stringify(r6.magic));

  S.state.me.magicHand = null; S.state.me.uid = null; S.state.me.skills = [];
}

/* --------------------------- 訪客補算漏洞（v0.10.8） -- */
// 真實災情：朋友發現「刷新可以免費加 3000 下」，小圈子總數被灌到十萬。
// 開頁時 prefillFromMirror() 會把會員的累計填進 state.me（免得畫面閃 0），
// 而那時候 mode 還是 'guest'。這個空檔裡點一下，squash() → saveGuest()
// 就把會員的數字存成訪客進度，認證回來就被當成新玩家的成果補算。
{
  const KEY = 'popgru.guest';
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } };

  // 正常的訪客：存得進去
  localStorage.removeItem(KEY);
  S.state.mode = 'guest';
  S.state.me.lifetime = 0; S.state.me.fish = 0;
  S.squash();
  ok('★ 真的訪客進度會存下來', (read()?.lifetime || 0) > 0, JSON.stringify(read()));

  // 模擬「畫面被會員備份墊過」的狀態
  localStorage.removeItem(KEY);
  localStorage.setItem('popgru.mirror', JSON.stringify({
    uid:'someone', lifetime: 50000, fish: 9999, treasures: [], skills: [],
  }));
  S._prefillFromMirrorForTest?.();
  const before = read();
  S.state.me.lifetime = 50000;                 // 墊上去的會員數字
  S.squash();
  const after = read();
  ok('★ 墊過會員數字之後就不再寫訪客存檔',
     !after || (after.lifetime || 0) < 50000,
     JSON.stringify(after));
  ok('沒有把五萬寫進訪客存檔', !after || after.lifetime !== 50001,
     JSON.stringify(after));

  localStorage.removeItem(KEY);
  localStorage.removeItem('popgru.mirror');
  S.state.me.lifetime = 0; S.state.me.fish = 0;
}

/* ------------------- 買東西之後畫面把錢退回去（v0.10.9） -- */
// 真實災情：用金魚買寶物，金魚扣掉了，但點一下就變回原來的數目。
// 快照是「伺服器的數字 ＋ 還沒送出的量」，而扣款排在 pendInc 裡，
// 那條算式沒把它加進去 —— 於是每次快照回音都把剛花掉的錢退回來。
{
  S.state.mode = 'member'; S.state.me.uid = 'me';
  S.state.me.treasures = []; S.state.me.skills = [];
  S.state.me.goldfish = 20; S.state.me.fish = 500;

  ok('一開始沒有欠帳', S.pendingDelta('goldfish') === 0, String(S.pendingDelta('goldfish')));

  await S.buyTreasure('trophy');                 // 🏆 獎盃 5 金魚
  ok('★ 本機立刻扣掉', S.state.me.goldfish === 15, String(S.state.me.goldfish));
  ok('★ 而且記著「伺服器還不知道扣了 5」',
     S.pendingDelta('goldfish') === -5, String(S.pendingDelta('goldfish')));

  // 這就是修好的關鍵：快照拿伺服器的舊數字 20，加上 -5 才是 15，不是 20
  const srvGold = 20;
  ok('★ 快照重算之後還是 15（不會退錢）',
     srvGold + S.pendingDelta('goldfish') === 15,
     String(srvGold + S.pendingDelta('goldfish')));

  await S.buyTreasure('gem');                    // 💎 原石 12 金魚 → 一共 17
  ok('★ 連買兩個會累加欠帳', S.pendingDelta('goldfish') === -17,
     String(S.pendingDelta('goldfish')));
  ok('★ 本機餘額正確', S.state.me.goldfish === 3, String(S.state.me.goldfish));

  // 買裝扮扣魚也要記著
  const before = S.pendingDelta('fish');
  await S.buySkin('bg', 'sunset').catch(() => {});
  ok('★ 買裝扮的扣款也記在帳上', S.pendingDelta('fish') < before,
     `${before} → ${S.pendingDelta('fish')}`);

  // 買道具給自己也是
  const b2 = S.pendingDelta('fish');
  S.state.me.fish = 500;
  await S.buyForSelf('freeze', 1);
  ok('★ 買道具的扣款也記在帳上', S.pendingDelta('fish') < b2,
     `${b2} → ${S.pendingDelta('fish')}`);

  S.state.mode = 'guest'; S.state.me.uid = null;
  S.state.me.treasures = []; S.state.me.goldfish = 0; S.state.me.fish = 0;
}

/* ------------------------ 全部收集完也不能玩壞（v0.10.10） -- */
// 真實災情：gold 增益全部收齊剛好是 1.00，而門檻算式是 `350 × (1 - 增益)`
//   → 350 × 0 = 0 → 夾成 1 → 每點一下掉一條金魚。
// `(1 - X)` 這個形式只要 X 逼近 1 就崩，而收集遊戲的增益本來就會越加越多。
// 這一段的用意是：以後再加任何寶物或技能，只要讓某個算式退化就會在這裡紅。
{
  const { TREASURES: ALL, SKILLS: ALLSK, ITEMS: IT } = await import('../js/config.js');
  globalThis.ALLT = ALL; globalThis.ALLS = ALLSK;   // 後面拆分測試也要用
  const total = kind => [...ALL, ...ALLSK]
    .filter(x => x.buff && x.buff.kind === kind)
    .reduce((n, x) => n + x.buff.value, 0);

  // 先把那個「剛好 1.00」記錄下來 —— 它就是踩到地雷的原因
  ok('★ gold 增益全收齊會達到 1.0（所以除法是必要的）', total('gold') >= 1,
     String(total('gold')));

  S.state.me.treasures = ALL.map(t => t.id);
  S.state.me.skills    = ALLSK.map(s => s.id);
  TUNING.goldfishOdds = 350;

  ok('★ 全收齊時金魚門檻不會退化成 1', S.goldfishOdds() > 1, String(S.goldfishOdds()));
  ok('★ 全收齊剛好是兩倍速（350 → 175）', S.goldfishOdds() === 175, String(S.goldfishOdds()));
  ok('★ 進度不會超過 1', S.goldfishProgress() <= 1);

  // 什麼都沒有的時候就是設定值
  S.state.me.treasures = []; S.state.me.skills = [];
  ok('沒有增益時就是門檻本身', S.goldfishOdds() === 350, String(S.goldfishOdds()));
  S.state.me.treasures = ['orb'];                       // 🔮 +20%
  ok('★ +20% 是 1.2 倍速，不是少 20%', S.goldfishOdds() === Math.round(350 / 1.2),
     String(S.goldfishOdds()));

  // 就算增益灌到很誇張也不能變成每下一條
  S.state.me.treasures = ALL.map(t => t.id);
  S.state.me.skills    = ALLSK.map(s => s.id);
  ok('★ 東西再多門檻也永遠 ≥ 1', S.goldfishOdds() >= 1);

  // 折扣不能把東西變免費
  for (const k of Object.keys(IT)) {
    if (!IT[k].cost) continue;
    ok(`★ 全收齊時「${IT[k].name}」還是要錢`, S.itemCost(k) >= 1, String(S.itemCost(k)));
  }
  ok('★ 折扣有天花板', S.itemCost('note') >= Math.round(IT.note.cost * (1 - TUNING.maxDiscount)),
     String(S.itemCost('note')));

  // 其他數值也不能爆掉
  ok('★ 幫忙額度仍然是有限的', Number.isFinite(S.helpCapNow()) && S.helpCapNow() > 0,
     String(S.helpCapNow()));
  ok('★ 掉寶機率仍然小於 1', (1 + S.buffOf('drop')) / 300 < 1,
     String((1 + S.buffOf('drop')) / 300));

  S.state.me.treasures = []; S.state.me.skills = [];
}

/* ------------------- 金魚與「攤了」拆開（v0.11.0） -- */
// 潮邊的提議：這兩件事本來是同一個事件穿兩件衣服 ——
// 金魚明明可預期卻裝成隨機，而最好笑的攤地動畫被鎖死在固定節奏上。
// 拆開之後：金魚＝穩定收入（有進度條），攤了＝真正的隨機大獎。
{
  S.state.me.treasures = []; S.state.me.skills = [];
  S.state.me.goldTick = 0; S.state.me.goldfish = 0; S.state.me.fish = 0;
  S.state.viewing = { ...S.state.myGru, isMine:true };

  // ── 金魚：固定計數，跟亂數無關 ──
  TUNING.goldfishOdds = 5;
  setRandom(1);                                  // 亂數壓在上限＝永遠不攤、不掉寶
  for (let i = 0; i < 4; i++) S.squash();
  ok('★ 還沒到門檻不會掉金魚', S.state.me.goldfish === 0, String(S.state.me.goldfish));
  const r5 = S.squash();
  ok('★ 到門檻一定掉，不看運氣', r5.goldfish === true && S.state.me.goldfish === 1);
  ok('★ 掉金魚不會讓格魯攤掉', !r5.flat, JSON.stringify(r5));

  // 連跑兩輪都準時
  for (let i = 0; i < 5; i++) S.squash();
  ok('★ 第二輪一樣準', S.state.me.goldfish === 2, String(S.state.me.goldfish));

  // ── 攤了：純隨機，跟金魚計數無關 ──
  S.state.me.goldTick = 0; S.state.me.goldfish = 0; S.state.me.fish = 0;
  setRandom(0);                                  // 亂數壓在下限＝一定攤
  const rf = S.squash();
  ok('★ 攤了是隨機事件', rf.flat === true, JSON.stringify(rf));
  ok('★ 攤一次給一大把魚', rf.flatFish === TUNING.flatFish, String(rf.flatFish));
  ok('★ 魚真的進帳', S.state.me.fish >= TUNING.flatFish, String(S.state.me.fish));
  ok('★ 攤了跟金魚各算各的', rf.goldfish !== true || S.state.me.goldTick === 0);

  // 攤的那一下特別容易掉寶
  S.state.me.treasures = [];
  setRandom(0);
  const withFlat = S.squash();
  ok('★ 攤的那一下會掉寶', !!withFlat.treasure, JSON.stringify(withFlat.treasure));

  // ── 兩者的機率算式都不會退化 ──
  TUNING.goldfishOdds = 350;
  S.state.me.treasures = ALLT.map(t => t.id);
  S.state.me.skills = ALLS.map(x => x.id);
  ok('★ 全收齊時攤的機率也不會變成每下都攤', S.flatOdds() > 1, String(S.flatOdds()));
  ok('★ 沒有 flat 增益時就是設定值', (() => {
      S.state.me.treasures = []; S.state.me.skills = [];
      return S.flatOdds() === TUNING.flatOdds; })(), String(S.flatOdds()));

  // 金魚比攤了常見 —— 穩定收入應該比大獎容易拿到
  ok('★ 金魚比攤了常見', TUNING.goldfishOdds < TUNING.flatOdds,
     `${TUNING.goldfishOdds} vs ${TUNING.flatOdds}`);

  setRandom(1);
  S.state.me.treasures = []; S.state.me.skills = [];
  S.state.me.goldTick = 0; S.state.me.goldfish = 0; S.state.me.fish = 0;
}

/* ------------------- 小圈子總數要跟得上（v0.11.2） -- */
// 潮邊回報「進度條有點沒跟上」，和運猜中了分母：
//   (317208 - 上一個門檻) / (500000 - 上一個門檻)
// 兩個問題：分母算的是「這一段」但旁邊的字寫「距離五十萬」；
// 而且 state.global.squashes 完全不含本機還沒送出的點擊，
// 所以連壓 20 秒畫面完全不動，然後突然跳一大格。
{
  S.state.mode = 'member'; S.state.me.uid = 'me'; S.state.me.loaded = true;
  S.state.me.treasures = []; S.state.me.skills = [];
  S.state.viewing = { ...S.state.myGru, isMine:true };
  S.state.global = { squashes: 1000, lastSquasher: null };
  S.state.pending = 0;
  setRandom(1);

  ok('★ 沒有待送量時就是伺服器的數字', S.globalNow() === 1000, String(S.globalNow()));
  S.squash(); S.squash(); S.squash();
  ok('★ 壓了就立刻反映，不用等寫入', S.globalNow() === 1003, String(S.globalNow()));
  ok('★ 伺服器的數字本身沒被動到', S.state.global.squashes === 1000,
     String(S.state.global.squashes));

  // 解鎖判定要跟畫面用同一個數字，不然會出現「進度條說到了但東西還鎖著」
  S.state.global = { squashes: 999, lastSquasher: null };
  S.state.pending = 0;
  const need1000 = require_hat_at_1000();
  function require_hat_at_1000() {
    const { SKINS } = cfgSync;
    return (SKINS.hat.find(h => h.need === 1000) || {}).id || null;
  }
  if (need1000) {
    ok('★ 差一下的時候還鎖著', S.skinLocked('hat', need1000));
    S.squash();
    ok('★ 壓下那一下就立刻解鎖（不用等寫入）', !S.skinLocked('hat', need1000));
  } else {
    ok('（沒有門檻剛好 1000 的帽子，跳過）', true);
    ok('（同上）', true);
  }

  S.state.mode = 'guest'; S.state.pending = 0;
  S.state.global = { squashes: 0, lastSquasher: null };
}

/* --------------------- 送的東西收不到（v0.11.3） -- */
// 真實災情：朋友說「有信，但似乎沒有真正得到」。
// collectInbox() 只寫伺服器、沒動 state.me，而 flush() 每 6 秒會把
// freezes / double 這兩個絕對值欄位用本機的舊值寫回去 —— 六秒內蓋掉。
{
  const { ITEMS: IT2 } = await import('../js/config.js');
  S.state.me.treasures = []; S.state.me.skills = [];
  S.state.me.fish = 0; S.state.me.medals = 0;
  S.state.me.freezes = 0; S.state.me.double = 0; S.state.me.giftsReceived = 0;

  // 送一張凍結卡
  S.applyInbox([{ id:'a', type:'freeze', from:'x', read:false }]);
  ok('★ 凍結卡有進到本機', S.state.me.freezes === 1, String(S.state.me.freezes));

  // 這就是關鍵：flush() 寫出去的是 me.freezes 這個絕對值。
  // 本機沒更新的話，寫出去的就是舊值，等於把剛收到的蓋掉。
  ok('★ 所以存檔寫出去的值也含這張卡', S.state.me.freezes === 1);

  // 一次送三張
  S.applyInbox([{ id:'b', type:'freeze', qty:3, from:'x', read:false }]);
  ok('★ 一封信送三張就是加三張', S.state.me.freezes === 4, String(S.state.me.freezes));

  // 雙倍魚
  S.applyInbox([{ id:'c', type:'double', from:'x', read:false }]);
  ok('★ 雙倍魚有進到本機', S.state.me.double === TUNING.doubleClicks,
     String(S.state.me.double));

  // 魚與金牌
  S.applyInbox([{ id:'d', type:'fish', qty:2, from:'x', read:false },
                { id:'e', type:'medal', from:'x', read:false }]);
  ok('★ 送魚 ×2 就是兩份', S.state.me.fish === (IT2.fish.gives || 20) * 2,
     String(S.state.me.fish));
  ok('★ 金牌有進到本機', S.state.me.medals === 1, String(S.state.me.medals));

  // 帽子要解鎖而且戴上
  S.state.me.ownedHats = [];
  S.applyInbox([{ id:'f', type:'hat', hat:'🎩', from:'x', read:false }]);
  ok('★ 送的帽子會永久解鎖', S.state.me.ownedHats.includes('🎩'),
     S.state.me.ownedHats.join(','));
  ok('★ 而且直接戴上', S.state.myGru.hat === '🎩', String(S.state.myGru.hat));

  // 🎁 人緣：以前 giftsReceived 從來沒被加過，這個成就根本拿不到
  ok('★ 收禮數量有在算', S.state.me.giftsReceived === 6,
     String(S.state.me.giftsReceived));
  S.state.me.giftsReceived = 9; S.state.me.treasures = [];
  S.applyInbox([{ id:'g', type:'fish', from:'x', read:false }]);
  ok('★ 收滿十樣拿得到 🎁 人緣',
     S.checkAchievements().some(t => t.id === 'loved'),
     String(S.state.me.giftsReceived));

  S.state.me.fish = 0; S.state.me.medals = 0; S.state.me.freezes = 0;
  S.state.me.double = 0; S.state.me.giftsReceived = 0;
  S.state.me.ownedHats = []; S.state.myGru.hat = null; S.state.me.treasures = [];
}

/* ------------------ 「幫過三個人」永遠達不成（v0.11.4） -- */
// 真實災情：好鄰居（幫過 3 個不同的人）拿不到。兩個原因疊在一起：
//   1. flush() 寫的是 p['helped.' + uid]，但 set(..., {merge:true})
//      不會把點號當路徑（只有 update() 會）—— 伺服器上長出一個
//      名字裡有點的頂層欄位，helped 這個 map 永遠是空的
//   2. 快照又用 d.helped（空的）把本機正確記下的內容蓋掉
{
  // 每個 key 取大的那一邊，本機還沒寫出去的不會被抹掉
  ok('★ 本機領先時保住本機的',
     S.mergeCounts({ a:5 }, { a:3 }).a === 5, JSON.stringify(S.mergeCounts({a:5},{a:3})));
  ok('★ 伺服器領先時採用伺服器的',
     S.mergeCounts({ a:2 }, { a:9 }).a === 9);
  ok('★ 只有本機有的不會消失',
     S.mergeCounts({ a:1, b:1 }, { a:1 }).b === 1,
     JSON.stringify(S.mergeCounts({a:1,b:1},{a:1})));
  ok('★ 只有伺服器有的會收進來（別的裝置幫的）',
     S.mergeCounts({ a:1 }, { a:1, c:1 }).c === 1);
  ok('空的不會炸', Object.keys(S.mergeCounts(null, null)).length === 0);

  // 舊資料救援：名字帶點的頂層欄位要讀得回來
  const legacy = { helped: {}, 'helped.u1': 12, 'helped.u2': 3, fish: 99 };
  const rescued = S.readHelped(legacy);
  ok('★ 救得回舊格式的紀錄',
     rescued.u1 === 12 && rescued.u2 === 3, JSON.stringify(rescued));
  ok('★ 不會把別的欄位當成幫忙紀錄', rescued.fish === undefined, JSON.stringify(rescued));
  ok('★ 新舊格式並存時取大的',
     S.readHelped({ helped:{ u1:5 }, 'helped.u1':20 }).u1 === 20,
     JSON.stringify(S.readHelped({ helped:{u1:5}, 'helped.u1':20 })));

  // 端對端：幫三個人就該解得開好鄰居
  S.state.me.treasures = []; S.state.me.skills = []; S.state.me.helped = {};
  S.state.mode = 'member'; S.state.me.uid = 'me';
  setRandom(1);
  TUNING.helpCap = 0;                       // 額度不擋，專心測計數
  for (const uid of ['a', 'b', 'c']) {
    S.state.viewing = { uid, name:'x', ownerName:'x', squashes:0, isMine:false, skin:{} };
    S.squash();
  }
  ok('★ 幫過三個不同的人', S.helpedCount() === 3, String(S.helpedCount()));
  // squash() 自己就會檢查成就，所以幫完第三個人的當下就解鎖了 ——
  // 要看的是結果，不是「再呼叫一次會不會回傳它」
  ok('★ 好鄰居解得開', S.hasTreasure('nb3'),
     JSON.stringify(S.state.me.helped) + ' / ' + S.state.me.treasures.join(','));

  // 快照回音（伺服器還是空的）不能把進度抹掉
  S.state.me.helped = S.mergeCounts(S.state.me.helped, {});
  ok('★ 快照回音之後仍然是三個人', S.helpedCount() === 3,
     JSON.stringify(S.state.me.helped));

  // 幫同一個人很多次還是只算一個
  S.state.viewing = { uid:'a', name:'x', ownerName:'x', squashes:0, isMine:false, skin:{} };
  for (let i = 0; i < 10; i++) S.squash();
  ok('★ 重複幫同一個人不會灌水', S.helpedCount() === 3, String(S.helpedCount()));
  ok('★ 但次數有累積', S.bestHelped() >= 10, String(S.bestHelped()));

  TUNING.helpCap = 300;
  S.state.mode = 'guest'; S.state.me.uid = null;
  S.state.me.helped = {}; S.state.me.treasures = [];
  S.state.viewing = { ...S.state.myGru, isMine:true };
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
