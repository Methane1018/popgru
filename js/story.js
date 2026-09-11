// ============================================================================
//  story.js —— 兔子洞的劇本
//
//  寫作規格見 docs/RABBITHOLE.md，世界觀見 docs/LORE.md。
//  三個重點：一句話 ≤ 60 字、場景要短（隨時可以關掉）、不要有失敗。
//
//  立繪檔名：src/story/<who>-<face>.png，例如 jiahao-normal.png
//  face 目前是暫定的，畫好之後依實際表情調整。
// ============================================================================

export const STORY = {
  id: 'rabbithole',
  title: '（還沒取名）',
  start: 'intro',

  // 故事回顧。看完一章就解鎖那一章，可以重跑、選不同的選項看不同結果。
  // 重跑不會改動任何進度，也不會重複給任何東西。
  chapters: [
    { id: 'intro', title: '導入', scenes: ['intro', 'introAsk', 'introEnd'] },
  ],

  scenes: {
    /* ------------------------------------------------------------ 導入 -- */
    intro: {
      lines: [
        { who:'jiahao', face:'surprised', text:'哇哇哇哇哇！真的成功進來了！幫大忙了！' },
        { who:'jiahao', face:'normal',    text:'你就是這塊地的執行者對吧。' },
        { who:'jiahao', face:'sad',       text:'對不起，我擅自闖進來了！我叫做乂卍㊣煞氣a家豪㊣卍乂，你可以叫我家豪。' },
        { who:'jiahao', face:'sad',       text:'雖然我很想確認你的意願再躲進來，可是我其實也不是很確定到底要怎麼進出不同領地。' },
        { who:'jiahao', face:'normal',    text:'我會盡可能不打擾你的！抱歉了！' },
        { who:'jiahao', face:'normal',    text:'對了，我從剛剛進來就有點好奇了，這邊是在......？' },
      ],
      next: 'introAsk',
    },

    introAsk: {
      lines: [],
      choices: [
        {
          text: '壓扁企鵝',
          lines: [{ who:'jiahao', face:'surprised', text:'……？這不違法嗎......？' }],
          to: 'introEnd',
        },
        {
          text: '以按壓為核心的即時回饋迴圈，視覺上採無中間幀的雙態切換。',
          lines: [{ who:'jiahao', face:'normal', text:'完全懂了。' }],
          to: 'introEnd',
        },
        {
          text: '對不起你剛剛說你的網名是什麼？',
          // loop：講完之後回到同一組選項（不會前進）
          // byCount：第幾次選到，就用哪一段回答；vanish：講完這段之後這個選項消失
          loop: true,
          byCount: [
            { upTo: 4, lines: [{ who:'jiahao', face:'normal', text:'乂卍㊣煞氣a家豪㊣卍乂' }] },
            { upTo: 5, lines: [{ who:'jiahao', face:'normal', text:'家豪。' }] },
            { upTo: 6, lines: [{ who:'jiahao', face:'sad',    text:'我不知道怎麼改網名嘛！' }],
              vanish: true },
          ],
        },
      ],
    },

    introEnd: {
      lines: [
        { who:'jiahao', face:'normal', text:'我會坐在這裡的角落，有事情找我！' },
      ],
      next: null,      // null = 這一章結束 → 解鎖「導入」回顧，家豪移到角落
    },
  },
};

// ============================================================================
//  角落閒聊
//
//  點家豪會隨機講一句。看過的會被收集起來可以回顧 —— 收集沒有任何效果。
//
//  ⚠️ id 一旦用過就不能改、不能重複使用、不能重新編號。
//  收集紀錄是用 id 存的；改了 id，大家已經收集到的就會對不上。
//  （跟寶物用 id 存是同一個道理。）要刪一句就整行刪掉，id 留著不要給別人用。
// ============================================================================

export const IDLE_LINES = [
  { id:'b01', text:'為什麼會有人建造跟維護這種無聊的專案網站......' },
  { id:'b02', text:'為什麼有人說這隻企鵝叫格魯、有人說不是？' },
  { id:'b03', text:'這隻企鵝的主人感覺好可憐......' },
  { id:'b04', text:'用 Firebase 資料庫儲存使用者資料嗎......感覺躲不了太久......' },
  { id:'b05', text:'你們能不能幫我跟這個網站的管理員說我需要一張椅子？' },
  { id:'b06', text:'GO！GO！GO！' },
  { id:'b07', text:'這遊戲到處 AI 味都好重，開發者到底實際上做了多少事？' },
  { id:'b08', text:'順帶一提，我的形象可不是 AI 畫的喔。' },
  { id:'b09', text:'感覺開發者自己也沒有看版本歷史寫了什麼東西。' },
  { id:'b10', text:'這遊戲真的有打算開發完嗎？' },
  // b11 讀起來是爛梗，事後回頭看是伏筆（他身上的東西有擴散性）。別改掉它。
  { id:'b11', text:'我看看怎麼幫別人下載原神......啊，沒事沒事' },
];

// 走完之後拿到的寶物。等劇本定名再填。
export const STORY_TREASURE = {
  id:'story1', icon:'📜', name:'（劇情名）', rarity:'myth', source:'story',
  hint:'（還沒進去的人看到的一句話）',
  how:'（走完兔子洞）',
  buff:{ kind:'fish', value:0.15 },
};
