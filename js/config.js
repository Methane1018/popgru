// ============================================================================
//  POPGRU 設定檔 —— 你只需要改這個檔案
// ============================================================================
//
//  還沒設定也能跑：整個遊戲會用「訪客模式」運作，資料存在瀏覽器本機，
//  後端完全沒有紀錄（所以不會產生一堆幽靈帳號）。
//  填好 firebaseConfig 之後才會開放登入 / 小圈子總數 / 名單 / 道具。
//
//  取得步驟見 README.md
//
//  這些金鑰本來就是公開的，前端一定看得到。真正的保護來自 firestore.rules。
// ----------------------------------------------------------------------------

export const firebaseConfig = {
  apiKey:            "AIzaSyCxXSm6T_PFKHsG9XKw3IO1Y2lfe4IpSPo",
  authDomain:        "popgru-b24de.firebaseapp.com",
  projectId:         "popgru-b24de",
  storageBucket:     "popgru-b24de.firebasestorage.app",
  messagingSenderId: "87839344947",
  appId:             "1:87839344947:web:c83bf17822cf0d458e9646",
};

// ----------------------------------------------------------------------------
//  更新紀錄。最上面那筆就是目前版本 —— 想升版就在最上面加一筆，
//  然後跑 ./bump.sh，它會把所有 import 的 ?v= 同步過去。
//  （順序是刻意的：不寫更新內容就升不了版。）
// ----------------------------------------------------------------------------
export const CHANGELOG = [
  { v:'0.5.1', date:'2026-08-31', notes:[
    '外觀改成先預覽再購買，點一下只是試看看，不會直接扣錢',
    '再修一次連續天數、凍結卡、雙倍魚、幫忙額度重整後歸零',
  ]},
  { v:'0.5.0', date:'2026-08-31', notes:[
    '加入外觀商店：背景、企鵝顏色、數字樣式，共 23 款',
    '外觀是掛在格魯身上的，朋友來你家就會看到你的樣子',
    '外觀跟帽子一樣買一次永久擁有，之後換來換去免費',
    '修好重新整理之後連續天數變成 0 天',
  ]},
  { v:'0.4.0', date:'2026-08-31', notes:[
    '加入版本號和這個更新紀錄，之後改了什麼都看得到',
    '帽子改成解鎖制：買一次就永久擁有，之後換來換去免費',
    '修好幫忙額度會自己跳回 300、連續天數莫名歸零',
    '修好壓完馬上關掉，那幾下會不見的問題',
    '信箱和足跡改成顯示對方現在的名字，改過名的會附註當時叫什麼',
    '提示訊息移到上面，不再擋住商店和信箱按鈕',
  ]},
  { v:'0.3.0', date:'2026-08-31', notes:[
    '可以自己設暱稱了，跟格魯的名字分開',
    '修好信箱點開是一片空白',
    '修好送東西給別人時看不到任何人',
    '修好選帽子、送人、改名選到一半會自己跳回去',
    '帽子的解鎖條件直接寫在帽子旁邊',
  ]},
  { v:'0.2.0', date:'2026-08-30', notes:[
    '每個人有自己的格魯，可以去別人家幫忙壓',
    '幫別人壓每天有 300 下的額度，壓自己家不限',
    '加入連續天數、魚、商店、道具、信箱',
    '加入大家一起達成的里程碑',
  ]},
  { v:'0.1.0', date:'2026-08-30', notes:[
    '初始版本發布',
    '點一下格魯，它就瞬間變扁',
  ]},
];

// 版本號就是更新紀錄最上面那筆。載入時會印在主控台。
export const APP_VERSION = CHANGELOG[0].v;

// Firebase SDK 版本。萬一載入失敗，改這個數字就好。
export const FIREBASE_VERSION = '11.6.0';

// ----------------------------------------------------------------------------
//  參加門檻
//    'open'   任何人 Google 登入就能玩（預設）
//    'invite' 要輸入下面的邀請碼才算成員；沒碼的人只能看數字，壓了不計分
//  連結真的外流了再改成 'invite' 就好，是一行的事。
// ----------------------------------------------------------------------------
export const ACCESS      = 'open';
export const INVITE_CODE = 'penguin';

// ----------------------------------------------------------------------------
//  遊戲平衡
// ----------------------------------------------------------------------------
export const TUNING = {
  dailyCap:            0,  // 每人每天計分上限。0 = 無上限（壓自己家不設限）
  helpCap:           300,  // 每天最多「幫別人」壓幾下。0 = 無上限
                           //   稀缺性是禮物之所以是禮物的原因：你有無限的點擊時，
                           //   花在朋友身上就不算什麼。300 下大約夠認真幫 3～5 個人。
                           //   額度用完還是壓得動，只是不計分。
  guestMaxClaim:   3000,   // 訪客最多能把幾下帶進小圈子（登入時補算）
  fishPerSquash:   1,      // 每次計分得幾條魚
  flushMs:         8000,   // 定時批次寫入的間隔（保底）
  quietFlushMs:    1500,   // 停手多久之後就寫出去。壓兩下馬上關掉時就靠這個
  maxPerFlush:     2000,   // 單次批次上限，規則層擋 5000
  goldfishOdds:    500,    // 每 N 次計分，有一次企鵝彈不回來並掉一條金魚
  doubleClicks:    100,    // 雙倍魚卡生效幾次點擊
  noteMaxLen:      30,     // 紙條字數上限
  rosterSize:      50,     // 名單一次抓幾個人（10 人的圈子等於全員）
  pokeCooldownMs:  60000,  // 同一個人多久才能再戳一次
  idleStopMs:      0,      // 0 = 只要分頁切到背景就停止計分
};

// 共同里程碑：全圈總壓扁數達標時，所有人一起解鎖
export const MILESTONES = [
  { at:      1000, label: '第一千下',  unlock: '🧢 鴨舌帽' },
  { at:      5000, label: '五千下',    unlock: '🕶 太陽眼鏡' },
  { at:     25000, label: '兩萬五',    unlock: '👑 皇冠' },
  { at:    100000, label: '十萬下',    unlock: '🍄 蘑菇' },
  { at:    250000, label: '二十五萬',  unlock: '🔥 火焰頭' },
  { at:    500000, label: '五十萬',    unlock: '🌈 彩虹' },
  { at:   1000000, label: '一百萬下',  unlock: '💎 鑽石' },
];

// 商店。cost 是魚；gold=true 的要用金魚買。
// self=true 代表可以買給自己，give=true 代表可以送人。
export const ITEMS = {
  poke:   { emoji:'👉', name:'戳一下',   cost:  0, give:true,            desc:'免費。在名單上點一下就送出' },
  note:   { emoji:'💌', name:'紙條',     cost:  8, give:true, text:true, desc:'留一句話，30 字以內' },
  fish:   { emoji:'🐟', name:'送魚',     cost: 25, give:true, gives:20,  desc:'對方收到 20 條魚（虧本，但是心意）' },
  freeze: { emoji:'🧊', name:'凍結卡',   cost: 60, give:true, self:true, desc:'漏掉一天時自動用掉，保住連續天數' },
  hat:    { emoji:'🎩', name:'帽子',     cost: 60, give:true, self:true, hat:true, desc:'解鎖後可以隨時免費換戴，送人也會幫對方解鎖' },
  double: { emoji:'⚡', name:'雙倍魚',   cost: 80, give:true, self:true, desc:'接下來 100 下拿雙倍魚（不影響每日上限）' },
  medal:  { emoji:'🏅', name:'金牌',     cost:  1, give:true, gold:true, desc:'用金魚買，永久掛在對方名字旁邊' },
};

// 帽子樣式。前四個一開始就有，後面靠里程碑解鎖。
// 格魯預設名字
export const DEFAULT_GRU_NAME = '格魯';

// 帽子是「買一次永久解鎖」，之後換戴不用再付錢。
//   cost = 解鎖要幾條魚
//   need = 小圈子總壓扁數要到多少才買得到（0 = 隨時可買）
// need 對應 MILESTONES 的門檻，兩邊要一起改。
export const HATS = [
  { e:'🎩', cost:  60, need:       0, name:'紳士帽' },
  { e:'🎀', cost:  60, need:       0, name:'蝴蝶結' },
  { e:'🍕', cost:  40, need:       0, name:'披薩' },
  { e:'💩', cost:  40, need:       0, name:'便便' },
  { e:'🐛', cost:  40, need:       0, name:'毛毛蟲' },
  { e:'🧻', cost:  40, need:       0, name:'衛生紙' },
  { e:'🥑', cost:  40, need:       0, name:'酪梨' },
  { e:'🧢', cost:  80, need:    1000, name:'鴨舌帽' },
  { e:'🕶', cost:  80, need:    5000, name:'太陽眼鏡' },
  { e:'👑', cost: 150, need:   25000, name:'皇冠' },
  { e:'🍄', cost: 150, need:  100000, name:'蘑菇' },
  { e:'🔥', cost: 200, need:  250000, name:'火焰頭' },
  { e:'🌈', cost: 200, need:  500000, name:'彩虹' },
  { e:'💎', cost: 300, need: 1000000, name:'鑽石' },
];
export const hatInfo = e => HATS.find(h => h.e === e) || { e, cost: 60, need: 0, name: '帽子' };

// ----------------------------------------------------------------------------
//  外觀。跟帽子一樣是買一次永久解鎖，之後換來換去免費。
//  外觀存在「格魯」身上而不是帳號上，所以別人來拜訪就會看到你的樣子。
//    cost 0 = 預設款，一開始就有
//    need   = 小圈子總壓扁數要到多少才買得到
// ----------------------------------------------------------------------------
export const SKINS = {
  bg: [
    { id:'ice',    name:'冰原',     cost:  0, need:      0 },
    { id:'sunset', name:'夕陽',     cost: 80, need:      0 },
    { id:'mint',   name:'薄荷',     cost: 80, need:      0 },
    { id:'grape',  name:'葡萄',     cost: 80, need:      0 },
    { id:'night',  name:'深夜',     cost:120, need:      0 },
    { id:'poop',   name:'便便雨',   cost:120, need:      0, emoji:'💩' },
    { id:'fish',   name:'滿天小魚', cost:150, need:   1000, emoji:'🐟' },
    { id:'star',   name:'星空',     cost:150, need:   5000, emoji:'⭐️' },
    { id:'pizza',  name:'披薩雨',   cost:200, need:  25000, emoji:'🍕' },
    { id:'crown',  name:'皇冠雨',   cost:300, need: 100000, emoji:'👑' },
  ],
  // 企鵝本體是灰的，所以先 sepia 再轉色相就能上色
  tint: [
    { id:'none',  name:'原色',       cost:  0, need:     0, filter:'' },
    { id:'blue',  name:'藍企鵝',     cost:100, need:     0, filter:'sepia(1) hue-rotate(165deg) saturate(2.4)' },
    { id:'pink',  name:'粉企鵝',     cost:100, need:     0, filter:'sepia(1) hue-rotate(290deg) saturate(2)' },
    { id:'mint',  name:'薄荷企鵝',   cost:100, need:     0, filter:'sepia(1) hue-rotate(105deg) saturate(1.9)' },
    { id:'ghost', name:'幽靈企鵝',   cost:180, need:  5000, filter:'grayscale(1) brightness(1.3) opacity(.6)' },
    { id:'gold',  name:'金企鵝',     cost:250, need: 25000, filter:'sepia(1) saturate(3.2) brightness(1.08) contrast(1.05)' },
    { id:'neon',  name:'霓虹企鵝',   cost:300, need:100000, filter:'sepia(1) hue-rotate(200deg) saturate(6) contrast(1.2)' },
  ],
  font: [
    { id:'plain',  name:'預設',   cost:  0, need:     0 },
    { id:'mono',   name:'等寬',   cost: 60, need:     0 },
    { id:'shadow', name:'立體',   cost:120, need:     0 },
    { id:'glow',   name:'發光',   cost:120, need:  5000 },
    { id:'gold',   name:'燙金',   cost:200, need: 25000 },
    { id:'rainbow',name:'彩虹',   cost:300, need:100000 },
  ],
};

export const SKIN_KINDS = [
  { k:'bg',   label:'背景' },
  { k:'tint', label:'企鵝顏色' },
  { k:'font', label:'數字樣式' },
];
export const skinInfo = (kind, id) =>
  (SKINS[kind] || []).find(x => x.id === id) || (SKINS[kind] || [])[0];
export const defaultSkin = () =>
  ({ bg:SKINS.bg[0].id, tint:SKINS.tint[0].id, font:SKINS.font[0].id });
