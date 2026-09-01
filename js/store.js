// ============================================================================
//  store.js —— 所有資料都只從這裡進出
//
//  guest  : 完全存在 localStorage，後端零紀錄（不會產生幽靈帳號）
//  member : Google 登入。每個人有一隻格魯 /grus/{uid}，可以互相拜訪、
//           幫對方壓。幫別人壓會同時算進「他家格魯」和「你的個人累計」。
// ============================================================================
import {
  firebaseConfig, FIREBASE_VERSION, TUNING, ITEMS,
  ACCESS, INVITE_CODE, DEFAULT_GRU_NAME, hatInfo, skinInfo, defaultSkin,
  TREASURES, RARITY, treasureInfo, SKINS,
} from './config.js?v=0.9.3';

const CDN       = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;
const GUEST_KEY = 'popgru.guest';
const SEEN_KEY  = 'popgru.lastSeenGlobal';
const POKE_KEY  = 'popgru.pokes';
const OUTBOX_KEY = 'popgru.outbox';   // 還沒寫進 Firestore 的點擊，撐過關頁／重整／當掉
const MIRROR_KEY = 'popgru.mirror';  // 連勝等「絕對值」欄位的本機備份
const INVITE_OK = 'popgru.invited';

export const configured = Object.keys(firebaseConfig).length > 0;

/* ------------------------------------------------------------------ 日期 -- */
// 「無名氏」是顯示用的佔位字串，不是名字。
// 舊版曾經把它寫進資料庫（ownerName / name），所以讀的時候要濾掉，
// 寫的時候也絕對不寫進去 —— 否則佔位字串會變成某人真正的名字。
const NO_NAME = '無名氏';
const realName = v => (typeof v === 'string' && v.trim() && v.trim() !== NO_NAME) ? v.trim() : null;

const pad = n => String(n).padStart(2, '0');
export const dayStr = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
export function dayDiff(a, b) {
  if (!a || !b) return null;
  const [ay,am,ad] = a.split('-').map(Number);
  const [by,bm,bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by,bm-1,bd) - Date.UTC(ay,am-1,ad)) / 86400000);
}
export const streakAlive = lastDay => { const g = dayDiff(lastDay, dayStr()); return g !== null && g <= 1; };

// 不變量：lastDay 是今天，就代表今天玩過，連續天數不可能是 0。
// 之前有個 bug 把 streak 寫成 0 而 lastDay 已經是今天，結果整天卡在 0 ——
// 因為加一的邏輯只在「換日」時才跑。這裡把它補回來。
function repairStreak() {
  if (state.me.lastDay === dayStr() && !state.me.streak) {
    state.me.streak = 1;
    state.me.bestStreak = Math.max(state.me.bestStreak || 0, 1);
    return true;
  }
  return false;
}

/* ---------------------------------------------------------------- events -- */
const listeners = {};
export const on = (evt, fn) => ((listeners[evt] ||= new Set()).add(fn), () => listeners[evt].delete(fn));
const emit = (evt, d) => listeners[evt]?.forEach(fn => { try { fn(d); } catch (e) { console.error(e); } });

/* ----------------------------------------------------------------- state -- */
const blankMe = () => ({
  uid:null, name:null, googleName:null, nick:null, photo:null,
  lifetime:0, fish:0, goldfish:0, medals:0, freezes:0, double:0,
  ownedHats:[], ownedSkins:[], loaded:false,
  treasures:[], helped:{}, giftsReceived:0,
  streak:0, bestStreak:0, lastDay:null, todayCount:0, helpToday:0, helpDay:null,
});
const blankGru = () => ({
  uid:null, name:DEFAULT_GRU_NAME, ownerName:null, ownerPhoto:null,
  hat:null, squashes:0, isMine:true, skin:defaultSkin(),
});

export const state = {
  ready:false, mode:'guest', offline:false, gated:false,
  me: blankMe(),
  myGru:   blankGru(),
  viewing: blankGru(),          // 現在正在看誰家的格魯
  global:  { squashes:0, lastSquasher:null },
  opening: { seen:false, missed:0, lastSquasher:null },
  roster: [],                   // 所有人的格魯（依最後上線排序）
  visits: [],                   // 誰來過我家
  inbox:  [],
  pending: 0,
};

const sync = () => { mirrorSave(); emit('state', state); };

// 今天還剩多少額度（會自動處理跨日，所以還沒壓之前顯示也是對的）
export function dailyLeft() {
  if (TUNING.dailyCap <= 0) return Infinity;
  const used = state.me.lastDay === dayStr() ? (state.me.todayCount || 0) : 0;
  return Math.max(0, TUNING.dailyCap - used);
}
// 幫忙額度會被寶物加寬（🧭 羅盤、🤝 好鄰居、🔥 一週皆勤）
export const helpCapNow = () =>
  TUNING.helpCap <= 0 ? 0 : TUNING.helpCap + buffOf('help');

export function helpLeft() {
  if (TUNING.helpCap <= 0) return Infinity;
  const used = state.me.helpDay === dayStr() ? (state.me.helpToday || 0) : 0;
  return Math.max(0, helpCapNow() - used);
}

/* ------------------------------------------------------------ 訪客存檔 -- */
function loadGuest() {
  try { return JSON.parse(localStorage.getItem(GUEST_KEY) || '{}'); } catch { return {}; }
}
function saveGuest() {
  if (state.mode !== 'guest') return;
  const { lifetime, fish, goldfish, streak, bestStreak, lastDay, todayCount, nick, ownedHats } = state.me;
  try {
    localStorage.setItem(GUEST_KEY, JSON.stringify({
      lifetime, fish, goldfish, streak, bestStreak, lastDay, todayCount, nick, ownedHats,
      ownedSkins: state.me.ownedSkins,
      gruName: state.myGru.name, gruHat: state.myGru.hat, gruSquashes: state.myGru.squashes,
      gruSkin: state.myGru.skin,
    }));
  } catch {}
}
function applyGuest() {
  const g = loadGuest();
  Object.assign(state.me, blankMe(), {
    lifetime:g.lifetime||0, fish:g.fish||0, goldfish:g.goldfish||0,
    streak:g.streak||0, bestStreak:g.bestStreak||0,
    lastDay:g.lastDay||null, todayCount:g.todayCount||0,
    nick:g.nick||null, name:g.nick||null,
    ownedHats: Array.isArray(g.ownedHats) ? g.ownedHats : [],
    ownedSkins: Array.isArray(g.ownedSkins) ? g.ownedSkins : [],
  });
  Object.assign(state.myGru, blankGru(), {
    name:g.gruName||DEFAULT_GRU_NAME, hat:g.gruHat||null, squashes:g.gruSquashes||0,
    skin: { ...defaultSkin(), ...(g.gruSkin || {}) },
  });
  state.viewing = { ...state.myGru, isMine:true };
}

/* ------------------------------------------------------- 持久待送匣 -- */
// flush() 是非同步的網路寫入，而瀏覽器在關頁時不會等它完成。
// 所以待送的數量必須先落地在 localStorage：寫入成功才扣掉。
// 這樣關分頁、重新整理、當掉、離線，通通不會掉資料。
function outboxRead() {
  try {
    const o = JSON.parse(localStorage.getItem(OUTBOX_KEY) || 'null');
    if (!o || !o.uid) return null;
    // 相容舊格式：以前一次只記一個對象
    if (!o.items && o.target) return { uid:o.uid, items:{ [o.target]:{ n:o.n||0, fish:o.fish||0, gold:o.gold||0 } } };
    return (o.items && typeof o.items === 'object') ? o : null;
  } catch { return null; }
}
function outboxWrite(o) {
  try {
    if (!o || !o.items || !Object.keys(o.items).length) localStorage.removeItem(OUTBOX_KEY);
    else localStorage.setItem(OUTBOX_KEY, JSON.stringify(o));
  } catch {}
}
// 每個對象各記一筆。之前只記一個對象，一從自己家換去朋友家，
// 自己家還沒送出去的那些就被整筆蓋掉了。
function outboxAdd(uid, target, n, fish, gold) {
  if (!uid || !target) return;          // 對象不明就不要記，免得又寫出一筆 "null"
  const o = outboxRead() || { uid, items:{} };
  if (o.uid !== uid) { o.uid = uid; o.items = {}; }      // 換帳號就重來
  const it = o.items[target] || { n:0, fish:0, gold:0 };
  it.n += n; it.fish += fish; it.gold += gold;
  o.items[target] = it;
  outboxWrite(o);
}
// 寫入成功才扣掉這次送出的量（期間可能又累積了新的點擊，所以是扣不是清空）
function outboxSettle(uid, target, n, fish, gold) {
  const o = outboxRead();
  if (!o || o.uid !== uid || !o.items[target]) return;
  const it = o.items[target];
  it.n -= n; it.fish -= fish; it.gold -= gold;
  if (it.n <= 0 && it.fish <= 0 && it.gold <= 0) delete o.items[target];
  outboxWrite(o);
}

/* ------------------------------------------------- 絕對值欄位的本機鏡像 -- */
// 連勝、凍結卡、雙倍魚、幫忙額度這些是「絕對值」，只有這台裝置在寫。
// 只要有任何一次沒寫成功，重整就會被伺服器上的舊值蓋回去。
// 所以每次變動都在本機留一份，載入時比日期挑比較新的那份。
// 這樣就算伺服器那邊完全沒寫進去，重整也不會掉。
// 前段是「絕對值」欄位（只有這台裝置在寫，遺失就回不來）；
// 後段是顯示用的數字，載入時先拿來墊著，免得畫面閃一下 0 再跳回真值。
const MIRROR_FIELDS = ['streak','bestStreak','lastDay','todayCount','helpToday','helpDay','freezes','double'];
const MIRROR_DISPLAY = ['lifetime','fish','goldfish','medals','treasures'];
const MIRROR_ALL = [...MIRROR_FIELDS, ...MIRROR_DISPLAY];

function mirrorSave() {
  if (state.mode !== 'member' || !state.me.uid || !state.me.loaded) return;
  try {
    const o = { uid: state.me.uid, at: Date.now() };
    for (const f of MIRROR_ALL) o[f] = state.me[f];
    localStorage.setItem(MIRROR_KEY, JSON.stringify(o));
  } catch {}
}
// 載入時先用上次的本機備份把畫面墊起來。
// 不然從開頁到伺服器回覆的那一兩秒，所有數字都是 0，看起來像東西不見了。
// 這只是墊著：不設 loaded，所以不會被當成確認過的資料寫回伺服器。
function prefillFromMirror() {
  let o = null;
  try { o = JSON.parse(localStorage.getItem(MIRROR_KEY) || 'null'); } catch {}
  if (!o || !o.uid) return false;
  for (const f of MIRROR_ALL) if (o[f] !== undefined) state.me[f] = o[f];
  return true;
}

function mirrorRead(uid) {
  try {
    const o = JSON.parse(localStorage.getItem(MIRROR_KEY) || 'null');
    return (o && o.uid === uid) ? o : null;
  } catch { return null; }
}

/* --------------------------------------------------------------- firebase -- */
let fb = null;
const globalRef = ()  => fb.F.doc(fb.db, 'meta', 'global');
const userRef   = uid => fb.F.doc(fb.db, 'users', uid);
const gruRef    = uid => fb.F.doc(fb.db, 'grus', uid);
const visitRef  = (owner, visitor) => fb.F.doc(fb.db, 'grus', owner, 'visits', visitor);
const inboxCol  = uid => fb.F.collection(fb.db, 'users', uid, 'inbox');

/* ------------------------------------------------------------------ init -- */
export async function init() {
  applyGuest();
  if (!configured) { state.ready = true; sync(); return; }
  if (prefillFromMirror()) emit('state', state);   // 先把畫面填起來，別閃 0

  try {
    const [appM, authM, fsM] = await Promise.all([
      import(`${CDN}/firebase-app.js`),
      import(`${CDN}/firebase-auth.js`),
      import(`${CDN}/firebase-firestore.js`),
    ]);
    const app = appM.initializeApp(firebaseConfig);
    fb = { app, auth: authM.getAuth(app), db: fsM.getFirestore(app), A: authM, F: fsM };
  } catch (e) {
    console.warn('Firebase 載入失敗，改用訪客模式：', e);
    state.offline = true; state.ready = true; sync(); return;
  }

  fb.F.onSnapshot(globalRef(), snap => {
    const d = snap.data() || {};
    const prev = state.global.squashes;
    state.global = { squashes: d.squashes||0, lastSquasher: d.lastSquasher||null };
    if (!state.opening.seen) {
      state.opening.seen = true;
      state.opening.lastSquasher = d.lastSquasher || null;
      let seen = 0; try { seen = parseInt(localStorage.getItem(SEEN_KEY),10)||0; } catch {}
      state.opening.missed = seen ? Math.max(0, state.global.squashes - seen) : 0;
    } else if (state.global.squashes > prev) {
      const ls = d.lastSquasher;
      if (ls && ls.uid !== state.me.uid) emit('live', ls);
    }
    try { localStorage.setItem(SEEN_KEY, state.global.squashes); } catch {}
    sync();
  }, err => { console.warn('讀取全圈總數失敗：', err); state.offline = true; sync(); });

  fb.A.onAuthStateChanged(fb.auth, u => u ? onSignedIn(u) : onSignedOut());
  state.ready = true; sync();
}

function onSignedOut() {
  unsubUser?.(); unsubUser = null;
  unsubGru?.();  unsubGru  = null;
  state.mode = 'guest';
  state.roster = []; state.visits = []; state.inbox = [];
  applyGuest();
  state.ready = true; sync();
}

// 格魯上的 ownerName 就是「別人在名單和信箱看到的名字」。
// 它必須等於 state.me.name（暱稱優先，沒設才用 Google 名字），
// 而暱稱要等個人資料的快照到了才知道 —— 所以只能在這裡對齊，不能在登入當下寫。
function syncOwnerName() {
  if (!fb || state.mode !== 'member' || !state.me.loaded) return;
  if (!state.myGru.uid || !state.me.uid) return;
  const want = state.me.name;
  if (!want || want === NO_NAME || state.myGru.ownerName === want) return;
  state.myGru.ownerName = want;
  fb.F.setDoc(gruRef(state.me.uid), { ownerName: want }, { merge:true })
    .then(() => console.log(`POPGRU 顯示名字對齊為「${want}」`))
    .catch(e => console.warn('同步顯示名字失敗：', e));
}

/* -------------------------------------------------------------- sign in -- */
let unsubUser = null, unsubGru = null;

async function onSignedIn(user) {
  const { F } = fb, uid = user.uid;

  if (ACCESS === 'invite') {
    let ok = false; try { ok = localStorage.getItem(INVITE_OK) === '1'; } catch {}
    if (!ok) { state.gated = true; state.mode = 'guest'; state.ready = true; sync(); return; }
  }
  state.gated = false;
  state.mode  = 'member';
  const gName = realName(user.displayName);            // 沒有就是 null，不是「無名氏」
  Object.assign(state.me, {
    uid, googleName: gName, name: gName || NO_NAME, photo: user.photoURL || null,
  });

  const guest = loadGuest();
  try {
    const mine = { photo: state.me.photo, lastSeen: F.serverTimestamp() };
    if (gName) mine.googleName = gName;                 // 沒有真名就不要寫
    await F.setDoc(userRef(uid), mine, { merge: true });
    const g = await F.getDoc(gruRef(uid));
    if (!g.exists()) {                                  // 第一次登入 → 開一隻格魯
      await F.setDoc(gruRef(uid), {
        name: guest.gruName || DEFAULT_GRU_NAME,
        ownerName: state.me.name, ownerPhoto: state.me.photo,
        squashes: 0,
        createdAt: F.serverTimestamp(),
        lastSquashedAt: F.serverTimestamp(),            // 沒這個欄位就不會出現在名單裡
      });
    } else {
      // 只更新頭像。這裡「不能」寫 ownerName ——
      // 個人資料的快照還沒到，state.me.name 還是 Google 名字，暱稱根本還沒讀進來，
      // 寫下去等於每次登入／重整都把使用者的暱稱蓋掉。
      // ownerName 改由 syncOwnerName() 在兩份資料都載入之後才對齊。
      await F.setDoc(gruRef(uid), { ownerPhoto: state.me.photo }, { merge: true });
    }
  } catch (e) {
    // ReferenceError / TypeError 是程式寫錯，不是網路問題 —— 這種必須大聲叫，
    // 否則會像 gName 那次一樣整段靜靜地不執行，沒有人發現。
    if (e instanceof ReferenceError || e instanceof TypeError) console.error('程式錯誤：', e);
    else console.warn('建立資料失敗：', e);
  }

  const claimed = await claimGuestProgress(uid);

  unsubUser?.();
  unsubUser = F.onSnapshot(userRef(uid), s => {
    // 只忽略「空的快取快照」。
    // 危險的只有『文件不存在 + 來自快取』這一種：那代表我們還不知道伺服器上有什麼，
    // 把它當真就會把資料讀成 0 再寫回去。快取裡「有資料」的快照是安全的
    // —— 那些資料本來就是從伺服器來的。
    // （上一版擋掉所有快取快照，結果連正常的資料都進不來。）
    if (!state.me.loaded && !s.exists() && s.metadata.fromCache) return;

    const d = s.data() || {};
    const first = !state.me.loaded;

    // 這幾個欄位是用 increment() 寫的，或會被別人改動（收到魚、金牌、帽子），
    // 伺服器永遠比本機正確，所以每次快照都照抄。
    // 伺服器的數字 ＋ 還沒寫出去的量。直接照抄伺服器的話，
    // 任何一次非 flush 的寫入（買帽子、買外觀、改暱稱、收信箱）都會
    // 推來一份「還沒算進你剛才那些點擊」的快照，畫面就往回跳。
    Object.assign(state.me, {
      lifetime: (d.lifetime||0) + state.pending + inflight.n,
      fish:     (d.fish    ||0) + pendFish      + inflight.fish,
      goldfish: (d.goldfish||0) + pendGold      + inflight.gold,
      medals:   d.medals||0,
      // 舊制買過的帽子（只存在 grus.hat）視同已解鎖，不能讓人白花錢
      ownedHats: Array.from(new Set([
        ...(Array.isArray(d.ownedHats) ? d.ownedHats : []),
        ...(state.myGru.hat ? [state.myGru.hat] : []),
      ])),
      ownedSkins: Array.isArray(d.ownedSkins) ? d.ownedSkins : [],
      treasures: Array.isArray(d.treasures) ? d.treasures : [],
      helped: (d.helped && typeof d.helped === 'object') ? d.helped : {},
      giftsReceived: d.giftsReceived || 0,
      nick: realName(d.nick),
      googleName: realName(d.googleName) || state.me.googleName,
      name: realName(d.nick) || realName(d.googleName) || state.me.googleName || NO_NAME,
      photo: d.photo || state.me.photo,
    });

    // 下面這些是「絕對值」欄位，只有這台裝置在寫，而快照永遠比本機慢一拍。
    // 每次都照抄回來的話，還沒寫出去的增量就會被洗掉 ——
    // 症狀就是幫忙額度自己跳回 300、連續天數莫名歸零。
    // 所以只在第一次載入時採用伺服器的值，之後以本機為準。
    if (first) {
      const srv = {
        streak:d.streak||0, bestStreak:d.bestStreak||0,
        lastDay:d.lastDay||null, todayCount:d.todayCount||0,
        helpToday:d.helpToday||0, helpDay:d.helpDay||null,
        freezes:d.freezes||0, double:d.double||0,
      };
      // 本機鏡像只要「不比伺服器舊」就以本機為準。
      // 'YYYY-MM-DD' 直接字串比大小就等於比日期。
      const mir = mirrorRead(uid);
      const useMirror = !!mir && (mir.lastDay || '') >= (srv.lastDay || '');
      const pickd = {};
      for (const f of MIRROR_FIELDS) pickd[f] = useMirror ? mir[f] : srv[f];
      Object.assign(state.me, pickd);
      state.me.loaded = true;      // 有了這個，flush() 才會開始寫
      repairStreak();
      checkAchievements();          // 上線當下大家會一次達成好幾個，呼叫端要合併通知

      const m = state.me;
      console.log(
        `POPGRU 個人資料｜採用=${useMirror ? '本機鏡像' : '伺服器'}` +
        `（來源=${s.metadata.fromCache ? '快取' : '伺服器'}, 文件${s.exists() ? '存在' : '不存在'}）\n` +
        `  伺服器：連勝=${srv.streak} 最後一天=${srv.lastDay} 凍結卡=${srv.freezes} ` +
        `雙倍=${srv.double} 幫忙=${srv.helpToday}/${srv.helpDay}\n` +
        `  本機　：${mir ? `連勝=${mir.streak} 最後一天=${mir.lastDay} 凍結卡=${mir.freezes} `
                        + `雙倍=${mir.double} 幫忙=${mir.helpToday}/${mir.helpDay}` : '（沒有備份）'}\n` +
        `  結果　：連勝=${m.streak} 凍結卡=${m.freezes} 雙倍=${m.double} 幫忙=${m.helpToday} ` +
        `魚=${m.fish} 累計=${m.lifetime}`);

      flush();                     // 資料到齊，把等在門口的寫入放行
    }
    syncOwnerName();                // 這時才知道暱稱，把名單上的名字補正
    sync();
  }, e => console.warn('讀取個人資料失敗：', e));

  unsubGru?.();
  let gruLoaded = false;
  unsubGru = F.onSnapshot(gruRef(uid), s => {
    if (!gruLoaded && !s.exists() && s.metadata.fromCache) return;   // 同理，只擋空的快取快照
    gruLoaded = true;
    const d = s.data() || {};
    state.myGru = {
      uid, name:d.name||DEFAULT_GRU_NAME, ownerName:d.ownerName||state.me.name,
      ownerPhoto:d.ownerPhoto||state.me.photo, hat:d.hat||null,
      squashes:d.squashes||0, isMine:true,
      skin: { ...defaultSkin(), ...(d.skin || {}) },
    };
    if (state.viewing.isMine) state.viewing = { ...state.myGru };
    syncOwnerName();                // 格魯後到的話，在這裡對齊
    sync();
  }, e => console.warn('讀取格魯失敗：', e));

  await recoverOutbox(uid);                    // 上次沒送出去的，現在補送
  await Promise.all([loadRoster(), loadVisits(), loadInbox()]);
  state.ready = true; sync();
  if (claimed) emit('claimed', claimed);
}

async function claimGuestProgress(uid) {
  const g = loadGuest();
  const take = Math.min(g.lifetime || 0, TUNING.guestMaxClaim);
  if (!take && !g.fish && !g.goldfish) { try { localStorage.removeItem(GUEST_KEY); } catch {} return null; }
  try {
    const { F } = fb;
    const b = F.writeBatch(fb.db);
    b.set(userRef(uid), {
      lifetime: F.increment(take),
      fish:     F.increment(Math.min(g.fish||0, TUNING.guestMaxClaim)),
      goldfish: F.increment(Math.min(g.goldfish||0, 50)),
    }, { merge:true });
    if (take > 0) {
      b.set(gruRef(uid),   { squashes: F.increment(take) }, { merge:true });
      b.set(globalRef(),   { squashes: F.increment(take) }, { merge:true });
    }
    await b.commit();
    try { localStorage.removeItem(GUEST_KEY); } catch {}
    return { taken: take, had: g.lifetime||0, capped: (g.lifetime||0) > take };
  } catch (e) { console.warn('補算訪客紀錄失敗：', e); return null; }
}

// 上次關頁沒送出去的點擊，開啟時補送
async function recoverOutbox(uid) {
  const o = outboxRead();
  if (!o || o.uid !== uid) return;
  const targets = Object.keys(o.items || {});
  if (!targets.length) return;
  let total = 0;
  for (const t of targets) {
    const it = o.items[t];
    if (!it || (!it.n && !it.fish && !it.gold)) continue;
    total += it.n;
    // 舊版有 bug 時會把對象記成 "null"（那時 viewing.uid 還沒載好）。
    // 那種紀錄要算回自己身上，否則會一直寫向不存在的格魯、永遠補送不出去。
    const to = (!t || t === 'null' || t === 'undefined') ? uid : t;
    if (to !== t) {
      console.log(`POPGRU 補送：把記成 ${t} 的 ${it.n} 下改算回自己身上`);
      o.items[to] = o.items[to] || { n:0, fish:0, gold:0 };
      o.items[to].n += it.n; o.items[to].fish += it.fish; o.items[to].gold += it.gold;
      delete o.items[t];
      outboxWrite(o);
    }
    flushTarget = to;
    state.pending += it.n; pendFish += it.fish; pendGold += it.gold;
    await flush();                       // 一次送一個對象
  }
  if (total) {
    console.log(`POPGRU: 補送上次沒寫入的 ${total} 下`);
    emit('recovered', { n: total });
  }
}

export async function signIn()  { if (!fb) throw new Error('尚未設定 Firebase');
                                  await fb.A.signInWithPopup(fb.auth, new fb.A.GoogleAuthProvider()); }
export async function signOut() { if (fb) await fb.A.signOut(fb.auth); }

export function submitInvite(code) {
  if (String(code).trim().toLowerCase() !== String(INVITE_CODE).toLowerCase()) return false;
  try { localStorage.setItem(INVITE_OK, '1'); } catch {}
  if (fb?.auth?.currentUser) onSignedIn(fb.auth.currentUser);
  return true;
}

/* ---------------------------------------------------------------- 拜訪 -- */
export async function visit(uid) {
  await flush();                                     // 換人之前先結清
  if (!uid || uid === state.me.uid || (state.mode === 'guest' && !uid)) return goHome();
  if (!fb) return goHome();
  try {
    const snap = await fb.F.getDoc(gruRef(uid));
    if (!snap.exists()) { emit('toast', '找不到這隻格魯'); return goHome(); }
    const d = snap.data();
    state.viewing = {
      uid, name:d.name||DEFAULT_GRU_NAME, ownerName:d.ownerName||'某人',
      ownerPhoto:d.ownerPhoto||null, hat:d.hat||null, squashes:d.squashes||0, isMine:false,
      skin: { ...defaultSkin(), ...(d.skin || {}) },     // 別人家會套用別人的外觀
    };
    sync();
    return true;
  } catch (e) { console.warn('拜訪失敗：', e); emit('toast','進不去這隻格魯的家'); return goHome(); }
}

export async function goHome() {
  await flush();
  state.viewing = { ...state.myGru, isMine:true };
  sync();
  return true;
}

/* --------------------------------------------------------------- squash -- */
let squashTicks = 0, flushTarget = null;
// 裝扮增益是百分比，但魚是整數。零頭先累積著，湊滿一條才發，
// 這樣不會出現 0.5 條魚，長期下來比例也是對的。
let fishFrac = 0;

export function squash() {
  const me = state.me, v = state.viewing;
  const r = { counted:false, capped:false, gained:0, goldfish:false, newDay:false, streakEvent:null, helping:!v.isMine };

  const today = dayStr();
  if (me.lastDay !== today) {                        // 跨日：算連續天數
    const gap = dayDiff(me.lastDay, today);
    if (me.lastDay == null)      { r.streakEvent = { kind:'first' }; }
    else if (gap === 1)          { r.streakEvent = { kind:'continue' }; }
    else if (gap > 1) {
      const missed = gap - 1;
      if (me.freezes >= missed)  { me.freezes -= missed; r.streakEvent = { kind:'frozen', used:missed }; }
      else                       { r.streakEvent = { kind:'broken', had:me.streak, missed }; me.streak = 0; }
    }
    me.streak     = (me.streak || 0) + 1;
    me.bestStreak = Math.max(me.bestStreak || 0, me.streak);
    me.lastDay    = today;
    me.todayCount = 0;
    r.newDay      = true;
  }
  if (me.helpDay !== today) { me.helpDay = today; me.helpToday = 0; }
  repairStreak();                            // 防呆：今天玩過就不該是 0 天

  const overDaily = TUNING.dailyCap > 0 && me.todayCount >= TUNING.dailyCap;
  const overHelp  = !v.isMine && TUNING.helpCap > 0 && me.helpToday >= helpCapNow();
  if (overDaily || overHelp) {                       // 壓得動，但不計分
    r.capped = overHelp ? 'help' : 'daily';
    sync(); return r;
  }

  r.counted = true;
  me.todayCount += 1;
  me.lifetime   += 1;
  if (!v.isMine) me.helpToday += 1;

  const mult = me.double > 0 ? 2 : 1;
  if (me.double > 0) me.double -= 1;
  r.gained = TUNING.fishPerSquash * mult;

  const bonus = cosmeticBonus() + buffOf('fish');   // 裝扮持有量 ＋ 寶物增益
  if (bonus > 0) {
    fishFrac += r.gained * bonus;
    if (fishFrac >= 1) { const extra = Math.floor(fishFrac); fishFrac -= extra; r.gained += extra; r.bonusFish = extra; }
  }
  me.fish += r.gained;

  // 🔮 水晶球、🕛 準時 會讓金魚更容易掉
  const goldOdds = Math.max(1, Math.round(TUNING.goldfishOdds * (1 - buffOf('gold'))));
  squashTicks += 1;
  if (squashTicks % goldOdds === 0) { r.goldfish = true; me.goldfish += 1; }

  const drop = rollTreasure();                       // 寶物掉落
  if (drop && unlockTreasure(drop.id)) r.treasure = drop;

  if (!v.isMine && v.uid) {                          // 記下幫過誰，成就要用
    me.helped = { ...me.helped, [v.uid]: (me.helped[v.uid] || 0) + 1 };
  }

  v.squashes += 1;                                   // 眼前這隻格魯的總數
  if (v.isMine) state.myGru.squashes = v.squashes;

  checkAchievements();                     // 成就用既有欄位判定，很便宜

  if (state.mode === 'member') {
    // 在自己家就直接用自己的 uid。之前依賴 state.viewing.uid，
    // 而格魯快照還沒回來時那是 null —— 結果整批寫入的對象是 null，
    // 格魯和小圈子總數兩份就被整個跳過，只有個人資料寫得出去。
    const targetUid = v.isMine ? (state.me.uid || v.uid) : v.uid;
    if (flushTarget && flushTarget !== targetUid) flush();
    flushTarget = targetUid;
    state.pending += 1;
    pendFish += r.gained;
    if (r.goldfish) pendGold += 1;
    outboxAdd(me.uid, flushTarget, 1, r.gained, r.goldfish ? 1 : 0);   // 先落地再說
    scheduleFlush();                     // 停手 1.5 秒就寫出去，不要等滿 8 秒
    if (state.pending >= TUNING.maxPerFlush) flush();
  } else {
    state.global.squashes += 0;                      // 訪客不計入小圈子
    saveGuest();
  }
  sync();
  return r;
}

/* ------------------------------------------------------------ 批次寫入 -- */
let pendFish = 0, pendGold = 0, pendPatch = null, flushing = false, flushTimer = null;
// 正在送出、但伺服器還沒確認的量。
// 少了這個，送出期間來的快照會用「還沒加上這批」的伺服器數字覆蓋畫面，
// 看起來就像數字自己往回跳。
let inflight = { n:0, fish:0, gold:0 };
let failCount = 0, blockedLogged = false;

// 停手之後很快就寫出去。原本只靠 8 秒的定時批次，壓兩下馬上關掉就來不及。
// 連續狂點時 timer 會一直被重設，所以一整串點擊仍然只算一次寫入。
function scheduleFlush() {
  clearTimeout(flushTimer);
  flushTimer = setTimeout(() => flush(), TUNING.quietFlushMs);
}
const queuePatch = p => { pendPatch = { ...(pendPatch||{}), ...p }; };

export async function flush() {
  if (state.mode !== 'member' || !fb) return;
  // 個人資料還沒讀進來就先不要寫。
  // 之前是「照寫，但跳過絕對值欄位」，那留下一個窗口：只要有一次 flush 落在
  // 這個窗口裡，連續天數／凍結卡／幫忙額度就整批不會被寫出去。
  // 乾脆等資料到齊再寫 —— 點擊本來就有待送匣墊著，不會掉。
  if (!state.me.loaded) {
    if (!blockedLogged) {                 // 只印一次，但一定要印
      blockedLogged = true;
      console.warn('POPGRU 寫入暫緩：個人資料還沒讀到（等伺服器的第一份快照）');
    }
    scheduleFlush(); return;
  }
  blockedLogged = false;
  // 前一次還在送就晚點再試。少了這個重排，送出期間累積的點擊
  // 要等 8 秒的保底定時器才會被撿走，剛好卡在「壓完馬上關掉」的空隙。
  if (flushing) { scheduleFlush(); return; }
  clearTimeout(flushTimer);
  const n = state.pending, fish = pendFish, gold = pendGold, patch = pendPatch, target = flushTarget;
  if (!n && !fish && !gold && !patch) return;

  flushing = true;
  inflight = { n, fish, gold };                 // 送出期間先記著，快照才不會把畫面往回拉
  state.pending = 0; pendFish = 0; pendGold = 0; pendPatch = null; flushTarget = null;
  const { F, db } = fb, me = state.me;
  try {
    const b = F.writeBatch(db);
    // 走到這裡代表個人資料一定讀進來了（上面擋掉了），所以絕對欄位一律寫回去。
    const p = {
      lastSeen: F.serverTimestamp(),
      streak: me.streak, bestStreak: me.bestStreak, lastDay: me.lastDay,
      todayCount: me.todayCount, helpToday: me.helpToday, helpDay: me.helpDay,
      freezes: me.freezes, double: me.double,
      ...(patch || {}),
    };
    if (n)    p.lifetime = F.increment(n);
    if (fish) p.fish     = F.increment(fish);
    if (gold) p.goldfish = F.increment(gold);
    b.set(userRef(me.uid), p, { merge:true });

    if (n && target) {
      b.set(gruRef(target), { squashes: F.increment(n), lastSquashedAt: F.serverTimestamp() }, { merge:true });
      if (target !== me.uid) {                       // 幫別人壓 → 在他家留下足跡
        b.set(visitRef(target, me.uid), {
          name: me.name, photo: me.photo, count: F.increment(n), at: F.serverTimestamp(),
        }, { merge:true });
        p['helped.' + target] = F.increment(n);      // 自己這邊也記一筆，成就要用
      }
      b.set(globalRef(), {
        squashes: F.increment(n),
        lastSquasher: { uid: me.uid, name: me.name, at: Date.now() },
      }, { merge:true });
    }
    await b.commit();
    if (n || fish || gold) outboxSettle(me.uid, target, n, fish, gold);   // 確定寫進去了才扣
    failCount = 0;
    console.log(`POPGRU 已寫入 +${n} 下 · 連勝=${me.streak} 幫忙=${me.helpToday} ` +
                `凍結卡=${me.freezes} 雙倍=${me.double}`);
  } catch (e) {
    // 寫入失敗必須看得見。之前只是 console.warn，結果整整一個多小時
    // 沒有任何資料寫進去，畫面上卻完全沒有徵兆。
    failCount++;
    const authUid = fb.auth && fb.auth.currentUser && fb.auth.currentUser.uid;
    console.error(
      `POPGRU 寫入失敗 #${failCount}｜code=${e && e.code}｜${e && e.message}
` +
      `  這批：+${n} 下 給 ${target}
` +
      `  登入身分=${authUid}  我方 uid=${me.uid}  ${authUid === me.uid ? '(一致)' : '(不一致！)'}
` +
      `  等在待送匣的不會掉，但伺服器沒收到`);
    if (failCount === 3) emit('writefail', { code: e && e.code, message: e && e.message });
    state.pending += n; pendFish += fish; pendGold += gold;
    flushTarget = target; if (patch) queuePatch(patch);
  } finally {
    flushing = false;
    inflight = { n:0, fish:0, gold:0 };
    if (state.pending || pendFish || pendGold) scheduleFlush();   // 期間又累積了就再送
  }
}

/* ----------------------------------------------------------- 名單 / 足跡 -- */
// 這三個查詢每次都要讀好幾份文件（名單一次就是全員）。
// 面板一開就重查的話，來回點幾次商店和信箱就燒掉幾百次讀取，
// 所以加一層時間快取；真的需要最新資料時傳 force。
const fetchedAt = { roster:0, visits:0, inbox:0 };
const stale = k => Date.now() - fetchedAt[k] >= TUNING.listTtlMs;

export async function loadRoster(force) {
  if (!fb) return;
  if (!force && !stale('roster') && state.roster.length) return;
  fetchedAt.roster = Date.now();
  try {
    const { F } = fb;
    const q = F.query(F.collection(fb.db,'grus'), F.orderBy('lastSquashedAt','desc'), F.limit(TUNING.rosterSize));
    const snap = await F.getDocs(q);
    state.roster = snap.docs.map(d => ({ uid:d.id, ...d.data() }));
    sync();
  } catch (e) { console.warn('讀取名單失敗：', e); }
}

export async function loadVisits(force) {
  if (!fb || state.mode !== 'member') return;
  if (!force && !stale('visits')) return;
  fetchedAt.visits = Date.now();
  try {
    const { F } = fb;
    const q = F.query(F.collection(fb.db,'grus',state.me.uid,'visits'), F.orderBy('at','desc'), F.limit(20));
    const snap = await F.getDocs(q);
    state.visits = snap.docs.map(d => ({ uid:d.id, ...d.data() })).filter(v => v.uid !== state.me.uid);
    sync();
  } catch (e) { console.warn('讀取足跡失敗：', e); }
}

export async function setGruName(name) {
  const n = String(name).trim().slice(0, 12) || DEFAULT_GRU_NAME;
  state.myGru.name = n;
  if (state.viewing.isMine) state.viewing.name = n;
  sync();
  if (state.mode === 'member' && fb) {
    fb.F.setDoc(gruRef(state.me.uid), { name:n }, { merge:true })
      .catch(e => console.warn('改格魯名失敗：', e));
  } else { saveGuest(); }
}

// 暱稱。同時要更新格魯上的 ownerName，名單才看得到新名字。
export async function setNick(n) {
  // realName() 也擋掉有人直接把暱稱打成「無名氏」——那樣會跟「沒設定」
  // 長得一模一樣，別人根本分不出來
  const nick = realName(String(n || '').slice(0, 12));
  state.me.nick = nick;
  state.me.name = nick || state.me.googleName || NO_NAME;
  // 本機也要立刻改，別等快照繞一圈回來 ——
  // 否則畫面會慢半拍，syncOwnerName() 也會判斷成不一致而多寫一次
  state.myGru.ownerName = state.me.name;
  if (state.viewing.isMine) state.viewing.ownerName = state.me.name;
  sync();
  if (state.mode === 'member' && fb) {
    const { F } = fb;
    const b = F.writeBatch(fb.db);
    b.set(userRef(state.me.uid), { nick: nick, name: state.me.name }, { merge:true });
    b.set(gruRef(state.me.uid),  { ownerName: state.me.name }, { merge:true });
    // 不 await：Firestore 離線時會把寫入排隊，await 下去畫面就卡住了
    // 不重查名單：新名字我們自己就知道，直接改本機那一筆，省下整份查詢
    b.commit().catch(e => console.warn('改暱稱失敗：', e));
    const mine = state.roster.find(g => g.uid === state.me.uid);
    if (mine) mine.ownerName = state.me.name;
  } else { saveGuest(); }
}

export const ownsHat  = e => !!e && state.me.ownedHats.includes(e);
export const hatLocked = e => hatInfo(e).need > state.global.squashes;

// 解鎖一頂帽子。付一次錢，之後換戴免費。
// 帽子的解鎖走 buySkin('hat', …)，這裡只留給舊呼叫點用
export async function buyHat(emoji) { return buySkin('hat', emoji); }

/* ----------------------------------------------------------------- 外觀 -- */
const skinKey = (kind, id) => `${kind}:${id}`;
// 預設款（cost 0）視同人人都有
export const ownsSkin = (kind, id) =>
  skinInfo(kind, id)?.cost === 0
  || state.me.ownedSkins.includes(skinKey(kind, id))
  // 帽子在舊版是獨立的 ownedHats，併進外觀系統之後要繼續認得，不能讓人重買
  || (kind === 'hat' && state.me.ownedHats.includes(id));
export const skinLocked = (kind, id) => (skinInfo(kind, id)?.need || 0) > state.global.squashes;

export async function buySkin(kind, id) {
  const info = skinInfo(kind, id);
  if (!info) throw new Error('沒有這個外觀');
  if (ownsSkin(kind, id))   throw new Error('已經解鎖過了');
  if (skinLocked(kind, id)) throw new Error(`要小圈子壓到 ${info.need.toLocaleString('en-US')} 下才解得開`);
  if (state.me.fish < info.cost) throw new Error('魚不夠');

  state.me.fish -= info.cost;
  state.me.ownedSkins = [...state.me.ownedSkins, skinKey(kind, id)];
  if (kind === 'hat') state.me.ownedHats = [...state.me.ownedHats, id];
  sync();
  if (state.mode === 'member' && fb) {
    const { F } = fb;
    const p = { fish: F.increment(-info.cost), ownedSkins: F.arrayUnion(skinKey(kind, id)) };
    if (kind === 'hat') p.ownedHats = F.arrayUnion(id);   // 舊欄位一起維護，別的裝置才讀得到
    F.setDoc(userRef(state.me.uid), p, { merge:true })
      .catch(e => console.warn('解鎖外觀失敗：', e));
  } else { saveGuest(); }
  await setSkin(kind, id);
}

// 換已解鎖的外觀（免費）。外觀存在格魯上，所以來訪的人也會看到。
// 帽子是特例：它在格魯文件的最上層（gru.hat），不在 skin 裡面 ——
// 舊資料就是那樣存的，改結構等於要遷移所有人的帽子，不值得。
export async function setSkin(kind, id) {
  if (kind === 'hat') return setHat(id === 'none' ? null : id);
  if (!ownsSkin(kind, id)) throw new Error('還沒解鎖這個外觀');
  state.myGru.skin = { ...state.myGru.skin, [kind]: id };
  if (state.viewing.isMine) state.viewing.skin = { ...state.myGru.skin };
  sync();
  if (state.mode === 'member' && fb) {
    fb.F.setDoc(gruRef(state.me.uid), { skin: state.myGru.skin }, { merge:true })
      .catch(e => console.warn('存外觀失敗：', e));
  } else { saveGuest(); }
}

// 目前戴／拿著什麼。帽子從 gru.hat 讀，其他從 gru.skin 讀。
export const wornSkin = (gru = state.viewing) => ({
  ...defaultSkin(), ...(gru.skin || {}), hat: gru.hat || 'none',
});

// 裝扮增益：看「持有幾件」，不看「配備什麼」。
// 這樣就不會有人被迫戴著醜帽子只因為它比較強。
export function cosmeticCount() {
  const keys = new Set(state.me.ownedSkins);
  state.me.ownedHats.forEach(h => keys.add(skinKey('hat', h)));   // 舊紀錄也算
  return keys.size;
}
export const cosmeticBonus = () =>
  Math.min(TUNING.cosmeticCap, cosmeticCount() * TUNING.cosmeticPerItem);

/* ----------------------------------------------------------------- 寶物 -- */
export const hasTreasure = id => state.me.treasures.includes(id);

// 增益是「解鎖就生效」，不需要裝備。同一條軸上的多個寶物直接相加。
export function buffOf(kind) {
  let v = 0;
  for (const id of state.me.treasures) {
    const t = treasureInfo(id);
    if (t && t.buff.kind === kind) v += t.buff.value;
  }
  return v;
}

export const helpedCount = () => Object.keys(state.me.helped || {}).length;

// 道具的實際價格。畫面和扣款都走這裡，兩邊才不會講不一樣的數字。
//   🧊 碎冰  → 凍結卡打折
//   🎁 人緣  → 其他道具打折
// 金魚價不打折（金魚太難拿，再打折就沒有份量了）
export function itemCost(key) {
  const item = ITEMS[key];
  if (!item || !item.cost) return 0;
  if (item.gold) return item.cost;
  const off = key === 'freeze' ? buffOf('freezeOff') : buffOf('giftOff');
  return Math.max(1, Math.round(item.cost * (1 - off)));
}
export const bestHelped  = () => Math.max(0, ...Object.values(state.me.helped || {}));

// 解鎖一個寶物。重複呼叫沒有副作用。
export function unlockTreasure(id, quiet) {
  if (!treasureInfo(id) || hasTreasure(id)) return false;
  state.me.treasures = [...state.me.treasures, id];
  if (state.mode === 'member' && fb) {
    queuePatch({ treasures: fb.F.arrayUnion(id) });
    scheduleFlush();
  } else { saveGuest(); }
  if (!quiet) emit('treasure', treasureInfo(id));
  return true;
}

// 商店寶物用金魚買（金魚原本只能買金牌，這樣它有第二個用途）
export async function buyTreasure(id) {
  const t = treasureInfo(id);
  if (!t || t.source !== 'shop') throw new Error('這個不是商店寶物');
  if (hasTreasure(id))           throw new Error('已經有了');
  if (state.me.goldfish < t.gold) throw new Error(`金魚不夠，需要 ${t.gold} 條`);
  state.me.goldfish -= t.gold;
  if (state.mode === 'member' && fb) {
    queuePatch({ goldfish: fb.F.increment(-t.gold) });
  }
  unlockTreasure(id);
  sync();
}

// 成就都用既有欄位判定，不需要額外的計數器（helped / giftsReceived 除外）
const ACHIEVE = {
  first:   () => state.me.lifetime >= 1,
  k1:      () => state.me.lifetime >= 1000,
  week:    () => state.me.streak >= 7,
  month:   () => state.me.streak >= 30,
  nb3:     () => helpedCount() >= 3,
  nb5:     () => helpedCount() >= 5,
  loved:   () => (state.me.giftsReceived || 0) >= 10,
  mt100k:  () => state.global.squashes >= 100000,
  stylish: () => cosmeticCount() >= 10,
  hatlove: () => SKINS.hat.filter(h => h.cost > 0).every(h => ownsSkin('hat', h.id)),
};

// 回傳這次新解鎖的清單。上線當下大家會一次達成好幾個，所以呼叫端要合併通知。
export function checkAchievements() {
  const got = [];
  for (const [id, test] of Object.entries(ACHIEVE)) {
    if (hasTreasure(id)) continue;
    let ok = false; try { ok = test(); } catch {}
    if (ok && unlockTreasure(id, true)) got.push(treasureInfo(id));
  }
  if (got.length) { sync(); emit('treasures', got); }
  return got;
}

// 掉落。稀有的先擲，才不會被常見的蓋過去。
function rollTreasure() {
  const mult = 1 + buffOf('drop');
  const pool = TREASURES
    .filter(t => t.source === 'drop' && !hasTreasure(t.id))
    .sort((a, b) => RARITY[b.rarity].odds - RARITY[a.rarity].odds);
  for (const t of pool) {
    if (Math.random() < mult / RARITY[t.rarity].odds) return t;
  }
  return null;
}

// 換戴已解鎖的帽子（免費），或傳 null 脫掉
export async function setHat(emoji) {
  if (emoji && !ownsHat(emoji)) throw new Error('還沒解鎖這頂帽子');
  state.myGru.hat = emoji;
  if (state.viewing.isMine) state.viewing.hat = emoji;
  sync();
  if (state.mode === 'member' && fb) {
    fb.F.setDoc(gruRef(state.me.uid), { hat:emoji }, { merge:true })
      .catch(e => console.warn('存帽子失敗：', e));
  } else { saveGuest(); }
}

/* ----------------------------------------------------------------- 信箱 -- */
export async function loadInbox(force) {
  if (!fb || state.mode !== 'member') return;
  if (!force && !stale('inbox')) return;
  fetchedAt.inbox = Date.now();
  try {
    const { F } = fb;
    const q = F.query(inboxCol(state.me.uid), F.orderBy('at','desc'), F.limit(40));
    const snap = await F.getDocs(q);
    state.inbox = snap.docs.map(d => ({ id:d.id, ...d.data() }));
    sync();
  } catch (e) { console.warn('讀取信箱失敗：', e); }
}

export function canPoke(uid) {
  try {
    const m = JSON.parse(localStorage.getItem(POKE_KEY) || '{}');
    return Date.now() - (m[uid]||0) > TUNING.pokeCooldownMs;
  } catch { return true; }
}
const markPoke = uid => {
  try {
    const m = JSON.parse(localStorage.getItem(POKE_KEY) || '{}');
    m[uid] = Date.now(); localStorage.setItem(POKE_KEY, JSON.stringify(m));
  } catch {}
};

export async function sendItem(toUid, key, extra = {}) {
  if (state.mode !== 'member') throw new Error('要登入才能送東西');
  const item = ITEMS[key];
  if (!item)                            throw new Error('沒有這個道具');
  if (toUid === state.me.uid)           throw new Error('不能送給自己');
  if (key === 'poke' && !canPoke(toUid)) throw new Error('剛剛才戳過，等一下再戳');

  const cost = itemCost(key);
  const bal = item.gold ? state.me.goldfish : state.me.fish;
  if (cost > 0 && bal < cost) throw new Error(item.gold ? '金魚不夠' : '魚不夠');

  await flush();
  const { F } = fb;
  const b = F.writeBatch(fb.db);
  b.set(F.doc(inboxCol(toUid)), {
    from:state.me.uid, fromName:state.me.name, type:key,
    at:F.serverTimestamp(), read:false, ...extra,
  });
  if (cost > 0) {
    b.set(userRef(state.me.uid),
      item.gold ? { goldfish:F.increment(-cost) } : { fish:F.increment(-cost) },
      { merge:true });
  }
  await b.commit();
  // 寫入成功之後才扣本機，畫面才會馬上更新。
  // 之前完全沒扣，要等快照繞一圈回來，看起來就像「買了但魚沒變」。
  // 也不能在 commit 之前扣：那樣期間來的快照會拿舊的伺服器值把畫面拉回去。
  if (cost > 0) {
    if (item.gold) state.me.goldfish -= cost; else state.me.fish -= cost;
    sync();
  }
  if (key === 'poke') markPoke(toUid);
}

export async function buyForSelf(key, extra = {}) {
  const item = ITEMS[key], me = state.me;
  if (!item?.self)        throw new Error('這個不能買給自己');
  const cost = itemCost(key);
  if (me.fish < cost) throw new Error('魚不夠');

  me.fish -= cost;
  if (key === 'freeze') me.freezes += 1;
  if (key === 'double') me.double  += TUNING.doubleClicks + buffOf('double');   // 🌌 星塵
  sync();

  if (state.mode === 'member' && fb) {
    const { F } = fb;
    const p = { fish:F.increment(-cost) };        // 要跟本機扣的一致，不能用原價
    if (key === 'freeze') p.freezes = me.freezes;
    if (key === 'double') p.double  = me.double;
    // 不 await：Firestore 離線時會把寫入排隊而不是失敗，
    // await 下去整個函式就卡住，呼叫端的重畫也永遠不會執行。
    F.setDoc(userRef(me.uid), p, { merge:true })
      .catch(e => console.warn('購買寫入失敗：', e));
  } else { saveGuest(); }
}

export async function collectInbox() {
  if (state.mode !== 'member' || !fb) return [];
  const unread = state.inbox.filter(m => !m.read);
  if (!unread.length) return [];

  const me = state.me;
  let fish = 0, freezes = 0, dbl = 0, medals = 0, hat = null;
  for (const m of unread) {
    if (m.type === 'fish')   fish    += (ITEMS.fish.gives || 20);
    if (m.type === 'freeze') freezes += 1;
    if (m.type === 'double') dbl     += TUNING.doubleClicks + buffOf('double');
    if (m.type === 'medal')  medals  += 1;
    if (m.type === 'hat')    hat      = m.hat || '🎩';
  }
  try {
    const { F } = fb;
    const b = F.writeBatch(fb.db);
    const p = { lastSeen:F.serverTimestamp() };
    if (fish)    p.fish    = F.increment(fish);
    if (medals)  p.medals  = F.increment(medals);
    if (freezes) p.freezes = (me.freezes||0) + freezes;
    if (dbl)     p.double  = (me.double ||0) + dbl;
    if (hat)     p.ownedHats = F.arrayUnion(hat);   // 送的帽子一併解鎖，之後能重複戴
    b.set(userRef(me.uid), p, { merge:true });
    if (hat) b.set(gruRef(me.uid), { hat }, { merge:true });
    for (const m of unread) b.update(F.doc(inboxCol(me.uid), m.id), { read:true });
    await b.commit();
    unread.forEach(m => { m.read = true; });
    sync();
  } catch (e) { console.warn('收取信箱失敗：', e); }
  return unread;
}
