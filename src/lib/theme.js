// 見た目の設定（モード・テーマカラー・壁紙・文字サイズ）を画面に反映する

export const DEFAULT_THEME = {
  mode: 'dark', // dark | black | light | auto
  accent: 'indigo',
  wallpaper: 'none',
  dim: 0.55, // 壁紙の上に重ねる暗さ（0〜0.9）
  fontSize: 'm', // s | m | l | xl
}

// 600 / 500 / 400 / 900 / 300 / 700 の順（Tailwind の色）
export const ACCENTS = {
  indigo: { label: 'インディゴ', c: ['#4f46e5', '#6366f1', '#818cf8', '#312e81', '#a5b4fc', '#4338ca'] },
  blue: { label: 'ブルー', c: ['#2563eb', '#3b82f6', '#60a5fa', '#1e3a8a', '#93c5fd', '#1d4ed8'] },
  sky: { label: 'スカイ', c: ['#0284c7', '#0ea5e9', '#38bdf8', '#0c4a6e', '#7dd3fc', '#0369a1'] },
  teal: { label: 'ティール', c: ['#0d9488', '#14b8a6', '#2dd4bf', '#134e4a', '#5eead4', '#0f766e'] },
  green: { label: 'グリーン', c: ['#16a34a', '#22c55e', '#4ade80', '#14532d', '#86efac', '#15803d'] },
  orange: { label: 'オレンジ', c: ['#ea580c', '#f97316', '#fb923c', '#7c2d12', '#fdba74', '#c2410c'] },
  red: { label: 'レッド', c: ['#dc2626', '#ef4444', '#f87171', '#7f1d1d', '#fca5a5', '#b91c1c'] },
  pink: { label: 'ピンク', c: ['#db2777', '#ec4899', '#f472b6', '#831843', '#f9a8d4', '#be185d'] },
  purple: { label: 'パープル', c: ['#9333ea', '#a855f7', '#c084fc', '#581c87', '#d8b4fe', '#7e22ce'] },
  gold: { label: 'ゴールド', c: ['#ca8a04', '#eab308', '#facc15', '#713f12', '#fde047', '#a16207'] },
}

export const WALLPAPERS = [
  { key: 'none', label: 'なし', css: 'none' },
  { key: 'midnight', label: 'ミッドナイト', css: 'linear-gradient(160deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)' },
  { key: 'sunset', label: 'サンセット', css: 'linear-gradient(160deg, #f97316 0%, #db2777 55%, #4c1d95 100%)' },
  { key: 'ocean', label: 'オーシャン', css: 'linear-gradient(160deg, #0ea5e9 0%, #1e40af 60%, #0f172a 100%)' },
  { key: 'forest', label: 'フォレスト', css: 'linear-gradient(160deg, #22c55e 0%, #166534 55%, #052e16 100%)' },
  { key: 'fire', label: 'ファイア', css: 'linear-gradient(160deg, #facc15 0%, #ef4444 50%, #450a0a 100%)' },
  { key: 'aurora', label: 'オーロラ', css: 'linear-gradient(160deg, #2dd4bf 0%, #6366f1 50%, #c026d3 100%)' },
  { key: 'steel', label: 'スチール', css: 'linear-gradient(160deg, #94a3b8 0%, #334155 55%, #020617 100%)' },
  { key: 'sakura', label: 'サクラ', css: 'linear-gradient(160deg, #fbcfe8 0%, #f472b6 50%, #831843 100%)' },
]

export const FONT_SIZES = [
  { key: 's', label: '小', px: 15 },
  { key: 'm', label: '標準', px: 16 },
  { key: 'l', label: '大', px: 18 },
  { key: 'xl', label: '特大', px: 20 },
]

// 自分の写真の壁紙は容量が大きいので同期せず、この端末にだけ保存する
const WALLPAPER_KEY = 'kintore-wallpaper'

export function loadCustomWallpaper() {
  try {
    return localStorage.getItem(WALLPAPER_KEY)
  } catch {
    return null
  }
}

export function saveCustomWallpaper(dataUrl) {
  try {
    if (dataUrl) localStorage.setItem(WALLPAPER_KEY, dataUrl)
    else localStorage.removeItem(WALLPAPER_KEY)
    return true
  } catch {
    return false
  }
}

// 写真を長辺1280pxのJPEGに縮めてから保存する
export function resizeImage(file, maxSide = 1280) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.8))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('image'))
    }
    img.src = url
  })
}

function resolveMode(mode) {
  if (mode !== 'auto') return mode
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function applyTheme(theme) {
  const th = { ...DEFAULT_THEME, ...theme }
  const root = document.documentElement
  const mode = resolveMode(th.mode)
  root.dataset.mode = mode

  const [a600, a500, a400, a900, a300, a700] = (ACCENTS[th.accent] ?? ACCENTS.indigo).c
  root.style.setProperty('--accent', a600)
  root.style.setProperty('--accent-border', a500)
  root.style.setProperty('--accent-text', mode === 'light' ? a700 : a400)
  root.style.setProperty('--accent-deep', a900)
  root.style.setProperty('--accent-soft', a300)
  root.style.setProperty('--accent-strong', a700)

  const font = FONT_SIZES.find((f) => f.key === th.fontSize) ?? FONT_SIZES[1]
  root.style.fontSize = `${font.px}px`

  let image = 'none'
  if (th.wallpaper === 'custom') {
    const custom = loadCustomWallpaper()
    if (custom) image = `url("${custom}")`
  } else {
    image = WALLPAPERS.find((w) => w.key === th.wallpaper)?.css ?? 'none'
  }
  root.style.setProperty('--wallpaper', image)
  root.style.setProperty('--wall-dim', String(th.dim))
  root.dataset.wallpaper = image === 'none' ? 'off' : 'on'

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.content = mode === 'light' ? '#f3f4f6' : mode === 'black' ? '#000000' : '#0b0f19'
}
