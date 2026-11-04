// App Store 用のスクリーンショットを作る：見本データでアプリの画面を撮り、見出しをつけた宣伝画像にする
// 使い方：npm run build && npx vite preview --port 4174 を起動してから
//   node appstore/make-screenshots.mjs appstore/screenshots
// （Playwright が必要：npm i -D playwright && npx playwright install chromium）
import { chromium } from 'playwright'
import fs from 'node:fs'
const OUT = process.argv[2]
const URL = 'http://localhost:4174/kintore-app/?paywall=off'
const SIZES = [
  { dir: '6.9-inch', w: 1320, h: 2868, vw: 440, vh: 956 },
  { dir: '6.5-inch', w: 1242, h: 2688, vw: 414, vh: 896 },
]

// 見本データ：8週間ぶんの記録・マイセット・食事・体重
function seed() {
  const k = 'kintore-app-data-v1'
  const d = JSON.parse(localStorage.getItem(k))
  const day = (n) => {
    const x = new Date()
    x.setDate(x.getDate() - n)
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
  }
  const sets = (w, reps = [10, 10, 8]) => reps.map((r) => ({ weight: w, reps: r }))
  const R = [
    { id: 'r-push', name: '胸・肩の日', color: '#ff5a1f', exerciseIds: ['chest-03', 'chest-09', 'shoulder-06', 'shoulder-07'], targets: { 'chest-03': { sets: 3, reps: 8 }, 'chest-09': { sets: 3, reps: 10 }, 'shoulder-06': { sets: 3, reps: 10 }, 'shoulder-07': { sets: 3, reps: 12 } } },
    { id: 'r-pull', name: '背中・腕の日', color: '#0a84ff', exerciseIds: ['back-01', 'back-08', 'arm-05', 'arm-08'], targets: { 'back-01': { sets: 3, reps: 10 }, 'back-08': { sets: 3, reps: 10 }, 'arm-05': { sets: 3, reps: 12 }, 'arm-08': { sets: 3, reps: 12 } } },
    { id: 'r-legs', name: '脚の日', color: '#30d158', exerciseIds: ['legs-05', 'legs-04', 'legs-02', 'legs-18'], targets: { 'legs-05': { sets: 3, reps: 8 }, 'legs-04': { sets: 3, reps: 10 }, 'legs-02': { sets: 3, reps: 12 }, 'legs-18': { sets: 3, reps: 15 } } },
  ]
  const w0 = { 'chest-03': 55, 'chest-09': 18, 'shoulder-06': 14, 'shoulder-07': 7, 'back-01': 45, 'back-08': 40, 'arm-05': 25, 'arm-08': 20, 'legs-05': 70, 'legs-04': 120, 'legs-02': 35, 'legs-18': 60 }
  const sessions = []
  let i = 0
  for (let n = 56; n >= 1; n--) {
    const dow = (new Date(Date.now() - n * 864e5).getDay() + 6) % 7
    if (![0, 2, 4].includes(dow)) continue
    const r = R[[0, 2, 4].indexOf(dow)]
    const wk = Math.floor((56 - n) / 7)
    const start = new Date(Date.now() - n * 864e5)
    start.setHours(19, 0, 0, 0)
    sessions.push({
      id: 'demo-' + n,
      date: day(n),
      routineId: r.id,
      bodyPartIds: [],
      startedAt: start.getTime(),
      finishedAt: start.getTime() + 62 * 60000,
      updatedAt: 1,
      entries: r.exerciseIds.map((id) => ({ exerciseId: id, sets: sets(w0[id] + wk * (w0[id] >= 40 ? 2.5 : 1)) })),
    })
    i++
  }
  // 有酸素（Apple Watch から取り込んだ想定）
  for (const n of [3, 10, 17]) sessions.push({ id: 'hk-' + n, date: day(n), bodyPartIds: ['cardio'], startedAt: 0, finishedAt: 0, updatedAt: 1, source: 'health', entries: [{ exerciseId: 'cardio-07', sets: [{ min: 32, km: 5.4, kcal: 330 }] }] })
  d.sessions = sessions
  d.routines = R
  d.plans = { dates: {}, weekly: { 1: 'r-push', 3: 'r-pull', 5: 'r-legs' } }
  d.profile = { sex: 'male', age: 29, height: 172, weight: 68, level: 'intermediate', days: 3, bodyType: 'hosomacho', weekdays: [1, 3, 5] }
  d.bodyLogs = Array.from({ length: 8 }, (_, j) => ({ id: 'bw' + j, date: day(56 - j * 7), weight: Math.round((70.2 - j * 0.3) * 10) / 10 }))
  const foods = [
    ['breakfast', 'オートミール・卵2個・バナナ', 520, 28, 16, 66],
    ['lunch', '鶏むね定食', 780, 48, 18, 98],
    ['dinner', '鮭の塩焼き・ご飯・味噌汁', 690, 38, 20, 84],
    ['snack', 'プロテイン', 120, 24, 1, 3],
  ]
  d.meals = []
  for (let n = 0; n < 10; n++) for (const [meal, name, kcal, p, f, c] of foods) d.meals.push({ id: `m${n}${meal}`, date: day(n), meal, name, kcal, p, f, c, updatedAt: 1 })
  d.settings = { ...d.settings, weeklyGoal: 3, onboarded: true, focus: 'strength' }
  localStorage.setItem(k, JSON.stringify(d))
  localStorage.setItem('kintore-show-map', '0')
}

const SHOTS = [
  {
    file: '01-workout',
    title: '前回の重さが入っている。\n✓を押すだけで記録',
    async go(p) {
      await p.locator('.quick-card', { hasText: '胸・肩の日' }).click()
      const rows = p.locator('.set-row')
      await rows.nth(0).locator('.check').click()
      await rows.nth(1).locator('.check').click()
      await p.evaluate(() => window.scrollTo(0, 0))
    },
  },
  {
    file: '02-muscle',
    title: '鍛えたい筋肉を選ぶだけで\nメニューが完成',
    async go(p) {
      await p.locator('.pick-mode button', { hasText: '筋肉で選ぶ' }).click()
      await p.locator('.muscle-focus .chip', { hasText: '上腕二頭筋' }).click()
      await p.locator('.muscle-focus .chip', { hasText: '三角筋（中部）' }).click()
      await p.locator('.muscle-focus .segmented').evaluate((e) => e.scrollIntoView({ block: 'start' }))
      await p.evaluate(() => window.scrollBy(0, -300))
    },
  },
  {
    file: '03-report',
    title: '週・月のレポートで\n成長が見える',
    async go(p) {
      await p.locator('.tabbar button', { hasText: '履歴' }).click()
      await p.locator('.segmented button', { hasText: 'レポート' }).click()
      await p.locator('.report .cal-header button').first().click()
    },
  },
  {
    file: '04-calendar',
    title: 'マイセットを色分け。\n予定と記録がひと目で',
    async go(p) {
      await p.locator('.tabbar button', { hasText: '計画' }).click()
    },
  },
  {
    file: '05-history',
    title: '記録は自動保存。\nグラフで伸びを確認',
    async go(p) {
      await p.locator('.tabbar button', { hasText: '履歴' }).click()
      await p.locator('select').first().selectOption({ index: 1 }).catch(() => {})
      await p.locator('.card', { hasText: '種目の推移' }).scrollIntoViewIfNeeded()
      await p.evaluate(() => window.scrollBy(0, -120))
    },
  },
  {
    file: '06-meals',
    title: '食事もApple Watchの\nランニングもまとめて管理',
    async go(p) {
      await p.locator('.tabbar button', { hasText: '食事' }).click()
    },
  },
]

const browser = await chromium.launch()
for (const size of SIZES) {
  fs.mkdirSync(`${OUT}/${size.dir}`, { recursive: true })
  for (const shot of SHOTS) {
    // アプリの画面を撮る
    const ctx = await browser.newContext({ viewport: { width: size.vw, height: size.vh }, deviceScaleFactor: 3, colorScheme: 'dark' })
    const p = await ctx.newPage()
    p.on('dialog', (d) => d.accept())
    await p.goto(URL)
    await p.getByRole('button', { name: 'スキップ' }).click({ timeout: 3000 }).catch(() => {})
    await p.evaluate(seed)
    await p.reload()
    await shot.go(p)
    await p.evaluate(() => document.activeElement?.blur())
    await p.waitForTimeout(500)
    const png = await p.screenshot()
    await ctx.close()

    // 見出しをつけて宣伝画像にする
    const ctx2 = await browser.newContext({ viewport: { width: size.w, height: size.h }, deviceScaleFactor: 1 })
    const q = await ctx2.newPage()
    const pad = Math.round(size.w * 0.075)
    const shotW = size.w - pad * 2
    const shotH = Math.round((shotW * size.vh) / size.vw)
    await q.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
      html,body{margin:0;width:${size.w}px;height:${size.h}px;overflow:hidden}
      body{background:radial-gradient(120% 80% at 50% 0%,#3a1608 0%,#0b0b0c 55%);font-family:-apple-system,"Hiragino Sans","Noto Sans CJK JP","Noto Sans JP",sans-serif;color:#fff}
      h1{margin:0;padding:${Math.round(size.h * 0.06)}px ${pad}px 0;font-size:${Math.round(size.w * 0.07)}px;line-height:1.3;font-weight:800;letter-spacing:-0.01em;white-space:pre-line;text-align:center}
      .accent{display:block;width:${Math.round(size.w * 0.12)}px;height:${Math.round(size.w * 0.012)}px;border-radius:99px;background:#ff5a1f;margin:${Math.round(size.h * 0.022)}px auto 0}
      .phone{position:absolute;left:${pad}px;top:${Math.round(size.h * 0.235)}px;width:${shotW}px;height:${shotH}px;border-radius:${Math.round(size.w * 0.07)}px;overflow:hidden;box-shadow:0 30px 90px rgba(0,0,0,.6),0 0 0 ${Math.round(size.w * 0.008)}px #2a2a2e}
      .phone img{width:100%;height:100%;display:block}
    </style></head><body><h1>${shot.title}</h1><span class="accent"></span><div class="phone"><img src="data:image/png;base64,${png.toString('base64')}"></div></body></html>`)
    await q.waitForTimeout(200)
    await q.screenshot({ path: `${OUT}/${size.dir}/${shot.file}.png` })
    await ctx2.close()
    console.log('saved', size.dir, shot.file)
  }
}
await browser.close()
