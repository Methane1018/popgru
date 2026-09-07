// ============================================================================
//  plan.js —— 「這一批要寫什麼」的決策層
//
//  這個檔案**刻意不 import 任何東西**。它不知道 Firebase 存在，
//  所以它可以在 node 裡直接跑，也就是說它測得到。
//
//  為什麼要拆出來：v0.10.5 到 v0.11.4 連續五個 bug 全部同一家族 ——
//  本機狀態與伺服器狀態沒有單一真相。而且每一個的錯誤都躲在 flush()
//  或快照回呼裡面，那兩段都要連線才跑得動，測試從來碰不到。
//  把「決定寫什麼」搬到這裡之後，那一整類就被測試蓋住了。
//
//  回傳的是**意圖**不是 FieldValue：{ __inc: 5 } 而不是 increment(5)。
//  FieldValue 是不透明物件，放進任何會合併的容器都會出事（v0.10.5 的教訓）。
//  真正變成 FieldValue 是送出那一層的工作。
// ============================================================================

export const INC   = v => ({ __inc: v });
export const UNION = (...a) => ({ __union: a });
export const NOW   = { __now: true };

export const isInc   = v => !!v && typeof v === 'object' && '__inc' in v;
export const isUnion = v => !!v && typeof v === 'object' && '__union' in v;
export const isNow   = v => v === NOW || (!!v && typeof v === 'object' && v.__now === true);

/* --------------------------------------------------------------- 寫出去 -- */
/**
 * 算出一次 flush 要寫哪些文件、寫什麼。
 *
 * @param me      個人資料（state.me）
 * @param n       這批要記幾下
 * @param fish    這批賺到幾條魚
 * @param gold    這批賺到幾條金魚
 * @param target  這幾下壓在誰家（uid）
 * @param inc     排隊中的增減，{ 欄位: 數字 }
 * @param uni     排隊中的聯集，{ 欄位: Set 或陣列 }
 * @param set     排隊中的絕對值，{ 欄位: 值 }
 * @param magic   👋 魔法手要幫誰壓幾下
 * @param now     現在時間（傳進來才是純函式）
 */
export function planFlush({
  me, n = 0, fish = 0, gold = 0, target = null,
  inc = {}, uni = {}, set = {}, magic = { uid:null, n:0 }, now = 0,
} = {}) {
  const warnings = [];

  // 走到這裡代表個人資料一定讀進來了，所以絕對欄位一律寫回去。
  const user = {
    lastSeen: NOW,
    streak: me.streak, bestStreak: me.bestStreak, lastDay: me.lastDay,
    todayCount: me.todayCount, helpToday: me.helpToday, helpDay: me.helpDay,
    freezes: me.freezes, double: me.double, magicDay: me.magicDay,
    goldTick: me.goldTick, magicHand: me.magicHand,
    ...set,
  };
  for (const [f, v] of Object.entries(inc)) if (v) user[f] = INC(v);
  for (const [f, s] of Object.entries(uni)) {
    const a = Array.from(s || []);
    if (a.length) user[f] = UNION(...a);
  }

  // 保險絲：只要有一個欄位是 undefined，Firestore 會拒絕**整批**寫入，
  // 連帶所有累積的點擊都送不出去。寧可少寫一個欄位也不要全部停擺 ——
  // 但一定要吼出來，這種情況永遠是 bug。（v0.10.1 就是這樣卡住所有人的。）
  for (const k of Object.keys(user)) {
    if (user[k] === undefined) { warnings.push(k); delete user[k]; }
  }

  // 持有清單每次都整份 union 回去，不倚賴某一筆補償寫入活到成功為止。
  // 整份 union 是冪等的，成本只有幾個字串，所以每次都送。（v0.10.4）
  if (me.skills?.length)    user.skills    = UNION(...me.skills);
  if (me.treasures?.length) user.treasures = UNION(...me.treasures);

  if (n)    user.lifetime = INC(n);
  if (fish) user.fish     = INC(fish);
  if (gold) user.goldfish = INC(gold);

  const grus = [], visits = [];
  let globalAdd = 0;

  if (n && target) {
    grus.push({ uid: target, data: { squashes: INC(n), lastSquashedAt: NOW } });
    if (target !== me.uid) {                    // 幫別人壓 → 在他家留下足跡
      visits.push({ gru: target, from: me.uid, data: {
        name: me.name, photo: me.photo, count: INC(n), at: NOW,
      }});
      // ⚠️ 巢狀物件，不是 'helped.' + uid。
      // set(..., {merge:true}) 不把點號當路徑，那樣寫會在伺服器上
      // 長出一個名字裡有點的頂層欄位，helped 這個 map 永遠是空的。（v0.11.4）
      user.helped = { ...(user.helped || {}), [target]: INC(n) };
    }
    globalAdd += n;
  }

  // 👋 魔法手：你在自己家壓的那些，同一批也落在朋友家
  if (magic.n && magic.uid && magic.uid !== target) {
    grus.push({ uid: magic.uid, data: { squashes: INC(magic.n), lastSquashedAt: NOW } });
    visits.push({ gru: magic.uid, from: me.uid, data: {
      name: me.name, photo: me.photo, count: INC(magic.n), at: NOW, magic: true,
    }});
    user.helped = { ...(user.helped || {}), [magic.uid]: INC(magic.n) };
    globalAdd += magic.n;
  }

  return {
    user,
    grus,
    visits,
    // 小圈子總數先算好再寫一次 ——
    // 同一個批次不能對同一份文件寫兩次，而魔法手也要加進總數。
    global: globalAdd
      ? { squashes: INC(globalAdd), lastSquasher: { uid: me.uid, name: me.name, at: now } }
      : null,
    warnings,
  };
}

// 同一個批次不能對同一份文件寫兩次（Firestore 會直接拒絕）。
// 這個函式讓測試能一眼確認這件事，不用等線上炸。
export const planDocIds = plan => [
  'users/' + (plan.user ? 'me' : ''),
  ...plan.grus.map(g => 'grus/' + g.uid),
  ...plan.visits.map(v => `grus/${v.gru}/visits/${v.from}`),
  ...(plan.global ? ['meta/global'] : []),
].filter(x => x !== 'users/');
