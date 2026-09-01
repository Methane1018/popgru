# POPGRU

大家一起壓扁企鵝的小圈子遊戲。每個人有一隻自己的**格魯**，可以互相拜訪、幫對方壓。

---

## 檔案

```
index.html                        版面與樣式
js/config.js                      ← 你只需要改這個檔案
js/store.js                       資料層（訪客 localStorage / 會員 Firestore）
js/app.js                         畫面與互動
firestore.rules                   安全規則，貼到 Firebase Console
src/penguin-tall-cutout.png       去背，站著
src/penguin-flat-cutout.png       去背，壓扁
src/penguin-tall-original.jpg     原始照片
src/penguin-flat-original.jpg     原始照片
```

兩張去背圖是**對齊在同一張畫布上的**（都是 1629×1302）：以兩眼間距為基準縮放、腳底對齊同一條地平線。所以 HTML 只要疊著切換就會準，不需要任何 CSS 位移。帽子的錨點（`.hat.tall` / `.hat.flat`）也是從眼睛座標算出來的。

---

## 文件

- [docs/ROADMAP.md](docs/ROADMAP.md) —— 開發計畫、已定案的設計原則、需要美術的規格
- [docs/DEVLOG.md](docs/DEVLOG.md) —— 踩過的坑與根因，每條在 `check.mjs` 都有對應檢查

## 發新版

版本號的來源是 `js/config.js` 的 `CHANGELOG`，**最上面那筆就是目前版本**。

```js
export const CHANGELOG = [
  { v:'0.5.0', date:'2026-09-01', notes:[
    '加了什麼',
    '修好了什麼',
  ]},
  ...舊的往下排
];
```

然後：

```bash
./bump.sh       # 把所有 import 的 ?v= 同步成新版本，並跑 check.mjs
git add . && git commit -m "..." && git push
```

順序是刻意的：**沒寫更新內容就升不了版**，所以不會有「版本跳了但沒人知道改了什麼」。

朋友那邊會看到左上角的版本號旁邊多一個小點，點下去就是更新內容。第一次玩的人不會被提醒。

`check.mjs` 是出貨前的靜態檢查，每一條都對應一個真的發生過而且**靜悄悄壞掉**的 bug：

- flush 寫回的欄位與快照讀入的欄位必須一字不差（不然連續天數和幫忙額度會自己歸零）
- 待送匣讀寫格式一致（不然補送整個失效，關頁面就掉資料）
- 從 config 匯入的名稱 config 真的有匯出（不然整個模組載入即爆）
- app.js 用到的 DOM id 在 index.html 存在
- 版本標記四處一致（不然同一個模組會被載入兩份，各有各的 state）
- 帽子門檻對齊里程碑

沒過就不讓升版。

## 本機測試

ES modules 不能用 `file://` 開，要起一個小伺服器：

```bash
cd popgru
python3 -m http.server 8000
# 打開 http://localhost:8000
```

**沒設定 Firebase 也能玩**：會自動跑訪客模式，資料存在瀏覽器本機，後端零紀錄。

---

## 接上 Firebase

1. 到 <https://console.firebase.google.com/> 建立專案（關掉 Google Analytics 就好）
2. **專案設定 → 一般 → 你的應用程式 → 新增網頁應用程式**（`</>` 圖示），
   把它給你的 `firebaseConfig` 整段貼進 `js/config.js`
3. **Authentication → Sign-in method → 啟用 Google**
4. **Authentication → Settings → 授權網域 → 新增** `<你的帳號>.github.io`
   （`localhost` 預設就在裡面，本機測試不用加）
5. **Firestore Database → 建立資料庫**，位置選離你近的（例如 `asia-east1`）
6. **Firestore → 規則**，把 `firestore.rules` 整份貼上 → **發布**

> 第 6 步不要跳過。測試模式的預設規則 30 天後會全部鎖死，到時候會突然壞掉。

`firebaseConfig` 裡的金鑰**本來就是公開的**，前端一定看得到，放進 git 沒問題。真正的保護來自規則。

---

## 放上 GitHub Pages

```bash
git init && git add . && git commit -m "popgru"
git branch -M main
git remote add origin git@github.com:<你的帳號>/popgru.git
git push -u origin main
```

**Settings → Pages → Source: Deploy from a branch → `main` / `(root)`**

網址是 `https://<你的帳號>.github.io/popgru/`。圖片和 js 都是相對路徑，放在子目錄底下能正常運作。

建議加個 `.gitignore`：

```
.DS_Store
```

---

## 玩法

- **點格魯** → 它瞬間變扁，計數 +1，拿到 🐟 魚。沒有中間幀，就是硬切
- **🔥 連續天數** → 每天來壓至少一下就 +1。刷不出來，只能每天出現
- **🧊 凍結卡** → 漏掉一天時自動用掉，保住連續天數。可以買給自己或送朋友
- **👥 大家** → 所有人的格魯，依「最近被壓過」排序，所以是一條動態而不是戰績表
- **去別人家幫忙壓** → 同時算進他家格魯**和**你自己的累計。幫忙永遠不是犧牲
- **🤝 每天 300 下的幫忙額度** → 壓自己家無上限，但幫別人有配額。額度用完照樣壓得動，只是不計分
- **🔗 分享** → 複製 `?gru=<你的 id>`，朋友打開就直接站在你家門口
- **🥇 金魚** → 每 500 下有一次格魯攤在地上三秒起不來，掉一條金魚
- **📬 信箱** → 收到的東西下次打開才會看到。收到的每樣東西旁邊都有「回丟」

---

## 設計註記

### 為什麼幫忙有額度、壓自己家沒有

`js/config.js`：

```js
dailyCap:   0,    // 壓自己家：無上限
helpCap:  300,    // 幫別人：每天 300 下
```

**稀缺性是禮物之所以是禮物的原因。** 你有無限的點擊時，花在朋友身上就不算什麼；一天只有 300 下可以送人，決定要給誰就變成一件有份量的事。300 下大約夠認真幫 3～5 個人。

額度是**每天總量**，不是每人各 300。所以你得選要幫誰——那個取捨才是有趣的地方。

覺得太緊就調大，覺得太鬆就調小。想全部拿掉就設 `0`。
另外 `dailyCap` 是全面的每日計分上限，如果哪天有人開始用自動點擊器刷自己家，把它設成 `1000` 之類的數字就能讓刷分完全失去意義。

### 作弊這件事

前端的數字都是前端在算的，會開 devtools 的人繞得過去。規則只擋單次寫入超過 5000 這種災難級的數值。

這是刻意的取捨：**在 10 個人的圈子裡，數字爆掉是一眼就看得出來的事**，那是社交約束，比技術約束有效得多。真的要擋，把規則裡的 `signedIn()` 換成 email 白名單：

```
function inCircle() {
  return signedIn() && request.auth.token.email in [
    'a@gmail.com', 'b@gmail.com'
  ];
}
```

比較輕的做法是把 `js/config.js` 的 `ACCESS` 改成 `'invite'`，設好 `INVITE_CODE`。路人還是能壓好玩的，只是不計分。（邀請碼是前端擋的，是門檻不是鎖。）

### Firestore 的讀取量從哪裡來

免費額度是每天 5 萬次讀取 / 2 萬次寫入。這個專案的讀取幾乎全部來自一件事：

**每次 flush 會寫三份文件**（`users/{uid}`、`grus/{uid}`、`meta/global`），而三份都掛著
`onSnapshot`。**寫下去就會回推一次快照，那就算一次讀取。** 所以「多久 flush 一次」
直接決定每小時燒多少額度：

| 停手後多久寫出去 | 密集操作一小時的讀取量（單人） |
|---|---|
| 1.5 秒 | 約 7,200 |
| 6 秒（現在） | 約 1,800 |
| 20 秒 | 約 540 |

`meta/global` 那份還會乘上**同時在線人數**——每個人的監聽器都會收到一次。

放慢寫入不會掉資料：真正保命的是待送匣（`popgru.outbox`）和本機鏡像
（`popgru.mirror`），它們在 localStorage，關頁面／當掉／離線都在。

第二個來源是名單／信箱／足跡的查詢，名單一查就是全員。面板一開就重查的話，
來回點幾次商店就燒掉幾百次，所以加了 `listTtlMs` 的時間快取。

還嫌多的話，依序調這幾個（效果由大到小）：

1. `TUNING.quietFlushMs` 和 `flushMs` 調大
2. `TUNING.listTtlMs` 調大
3. 把 `meta/global` 的 `onSnapshot` 換成載入時 `getDoc` 一次
   —— 會失去「別人正在壓」的即時感，但省掉最大的乘數

### 連續天數用的是瀏覽器本機日期

不是 UTC，也不是伺服器時間。大家在同一個時區就沒差；跨時區的話，換日的時間點會各自不同。

### 掛機

沒有離線收益，放著不動賺不到任何東西。網頁開一整晚跟沒開一樣。

---

## 資料模型

```
/meta/global                    { squashes, lastSquasher:{uid,name,at} }
/grus/{uid}                     { name, ownerName, ownerPhoto, hat,
                                  squashes, createdAt, lastSquashedAt }
/grus/{uid}/visits/{visitorUid} { name, photo, count, at }
/users/{uid}                    { name, photo, lifetime, fish, goldfish, medals,
                                  freezes, double, streak, bestStreak,
                                  lastDay, todayCount, helpToday, helpDay, lastSeen }
/users/{uid}/inbox/{msgId}      { from, fromName, type, text?, hat?, at, read }
```

點擊**不會**每一下都寫資料庫：在前端累積，每 8 秒、或分頁切到背景、或關頁面時批次送出一次 `increment()`。所以狂點 500 下只算 1 次寫入——寫入量只跟 flush 頻率有關，跟點多快無關。10 個人的規模，免費額度用不到 1%。
