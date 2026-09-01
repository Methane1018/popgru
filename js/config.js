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
  { v:'0.10.2', date:'2026-09-02', notes:[
    '下面那排按鈕重排：圖示在上、字在下，不會再擠成參差的兩列',
    '信箱有未讀時會直接顯示幾封',
  ]},
  { v:'0.10.1', date:'2026-09-02', notes:[
    '緊急修復：v0.10.0 會讓舊裝置的所有寫入被伺服器拒絕，壓的下數暫時存在本機送不出去',
    '（資料沒有掉，重新整理之後待送的點擊會補送出去）',
  ]},
  { v:'0.10.0', date:'2026-09-02', notes:[
    '🌳 技能樹：壓製、社交、探寶三條路，每條四層。壓得越多技能點越多',
    '技能點永遠不夠點滿三條路，所以要走哪條是你自己的選擇（而且不能重來）',
    '寶物稀有度細分成 一般／少見／稀有／傳說／神話，新增 5 個寶物',
    '傳說與神話寶物要先在探寶軸點出「深掘」「神話之眼」才會開始掉',
    '🏗 自動液壓機（壓製軸最後一層）：開著這頁，你家的格魯會自己被壓',
    '👋 魔法手（社交軸最後一層）：每天可以在一位朋友家幫壓 60 下，不算你的額度',
    '圖鑑裡還沒拿到的寶物不再直接寫出稀有度，要點出「線索」才看得到',
    '修：訪客模式的寶物之前重新整理就會不見',
  ]},
  { v:'0.9.3', date:'2026-09-01', notes:[
    '修好「送人」按鈕按下去沒反應 —— 這個功能從 v0.8 就壞掉了',
  ]},
  { v:'0.9.2', date:'2026-09-01', notes:[
    '修好預覽帽子但沒買、離開之後原本戴的帽子會消失',
    '彩蛋的線索改得隱晦了，原本那四句根本是說明書',
    '點圖鑑裡的任何一格可以看細節，解鎖後會揭曉「當初是怎麼拿到的」',
    '裝扮的帽子和手持物現在直接顯示名字，不用滑鼠停留才看得到',
  ]},
  { v:'0.9.1', date:'2026-09-01', notes:[
    '修好送東西給別人之後，魚的數量不會馬上更新',
    '🎁 人緣的「道具便宜 10%」原本沒有真的生效，現在會了',
    '凍結卡折扣原本只扣本機、伺服器仍收原價，兩邊已經一致',
  ]},
  { v:'0.9.0', date:'2026-09-01', notes:[
    '加入寶物與圖鑑：24 個寶物，四種來源 —— 掉落、成就、彩蛋、商店',
    '每個寶物都有不同的增益，解鎖就生效，不用裝備',
    '成就用你既有的紀錄判定，所以一上線就會補發好幾個',
    '有四個彩蛋藏在遊戲裡。圖鑑會給提示，但不會告訴你答案',
    '金魚終於有第二個用途：可以在圖鑑裡換兩個寶物',
  ]},
  { v:'0.8.0', date:'2026-08-31', notes:[
    '商店拆成「🎁 道具」和「🎨 裝扮」兩個按鈕',
    '格魯可以拿東西了：水槍、斧頭、平底鍋、麥克風、球棒、珍奶等 11 種',
    '裝扮全部整合在一個面板，分成帽子／手持物／背景／顏色／數字五類',
    '持有裝扮會有微量加成：每擁有一件，壓扁多拿 0.5% 的魚（上限 30%）',
    '加成看的是「擁有幾件」而不是「身上穿什麼」，所以隨你怎麼搭都不吃虧',
  ]},
  { v:'0.7.1', date:'2026-08-31', notes:[
    '修好暱稱別人看不到：每次登入或重整都會把暱稱蓋回 Google 帳號的名字',
    '被蓋掉的人重新設一次暱稱就會固定住了',
  ]},
  { v:'0.7.0', date:'2026-08-31', notes:[
    '外觀多了「👀 預覽」：會把商店收起來讓你全畫面看效果，點任何地方結束',
    '「立體」的數字樣式原本跟預設看起來一樣，現在真的立體了',
  ]},
  { v:'0.6.4', date:'2026-08-31', notes:[
    '修好格魯次數歸零、小圈子總數不動：寫入的對象變成了空值，'
    + '結果格魯和總數兩份資料整個被跳過',
    '這段期間你們壓的都還在，會自動補寫上去',
  ]},
  { v:'0.6.3', date:'2026-08-31', notes:[
    '存檔失敗時會在畫面上明講，不再默默地什麼都沒存進去',
  ]},
  { v:'0.6.2', date:'2026-08-31', notes:[
    '修好數字會往回跳：買東西或改名時，畫面會被還沒存檔的舊數字蓋掉',
    '修好剛打開時所有數字先閃一下 0 才跳成真值',
  ]},
  { v:'0.6.1', date:'2026-08-31', notes:[
    '大幅降低資料庫用量：寫入頻率放慢，名單和信箱加上快取',
    '不會因此掉資料，離線待送和本機備份都還在',
  ]},
  { v:'0.6.0', date:'2026-08-31', notes:[
    '找到連勝歸零的真正原因並修好：載入時會先收到一份空的快取資料，'
    + '程式把它當成真的，於是把連勝、凍結卡、雙倍魚讀成 0 又寫回伺服器',
    '外觀改成先預覽再購買，點一下只是試看看，不會直接扣錢',
  ]},
  { v:'0.5.2', date:'2026-08-31', notes:[
    '連勝、凍結卡、雙倍魚、幫忙額度改成本機也存一份，重整不會再掉',
  ]},
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
  // 讀取成本主要來自這裡：每次 flush 會寫三份文件（個人資料 / 你的格魯 /
  // 小圈子總數），而三份都掛著 onSnapshot —— 寫下去就回推一次快照，那就是讀取。
  // 所以「多久寫一次」直接決定每小時的讀取量。
  // 不用怕寫得慢會掉資料：待送匣（localStorage）跟本機鏡像才是保命的東西。
  flushMs:        20000,   // 定時批次寫入的間隔（保底）
  quietFlushMs:    6000,   // 停手多久之後寫出去
  listTtlMs:      90000,   // 名單／信箱／足跡的快取時間，這段時間內重開面板不會再查

  // 裝扮的增益看「持有」不看「配備」，所以不會有人被迫戴醜帽子。
  // 每件很小，靠數量累積；設上限免得收集完的人跟新人差太多。
  cosmeticPerItem: 0.005,  // 每擁有一件裝扮，魚 +0.5%
  cosmeticCap:     0.30,   // 最多 +30%
  maxPerFlush:     2000,   // 單次批次上限，規則層擋 5000
  goldfishOdds:    500,    // 每 N 次計分，有一次企鵝彈不回來並掉一條金魚
  doubleClicks:    100,    // 雙倍魚卡生效幾次點擊
  noteMaxLen:      30,     // 紙條字數上限
  rosterSize:      50,     // 名單一次抓幾個人（10 人的圈子等於全員）
  pokeCooldownMs:  60000,  // 同一個人多久才能再戳一次
  idleStopMs:      0,      // 0 = 只要分頁切到背景就停止計分

  // ── 技能樹 ──
  autopressMs:  1400,      // 自動液壓機每幾毫秒壓一下（只在分頁看得見時）
  magicHandHits:  60,      // 魔法手一次幫朋友壓幾下
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

// ----------------------------------------------------------------------------
//  寶物與圖鑑
//
//  增益跟著「解鎖」走，不需要裝備 —— 跟裝扮同一個原則。
//  刻意把增益分散到不同軸，不要每個都是「魚 +X%」：
//  那樣收集 20 個只是一個數字變大，記不住哪個是哪個，也容易疊爆。
//
//  buff.kind：
//    fish    魚產出 +value（比例）
//    help    每天幫忙額度 +value（次數）
//    drop    寶物掉落機率 ×(1+value)
//    gold    金魚門檻 ×(1-value)，越小越容易掉
//    double  雙倍卡每次給的次數 +value
//    freezeOff / giftOff   凍結卡 / 道具打折（比例）
// ----------------------------------------------------------------------------
export const RARITY = {
  // odds 是機率分母：每次計分有 1/odds 的機會掉這一級的某個寶物。
  // 傳說與神話要先在探寶軸點出權限才會進掉落池 —— 那個「還不行」就是深度。
  common:   { name:'一般', odds:   300, color:'#8b9aa5' },
  uncommon: { name:'少見', odds:   900, color:'#3fa45b' },
  rare:     { name:'稀有', odds:  2600, color:'#2f7fd0' },
  epic:     { name:'傳說', odds:  9000, color:'#a457d8', needs:'dropEpic' },
  myth:     { name:'神話', odds: 30000, color:'#d8a020', needs:'dropMyth' },
};

export const RARITY_ORDER = ['common','uncommon','rare','epic','myth'];

export const TREASURES = [
  // ── 機率掉落 11 ──
  { id:'sweat',   icon:'💦', name:'汗珠',     rarity:'common',   source:'drop',
    hint:'壓著壓著就會掉',            buff:{ kind:'fish', value:0.02 } },
  { id:'down',    icon:'🪶', name:'絨毛',     rarity:'common',   source:'drop',
    hint:'壓著壓著就會掉',            buff:{ kind:'drop', value:0.20 } },
  { id:'shard',   icon:'🧊', name:'碎冰',     rarity:'common',   source:'drop',
    hint:'壓著壓著就會掉',            buff:{ kind:'freezeOff', value:0.30 } },
  { id:'shell',   icon:'🐚', name:'貝殼',     rarity:'uncommon', source:'drop',
    hint:'要壓久一點才看得到',        buff:{ kind:'fish', value:0.05 } },
  { id:'orb',     icon:'🔮', name:'水晶球',   rarity:'uncommon', source:'drop',
    hint:'要壓久一點才看得到',        buff:{ kind:'gold', value:0.20 } },
  { id:'compass', icon:'🧭', name:'羅盤',     rarity:'uncommon', source:'drop',
    hint:'要壓久一點才看得到',        buff:{ kind:'help', value:50 } },
  { id:'crown',   icon:'👑', name:'王冠碎片', rarity:'rare',     source:'drop',
    hint:'比較難掉的那種',            buff:{ kind:'fish', value:0.08 } },
  { id:'quill',   icon:'🖋', name:'冰筆',     rarity:'rare',     source:'drop',
    hint:'比較難掉的那種',            buff:{ kind:'giftOff', value:0.08 } },
  { id:'stardust',icon:'🌌', name:'星塵',     rarity:'epic',     source:'drop',
    hint:'挖得夠深才見得到',          buff:{ kind:'double', value:50 } },
  { id:'aurora',  icon:'🌠', name:'極光',     rarity:'epic',     source:'drop',
    hint:'挖得夠深才見得到',          buff:{ kind:'gold', value:0.30 } },
  { id:'core',    icon:'🌟', name:'格魯之心', rarity:'myth',     source:'drop',
    hint:'據說它一直都在，只是沒人看得見', buff:{ kind:'fish', value:0.15 } },

  // ── 成就 11 ──
  { id:'first',   icon:'🥚', name:'第一下',   rarity:'common',   source:'achieve',
    hint:'壓下你的第一下',            buff:{ kind:'fish', value:0.01 } },
  { id:'k1',      icon:'🏃', name:'千錘百鍊', rarity:'common',   source:'achieve',
    hint:'自己累計壓滿 1,000 下',      buff:{ kind:'fish', value:0.03 } },
  { id:'nb3',     icon:'🤝', name:'好鄰居',   rarity:'common',   source:'achieve',
    hint:'幫過 3 個不同的人',          buff:{ kind:'help', value:40 } },
  { id:'stylish', icon:'🎨', name:'有型',     rarity:'common',   source:'achieve',
    hint:'擁有 10 件裝扮',             buff:{ kind:'drop', value:0.15 } },
  { id:'week',    icon:'🔥', name:'一週皆勤', rarity:'uncommon', source:'achieve',
    hint:'連續 7 天都有來',            buff:{ kind:'help', value:30 } },
  { id:'nb5',     icon:'🏘', name:'街坊',     rarity:'uncommon', source:'achieve',
    hint:'幫過 5 個不同的人',          buff:{ kind:'fish', value:0.04 } },
  { id:'loved',   icon:'🎁', name:'人緣',     rarity:'uncommon', source:'achieve',
    hint:'收到 10 樣別人送的東西',      buff:{ kind:'giftOff', value:0.10 } },
  { id:'month',   icon:'📅', name:'一月不輟', rarity:'rare',     source:'achieve',
    hint:'連續 30 天都有來',           buff:{ kind:'fish', value:0.06 } },
  { id:'mt100k',  icon:'🗻', name:'十萬大山', rarity:'rare',     source:'achieve',
    hint:'小圈子總數突破十萬',          buff:{ kind:'fish', value:0.05 } },
  { id:'hatlove', icon:'🎩', name:'帽癡',     rarity:'epic',     source:'achieve',
    hint:'集滿所有帽子',               buff:{ kind:'fish', value:0.05 } },
  { id:'master',  icon:'🌳', name:'專精',     rarity:'myth',     source:'achieve',
    hint:'把一條路走到底',
    how:'把任何一條技能軸的四個技能全部學會',    buff:{ kind:'fish', value:0.10 } },

  // ── 彩蛋 4 ──
  // 彩蛋的 hint 是「還沒拿到時」看到的，要隱晦；
  // how 是「拿到之後」才揭曉的真正做法 —— 不然不知不覺解鎖的人不知道發生了什麼。
  { id:'curious', icon:'🔢', name:'好奇心',   rarity:'common',   source:'egg',
    hint:'有些數字禁不起反覆敲打',
    how:'快速連點左上角的版本號 5 下',           buff:{ kind:'drop', value:0.10 } },
  { id:'oclock',  icon:'🕛', name:'準時',     rarity:'uncommon', source:'egg',
    hint:'分針歸零的那一刻',
    how:'在整點過後的那一分鐘之內壓一下',        buff:{ kind:'gold', value:0.10 } },
  { id:'tickle',  icon:'🦶', name:'搔癢',     rarity:'uncommon', source:'egg',
    hint:'別老是打頭',
    how:'連續戳格魯的腳 10 下',                  buff:{ kind:'fish', value:0.03 } },
  { id:'combo',   icon:'🔁', name:'一鏡到底', rarity:'epic',     source:'egg',
    hint:'別停下來',
    how:'一口氣壓 100 下，中間不能停超過 2 秒',   buff:{ kind:'double', value:30 } },

  // ── 商店（用金魚買）3 ──
  { id:'trophy',  icon:'🏆', name:'獎盃',     rarity:'uncommon', source:'shop', gold:5,
    hint:'商店裡用金魚換',              buff:{ kind:'fish', value:0.05 } },
  { id:'gem',     icon:'💎', name:'原石',     rarity:'rare',     source:'shop', gold:12,
    hint:'商店裡用金魚換',              buff:{ kind:'drop', value:0.30 } },
  { id:'monolith',icon:'🗿', name:'石像',     rarity:'myth',     source:'shop', gold:40,
    hint:'商店最深處那個很貴的東西',     buff:{ kind:'fish', value:0.12 } },
];

export const SOURCE_LABEL = { drop:'掉落', achieve:'成就', egg:'彩蛋', shop:'商店' };
export const treasureInfo = id => TREASURES.find(t => t.id === id);
// 拿到之後看到的說明。彩蛋才需要另寫，其他的條件本身就是提示。
export const treasureHow = t => t.how || t.hint;

// 商店。cost 是魚；gold=true 的要用金魚買。
// self=true 代表可以買給自己，give=true 代表可以送人。
export const ITEMS = {
  poke:   { emoji:'👉', name:'戳一下',   cost:  0, give:true,            desc:'免費。在名單上點一下就送出' },
  note:   { emoji:'💌', name:'紙條',     cost:  8, give:true, text:true, desc:'留一句話，30 字以內' },
  fish:   { emoji:'🐟', name:'送魚',     cost: 25, give:true, gives:20,  desc:'對方收到 20 條魚（虧本，但是心意）' },
  freeze: { emoji:'🧊', name:'凍結卡',   cost: 60, give:true, self:true, desc:'漏掉一天時自動用掉，保住連續天數' },
  hat:    { emoji:'🎩', name:'帽子',     cost: 60, give:true, hat:true, desc:'送一頂帽子給朋友，他會直接戴上而且永久解鎖' },
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

// 手持物。錨點取自去背圖的翅膀尖端，兩個姿勢都會自動跟著移動。
// 先用 emoji 起手；之後換成手繪圖只是換一個圖層來源，結構不用動。
export const HOLD = [
  { id:'none', name:'空手',   cost:  0, need:      0 },
  { id:'🔫',   name:'水槍',   cost: 90, need:      0 },
  { id:'🪓',   name:'斧頭',   cost: 90, need:      0 },
  { id:'🍳',   name:'平底鍋', cost: 90, need:      0 },
  { id:'🎤',   name:'麥克風', cost: 90, need:      0 },
  { id:'🏏',   name:'球棒',   cost: 90, need:      0 },
  { id:'🌭',   name:'熱狗',   cost: 70, need:      0 },
  { id:'🧋',   name:'珍奶',   cost: 70, need:      0 },
  { id:'🗡',   name:'劍',     cost:150, need:   5000 },
  { id:'🔦',   name:'手電筒', cost:150, need:  25000 },
  { id:'🪄',   name:'魔杖',   cost:200, need: 100000 },
  { id:'⚡️',   name:'閃電',   cost:250, need: 250000 },
];

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

// 帽子和手持物也併進來，五類共用同一套「解鎖 / 預覽 / 換裝」流程
// 「不戴」也要是一個正式選項（免費），不然換裝流程會把它當成沒解鎖的東西
SKINS.hat  = [{ id:'none', name:'不戴', cost:0, need:0 },
              ...HATS.map(h => ({ id:h.e, name:h.name, cost:h.cost, need:h.need }))];
SKINS.hold = HOLD;

export const SKIN_KINDS = [
  { k:'hat',  label:'帽子' },
  { k:'hold', label:'手持物' },
  { k:'bg',   label:'背景' },
  { k:'tint', label:'企鵝顏色' },
  { k:'font', label:'數字樣式' },
];
export const skinInfo = (kind, id) =>
  (SKINS[kind] || []).find(x => x.id === id) || (SKINS[kind] || [])[0];
export const defaultSkin = () =>
  ({ bg:SKINS.bg[0].id, tint:SKINS.tint[0].id, font:SKINS.font[0].id,
     hold:'none', hat:'none' });


/* ------------------------------------------------------------- 技能樹 -- */
/* 詳細設計理由見 docs/SKILLTREE.md。
   一句話版本：技能點總數由 lifetime 推導，資料庫只存「學會了哪些」，
   所以沒有需要同步的計數器，也就沒有回滾 bug。                              */

export const AXES = {
  press:  { name:'壓製', icon:'🔨', color:'#d06a2f', blurb:'把每一下壓得更值錢' },
  social: { name:'社交', icon:'🤝', color:'#2f7fd0', blurb:'跟朋友之間能做的事' },
  hunt:   { name:'探寶', icon:'🔍', color:'#a457d8', blurb:'找到更稀有的東西' },
};

// 每通過一個門檻（個人累計壓製）就 +1 技能點。里程碑另外再各 +1。
// 全部點滿要 33 點，而這裡最多給 17 + 7 = 24 —— 點不滿是故意的，
// 這樣「要走哪條路」才是一個真的選擇。
export const SP_STEPS = [
  500, 1500, 3000, 6000, 10000, 15000, 25000, 40000, 60000,
  90000, 130000, 180000, 250000, 350000, 500000, 700000, 1000000,
];

// buff 的 kind 跟寶物共用同一套，所以效果會自動疊加進 buffOf()。
// grants 則是「權限」而不是數值 —— 那是後期解鎖真正的味道。
export const SKILLS = [
  { id:'press1',  axis:'press',  tier:1, cost:1, icon:'💪', name:'熟練',
    desc:'每次計分多 10% 的魚',          buff:{ kind:'fish', value:0.10 } },
  { id:'press2',  axis:'press',  tier:2, cost:2, icon:'🪨', name:'重壓',
    desc:'金魚出現的機率提高 25%',        buff:{ kind:'gold', value:0.25 } },
  { id:'press3',  axis:'press',  tier:3, cost:3, icon:'⚡', name:'連壓',
    desc:'每次計分再多 20% 的魚',         buff:{ kind:'fish', value:0.20 } },
  { id:'press4',  axis:'press',  tier:4, cost:5, icon:'🏗', name:'自動液壓機',
    desc:'開著這一頁的時候，你家的格魯會自己被壓。切到別的分頁就會停。',
    grants:'autopress' },

  { id:'social1', axis:'social', tier:1, cost:1, icon:'☕', name:'熱心',
    desc:'每天幫別人的額度 +100',         buff:{ kind:'help', value:100 } },
  { id:'social2', axis:'social', tier:2, cost:2, icon:'🎀', name:'順手禮',
    desc:'送人的東西便宜 15%',            buff:{ kind:'giftOff', value:0.15 } },
  { id:'social3', axis:'social', tier:3, cost:3, icon:'🚪', name:'常客',
    desc:'每天幫別人的額度再 +200',        buff:{ kind:'help', value:200 } },
  { id:'social4', axis:'social', tier:4, cost:5, icon:'👋', name:'魔法手',
    desc:'每天可以在一位朋友家留下一隻手，直接幫壓 60 下，而且不算你的額度。',
    grants:'magichand' },

  { id:'hunt1',   axis:'hunt',   tier:1, cost:1, icon:'👀', name:'眼尖',
    desc:'寶物掉落機率 +30%',            buff:{ kind:'drop', value:0.30 } },
  { id:'hunt2',   axis:'hunt',   tier:2, cost:2, icon:'📖', name:'線索',
    desc:'圖鑑裡還沒拿到的格子會顯示稀有度',  grants:'hintRarity' },
  { id:'hunt3',   axis:'hunt',   tier:3, cost:3, icon:'⛏', name:'深掘',
    desc:'解鎖「傳說」級寶物的掉落。沒有這個，它們永遠不會出現。',
    grants:'dropEpic' },
  { id:'hunt4',   axis:'hunt',   tier:4, cost:5, icon:'🔆', name:'神話之眼',
    desc:'解鎖「神話」級寶物的掉落。整個小圈子最深的地方。',
    grants:'dropMyth' },
];

export const skillInfo = id => SKILLS.find(s => s.id === id) || null;

// 同一軸要照順序點：第 N 層要先有第 N−1 層。
export const skillPrereq = sk =>
  sk.tier === 1 ? null
  : (SKILLS.find(s => s.axis === sk.axis && s.tier === sk.tier - 1)?.id || null);
