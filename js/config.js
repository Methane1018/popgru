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
  { v:'0.15.2', date:'2026-09-17', notes:[
    '格魯的裝扮和次數不用再空等連線，開頁就先把上次的畫上去',
  ]},
  { v:'0.15.1', date:'2026-09-17', notes:[
    '修掉一個會弄丟進度的問題：在新裝置登入、或清掉瀏覽器資料之後重新登入時，',
    '　遊戲有機會把「連勝、凍結卡、雙倍魚」讀成 0 再存回去',
    '現在第一次載入只認伺服器傳來的資料，不會再被剛登入時的半成品騙到',
  ]},
  { v:'0.15.0', date:'2026-09-17', notes:[
    '找到了：數字亂跳是「送人道具」造成的 —— 它扣了兩次魚，過一下才退回來一次',
    '送人的扣款現在跟買東西走同一條路，不會再亂跳',
  ]},
  { v:'0.14.9', date:'2026-09-17', notes:[
    '追蹤用：買東西和魚變動時會在主控台印出完整算式（還在追數字亂跳的問題）',
  ]},
  { v:'0.14.8', date:'2026-09-17', notes:[
    '再修一次數字亂跳：買東西時會先扣兩次、過一下才退回來一次。存檔送出的那一瞬間被重複計算了',
  ]},
  { v:'0.14.7', date:'2026-09-17', notes:[
    '魚或金魚如果算出負數，會在主控台印出完整的來源，方便回報（還在追一個數字會亂跳的問題）',
  ]},
  { v:'0.14.6', date:'2026-09-17', notes:[
    '修：花一大筆魚的時候，數字會先扣兩次再跳回正確值（存檔送出的那一瞬間被算了兩遍）',
  ]},
  { v:'0.14.5', date:'2026-09-17', notes:[
    '真的修好「魚花掉又跳回來」了 —— 只要在同一段時間裡既壓了格魯又買了東西，扣款就會被剛賺到的魚整個蓋掉，等於沒扣',
    '金魚買圖鑑寶物時也有同樣的問題，一併修好',
  ]},
  { v:'0.14.4', date:'2026-09-16', notes:[
    '修：魚花掉之後又跳回原本的數字，等於永遠用不完 —— 在自己家壓完馬上去朋友家壓的時候，前面那批會被記錯對象，然後每次重開又被算一次',
    '待送的點擊現在照「壓在誰家」分開記，不會再混在一起',
  ]},
  { v:'0.14.3', date:'2026-09-16', notes:[
    '修：同一個帳號在不同裝置登入時，連勝、凍結卡、雙倍魚、今天幫忙的次數不會同步，而且晚開的那台還會把舊資料寫回去蓋掉',
    '現在會比較「哪一台最後動過」，新的那份為準；開著的分頁也會跟上別台的改動',
  ]},
  { v:'0.14.2', date:'2026-09-16', notes:[
    '🎩 帽癡從「傳說」降到「一般」、效果從魚 +5% 改成 +2% —— 條件變簡單之後，它比「有型」還好拿',
  ]},
  { v:'0.14.1', date:'2026-09-16', notes:[
    '🎩 帽癡改成只要集滿「一開始就能買」的 7 頂帽子 —— 里程碑解鎖的不用。本來每加一次里程碑就更難拿',
    '裝扮商店分成「一開始就有」和「里程碑才解鎖」兩區，帽子那一區會顯示帽癡的進度',
    '已經拿到帽癡的人不受影響',
  ]},
  { v:'0.14.0', date:'2026-09-16', notes:[
    '下面那排按鈕整理成四顆：👥 大家、🛍 商店、🎒 我的、⚙️ 其他 —— 點進去再用分頁切換',
    '信箱搬進「大家」裡了，有新信的時候「大家」這顆會亮並顯示幾封',
    '新增 🎒 盒子：一眼看到自己手上有多少魚、金魚、金牌、凍結卡、雙倍魚',
    '每一組會記得你上次看到哪個分頁',
    '音效開關和分享連結搬到「其他」裡',
  ]},
  { v:'0.13.1', date:'2026-09-15', notes:[
    '技能樹現在真的畫成一棵樹了 —— 從起點分成三條，末端在「交會」會合，走過的路是實線',
  ]},
  { v:'0.13.0', date:'2026-09-14', notes:[
    '里程碑多了四個，一路到兩千五百萬 —— 🛸 幽浮、🌠 流星雨、🌌 銀河、🦚 極光企鵝',
    '技能樹長出「交會」：三個要兩條軸都有進度才點得起的節點',
    '〽️ 餘震：格魯攤倒那一下會多滾一次寶物',
    '🕵️ 情報網：每幫過一個不同的人，掉落機率 +2%（最多 +20%）',
    '🔗 同步：幫別人壓的時候，自己拿到的魚變兩倍',
  ]},
  { v:'0.12.1', date:'2026-09-08', notes:[
    '內部整理第二段：讀取資料時「哪個值該贏」的規則也搬出來了，同樣沒有玩法上的差別',
  ]},
  { v:'0.12.0', date:'2026-09-08', notes:[
    '內部整理：把「決定要存什麼」跟「送出去」拆開，這樣那些同步問題才測得到（玩起來沒有任何差別）',
  ]},
  { v:'0.11.4', date:'2026-09-03', notes:[
    '修：🤝「好鄰居」和 🏘「街坊」永遠達不成 —— 幫過誰的紀錄一直存錯地方',
    '之前幫過的人數不會白費，開啟時會自動從舊紀錄救回來',
  ]},
  { v:'0.11.3', date:'2026-09-03', notes:[
    '修：別人送的凍結卡和雙倍魚，收下來之後會在幾秒內消失（信在，東西沒了）',
    '🎁「人緣」成就本來根本拿不到 —— 收禮的數量從來沒被記錄過，現在會了',
    '收下的東西現在會立刻顯示，不用等存檔',
  ]},
  { v:'0.11.2', date:'2026-09-03', notes:[
    '修好上面的進度條（潮邊回報、和運猜中原因）——本來算的是「這一段走了多少」，旁邊的字卻寫「距離五十萬」，兩邊在講不同的事',
    '現在進度條就是「離下一個里程碑多遠」，而且直接寫出 317,208 / 500,000',
    '小圈子總數現在會即時反映你剛壓的下數，不用等存檔（本來最多卡 20 秒才跳一次）',
  ]},
  { v:'0.11.1', date:'2026-09-03', notes:[
    '跟金魚有關的寶物說明改寫（潮邊指出的）—— 金魚現在是固定計數，不該再講成「機率」',
    '圖鑑的總增益會直接告訴你「現在每幾下一條金魚」',
  ]},
  { v:'0.11.0', date:'2026-09-03', notes:[
    '「格魯攤在地上」跟「掉金魚」拆開了（潮邊的提議）',
    '🥇 金魚：每 350 下固定掉一條，不再看運氣 —— 進度條看得到還差幾下',
    '😵 攤了：變成少見的隨機大獎，一次給 150 條魚，而且那一下特別容易掉寶',
  ]},
  { v:'0.10.10', date:'2026-09-03', notes:[
    '修：金魚增益收滿之後變成「點一下掉一條」—— 算式在增益逼近 100% 時整個垮掉',
    '「金魚更容易掉 +25%」現在的意思是掉落頻率變 1.25 倍，收好收滿是 2 倍（350 → 175 下）',
    '道具折扣加了天花板，以後再多折扣寶物也不會變免費',
  ]},
  { v:'0.10.9', date:'2026-09-02', notes:[
    '修：用金魚買寶物之後，點一下金魚又變回原來的數目（等於沒扣到）',
    '買裝扮、買道具也有同樣的問題，一併修好',
  ]},
  { v:'0.10.8', date:'2026-09-02', notes:[
    '修掉「重新整理就白拿 3000 下」的漏洞 —— 開頁那一瞬間，本機備份的數字會被誤認成訪客成果重複補算',
    '補算訪客紀錄從此一個帳號只會發生一次',
  ]},
  { v:'0.10.7', date:'2026-09-02', notes:[
    '彩蛋解鎖後的邊框也是粉色的了 —— 它自成一級，不排在稀有度那條線上',
  ]},
  { v:'0.10.6', date:'2026-09-02', notes:[
    '👋 魔法手大改：不再是一次幫壓幾十下，而是在朋友身上留下一隻手 —— 接下來你在自己家壓的 200 下會同時幫他壓一下。你照常玩，順手就幫到人',
    '新彩蛋一枚。提示：在很久很久以前......',
    '彩蛋在圖鑑改用粉色標記，不再顯示稀有度（稀有度會洩漏它有多難）',
    '「好奇心」改名叫「再看一眼」',
    '「一鏡到底」講明了要手動壓，自動液壓機不算',
  ]},
  { v:'0.10.5', date:'2026-09-02', notes:[
    '終於找到技能消失的真正原因：連續學兩個技能時，後面那筆會把前面那筆的存檔蓋掉',
    '被弄丟的技能會在下次開啟時自動補回來（學得起第二層就代表第一層一定付過錢）',
    '同一個問題也會讓「連買兩個寶物只扣到後面那筆的錢」，一併修好',
  ]},
  { v:'0.10.4', date:'2026-09-02', notes:[
    '再修一次「學過的技能又變回可以學」—— 這次是從根本改：每次存檔都把完整的技能與寶物清單送上去，就算中間有一次寫入失敗也會自己補回來',
    '🥇 金魚進度條：現在看得到距離下一條還有幾下',
    '金魚變好拿了（每 350 下，本來是 500），圖鑑裡最貴的那個也降價了',
    '後期加速：可以用 10 條金魚換 1 點技能點',
    '「📖 線索」除了顯示掉落機率之外，也真的加 15% 掉落機率了',
    '圖鑑的商店寶物本來寫「道具商店」，其實是在圖鑑裡點進去換，文案修正',
  ]},
  { v:'0.10.3', date:'2026-09-02', notes:[
    '修：學會的技能過幾秒又變回「可以學」（剛拿到的東西會被伺服器的舊資料蓋掉）',
    '道具可以一次買／送好幾個，加減按鈕之外也能直接打數字',
    '圖鑑除了彩蛋之外都直接寫出取得條件，稀有度也不再遮起來',
    '現在還掉不到的寶物會標上灰鎖頭，直接告訴你缺哪個技能',
    '「📖 線索」改成顯示實際掉落機率',
    '修：裝扮商店的背景／顏色／字體按鈕互相疊在一起',
  ]},
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
  goldfishOdds:    350,    // 每壓 N 下固定掉一條金魚。
                           //   這是「計數」不是「碰運氣」—— 畫面上有進度條，
                           //   看得到還差幾下，努力就一定拿得到

  // 😵 格魯攤了：隨機、少見、獎勵大。
  //   本來這件事跟掉金魚是綁在一起的（同一個事件穿兩件衣服），
  //   結果兩邊都做不好：金魚明明是可預期的卻裝成隨機，
  //   而整個遊戲最好笑的攤地動畫被鎖死在一個固定節奏上。
  //   拆開之後，金魚是穩定的收入，攤了是真的會讓人「喔！」的那一下。
  flatOdds:        500,    // 平均每 N 下攤一次（真的擲骰，會連兩次也會很久沒有）
  flatFish:        150,    // 攤一次直接給幾條魚
  flatDropBoost:     8,    // 攤的那一下，寶物掉落機率乘幾倍
  goldPerSkillPoint: 10,   // 幾條金魚換一點技能點。後期唯一持續推進的來源，
                           //   也讓金魚在買完商店寶物之後還有用途
  doubleClicks:    100,    // 雙倍魚卡生效幾次點擊
  maxDiscount:    0.6,     // 折扣最多打到幾折為止。
                           //   折扣是 `原價 × (1 - 折扣)`，這個形式在折扣逼近 1
                           //   的時候會變成免費 —— 現在最多 0.33，但寶物只會越加越多，
                           //   先把天花板釘死比較安全
  noteMaxLen:      30,     // 紙條字數上限
  rosterSize:      50,     // 名單一次抓幾個人（10 人的圈子等於全員）
  pokeCooldownMs:  60000,  // 同一個人多久才能再戳一次
  idleStopMs:      0,      // 0 = 只要分頁切到背景就停止計分

  // ── 技能樹 ──
  autopressMs:  1400,      // 自動液壓機每幾毫秒壓一下（只在分頁看得見時）
  magicHandClicks: 200,    // 魔法手留下之後，你在自己家壓的前幾下會同時幫朋友壓
                           //   重點不是數量，是「你照常玩，順手就幫到人」
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
  // 放置手段上線之後總數會長得快很多，所以先把路鋪長一點。
  // 里程碑用完的話，進度條會因為 find() 找不到東西而整條消失。
  { at:   2000000, label: '兩百萬下',   unlock: '🛸 幽浮' },
  { at:   5000000, label: '五百萬下',   unlock: '🌠 流星雨' },
  { at:  10000000, label: '一千萬下',   unlock: '🌌 銀河' },
  { at:  25000000, label: '兩千五百萬', unlock: '🦚 極光企鵝' },
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
//    gold    金魚門檻 ÷(1+value) —— value 是「累積快幾倍」，不是機率
//    flat    格魯攤倒的機率 ÷(1+value)，同上
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
    hint:'壓扁時隨機掉落',            buff:{ kind:'fish', value:0.02 } },
  { id:'down',    icon:'🪶', name:'絨毛',     rarity:'common',   source:'drop',
    hint:'壓扁時隨機掉落',            buff:{ kind:'drop', value:0.20 } },
  { id:'shard',   icon:'🧊', name:'碎冰',     rarity:'common',   source:'drop',
    hint:'壓扁時隨機掉落',            buff:{ kind:'freezeOff', value:0.30 } },
  { id:'shell',   icon:'🐚', name:'貝殼',     rarity:'uncommon', source:'drop',
    hint:'壓扁時隨機掉落',            buff:{ kind:'fish', value:0.05 } },
  { id:'orb',     icon:'🔮', name:'水晶球',   rarity:'uncommon', source:'drop',
    hint:'壓扁時隨機掉落',            buff:{ kind:'gold', value:0.20 } },
  { id:'compass', icon:'🧭', name:'羅盤',     rarity:'uncommon', source:'drop',
    hint:'壓扁時隨機掉落',            buff:{ kind:'help', value:50 } },
  { id:'crown',   icon:'👑', name:'王冠碎片', rarity:'rare',     source:'drop',
    hint:'壓扁時隨機掉落',            buff:{ kind:'fish', value:0.08 } },
  { id:'quill',   icon:'🖋', name:'冰筆',     rarity:'rare',     source:'drop',
    hint:'壓扁時隨機掉落',            buff:{ kind:'giftOff', value:0.08 } },
  { id:'stardust',icon:'🌌', name:'星塵',     rarity:'epic',     source:'drop',
    hint:'壓扁時隨機掉落',            buff:{ kind:'double', value:50 } },
  { id:'aurora',  icon:'🌠', name:'極光',     rarity:'epic',     source:'drop',
    hint:'壓扁時隨機掉落',            buff:{ kind:'gold', value:0.30 } },
  { id:'core',    icon:'🌟', name:'格魯之心', rarity:'myth',     source:'drop',
    hint:'壓扁時隨機掉落',            buff:{ kind:'fish', value:0.15 } },

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
  // 本來是傳說：條件是「集滿所有帽子」，要等小圈子壓到一千萬。
  // v0.14.1 改成只看一開始就能買的 7 頂（合計 320 條魚）之後，
  // 它比 🎨 有型（任意 10 件裝扮，一般級）還簡單 —— 所以降到一般。
  // 「集滿全部」跟「卡進度」是互斥的；要一個稀有的帽子成就，用數量（例如擁有 12 頂），
  // 那種目標加新帽子只會變簡單，不會越改越難。
  { id:'hatlove', icon:'🎩', name:'帽癡',     rarity:'common',   source:'achieve',
    hint:'集滿一開始就能買的帽子（里程碑解鎖的不算）', buff:{ kind:'fish', value:0.02 } },
  { id:'master',  icon:'🌳', name:'專精',     rarity:'myth',     source:'achieve',
    hint:'把任何一條技能軸的四個技能全部學會',    buff:{ kind:'fish', value:0.10 } },

  // ── 彩蛋 4 ──
  // 彩蛋的 hint 是「還沒拿到時」看到的，要隱晦；
  // how 是「拿到之後」才揭曉的真正做法 —— 不然不知不覺解鎖的人不知道發生了什麼。
  { id:'curious', icon:'🔢', name:'再看一眼', rarity:'common',   source:'egg',
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
    how:'一口氣手動壓 100 下，中間不能停超過 2 秒（自動液壓機不算）',
    buff:{ kind:'double', value:30 } },
  { id:'origin',  icon:'📜', name:'追本溯源', rarity:'rare',     source:'egg',
    hint:'在很久很久以前......',
    how:'在更新內容裡翻到最舊的 v0.1.0，點那四個藍色的字',
    buff:{ kind:'gold', value:0.15 } },

  // ── 商店（用金魚買）3 ──
  { id:'trophy',  icon:'🏆', name:'獎盃',     rarity:'uncommon', source:'shop', gold:5,
    hint:'圖鑑裡用 5 金魚換，點進來就看得到', buff:{ kind:'fish', value:0.05 } },
  { id:'gem',     icon:'💎', name:'原石',     rarity:'rare',     source:'shop', gold:12,
    hint:'圖鑑裡用 12 金魚換，點進來就看得到',buff:{ kind:'drop', value:0.30 } },
  { id:'monolith',icon:'🗿', name:'石像',     rarity:'myth',     source:'shop', gold:30,
    hint:'圖鑑裡用 30 金魚換',           buff:{ kind:'fish', value:0.12 } },
];

export const SOURCE_LABEL = { drop:'掉落', achieve:'成就', egg:'彩蛋', shop:'商店' };
// 彩蛋自成一級。稀有度會洩漏它有多難，而彩蛋的重點就是自己撞到，
// 所以它不排在一般／少見／稀有／傳說／神話那條線上，用自己的粉色。
export const EGG_TAG = { name:'彩蛋', color:'#d4568f' };

// 一個寶物在畫面上的「級別」。邊框、徽章、找到時的提示都走這裡，
// 才不會有的地方記得換成彩蛋色、有的地方忘了。
export const tagOf = t => (t.source === 'egg' ? EGG_TAG : RARITY[t.rarity]);
export const treasureInfo = id => TREASURES.find(t => t.id === id);
// 拿到之後看到的說明。彩蛋才需要另寫，其他的條件本身就是提示。
export const treasureHow = t => t.how || t.hint;

// 商店。cost 是魚；gold=true 的要用金魚買。
// self=true 代表可以買給自己，give=true 代表可以送人。
// stack=true 代表可以一次買／送很多個。紙條和帽子沒有意義（一句話、一頂），
// 戳一下有冷卻，所以這三個沒有數量。
export const ITEMS = {
  poke:   { emoji:'👉', name:'戳一下',   cost:  0, give:true,            desc:'免費。在名單上點一下就送出' },
  note:   { emoji:'💌', name:'紙條',     cost:  8, give:true, text:true, desc:'留一句話，30 字以內' },
  fish:   { emoji:'🐟', name:'送魚',     cost: 25, give:true, gives:20, stack:true, desc:'對方收到 20 條魚（虧本，但是心意）' },
  freeze: { emoji:'🧊', name:'凍結卡',   cost: 60, give:true, self:true, stack:true, desc:'漏掉一天時自動用掉，保住連續天數' },
  hat:    { emoji:'🎩', name:'帽子',     cost: 60, give:true, hat:true, desc:'送一頂帽子給朋友，他會直接戴上而且永久解鎖' },
  double: { emoji:'⚡', name:'雙倍魚',   cost: 80, give:true, self:true, stack:true, desc:'接下來 100 下拿雙倍魚（不影響每日上限）' },
  medal:  { emoji:'🏅', name:'金牌',     cost:  1, give:true, gold:true, stack:true, desc:'用金魚買，永久掛在對方名字旁邊' },
};

// 一次最多買／送幾個。上限存在的理由是手滑打錯數字，不是平衡。
export const MAX_QTY = 99;
export const clampQty = (n, max = MAX_QTY) =>
  Math.max(1, Math.min(max, Math.floor(Number(n)) || 1));

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
  { e:'🛸', cost: 350, need: 2000000, name:'幽浮' },
  { e:'🌌', cost: 450, need:10000000, name:'銀河' },
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
    { id:'meteor', name:'流星雨',   cost:400, need:5000000, emoji:'🌠' },
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
    { id:'aurora',name:'極光企鵝',   cost:500, need:25000000, filter:'sepia(1) hue-rotate(140deg) saturate(5) brightness(1.12) contrast(1.1)' },
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

// 三條軸從同一個起點長出來，末端再交會 —— 這樣才是一棵樹，不是三條平行線。
//
// 但老實說，「單一起點」本身不會增加深度：三條軸共用點數的時候，
// 選擇壓力就已經存在了。真正增加深度的是**跨支節點** ——
// 要兩條軸都有進度才點得起，所以走壓製＋探寶的人跟走社交＋探寶的人
// 玩起來是兩種不同的遊戲，而不是同一個遊戲的兩種數值配置。
export const CROSS = { name:'交會', icon:'🌳', color:'#3fa45b',
                       blurb:'兩條路都走過一段，才到得了的地方' };

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
  { id:'press1',  axis:'press',  tier:1, row:1, col:0, cost:1, icon:'💪', name:'熟練',
    desc:'每次計分多 10% 的魚',          buff:{ kind:'fish', value:0.10 } },
  { id:'press2',  axis:'press',  tier:2, row:2, col:0, cost:2, icon:'🪨', name:'重壓',
    desc:'金魚累積速度 +25% —— 金魚是每壓固定下數就掉一條，這讓那個門檻變短',
    buff:{ kind:'gold', value:0.25 } },
  { id:'press3',  axis:'press',  tier:3, row:3, col:0, cost:3, icon:'⚡', name:'連壓',
    desc:'每次計分再多 20% 的魚',         buff:{ kind:'fish', value:0.20 } },
  { id:'press4',  axis:'press',  tier:4, row:4, col:0, cost:5, icon:'🏗', name:'自動液壓機',
    desc:'開著這一頁的時候，你家的格魯會自己被壓。切到別的分頁就會停。',
    grants:'autopress' },

  { id:'social1', axis:'social', tier:1, row:1, col:4, cost:1, icon:'☕', name:'熱心',
    desc:'每天幫別人的額度 +100',         buff:{ kind:'help', value:100 } },
  { id:'social2', axis:'social', tier:2, row:2, col:4, cost:2, icon:'🎀', name:'順手禮',
    desc:'送人的東西便宜 15%',            buff:{ kind:'giftOff', value:0.15 } },
  { id:'social3', axis:'social', tier:3, row:3, col:4, cost:3, icon:'🚪', name:'常客',
    desc:'每天幫別人的額度再 +200',        buff:{ kind:'help', value:200 } },
  { id:'social4', axis:'social', tier:4, row:4, col:4, cost:5, icon:'👋', name:'魔法手',
    desc:'每天可以在一位朋友身上留下一隻手。接下來你在自己家壓的 200 下，' +
         '會同時幫他壓一下 —— 你照常玩，順手就幫到人，而且完全不吃你的幫忙額度。',
    grants:'magichand' },

  { id:'hunt1',   axis:'hunt',   tier:1, row:1, col:2, cost:1, icon:'👀', name:'眼尖',
    desc:'寶物掉落機率 +30%',            buff:{ kind:'drop', value:0.30 } },
  { id:'hunt2',   axis:'hunt',   tier:2, row:2, col:2, cost:2, icon:'📖', name:'線索',
    desc:'圖鑑會顯示實際掉落機率，而且掉落機率 +15%',
    buff:{ kind:'drop', value:0.15 }, grants:'hintOdds' },
  { id:'hunt3',   axis:'hunt',   tier:3, row:3, col:2, cost:3, icon:'⛏', name:'深掘',
    desc:'解鎖「傳說」級寶物的掉落。沒有這個，它們永遠不會出現。',
    grants:'dropEpic' },
  { id:'hunt4',   axis:'hunt',   tier:4, row:4, col:2, cost:5, icon:'🔆', name:'神話之眼',
    desc:'解鎖「神話」級寶物的掉落。整個小圈子最深的地方。',
    grants:'dropMyth' },

  // ── 交會：needs 要兩條軸都有進度 ──
  // 刻意要求兩邊的第三層，所以最快也要 6+6+4 = 16 點才碰得到一個。
  // 它們應該長期掛在樹上當「看得到但還走不到的地方」。
  { id:'cross1', axis:'cross', tier:5, row:5, col:1, cost:4, icon:'〽️', name:'餘震',
    needs:['press3','hunt3'],
    desc:'格魯攤倒的那一下會多滾一次寶物 —— 等於兩次機會',
    grants:'aftershock' },
  { id:'cross2', axis:'cross', tier:5, row:5, col:3, cost:4, icon:'🕵️', name:'情報網',
    needs:['social3','hunt3'],
    desc:'每幫過一個不同的人，掉落機率 +2%（最多 +20%）',
    grants:'intel' },
  { id:'cross3', axis:'cross', tier:5, row:5, col:2, cost:4, icon:'🔗', name:'同步',
    needs:['press3','social3'],
    desc:'幫別人壓的時候，你自己拿到的魚變兩倍',
    grants:'syncFish' },
];

// 技能樹畫成樹狀圖用的。
//
// 位置寫在每個節點的 row / col 上，**線則完全由 needs 推導出來** ——
// 不另外維護一份邊資料，圖跟規則就不可能不一致。
// 以後要加分支的分支、或是更多合成，就是加一個節點寫好 row/col/needs，
// 線會自己長出來。
export const TREE_COLS = 5;
export const SKILL_ROOT = { id:'__root', row:0, col:2, icon:'🥚', name:'起點' };

// 畫布上所有的線：[從, 到]。第一層沒有 needs，就從起點長出來。
export const treeEdges = () => SKILLS.flatMap(sk => {
  const from = skillNeeds(sk);
  return (from.length ? from : [SKILL_ROOT.id]).map(f => [f, sk.id]);
});

// 某個 id 在畫布上的位置（含起點）
export const treePos = id =>
  id === SKILL_ROOT.id ? SKILL_ROOT : (SKILLS.find(s => s.id === id) || null);

export const TREE_ROWS = () =>
  Math.max(...SKILLS.map(s => s.row), SKILL_ROOT.row) + 1;

export const skillInfo = id => SKILLS.find(s => s.id === id) || null;

// 一個技能要先有哪些技能才點得起。回傳陣列（可能是空的）。
//
// 一般節點：同一軸的前一層。
// 交會節點：自己寫在 needs 裡，通常是兩條不同軸的節點。
export const skillNeeds = sk => {
  if (!sk) return [];
  if (sk.needs) return sk.needs;
  if (sk.tier === 1) return [];
  const prev = SKILLS.find(s => s.axis === sk.axis && s.tier === sk.tier - 1);
  return prev ? [prev.id] : [];
};

// 舊名字，留給還沒改過來的呼叫點（只回第一個）
export const skillPrereq = sk => skillNeeds(sk)[0] || null;
