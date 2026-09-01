// ============================================================================
//  app.js —— 畫面與互動。所有資料都跟 store.js 要。
// ============================================================================
import * as S from './store.js?v=0.9.2';
import {
  TUNING, ITEMS, MILESTONES, HATS,
  ACCESS, DEFAULT_GRU_NAME, APP_VERSION, CHANGELOG,
  SKINS, SKIN_KINDS, skinInfo, defaultSkin,
  TREASURES, RARITY, SOURCE_LABEL, treasureHow,
} from './config.js?v=0.9.2';

console.log(`%cPOPGRU v${APP_VERSION}`, 'font-weight:bold');

// 記住朋友看過哪一版的更新內容，沒看過就在版本號旁邊點一個小點
const SEEN_VER = 'popgru.seenVersion';
const seenVersion = () => { try { return localStorage.getItem(SEEN_VER); } catch { return null; } };
function markVersionSeen() {
  try { localStorage.setItem(SEEN_VER, APP_VERSION); } catch {}
  document.getElementById('brand')?.classList.remove('fresh');
}

const $  = id => document.getElementById(id);
const el = (tag, cls, text) => { const n = document.createElement(tag);
  if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
const nf = n => (n || 0).toLocaleString('en-US');
// 舊版可能把「無名氏」寫進別人的 ownerName，顯示時當成沒設定
const who = (v, fallback = '某人') =>
  (v && v !== '無名氏') ? v : fallback;

// 信箱和足跡存的是「寄出當下」的名字。對方改暱稱之後，那些舊紀錄就
// 認不出是誰了，所以顯示時改用名單裡的現名，並把當時的名字附在後面。
function senderName(uid, stored) {
  const cur = who(S.state.roster.find(g => g.uid === uid)?.ownerName, null);
  const old = who(stored, null);
  return { now: cur || old || '某人',
           then: (cur && old && cur !== old) ? old : null };
}

/* ------------------------------------------------------------- 時間格式 -- */
const ms = t => !t ? 0 : (typeof t === 'number' ? t : (t.toMillis ? t.toMillis() : +new Date(t)));
function ago(t) {
  const d = Date.now() - ms(t);
  if (!ms(t) || d < 0) return '';
  const m = d / 60000;
  if (m < 1)    return '剛剛';
  if (m < 60)   return `${Math.floor(m)} 分鐘前`;
  if (m < 1440) return `${Math.floor(m / 60)} 小時前`;
  const days = Math.floor(m / 1440);
  return days < 30 ? `${days} 天前` : `${Math.floor(days / 30)} 個月前`;
}

/* ------------------------------------------------------------------ 外觀 -- */
// 表情符號背景直接用內嵌 SVG 平鋪，不需要任何圖檔
const emojiTile = e => `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72">` +
  `<text x="36" y="47" font-size="26" text-anchor="middle" opacity="0.13">${e}</text></svg>`)}")`;

// 套用外觀。參數是「正在看的那隻格魯」的外觀 —— 所以去別人家會看到他的樣子。
function applySkin(skin) {
  const sk = { ...defaultSkin(), ...(skin || {}) };
  const b  = document.body;
  const bg = skinInfo('bg', sk.bg);
  b.dataset.bg = bg.id;
  b.style.setProperty('--skin-tile', bg.emoji ? emojiTile(bg.emoji) : 'none');
  b.style.setProperty('--skin-tint', skinInfo('tint', sk.tint).filter || 'none');
  b.dataset.font = skinInfo('font', sk.font).id;

  const hat = sk.hat && sk.hat !== 'none' ? sk.hat : '';
  hatEl.textContent = hat; hatEl.hidden = !hat;
  const hold = sk.hold && sk.hold !== 'none' ? sk.hold : '';
  holdEl.textContent = hold; holdEl.hidden = !hold;
}

/* ------------------------------------------------------------------ 姿勢 -- */
const stage = $('stage'), imgTall = $('imgTall'), imgFlat = $('imgFlat'),
      shadow = $('shadow'), hatEl = $('hat'), holdEl = $('hold');
// pointerDown 是「手指還壓著嗎」，squashed 是「畫面上扁了嗎」。
// 這兩件事必須分開：狂點時每一下都要算到，但畫面可以整段維持扁的。
let pointerDown = false, squashed = false, pressedAt = 0, releaseTimer = null, stuckTimer = null;
const MIN_SQUASH_MS = 110;

function setPose(flat, stuck = false) {
  squashed = flat;
  imgTall.classList.toggle('hide',  flat);
  imgFlat.classList.toggle('hide', !flat);
  const p = flat ? 'flat' : 'tall';
  shadow.className = 'shadow ' + p;
  hatEl.className  = 'hat '    + p + (stuck ? ' stuck' : '');
  holdEl.className = 'hold '   + p + (stuck ? ' stuck' : '');
}

/* ------------------------------------------------------------------ 音效 -- */
let ac = null, soundOn = true;
try { soundOn = localStorage.getItem('popgru.sound') !== '0'; } catch {}

function tone({ from, to, dur = 0.1, type = 'sine', vol = 0.25, delay = 0 }) {
  if (!soundOn) return;
  try {
    ac ||= new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    const t = ac.currentTime + delay;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 1.6);
    o.connect(g).connect(ac.destination);
    o.start(t); o.stop(t + dur * 2);
  } catch {}
}
function fwump() {
  if (!soundOn) return;
  try {
    ac ||= new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    const t = ac.currentTime, len = Math.floor(ac.sampleRate * 0.05);
    const buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random()*2-1) * (1 - i/len) ** 2;
    const s = ac.createBufferSource(); s.buffer = buf;
    const g = ac.createGain(); g.gain.value = 0.16;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100;
    s.connect(lp).connect(g).connect(ac.destination); s.start(t);
  } catch {}
}
const sfxDown = () => { tone({ from:460, to:90,  dur:0.09, type:'sine',     vol:0.30 }); fwump(); };
const sfxUp   = () =>   tone({ from:180, to:420, dur:0.09, type:'triangle', vol:0.13 });
const sfxGold = () => { tone({ from:660, to:990, dur:0.10, type:'triangle', vol:0.20 });
                        tone({ from:880, to:1320,dur:0.14, type:'triangle', vol:0.16, delay:0.09 }); };
const sfxSad  = () =>   tone({ from:300, to:110, dur:0.34, type:'sawtooth', vol:0.14 });

/* ------------------------------------------------------------------ 互動 -- */
let stuck = false;                                    // 稀有事件：企鵝彈不回來

// 彩蛋的計數器。都放在記憶體裡，重整就歸零 —— 本來就該是「一口氣做到」。
let tickleRun = 0, comboRun = 0, lastSquashAt = 0, brandRun = 0, brandAt = 0;

function checkEggs(ev, r) {
  if (!r.counted) return;
  const now = Date.now();

  // 🕛 準時：整點剛過的那一分鐘
  if (new Date().getMinutes() === 0) S.unlockTreasure('oclock');

  // 🦶 搔癢：連續戳腳 10 下（腳大約在舞台下緣 15%）
  if (ev && typeof ev.clientY === 'number') {
    const b = stage.getBoundingClientRect();
    tickleRun = ((ev.clientY - b.top) / b.height) > 0.85 ? tickleRun + 1 : 0;
    if (tickleRun >= 10) S.unlockTreasure('tickle');
  }

  // 🔁 一鏡到底：連續 100 下，中間不能停超過 2 秒
  comboRun = (now - lastSquashAt < 2000) ? comboRun + 1 : 1;
  lastSquashAt = now;
  if (comboRun >= 100) S.unlockTreasure('combo');
}

function press(ev) {
  if (pointerDown || stuck) return;      // 擋的是「按住不放」，不是「按太快」
  pointerDown = true;
  clearTimeout(releaseTimer);
  pressedAt = performance.now();
  if (!squashed) setPose(true);
  $('hint').textContent = '';            // 要在 squash() 之前，否則會蓋掉額度用完的提示

  const r = S.squash();
  sfxDown();
  if (navigator.vibrate) { try { navigator.vibrate(r.goldfish ? [12,40,24] : 12); } catch {} }

  if (r.goldfish) {                      // 攤在地上三秒，掉一條金魚
    stuck = true;
    setPose(true, true);
    sfxSad();
    toast('🥇 格魯攤了 · 掉了一條金魚');
    clearTimeout(stuckTimer);
    stuckTimer = setTimeout(() => {
      stuck = false;
      if (!pointerDown) { setPose(false); sfxUp(); } else { setPose(true); }
      sfxGold();
    }, 3000);
    return;
  }
  checkEggs(ev, r);
  if (r.newDay && r.streakEvent) announceStreak(r.streakEvent);
  if (r.capped) toast(r.capped === 'help'
    ? '今天幫忙的額度用完了，明天再來幫他'
    : '今天壓滿了，明天再來');
}

function release() {
  if (!pointerDown) return;
  pointerDown = false;
  if (stuck) return;
  // 畫面至少維持扁的 110ms，快點時就整段維持扁的，不會擋掉任何一下
  const wait = Math.max(0, MIN_SQUASH_MS - (performance.now() - pressedAt));
  clearTimeout(releaseTimer);
  releaseTimer = setTimeout(() => {
    if (!stuck && !pointerDown) { setPose(false); sfxUp(); }
  }, wait);
}

function announceStreak(e) {
  if (e.kind === 'frozen')   toast(`🧊 用掉 ${e.used} 張凍結卡，連續天數保住了`);
  else if (e.kind === 'broken') toast(`連續 ${e.had} 天中斷了，重新開始`);
  else if (e.kind === 'continue') toast(`🔥 連續第 ${S.state.me.streak} 天`);
}

stage.addEventListener('pointerdown', e => {
  e.preventDefault();
  try { stage.setPointerCapture?.(e.pointerId); } catch {}
  press(e);                              // 帶著事件，搔癢彩蛋要知道點在哪
});
['pointerup','pointercancel'].forEach(t =>
  stage.addEventListener(t, e => { e.preventDefault(); release(); }));
stage.addEventListener('contextmenu', e => e.preventDefault());
stage.addEventListener('dragstart',   e => e.preventDefault());
stage.addEventListener('keydown', e => {
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); press(); } });
stage.addEventListener('keyup', e => {
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); release(); } });

// 分頁切到背景就停手，順便把累積的點擊寫出去
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { release(); S.flush(); } });
window.addEventListener('pagehide', () => S.flush());
setInterval(() => S.flush(), TUNING.flushMs);

/* ------------------------------------------------------------------ 提示 -- */
let toastTimer = null;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ------------------------------------------------------------------ 畫面 -- */
let lastCount = -1;

function render() {
  const st = S.state, me = st.me, v = st.viewing;

  // --- 身分列 ---
  const who = $('who');
  who.innerHTML = '';
  if (st.mode === 'member') {
    if (me.photo) { const i = new Image(); i.src = me.photo; i.className = 'avatar'; i.alt = ''; who.append(i); }
    who.append(el('span', 'who-name', me.name));
    const out = el('button', 'link', '登出');
    out.onclick = () => S.signOut();
    who.append(out);
  } else if (S.configured && !st.offline) {
    const b = el('button', 'btn primary', 'Google 登入');
    b.onclick = async () => { try { await S.signIn(); } catch (e) { toast('登入失敗：' + e.message); } };
    who.append(b);
    if (me.lifetime > 0) who.append(el('span', 'who-hint', `登入把 ${nf(me.lifetime)} 下算進去`));
  } else {
    who.append(el('span', 'who-hint', st.offline ? '離線模式' : '訪客模式'));
  }

  // --- 小圈子總數 + 里程碑 ---
  const shown = S.configured && !st.offline ? st.global.squashes : me.lifetime;
  $('countLabel').textContent = S.configured && !st.offline ? '小圈子總共壓了' : '你總共壓了';
  const c = $('count');
  c.textContent = nf(shown);
  if (shown !== lastCount) {
    c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump');
    lastCount = shown;
  }
  const next = MILESTONES.find(m => m.at > shown);
  if (next) {
    const prev = [...MILESTONES].reverse().find(m => m.at <= shown)?.at || 0;
    const pct = Math.max(0, Math.min(100, (shown - prev) / (next.at - prev) * 100));
    $('barFill').style.width = pct + '%';
    $('barText').textContent = `距離「${next.label}」還有 ${nf(next.at - shown)} 下 · 解鎖 ${next.unlock}`;
    $('bar').hidden = false;
  } else { $('bar').hidden = true; }

  // --- 格魯 ---
  $('gruName').textContent  = v.name || DEFAULT_GRU_NAME;
  $('gruCount').textContent = `${nf(v.squashes)} 下`;
  const helpLeft = S.helpLeft();
  $('gruOwner').textContent = v.isMine
    ? '你的格魯'
    : helpLeft === Infinity ? `${v.ownerName} 的格魯 · 你是客人`
    : helpLeft > 0          ? `${v.ownerName} 的格魯 · 今天還能幫 ${nf(helpLeft)} 下`
                            : `${v.ownerName} 的格魯 · 今天幫忙的額度用完了`;
  document.body.classList.toggle('visiting', !v.isMine);
  // 看誰家就套誰的外觀；自己家在試外觀時顯示預覽
  const worn = S.wornSkin(v);
  applySkin(v.isMine && skinPreview ? { ...worn, ...skinPreview } : worn);

  const ls = st.opening.lastSquasher;
  $('lastSquasher').textContent = !ls ? ''
    : ls.uid === me.uid ? `上一個壓的是你自己 · ${ago(ls.at)}`
    : `上一個壓的是 ${ls.name} · ${ago(ls.at)}`;

  // --- 個人數字 ---
  const alive = S.streakAlive(me.lastDay);
  $('statStreak').textContent = `${alive ? '🔥' : '💤'} ${me.streak || 0} 天`;
  $('statFish').textContent   = `🐟 ${nf(me.fish)}`;
  $('statMine').textContent   = `⭐️ ${nf(me.lifetime)}`;
  $('statExtra').textContent  = [
    helpLeft !== Infinity ? `🤝 ${nf(helpLeft)}` : '',
    me.goldfish ? `🥇 ${me.goldfish}` : '',
    me.freezes  ? `🧊 ${me.freezes}`  : '',
    me.double   ? `⚡ ${me.double}`   : '',
    me.medals   ? `🏅 ${me.medals}`   : '',
  ].filter(Boolean).join('  ');

  if (!v.isMine && helpLeft === 0)
    $('hint').textContent = '額度用完了，還是可以壓爽的，只是不計分';

  const unread = st.inbox.filter(m => !m.read).length;
  $('navInbox').textContent = unread ? `📬 ${unread}` : '📭';
  $('navInbox').classList.toggle('alert', unread > 0);
  $('navHome').hidden = v.isMine;

  const social = st.mode === 'member';
  $('navPeople').disabled = !social;
  $('navItems').disabled  = !social;   // 裝扮訪客也能玩，資料先存本機
  $('navInbox').disabled  = !social;
  $('shareBtn').hidden    = !social;

}

/* ------------------------------------------------------------------ 面板 -- */
// 面板一旦畫出來就不再被狀態更新碰。
// 之前讓它跟著 sync 自動重繪，結果是：朋友一壓，meta/global 的快照推過來就把面板
// 清空，而 panelInbox 是 async 的，清空之後要等 await 才畫得回來 ——
// 朋友越活躍，信箱就越畫不出來。現在只有「該面板自己的資料載完」才重畫。
let openPanel = null, subView = false;

function showPanel(name) {
  openPanel = name;
  subView = false;
  document.body.classList.add('sheet-open');
  $('sheet').classList.add('open');
  $('scrim').classList.add('open');
  renderPanel(name);
}
function refreshPanel(name) {
  if (openPanel === name && !subView) renderPanel(name);
}
function closePanel() {
  exitPreview(false);                 // 預覽罩也要收掉
  clearSkinPreview();                 // 沒按確認就離開＝不要那個預覽
  openPanel = null; subView = false;
  document.body.classList.remove('sheet-open');
  $('sheet').classList.remove('open');
  $('scrim').classList.remove('open');
}
$('scrim').onclick = closePanel;
$('sheetClose').onclick = closePanel;

function renderPanel(name) {
  const body = $('sheetBody'); body.innerHTML = '';
  $('sheetTitle').textContent =
    { people:'大家的格魯', items:'道具', wardrobe:'裝扮', codex:'圖鑑', inbox:'信箱',
      me:'我的格魯', changelog:'更新內容' }[name] || '';
  ({ people: panelPeople, items: panelItems, wardrobe: panelWardrobe, codex: panelCodex,
     inbox: panelInbox, me: panelMe, changelog: panelChangelog })[name]?.(body);
}

/* --- 外觀 --- */
// 點選只是「預覽」，不會扣錢。要按下面那條的按鈕才真的買 / 換。
// 直接點就買太容易誤觸了。
let skinPreview = null;

function skinPickerState() {
  const cur = S.wornSkin(S.state.myGru);   // 含帽子與手持物
  const sel = { ...cur, ...(skinPreview || {}) };
  const toBuy = SKIN_KINDS.map(({ k }) => ({ k, id: sel[k] }))
                          .filter(({ k, id }) => !S.ownsSkin(k, id));
  const cost = toBuy.reduce((a, { k, id }) => a + skinInfo(k, id).cost, 0);
  const changed = SKIN_KINDS.some(({ k }) => sel[k] !== cur[k]);
  return { cur, sel, toBuy, cost, changed };
}

function clearSkinPreview() {
  if (!skinPreview) return;
  skinPreview = null;
  // 一定要用 wornSkin：帽子存在 gru.hat，不在 gru.skin 裡面。
  // 直接傳 .skin 的話 defaultSkin() 會把 hat 補成 'none'，原本戴的帽子就不見了。
  applySkin(S.wornSkin(S.state.viewing));
}

// 全畫面預覽：把商店收起來讓你真的看得到企鵝。
// 期間整個畫面被罩住，點任何地方都是結束預覽。
let previewing = false;

function enterPreview() {
  const { sel, cur } = skinPickerState();
  const names = SKIN_KINDS.filter(({ k }) => sel[k] !== cur[k])
                          .map(({ k }) => skinInfo(k, sel[k]).name).join('、');
  previewing = true;
  document.body.classList.remove('sheet-open');
  $('sheet').classList.remove('open');
  $('scrim').classList.remove('open');
  $('previewWhat').textContent = names ? `預覽中：${names}` : '預覽中';
  $('previewVeil').hidden = false;
  applySkin({ ...cur, ...skinPreview });
}

function exitPreview(back = true) {
  if (!previewing) return;
  previewing = false;
  $('previewVeil').hidden = true;
  if (back && openPanel) {               // 回到剛才那個選單
    document.body.classList.add('sheet-open');
    $('sheet').classList.add('open');
    $('scrim').classList.add('open');
    renderPanel(openPanel);
  }
}

$('previewVeil').onclick = () => exitPreview();      // 點任何地方都結束

// 裝扮：帽子／手持物／背景／顏色／數字，五類共用同一套流程。
// 點選只是預覽，要按底下的按鈕才會真的買或換。
let wardrobeTab = 'hat';

function panelWardrobe(body) {
  const st = S.state;
  const { cur, sel, toBuy, cost, changed } = skinPickerState();
  const owned = S.cosmeticCount();
  const bonus = Math.round(S.cosmeticBonus() * 100);

  body.append(el('p', 'note', `🐟 ${nf(st.me.fish)}　·　已收集 ${owned} 件裝扮`));
  body.append(el('p', 'hint-sm',
    bonus > 0
      ? `持有裝扮讓你每次壓扁多拿 ${bonus}% 的魚 —— 看的是「擁有幾件」，不是身上穿什麼，所以隨你怎麼搭。`
      : '買下任何一件裝扮就會開始有微量加成，而且看的是持有量，不是身上穿什麼。'));

  // 分類
  const tabs = el('div', 'tabs');
  for (const { k, label } of SKIN_KINDS) {
    const t = el('button', 'tab' + (wardrobeTab === k ? ' on' : ''), label);
    t.onclick = () => { wardrobeTab = k; renderPanel('wardrobe'); };
    tabs.append(t);
  }
  body.append(tabs);

  const kind = wardrobeTab;
  const grid = el('div', 'grid');
  for (const item of SKINS[kind]) {
    const has      = S.ownsSkin(kind, item.id);
    const locked   = S.skinLocked(kind, item.id);
    const selected = sel[kind] === item.id;
    const inUse    = cur[kind] === item.id;

    const cell = el('div', 'hat-cell');
    // 帽子和手持物用符號當按鈕，其他用名字
    const face = (kind === 'hat' || kind === 'hold')
      ? (item.id === 'none' ? '🚫' : item.id)
      : item.name;
    const b = el('button',
      (kind === 'hat' || kind === 'hold' ? 'emoji-btn' : 'skin-btn')
      + (selected ? ' on' : '') + (locked ? ' locked' : ''), face);
    b.title = item.name;

    if (locked) {
      b.disabled = true;
      cell.append(b);
      if (kind === 'hat' || kind === 'hold') cell.append(el('span', 'cell-name', item.name));
      cell.append(el('span', 'hat-need', nf(item.need)));
    } else {
      b.onclick = () => {                       // 只預覽，不扣錢
        skinPreview = { ...(skinPreview || {}), [kind]: item.id };
        applySkin({ ...cur, ...skinPreview });
        renderPanel('wardrobe');
      };
      if (!has && st.me.fish < item.cost) b.classList.add('poor');
      cell.append(b);
      // 帽子和手持物只有一個符號，名字不能只放在 title —— 手機上看不到
      if (kind === 'hat' || kind === 'hold') cell.append(el('span', 'cell-name', item.name));
      cell.append(el('span', 'hat-need',
        inUse ? '使用中' : has ? '已擁有' : `${item.cost} 🐟`));
    }
    grid.append(cell);
  }
  body.append(grid);

  // 底部確認列：真正花錢的地方只有這裡
  const bar = el('div', 'skin-bar');
  if (!changed) {
    bar.append(el('span', 'skin-bar-note', '點上面的樣式試看看，這裡會出現預覽和購買按鈕'));
  } else {
    const names = SKIN_KINDS.filter(({ k }) => sel[k] !== cur[k])
                            .map(({ k }) => skinInfo(k, sel[k]).name).join('、');
    const apply = async () => {
      for (const { k, id } of toBuy) await S.buySkin(k, id);
      for (const { k } of SKIN_KINDS) if (sel[k] !== cur[k]) await S.setSkin(k, sel[k]);
      skinPreview = null;
      exitPreview(false);
    };
    if (toBuy.length) {
      const poor = st.me.fish < cost;
      bar.append(el('span', 'skin-bar-note', `預覽中：${names}　未擁有 ${toBuy.length} 項`));
      const buy = el('button', 'btn primary', `購買並使用 · ${cost} 🐟`);
      buy.disabled = poor;
      if (poor) buy.title = '魚不夠';
      buy.onclick = async () => {
        buy.disabled = true;
        try { await apply(); toast(`買下並換上「${names}」`); renderPanel('wardrobe'); }
        catch (e) { toast(e.message); buy.disabled = false; }
      };
      bar.append(buy);
    } else {
      bar.append(el('span', 'skin-bar-note', `預覽中：${names}　都已經擁有`));
      const use = el('button', 'btn primary', '換上這一套');
      use.onclick = async () => {
        try { await apply(); toast(`換成「${names}」`); renderPanel('wardrobe'); }
        catch (e) { toast(e.message); }
      };
      bar.append(use);
    }
    const look = el('button', 'btn', '👀 預覽');
    look.title = '把面板收起來，全畫面看效果';
    look.onclick = enterPreview;
    bar.append(look);

    const undo = el('button', 'btn', '還原');
    undo.onclick = () => { clearSkinPreview(); renderPanel('wardrobe'); };
    bar.append(undo);
  }
  body.append(bar);
}


/* --- 圖鑑 --- */
let dexFilter = 'all', dexDetail = null;

// 點任何一格看細節。手機上不能靠滑鼠停留，所以細節一定要點得開，
// 而且解鎖後要看得到「當初是怎麼拿到的」—— 不然不知不覺解鎖的人一頭霧水。
function dexDetailView(body, t) {
  const has = S.hasTreasure(t.id);
  const back = el('button', 'btn', '← 回圖鑑');
  back.onclick = () => { dexDetail = null; renderPanel('codex'); };
  body.append(back);

  const head = el('div', 'dex-detail');
  head.append(el('div', 'dex-detail-icon' + (has ? '' : ' locked'), has ? t.icon : '❔'));
  head.append(el('div', 'dex-detail-name', has ? t.name : '???'));
  const tags = el('div', 'dex-detail-tags');
  const rar = el('span', 'dex-rar', RARITY[t.rarity].name);
  rar.style.background = RARITY[t.rarity].color;
  tags.append(rar, el('span', 'dex-rar src', SOURCE_LABEL[t.source]));
  head.append(tags);
  body.append(head);

  body.append(el('p', 'note', has ? '怎麼拿到的' : '線索'));
  body.append(el('p', 'dex-line', has ? treasureHow(t) : t.hint));

  if (has) {
    body.append(el('p', 'note', '增益'));
    body.append(el('p', 'dex-line', buffText(t)));
  } else {
    body.append(el('p', 'hint-sm', '拿到之後才會知道它有什麼效果。'));
    if (t.source === 'shop') {
      const b = el('button', 'btn primary', `用 ${t.gold} 🥇 換`);
      b.onclick = async () => {
        try { await S.buyTreasure(t.id); toast(`換到 ${t.icon} ${t.name}`); renderPanel('codex'); }
        catch (e) { toast(e.message); }
      };
      body.append(b);
    }
  }
}

function panelCodex(body) {
  const st = S.state;
  if (dexDetail) {
    const t = TREASURES.find(x => x.id === dexDetail);
    if (t) return dexDetailView(body, t);
    dexDetail = null;
  }
  const got = TREASURES.filter(t => S.hasTreasure(t.id));

  body.append(el('p', 'note', `收集進度 ${got.length} / ${TREASURES.length}`));

  // 目前總增益，讓人看得到收集的回報
  const axes = [
    ['fish','壓扁多拿魚', v => `+${Math.round(v*100)}%`],
    ['help','每天幫忙額度', v => `+${nf(v)} 下`],
    ['drop','寶物掉落機率', v => `+${Math.round(v*100)}%`],
    ['gold','金魚更容易掉', v => `+${Math.round(v*100)}%`],
    ['double','雙倍卡持續', v => `+${nf(v)} 下`],
    ['freezeOff','凍結卡折扣', v => `-${Math.round(v*100)}%`],
    ['giftOff','道具折扣', v => `-${Math.round(v*100)}%`],
  ].map(([k,label,fmt]) => [label, S.buffOf(k), fmt])
   .filter(([,v]) => v > 0);
  const sum = el('p', 'dex-sum');
  sum.innerHTML = axes.length
    ? '目前總增益　' + axes.map(([l,v,f]) => `${l} <b>${f(v)}</b>`).join('　·　')
    : '還沒有任何寶物。壓扁時有機率掉落，也可以靠成就和彩蛋拿到。';
  body.append(sum);

  const filters = el('div', 'tabs');
  for (const [k, label] of [['all','全部'], ...Object.entries(SOURCE_LABEL)]) {
    const t = el('button', 'tab' + (dexFilter === k ? ' on' : ''), label);
    t.onclick = () => { dexFilter = k; renderPanel('codex'); };
    filters.append(t);
  }
  body.append(filters);

  const list = TREASURES.filter(t => dexFilter === 'all' || t.source === dexFilter);
  const grid = el('div', 'dex');
  for (const t of list) {
    const has = S.hasTreasure(t.id);
    const cell = el('div', 'dex-cell ' + (has ? 'got' : 'locked'));
    if (has) cell.style.borderColor = RARITY[t.rarity].color;

    cell.append(el('div', 'dex-icon', has ? t.icon : '❔'));
    cell.append(el('div', 'dex-name', has ? t.name : '???'));

    const rar = el('span', 'dex-rar', RARITY[t.rarity].name);
    rar.style.background = RARITY[t.rarity].color;
    cell.append(rar);

    // 未解鎖給線索但不給增益 —— 有方向，仍然要自己動手
    cell.append(el('div', 'dex-sub', has ? buffText(t) : t.hint));

    // 整格可點，手機也用得了
    cell.tabIndex = 0;
    cell.setAttribute('role', 'button');
    const open = () => { dexDetail = t.id; renderPanel('codex'); };
    cell.onclick = open;
    cell.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } };
    grid.append(cell);
  }
  body.append(grid);
}

function buffText(t) {
  const v = t.buff.value;
  return {
    fish:      `壓扁多拿 ${Math.round(v*100)}% 魚`,
    help:      `每天多幫 ${nf(v)} 下`,
    drop:      `掉落機率 +${Math.round(v*100)}%`,
    gold:      `金魚門檻 -${Math.round(v*100)}%`,
    double:    `雙倍卡多 ${nf(v)} 下`,
    freezeOff: `凍結卡便宜 ${Math.round(v*100)}%`,
    giftOff:   `道具便宜 ${Math.round(v*100)}%`,
  }[t.buff.kind] || '';
}

/* --- 更新內容 --- */
function panelChangelog(body) {
  markVersionSeen();
  for (const rel of CHANGELOG) {
    const box = el('div', 'rel');
    const head = el('div', 'rel-head');
    head.append(el('span', 'rel-v' + (rel.v === APP_VERSION ? ' now' : ''), `v${rel.v}`));
    head.append(el('span', 'rel-date', rel.date));
    if (rel.v === APP_VERSION) head.append(el('span', 'rel-tag', '目前版本'));
    box.append(head);
    const ul = el('ul');
    rel.notes.forEach(n => ul.append(el('li', null, n)));
    box.append(ul);
    body.append(box);
  }
}

/* --- 大家 --- */
function panelPeople(body) {
  const st = S.state;
  const list = st.roster.filter(g => g.uid !== st.me.uid);
  if (!list.length) { body.append(el('p', 'empty', '還沒有其他人。把連結分享給朋友，他們登入後就會出現在這裡。')); return; }

  for (const g of list) {
    const row = el('div', 'row');
    const av = el('div', 'row-av');
    if (g.ownerPhoto) { const i = new Image(); i.src = g.ownerPhoto; i.alt = ''; av.append(i); }
    else av.textContent = '🐧';
    row.append(av);

    const mid = el('div', 'row-mid');
    mid.append(el('div', 'row-title', `${g.hat || ''} ${g.name || DEFAULT_GRU_NAME}`.trim()));
    mid.append(el('div', 'row-sub',
      `${who(g.ownerName)} · ${nf(g.squashes)} 下 · ${ago(g.lastSquashedAt) || '還沒被壓過'}`));
    row.append(mid);

    const acts = el('div', 'row-acts');
    const go = el('button', 'btn small primary', '去幫忙壓');
    go.onclick = async () => { await S.visit(g.uid); closePanel(); toast(`來到 ${g.name} 家`); };
    acts.append(go);

    const poke = el('button', 'btn small', '👉');
    poke.title = '戳一下（免費）';
    poke.disabled = !S.canPoke(g.uid);
    poke.onclick = async () => {
      try { await S.sendItem(g.uid, 'poke'); poke.disabled = true; toast(`戳了 ${g.ownerName} 一下`); }
      catch (e) { toast(e.message); }
    };
    acts.append(poke);
    row.append(acts);
    body.append(row);
  }
}

/* --- 商店 --- */
function panelItems(body) {
  const me = S.state.me;
  body.append(el('p', 'note', `你有 🐟 ${nf(me.fish)}${me.goldfish ? ` · 🥇 ${me.goldfish} 金魚` : ''}`));
  body.append(el('p', 'hint-sm',
    `🐟 魚壓一下得一條。🥇 金魚每 ${nf(TUNING.goldfishOdds)} 下才掉一次，只能用來買金牌送人。` +
    `想換造型請按下面的「🎨 裝扮」。`));

  for (const [key, item] of Object.entries(ITEMS)) {
    if (key === 'poke') continue;
    const row = el('div', 'row');
    row.append(el('div', 'row-av big', item.emoji));
    const mid = el('div', 'row-mid');
    // 價格走 store 的 itemCost，畫面和扣款才不會講不一樣的數字
    const price = S.itemCost(key), unit = item.gold ? ' 🥇' : ' 🐟';
    const title = el('div', 'row-title');
    title.append(`${item.name} · ${price}${unit}`);
    if (price < item.cost) {                       // 有寶物折扣就把原價劃掉
      const was = el('span', 'was', `${item.cost}${unit}`);
      title.append(' ', was);
    }
    mid.append(title);
    mid.append(el('div', 'row-sub', item.desc));
    row.append(mid);

    const acts = el('div', 'row-acts');
    if (item.self) {
      const b = el('button', 'btn small', '買給自己');
      b.onclick = async () => {
        b.disabled = true;
        try { await S.buyForSelf(key); toast(`買了 ${item.name}`); }
        catch (e) { toast(e.message); }
        renderPanel('items');                      // 不管成敗都重畫，魚的數字才會即時更新
      };
      acts.append(b);
    }
    if (item.give) {
      const b = el('button', 'btn small primary', '送人');
      b.onclick = () => showGivePicker(key);
      acts.append(b);
    }
    row.append(acts);
    body.append(row);
  }
}


/* --- 信箱 --- */
// 同步把目前信箱畫出來；「收下」在背景做，收完再重畫一次。
// 千萬不要讓這個函式變成 async —— renderPanel 會先清空面板，
// 一旦中間有 await，面板就會空白直到 await 結束。
function panelInbox(body) {
  drawInbox(body);
  S.collectInbox().then(got => {
    if (!got.length) return;
    toast(`收下了 ${got.length} 樣東西`);
    refreshPanel('inbox');
  });
}

function drawInbox(body) {
  const st = S.state;
  if (!st.inbox.length) { body.append(el('p', 'empty', '信箱是空的。去幫別人壓幾下，通常就會有回音。')); return; }

  for (const m of st.inbox) {
    const item = ITEMS[m.type] || { emoji:'❔', name:m.type };
    const row = el('div', 'row');
    row.append(el('div', 'row-av big', item.emoji));
    const mid = el('div', 'row-mid');
    const verb = { poke:'戳了你一下', note:'留了一句話', fish:'送你魚',
                   freeze:'送你凍結卡', hat:'扣了頂帽子在你頭上',
                   double:'送你雙倍魚', medal:'頒了金牌給你' }[m.type] || '送了東西';
    const nm = senderName(m.from, m.fromName);
    mid.append(el('div', 'row-title', `${nm.now} ${verb}`));
    mid.append(el('div', 'row-sub', [
      m.text ? `「${m.text}」` : '',
      ago(m.at),
      nm.then ? `當時叫 ${nm.then}` : '',
    ].filter(Boolean).join(' · ')));
    row.append(mid);

    if (m.from && m.from !== st.me.uid) {          // 回禮永遠比主動送容易
      const back = el('button', 'btn small', '回丟');
      back.onclick = () => showGivePicker(m.type === 'poke' ? 'poke' : m.type);
      if (m.type === 'poke') back.onclick = async () => {
        try { await S.sendItem(m.from, 'poke'); toast(`戳回去了`); back.disabled = true; }
        catch (e) { toast(e.message); }
      };
      const acts = el('div', 'row-acts');
      acts.append(back);
      row.append(acts);
    }
    body.append(row);
  }
}

/* --- 我的格魯 --- */
function panelMe(body) {
  const st = S.state;

  // 你自己的暱稱（別人在名單、信箱、「上一個壓的人」看到的名字）
  body.append(el('p', 'note', '你的暱稱'));
  const nickIn = el('input', 'input');
  nickIn.value = st.me.nick || '';
  nickIn.maxLength = 12;
  nickIn.placeholder = st.me.googleName || '留空就用 Google 帳號的名字';
  body.append(nickIn);

  // 把「大家實際會看到的名字」直接寫出來，跟著輸入即時更新，
  // 免得留空的人以為自己真的叫「無名氏」
  const preview = el('p', 'hint-sm');
  const paintPreview = () => {
    const typed = nickIn.value.trim();
    const shown = typed || st.me.googleName || '無名氏';
    preview.textContent = typed
      ? `大家會看到：${shown}`
      : `留空 · 大家會看到你的 Google 名字：${shown}`;
  };
  nickIn.oninput = paintPreview;
  paintPreview();
  body.append(preview);
  if (st.mode !== 'member')
    body.append(el('p', 'hint-sm', '登入之後大家才看得到這個名字。'));

  // 格魯的名字
  body.append(el('p', 'note', '格魯的名字'));
  const gruIn = el('input', 'input');
  gruIn.value = st.myGru.name || DEFAULT_GRU_NAME;
  gruIn.maxLength = 12;
  gruIn.placeholder = DEFAULT_GRU_NAME;
  body.append(gruIn);

  const save = el('button', 'btn primary', '儲存');
  save.onclick = async () => {
    save.disabled = true;
    try {
      if ((st.me.nick || '') !== nickIn.value.trim()) await S.setNick(nickIn.value);
      if ((st.myGru.name || '') !== gruIn.value.trim()) await S.setGruName(gruIn.value);
      toast('存好了'); closePanel();
    } catch (e) { toast('存不起來：' + e.message); save.disabled = false; }
  };
  body.append(save);

  const skin = el('button', 'btn', '🎨 換裝扮');
  skin.onclick = () => showPanel('wardrobe');
  body.append(skin);

  if (st.visits.length) {
    body.append(el('h3', 'sub-h', '來過我家的人'));
    for (const v of st.visits) {
      const row = el('div', 'row');
      row.append(el('div', 'row-av', '🐧'));
      const mid = el('div', 'row-mid');
      const nm = senderName(v.uid, v.name);
      mid.append(el('div', 'row-title', `${nm.now} 幫你壓了 ${nf(v.count)} 下`));
      mid.append(el('div', 'row-sub',
        [ago(v.at), nm.then ? `當時叫 ${nm.then}` : ''].filter(Boolean).join(' · ')));
      row.append(mid);
      body.append(row);
    }
  }
}

/* ------------------------------------------------------------------ 導覽 -- */
$('brand').onclick     = () => {
  // 🔢 好奇心：短時間內連點版本號 5 下
  const now = Date.now();
  brandRun = (now - brandAt < 1200) ? brandRun + 1 : 1;
  brandAt = now;
  if (brandRun >= 5) S.unlockTreasure('curious');
  showPanel('changelog');
};
$('navPeople').onclick = () => { showPanel('people'); S.loadRoster().then(() => refreshPanel('people')); };
$('navItems').onclick    = () => { showPanel('items'); S.loadRoster(); };
$('navWardrobe').onclick = () => showPanel('wardrobe');
$('navCodex').onclick    = () => showPanel('codex');
$('navInbox').onclick  = () => {
  showPanel('inbox');
  // 也要名單才查得到寄件人現在的名字
  Promise.all([S.loadInbox(), S.loadRoster()]).then(() => refreshPanel('inbox'));
};
$('gruName').onclick   = () => {
  if (!S.state.viewing.isMine) return;          // 在別人家不能改人家的名字
  showPanel('me');
  if (S.state.mode === 'member')
    Promise.all([S.loadVisits(), S.loadRoster()]).then(() => refreshPanel('me'));                               // 訪客也能取名，資料存在本機
};
$('navHome').onclick   = async () => {
  await S.goHome();
  history.replaceState(null, '', location.pathname);
  toast('回到自己家');
};
$('shareBtn').onclick = async () => {
  const url = `${location.origin}${location.pathname}?gru=${S.state.me.uid}`;
  try { await navigator.clipboard.writeText(url); toast('連結複製好了，丟給朋友'); }
  catch { prompt('把這個連結丟給朋友：', url); }
};
$('sound').onclick = () => {
  soundOn = !soundOn;
  try { localStorage.setItem('popgru.sound', soundOn ? '1' : '0'); } catch {}
  $('sound').textContent = soundOn ? '🔊' : '🔇';
  $('sound').setAttribute('aria-pressed', String(soundOn));
};
$('sound').textContent = soundOn ? '🔊' : '🔇';

/* ------------------------------------------------------------------ 啟動 -- */
S.on('state', render);
S.on('toast', toast);
S.on('live', ls => toast(`👀 ${ls.name} 剛剛也在壓`));
// 連續存檔失敗要讓人看得到，不然會像這幾天一樣：畫面正常，資料一個字都沒進去
S.on('writefail', e => {
  const bar = $('writefail');
  bar.textContent = `⚠️ 存檔失敗（${e.code || '未知錯誤'}）· 你壓的還在這台裝置上，但沒有存進伺服器`;
  bar.hidden = false;
});
// 單一寶物到手
S.on('treasure', t => {
  toast(`${t.icon} 找到「${t.name}」· ${RARITY[t.rarity].name}`);
  if (navigator.vibrate) { try { navigator.vibrate([15,50,25]); } catch {} }
});
// 一次多個（通常是上線時補發的成就）→ 合併成一則，不要洗版
S.on('treasures', list => {
  if (list.length === 1) return toast(`${list[0].icon} 找到「${list[0].name}」`);
  setTimeout(() => toast(`解鎖了 ${list.length} 個寶物 · 點下面的圖鑑看看`), 1200);
});
S.on('claimed', c => {
  if (!c.taken) return;
  toast(c.capped ? `把 ${nf(c.taken)} 下算進小圈子了（訪客上限）` : `把你的 ${nf(c.taken)} 下算進小圈子了`);
});

const ready = img => img.complete && img.naturalWidth
  ? Promise.resolve() : new Promise(r => { img.onload = img.onerror = r; });

(async () => {
  $('ver').textContent = `v${APP_VERSION}`;
  const prevVer = seenVersion();
  if (prevVer !== APP_VERSION) $('brand').classList.add('fresh');

  await Promise.all([ready(imgTall), ready(imgFlat)]);
  $('loading').hidden = true;
  await S.init();

  // 只在「用過舊版之後升上來」時提醒；第一次玩的人不用被打擾
  if (prevVer && prevVer !== APP_VERSION)
    setTimeout(() => toast(`更新到 v${APP_VERSION}，點左上角看改了什麼`), 900);
  else if (!prevVer) markVersionSeen();

  const target = new URLSearchParams(location.search).get('gru');
  if (target && S.configured) {
    await S.visit(target);
    if (!S.state.viewing.isMine) {
      toast(S.state.mode === 'member'
        ? `來到 ${S.state.viewing.ownerName} 家，幫忙壓幾下吧`
        : `這是 ${S.state.viewing.ownerName} 的格魯。登入之後你壓的才會算進他家`);
    }
  }

  const st = S.state;
  if (st.opening.missed > 0) {
    const who = st.opening.lastSquasher;
    toast(`你不在的時候，大家又壓了 ${nf(st.opening.missed)} 下${who && who.uid !== st.me.uid ? `，最後是 ${who.name}` : ''}`);
  }
  if (ACCESS === 'invite' && st.gated) {
    const code = prompt('這是朋友之間的小圈子，輸入邀請碼才能加分：');
    if (code && !S.submitInvite(code)) toast('邀請碼不對，你還是可以壓，只是不計分');
  }
  render();
})();
