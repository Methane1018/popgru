// ============================================================================
//  store.js —— 所有資料都只從這裡進出
//
//  guest  : 完全存在 localStorage，後端零紀錄（不會產生幽靈帳號）
//  member : Google 登入。每個人有一隻格魯 /grus/{uid}，可以互相拜訪、
//           幫對方壓。幫別人壓會同時算進「他家格魯」和「你的個人累計」。
// ============================================================================
import {
  firebaseConfig, FIREBASE_VERSION, TUNING, ITEMS,
  ACCESS, INVITE_CODE, DEFAULT_GRU_NAME, hatInfo,
} from './config.js?v=10';

const CDN       = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;
const GUEST_KEY = 'popgru.guest';
const SEEN_KEY  = 'popgru.lastSeenGlobal';
const POKE_KEY  = 'popgru.pokes';
const OUTBOX_KEY = 'popgru.outbox';   // 還沒寫進 Firestore 的點擊，撐過關頁／重整／當掉
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

/* ---------------------------------------------------------------- events -- */
const listeners = {};
export const on = (evt, fn) => ((listeners[evt] ||= new Set()).add(fn), () => listeners[evt].delete(fn));
const emit = (evt, d) => listeners[evt]?.forEach(fn => { try { fn(d); } catch (e) { console.error(e); } });

/* ----------------------------------------------------------------- state -- */
const blankMe = () => ({
  uid:null, name:null, googleName:null, nick:null, photo:null,
  lifetime:0, fish:0, goldfish:0, medals:0, freezes:0, double:0, ownedHats:[], loaded:false,
  streak:0, bestStreak:0, lastDay:null, todayCount:0, helpToday:0, helpDay:null,
});
const blankGru = () => ({
  uid:null, name:DEFAULT_GRU_NAME, ownerName:null, ownerPhoto:null,
  hat:null, squashes:0, isMine:true,
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

const sync = () => emit('state', state);

// 今天還剩多少額度（會自動處理跨日，所以還沒壓之前顯示也是對的）
export function dailyLeft() {
  if (TUNING.dailyCap <= 0) return Infinity;
  const used = state.me.lastDay === dayStr() ? (state.me.todayCount || 0) : 0;
  return Math.max(0, TUNING.dailyCap - used);
}
export function helpLeft() {
  if (TUNING.helpCap <= 0) return Infinity;
  const used = state.me.helpDay === dayStr() ? (state.me.helpToday || 0) : 0;
  return Math.max(0, TUNING.helpCap - used);
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
      gruName: state.myGru.name, gruHat: state.myGru.hat, gruSquashes: state.myGru.squashes,
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
  });
  Object.assign(state.myGru, blankGru(), {
    name:g.gruName||DEFAULT_GRU_NAME, hat:g.gruHat||null, squashes:g.gruSquashes||0,
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
    } else {                                            // 之後只更新頭像和名字
      await F.setDoc(gruRef(uid),
        { ownerName: state.me.name, ownerPhoto: state.me.photo }, { merge: true });
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
    const d = s.data() || {};
    Object.assign(state.me, {
      lifetime:d.lifetime||0, fish:d.fish||0, goldfish:d.goldfish||0,
      medals:d.medals||0, freezes:d.freezes||0, double:d.double||0,
      // 舊制買過的帽子（只存在 grus.hat）視同已解鎖，不能讓人白花錢
      ownedHats: Array.from(new Set([
        ...(Array.isArray(d.ownedHats) ? d.ownedHats : []),
        ...(state.myGru.hat ? [state.myGru.hat] : []),
      ])),
      streak:d.streak||0, bestStreak:d.bestStreak||0,
      lastDay:d.lastDay||null, todayCount:d.todayCount||0,
      helpToday:d.helpToday||0, helpDay:d.helpDay||null,
      nick: realName(d.nick),
      googleName: realName(d.googleName) || state.me.googleName,
      name: realName(d.nick) || realName(d.googleName) || state.me.googleName || NO_NAME,
      photo: d.photo || state.me.photo,
    });
    sync();
  }, e => console.warn('讀取個人資料失敗：', e));

  unsubGru?.();
  unsubGru = F.onSnapshot(gruRef(uid), s => {
    const d = s.data() || {};
    state.myGru = {
      uid, name:d.name||DEFAULT_GRU_NAME, ownerName:d.ownerName||state.me.name,
      ownerPhoto:d.ownerPhoto||state.me.photo, hat:d.hat||null,
      squashes:d.squashes||0, isMine:true,
    };
    if (state.viewing.isMine) state.viewing = { ...state.myGru };
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
    flushTarget = t;
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

  const overDaily = TUNING.dailyCap > 0 && me.todayCount >= TUNING.dailyCap;
  const overHelp  = !v.isMine && TUNING.helpCap > 0 && me.helpToday >= TUNING.helpCap;
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
  me.fish += r.gained;

  squashTicks += 1;
  if (squashTicks % TUNING.goldfishOdds === 0) { r.goldfish = true; me.goldfish += 1; }

  v.squashes += 1;                                   // 眼前這隻格魯的總數
  if (v.isMine) state.myGru.squashes = v.squashes;

  if (state.mode === 'member') {
    if (flushTarget && flushTarget !== v.uid) flush();
    flushTarget = v.uid;
    state.pending += 1;
    pendFish += r.gained;
    if (r.goldfish) pendGold += 1;
    outboxAdd(me.uid, v.uid, 1, r.gained, r.goldfish ? 1 : 0);   // 先落地再說
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

// 停手之後很快就寫出去。原本只靠 8 秒的定時批次，壓兩下馬上關掉就來不及。
// 連續狂點時 timer 會一直被重設，所以一整串點擊仍然只算一次寫入。
function scheduleFlush() {
  clearTimeout(flushTimer);
  flushTimer = setTimeout(() => flush(), TUNING.quietFlushMs);
}
const queuePatch = p => { pendPatch = { ...(pendPatch||{}), ...p }; };

export async function flush() {
  if (state.mode !== 'member' || !fb) return;
  // 前一次還在送就晚點再試。少了這個重排，送出期間累積的點擊
  // 要等 8 秒的保底定時器才會被撿走，剛好卡在「壓完馬上關掉」的空隙。
  if (flushing) { scheduleFlush(); return; }
  clearTimeout(flushTimer);
  const n = state.pending, fish = pendFish, gold = pendGold, patch = pendPatch, target = flushTarget;
  if (!n && !fish && !gold && !patch) return;

  flushing = true;
  state.pending = 0; pendFish = 0; pendGold = 0; pendPatch = null; flushTarget = null;
  const { F, db } = fb, me = state.me;
  try {
    const b = F.writeBatch(db);
    // 絕對欄位只有在個人資料真的讀進來之後才寫回去。
    // 否則補送時（快照還沒回來）會把連續天數、凍結卡、雙倍卡全部覆寫成 0。
    const p = { lastSeen: F.serverTimestamp(), ...(patch || {}) };
    if (me.loaded) Object.assign(p, {
      streak: me.streak, bestStreak: me.bestStreak, lastDay: me.lastDay,
      todayCount: me.todayCount, helpToday: me.helpToday, helpDay: me.helpDay,
      freezes: me.freezes, double: me.double,
    });
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
      }
      b.set(globalRef(), {
        squashes: F.increment(n),
        lastSquasher: { uid: me.uid, name: me.name, at: Date.now() },
      }, { merge:true });
    }
    await b.commit();
    if (n || fish || gold) outboxSettle(me.uid, target, n, fish, gold);   // 確定寫進去了才扣
  } catch (e) {
    console.warn('寫入失敗，稍後重試：', e);
    state.pending += n; pendFish += fish; pendGold += gold;
    flushTarget = target; if (patch) queuePatch(patch);
  } finally {
    flushing = false;
    if (state.pending || pendFish || pendGold) scheduleFlush();   // 期間又累積了就再送
  }
}

/* ----------------------------------------------------------- 名單 / 足跡 -- */
export async function loadRoster() {
  if (!fb) return;
  try {
    const { F } = fb;
    const q = F.query(F.collection(fb.db,'grus'), F.orderBy('lastSquashedAt','desc'), F.limit(TUNING.rosterSize));
    const snap = await F.getDocs(q);
    state.roster = snap.docs.map(d => ({ uid:d.id, ...d.data() }));
    sync();
  } catch (e) { console.warn('讀取名單失敗：', e); }
}

export async function loadVisits() {
  if (!fb || state.mode !== 'member') return;
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
  sync();
  if (state.mode === 'member' && fb) {
    const { F } = fb;
    const b = F.writeBatch(fb.db);
    b.set(userRef(state.me.uid), { nick: nick, name: state.me.name }, { merge:true });
    b.set(gruRef(state.me.uid),  { ownerName: state.me.name }, { merge:true });
    // 不 await：Firestore 離線時會把寫入排隊，await 下去畫面就卡住了
    b.commit().then(() => loadRoster()).catch(e => console.warn('改暱稱失敗：', e));
  } else { saveGuest(); }
}

export const ownsHat  = e => !!e && state.me.ownedHats.includes(e);
export const hatLocked = e => hatInfo(e).need > state.global.squashes;

// 解鎖一頂帽子。付一次錢，之後換戴免費。
export async function buyHat(emoji) {
  const info = hatInfo(emoji);
  if (ownsHat(emoji))   throw new Error('已經解鎖過了');
  if (hatLocked(emoji)) throw new Error(`要小圈子壓到 ${info.need.toLocaleString('en-US')} 下才解得開`);
  if (state.me.fish < info.cost) throw new Error('魚不夠');

  state.me.fish -= info.cost;
  state.me.ownedHats = [...state.me.ownedHats, emoji];
  sync();
  if (state.mode === 'member' && fb) {
    const { F } = fb;
    F.setDoc(userRef(state.me.uid),
      { fish: F.increment(-info.cost), ownedHats: F.arrayUnion(emoji) }, { merge:true })
      .catch(e => console.warn('解鎖帽子失敗：', e));
  } else { saveGuest(); }
  await setHat(emoji);                       // 解鎖後直接戴上
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
export async function loadInbox() {
  if (!fb || state.mode !== 'member') return;
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

  const bal = item.gold ? state.me.goldfish : state.me.fish;
  if (item.cost > 0 && bal < item.cost) throw new Error(item.gold ? '金魚不夠' : '魚不夠');

  await flush();
  const { F } = fb;
  const b = F.writeBatch(fb.db);
  b.set(F.doc(inboxCol(toUid)), {
    from:state.me.uid, fromName:state.me.name, type:key,
    at:F.serverTimestamp(), read:false, ...extra,
  });
  if (item.cost > 0) {
    b.set(userRef(state.me.uid),
      item.gold ? { goldfish:F.increment(-item.cost) } : { fish:F.increment(-item.cost) },
      { merge:true });
  }
  await b.commit();
  if (key === 'poke') markPoke(toUid);
}

export async function buyForSelf(key, extra = {}) {
  const item = ITEMS[key], me = state.me;
  if (!item?.self)        throw new Error('這個不能買給自己');
  if (me.fish < item.cost) throw new Error('魚不夠');

  me.fish -= item.cost;
  if (key === 'freeze') me.freezes += 1;
  if (key === 'double') me.double  += TUNING.doubleClicks;
  sync();

  if (state.mode === 'member' && fb) {
    const { F } = fb;
    const p = { fish:F.increment(-item.cost) };
    if (key === 'freeze') p.freezes = me.freezes;
    if (key === 'double') p.double  = me.double;
    try { await F.setDoc(userRef(me.uid), p, { merge:true }); }
    catch (e) { console.warn('購買寫入失敗：', e); }
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
    if (m.type === 'double') dbl     += TUNING.doubleClicks;
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
