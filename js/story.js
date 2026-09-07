// ============================================================================
//  story.js —— 兔子洞的劇本
//
//  寫作規格見 docs/RABBITHOLE.md。三個重點：
//    一句話 ≤ 60 字、場景要短（隨時可以關掉）、不要有失敗。
//
//  下面是格式範例，內容是佔位用的，寫的時候整段換掉。
// ============================================================================

export const STORY = {
  id: 'rabbithole',
  title: '（還沒取名）',   // 賽博：電子警察追查非法道具。世界觀見 docs/LORE.md

  // 從哪一個場景開始
  start: 'placeholder',

  scenes: {
    placeholder: {
      lines: [
        { who: null,  text: '（旁白：who 給 null 就沒有立繪）' },
        { who: 'cop', face: 'normal',    text: '（一句話盡量不超過 60 個中文字。）' },
        { who: 'cop', face: 'surprised', text: '（表情換成 surprised 就會換立繪。）' },
      ],
      // 直接接下一幕
      next: 'placeholder2',
    },

    placeholder2: {
      lines: [
        { who: 'cop', face: 'normal', text: '（這裡示範選擇。選擇改語氣，不改路線。）' },
      ],
      choices: [
        { text: '（選項一）', to: 'placeholder3' },
        { text: '（選項二）', to: 'placeholder3' },
        { text: '先回去',     to: null },          // null = 離開劇情，回到遊戲
      ],
    },

    placeholder3: {
      lines: [
        { who: null, text: '（這裡示範謎題。答錯不會有任何損失。）' },
      ],
      ask: {
        prompt: '（要問什麼）',
        answer: ['（答案）', '（也接受的寫法）'],
        wrong:  '（答錯時說什麼 —— 要好笑，不要責備）',
        hint:   '（卡太久給的提示）',
      },
      next: null,     // null = 走完了
    },
  },
};

// 走完之後拿到的寶物。等劇本定名再填。
export const STORY_TREASURE = {
  id:'story1', icon:'📜', name:'（劇情名）', rarity:'myth', source:'story',
  hint:'（還沒進去的人看到的一句話）',
  how:'（走完兔子洞）',
  buff:{ kind:'fish', value:0.15 },
};
