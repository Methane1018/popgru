// ============================================================================
//  app.js —— 畫面與互動。所有資料都跟 store.js 要。
// ============================================================================
import * as S from './store.js?v=0.5.1';
import {
  TUNING, ITEMS, MILESTONES, HATS,
  ACCESS, DEFAULT_GRU_NAME, APP_VERSION, CHANGELOG,
  SKINS, SKIN_KINDS, skinInfo, defaultSkin,
} from './config.js?v=0.5.1';

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
}

/* ------------------------------------------------------------------ 姿勢 -- */
const stage = $('stage'), imgTall = $('imgTall'), imgFlat = $('imgFlat'),
      shadow = $('shadow'), hatEl = $('hat');
// pointerDown 是「手指還壓著嗎」，squashed 是「畫面上扁了嗎」。
// 這兩件事必須分開：狂點時每一下都要算到，但畫面可以整段維持扁的。
let pointerDown = false, squashed = false, pressedAt = 0, releaseTimer = null, stuckTimer = null;
const MIN_SQUASH_MS = 110;

function setPose(flat, hold = false) {
  squashed = flat;
  imgTall.classList.toggle('hide',  flat);
  imgFlat.classList.toggle('hide', !flat);
  shadow.className = 'shadow ' + (flat ? 'flat' : 'tall');
  hatEl.className  = 'hat '    + (flat ? 'flat' : 'tall') + (hold ? ' stuck' : '');
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

function press() {
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
  press();
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
  applySkin(v.isMine && skinPreview ? { ...v.skin, ...skinPreview } : v.skin);
  hatEl.textContent = v.hat || '';
  hatEl.hidden = !v.hat;

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
  $('navShop').disabled   = !social;
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
    { people:'大家的格魯', shop:'商店', inbox:'信箱', me:'我的格魯', changelog:'更新內容' }[name] || '';
  ({ people: panelPeople, shop: panelShop, inbox: panelInbox,
     me: panelMe, changelog: panelChangelog })[name]?.(body);
}

/* --- 外觀 --- */
// 點選只是「預覽」，不會扣錢。要按下面那條的按鈕才真的買 / 換。
// 直接點就買太容易誤觸了。
let skinPreview = null;

function skinPickerState() {
  const cur = { ...defaultSkin(), ...(S.state.myGru.skin || {}) };
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
  applySkin(S.state.viewing.skin);        // 還原成真正存起來的樣子
}

function showSkinPicker() {
  subView = true;
  const body = $('sheetBody'); body.innerHTML = '';
  $('sheetTitle').textContent = '外觀';
  const st = S.state;
  const { cur, sel, toBuy, cost, changed } = skinPickerState();

  body.append(el('p', 'hint-sm',
    `你有 🐟 ${nf(st.me.fish)}。點一下只是試看看，要按最下面的按鈕才會真的買或換。` +
    `外觀掛在格魯身上，朋友來你家就會看到。`));

  for (const { k, label } of SKIN_KINDS) {
    body.append(el('p', 'note', label));
    const grid = el('div', 'grid');
    for (const item of SKINS[k]) {
      const owned    = S.ownsSkin(k, item.id);
      const locked   = S.skinLocked(k, item.id);
      const selected = sel[k] === item.id;
      const inUse    = cur[k] === item.id;

      const cell = el('div', 'hat-cell');
      const b = el('button', 'skin-btn' + (selected ? ' on' : '') + (locked ? ' locked' : ''));
      b.append(el('span', 'skin-name', item.name));
      b.title = item.name;
      if (locked) {
        b.disabled = true;
        cell.append(b, el('span', 'hat-need', nf(item.need)));
      } else {
        b.onclick = () => {                       // 只預覽，不扣錢
          skinPreview = { ...(skinPreview || {}), [k]: item.id };
          applySkin({ ...cur, ...skinPreview });
          showSkinPicker();
        };
        if (!owned && st.me.fish < item.cost) b.classList.add('poor');
        cell.append(b, el('span', 'hat-need',
          inUse ? '使用中' : owned ? '已擁有' : `${item.cost} 🐟`));
      }
      grid.append(cell);
    }
    body.append(grid);
  }

  // ── 底部確認列：真正花錢的地方只有這裡 ──
  const bar = el('div', 'skin-bar');
  if (!changed) {
    bar.append(el('span', 'skin-bar-note', '點上面的樣式試看看，這裡會出現購買按鈕'));
  } else {
    const names = SKIN_KINDS.filter(({ k }) => sel[k] !== cur[k])
                            .map(({ k }) => skinInfo(k, sel[k]).name).join('、');
    if (toBuy.length) {
      const poor = st.me.fish < cost;
      bar.append(el('span', 'skin-bar-note',
        `預覽中：${names}　未擁有 ${toBuy.length} 項`));
      const buy = el('button', 'btn primary' + (poor ? '' : ''), `購買並使用 · ${cost} 🐟`);
      buy.disabled = poor;
      if (poor) buy.title = '魚不夠';
      buy.onclick = async () => {
        buy.disabled = true;
        try {
          for (const { k, id } of toBuy) await S.buySkin(k, id);       // 先解鎖
          for (const { k } of SKIN_KINDS) if (sel[k] !== cur[k]) await S.setSkin(k, sel[k]);
          skinPreview = null;
          toast(`買下並換上「${names}」`);
          showSkinPicker();
        } catch (e) { toast(e.message); buy.disabled = false; }
      };
      bar.append(buy);
    } else {
      bar.append(el('span', 'skin-bar-note', `預覽中：${names}　都已經擁有`));
      const use = el('button', 'btn primary', '換上這一套');
      use.onclick = async () => {
        try {
          for (const { k } of SKIN_KINDS) if (sel[k] !== cur[k]) await S.setSkin(k, sel[k]);
          skinPreview = null;
          toast(`換成「${names}」`);
          showSkinPicker();
        } catch (e) { toast(e.message); }
      };
      bar.append(use);
    }
    const undo = el('button', 'btn', '還原');
    undo.onclick = () => { clearSkinPreview(); showSkinPicker(); };
    bar.append(undo);
  }
  body.append(bar);
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
function panelShop(body) {
  const me = S.state.me;
  body.append(el('p', 'note', `你有 🐟 ${nf(me.fish)}${me.goldfish ? ` · 🥇 ${me.goldfish} 金魚` : ''}`));
  body.append(el('p', 'hint-sm',
    `🐟 魚壓一下得一條。🥇 金魚每 ${nf(TUNING.goldfishOdds)} 下才掉一次，只能用來買金牌送人。`));

  // 外觀自己一列，因為它有三大類、價格也不只一種
  {
    const row = el('div', 'row');
    row.append(el('div', 'row-av big', '🎨'));
    const mid = el('div', 'row-mid');
    mid.append(el('div', 'row-title', '外觀 · 40〜300 🐟'));
    mid.append(el('div', 'row-sub', '背景、企鵝顏色、數字樣式。朋友來你家就會看到'));
    row.append(mid);
    const acts = el('div', 'row-acts');
    const b = el('button', 'btn small', '看外觀');
    b.onclick = showSkinPicker;
    acts.append(b); row.append(acts);
    body.append(row);
  }

  for (const [key, item] of Object.entries(ITEMS)) {
    if (key === 'poke') continue;
    const row = el('div', 'row');
    row.append(el('div', 'row-av big', item.emoji));
    const mid = el('div', 'row-mid');
    mid.append(el('div', 'row-title', item.hat
      ? `${item.name} · 40〜300 🐟`
      : `${item.name} · ${item.cost}${item.gold ? ' 🥇' : ' 🐟'}`));
    mid.append(el('div', 'row-sub', item.desc));
    row.append(mid);

    const acts = el('div', 'row-acts');
    if (item.self) {
      const b = el('button', 'btn small', item.hat ? '看帽子' : '買給自己');
      b.onclick = async () => {
        try {
          if (item.hat) return showHatPicker();
          await S.buyForSelf(key); toast(`買了 ${item.name}`);
        } catch (e) { toast(e.message); }
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

// 帽子是解鎖制：買一次永久擁有，之後換戴免費。
// 一頂帽子有三種狀態 —— 已解鎖 / 買得起 / 還沒到門檻，畫面要一眼分得出來。
function showHatPicker() {
  subView = true;
  const body = $('sheetBody'); body.innerHTML = '';
  $('sheetTitle').textContent = '帽子';
  const st = S.state, worn = st.myGru.hat;

  const owned = HATS.filter(h => S.ownsHat(h.e));
  const buyable = HATS.filter(h => !S.ownsHat(h.e) && !S.hatLocked(h.e));
  const locked = HATS.filter(h => !S.ownsHat(h.e) && S.hatLocked(h.e));

  const grid = (list, build) => {
    const g = el('div', 'grid');
    list.forEach(h => g.append(build(h)));
    body.append(g);
  };

  // ── 已解鎖：直接換戴，不用錢 ──
  body.append(el('p', 'note', `我的帽子${owned.length ? `（${owned.length} 頂）` : ''}`));
  if (!owned.length) {
    body.append(el('p', 'hint-sm', '還沒有任何帽子。買一頂之後就永久擁有，之後想換回來都不用再付錢。'));
  } else {
    body.append(el('p', 'hint-sm', '點一下就換戴，已經解鎖的帽子換來換去都免費。'));
    grid(owned, h => {
      const cell = el('div', 'hat-cell');
      const b = el('button', 'emoji-btn' + (worn === h.e ? ' on' : ''), h.e);
      b.title = h.name;
      b.onclick = async () => {
        try { await S.setHat(h.e); toast(`戴上 ${h.e} ${h.name}`); closePanel(); }
        catch (e) { toast(e.message); }
      };
      cell.append(b, el('span', 'hat-need', worn === h.e ? '戴著' : '免費'));
      return cell;
    });
    const off = el('button', 'btn', '不戴帽子');
    off.onclick = async () => { await S.setHat(null); toast('脫掉了'); closePanel(); };
    body.append(off);
  }

  // ── 買得起的 ──
  if (buyable.length) {
    body.append(el('p', 'note', '可以解鎖'));
    body.append(el('p', 'hint-sm', `你有 🐟 ${nf(st.me.fish)}。解鎖一次，之後永久免費換戴。`));
    grid(buyable, h => {
      const cell = el('div', 'hat-cell');
      const b = el('button', 'emoji-btn', h.e);
      b.title = `${h.name} · ${h.cost} 魚`;
      if (st.me.fish < h.cost) b.classList.add('poor');
      b.onclick = async () => {
        try { await S.buyHat(h.e); toast(`解鎖 ${h.e} ${h.name}，已經戴上`); closePanel(); }
        catch (e) { toast(e.message); }
      };
      cell.append(b, el('span', 'hat-need', `${h.cost} 🐟`));
      return cell;
    });
  }

  // ── 還沒到門檻的 ──
  if (locked.length) {
    body.append(el('p', 'note', '還沒解鎖'));
    body.append(el('p', 'hint-sm',
      `數字是小圈子要壓到的總數，目前 ${nf(st.global.squashes)} 下。到了之後才買得到。`));
    grid(locked, h => {
      const cell = el('div', 'hat-cell');
      const b = el('button', 'emoji-btn locked', h.e);
      b.disabled = true; b.title = `${h.name} · ${nf(h.need)} 下解鎖`;
      cell.append(b, el('span', 'hat-need', nf(h.need)));
      return cell;
    });
  }
}

function showGivePicker(key, retried) {
  subView = true;
  const item = ITEMS[key], st = S.state;
  const body = $('sheetBody'); body.innerHTML = '';
  $('sheetTitle').textContent = `送 ${item.emoji} ${item.name} 給誰`;

  let hat = '🎩', note = '';
  if (item.hat) {
    const grid = el('div', 'grid');
    HATS.filter(h => h.need === 0).forEach((h, i) => {
      const b = el('button', 'emoji-btn' + (i === 0 ? ' on' : ''), h.e);
      b.title = h.name;
      b.onclick = () => { hat = h.e;
        grid.querySelectorAll('.emoji-btn').forEach(x => x.classList.remove('on')); b.classList.add('on'); };
      grid.append(b);
    });
    body.append(el('p', 'note', '選一頂扣在對方頭上'));
    body.append(el('p', 'hint-sm', '對方會直接戴上，而且永久解鎖，之後想換回來不用付錢。'));
    body.append(grid);
  }
  if (item.text) {
    const inp = el('input', 'input');
    inp.maxLength = TUNING.noteMaxLen;
    inp.placeholder = `想說什麼？${TUNING.noteMaxLen} 字以內`;
    inp.oninput = () => { note = inp.value; };
    body.append(inp);
  }

  const list = st.roster.filter(g => g.uid !== st.me.uid);
  if (!list.length) {
    if (!retried) {                       // 名單可能還沒抓過，抓一次再畫
      body.append(el('p', 'empty', '載入名單中…'));
      S.loadRoster().then(() => { if (openPanel === 'shop') showGivePicker(key, true); });
    } else {
      body.append(el('p', 'empty', '還沒有其他人可以送。等朋友登入之後就會出現。'));
    }
    return;
  }
  for (const g of list) {
    const row = el('div', 'row');
    row.append(el('div', 'row-av', g.ownerPhoto ? '' : '🐧'));
    if (g.ownerPhoto) { const i = new Image(); i.src = g.ownerPhoto; i.alt = ''; row.firstChild.append(i); }
    const mid = el('div', 'row-mid');
    mid.append(el('div', 'row-title', g.ownerName || '某人'));
    mid.append(el('div', 'row-sub', g.name || DEFAULT_GRU_NAME));
    row.append(mid);
    const b = el('button', 'btn small primary', '送出');
    b.onclick = async () => {
      b.disabled = true;
      try {
        const extra = {};
        if (item.hat)  extra.hat = hat;
        if (item.text) extra.text = note.slice(0, TUNING.noteMaxLen);
        await S.sendItem(g.uid, key, extra);
        toast(`送出 ${item.emoji} 給 ${g.ownerName}`);
        closePanel();
      } catch (e) { toast(e.message); b.disabled = false; }
    };
    const acts = el('div', 'row-acts');
    acts.append(b);
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

  const row2 = el('div', 'row-acts');
  const hat = el('button', 'btn', '🎩 換帽子');
  hat.onclick = showHatPicker;
  const skin = el('button', 'btn', '🎨 換外觀');
  skin.onclick = showSkinPicker;
  row2.append(hat, skin);
  body.append(row2);

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
$('brand').onclick     = () => showPanel('changelog');
$('navPeople').onclick = () => { showPanel('people'); S.loadRoster().then(() => refreshPanel('people')); };
$('navShop').onclick   = () => { showPanel('shop'); S.loadRoster(); };
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
