// ============================================================================
//  app.js —— 畫面與互動。所有資料都跟 store.js 要。
// ============================================================================
import * as S from './store.js?v=5';
import {
  TUNING, ITEMS, MILESTONES, HATS, SILLY_HATS,
  ACCESS, DEFAULT_GRU_NAME, APP_VERSION,
} from './config.js?v=5';

console.log(`%cPOPGRU v${APP_VERSION}`, 'font-weight:bold');

const $  = id => document.getElementById(id);
const el = (tag, cls, text) => { const n = document.createElement(tag);
  if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
const nf = n => (n || 0).toLocaleString('en-US');

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
  openPanel = null; subView = false;
  document.body.classList.remove('sheet-open');
  $('sheet').classList.remove('open');
  $('scrim').classList.remove('open');
}
$('scrim').onclick = closePanel;
$('sheetClose').onclick = closePanel;

function renderPanel(name) {
  const body = $('sheetBody'); body.innerHTML = '';
  $('sheetTitle').textContent = { people:'大家的格魯', shop:'商店', inbox:'信箱', me:'我的格魯' }[name] || '';
  ({ people: panelPeople, shop: panelShop, inbox: panelInbox, me: panelMe })[name]?.(body);
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
      `${g.ownerName || '某人'} · ${nf(g.squashes)} 下 · ${ago(g.lastSquashedAt) || '還沒被壓過'}`));
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

  for (const [key, item] of Object.entries(ITEMS)) {
    if (key === 'poke') continue;
    const row = el('div', 'row');
    row.append(el('div', 'row-av big', item.emoji));
    const mid = el('div', 'row-mid');
    mid.append(el('div', 'row-title', `${item.name} · ${item.cost}${item.gold ? ' 🥇' : ' 🐟'}`));
    mid.append(el('div', 'row-sub', item.desc));
    row.append(mid);

    const acts = el('div', 'row-acts');
    if (item.self) {
      const b = el('button', 'btn small', '買給自己');
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

function showHatPicker() {
  subView = true;
  const body = $('sheetBody'); body.innerHTML = '';
  $('sheetTitle').textContent = '選一頂帽子';
  const unlocked = S.state.global.squashes;
  const grid = el('div', 'grid');
  const all = [...HATS.map((h, i) => ({ h, need: i < 4 ? 0 : (MILESTONES[i - 4]?.at || 0) })),
               ...SILLY_HATS.map(h => ({ h, need: 0 }))];
  let locked = 0;
  for (const { h, need } of all) {
    const cell = el('div', 'hat-cell');
    const b = el('button', 'emoji-btn', h);
    if (need > unlocked) {
      locked++;
      b.disabled = true; b.classList.add('locked');
      cell.append(b, el('span', 'hat-need', nf(need)));      // 解鎖門檻直接寫出來
    } else {
      b.onclick = async () => {
        try { await S.buyForSelf('hat', { hat: h }); toast(`戴上 ${h}`); closePanel(); }
        catch (e) { toast(e.message); }
      };
      cell.append(b);
    }
    grid.append(cell);
  }
  body.append(el('p', 'note', `一頂 ${ITEMS.hat.cost} 🐟。灰色的要等小圈子總數到達才會解鎖。`));
  body.append(grid);
  if (locked) body.append(el('p', 'hint-sm',
    `還有 ${locked} 頂沒解鎖，數字是需要的小圈子總壓扁數。目前 ${nf(unlocked)} 下。`));
  const off = el('button', 'btn', '不戴了');
  off.onclick = async () => { await S.setHat(null); closePanel(); };
  body.append(off);
}

function showGivePicker(key, retried) {
  subView = true;
  const item = ITEMS[key], st = S.state;
  const body = $('sheetBody'); body.innerHTML = '';
  $('sheetTitle').textContent = `送 ${item.emoji} ${item.name} 給誰`;

  let hat = '🎩', note = '';
  if (item.hat) {
    const grid = el('div', 'grid');
    [...HATS.slice(0, 4), ...SILLY_HATS].forEach((h, i) => {
      const b = el('button', 'emoji-btn' + (i === 0 ? ' on' : ''), h);
      b.onclick = () => { hat = h; grid.querySelectorAll('.emoji-btn').forEach(x => x.classList.remove('on')); b.classList.add('on'); };
      grid.append(b);
    });
    body.append(el('p', 'note', '選一頂要扣在對方頭上的帽子'));
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
    mid.append(el('div', 'row-title', `${m.fromName || '某人'} ${verb}`));
    mid.append(el('div', 'row-sub', [m.text ? `「${m.text}」` : '', ago(m.at)].filter(Boolean).join(' · ')));
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
  nickIn.placeholder = st.me.googleName || '用 Google 帳號的名字';
  body.append(nickIn);
  body.append(el('p', 'hint-sm', st.mode === 'member'
    ? '留空就用 Google 帳號的名字。大家在名單和信箱看到的就是這個。'
    : '先取好放著，登入之後大家就會看到這個名字。'));

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

  const hat = el('button', 'btn', '換帽子');
  hat.onclick = showHatPicker;
  body.append(hat);

  if (st.visits.length) {
    body.append(el('h3', 'sub-h', '來過我家的人'));
    for (const v of st.visits) {
      const row = el('div', 'row');
      row.append(el('div', 'row-av', '🐧'));
      const mid = el('div', 'row-mid');
      mid.append(el('div', 'row-title', `${v.name || '某人'} 幫你壓了 ${nf(v.count)} 下`));
      mid.append(el('div', 'row-sub', ago(v.at)));
      row.append(mid);
      body.append(row);
    }
  }
}

/* ------------------------------------------------------------------ 導覽 -- */
$('navPeople').onclick = () => { showPanel('people'); S.loadRoster().then(() => refreshPanel('people')); };
$('navShop').onclick   = () => { showPanel('shop'); S.loadRoster(); };
$('navInbox').onclick  = () => { showPanel('inbox'); S.loadInbox().then(() => refreshPanel('inbox')); };
$('gruName').onclick   = () => {
  if (!S.state.viewing.isMine) return;          // 在別人家不能改人家的名字
  showPanel('me');
  if (S.state.mode === 'member') S.loadVisits().then(() => refreshPanel('me'));                               // 訪客也能取名，資料存在本機
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
  await Promise.all([ready(imgTall), ready(imgFlat)]);
  $('loading').hidden = true;
  await S.init();

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
