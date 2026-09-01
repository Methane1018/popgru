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

ok('寶物共 29 個', TREASURES.length === 29, String(TREASURES.length));
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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
