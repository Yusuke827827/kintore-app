// 料金プランと、無料版・プレミアムの線引き
// 方針：記録・自動保存・履歴・バックアップは無料で無制限（データを人質にしない）。
// 「考えてくれる」「分析してくれる」機能をプレミアムにする。

// App Store Connect / RevenueCat に同じ ID で登録する
export const ENTITLEMENT_ID = 'premium'

// price は日本円（App Store の価格。アプリ版では App Store から取った表示価格を優先する）
export const PLANS = [
  {
    id: 'annual',
    productId: 'kintore_premium_annual',
    label: '年額プラン',
    price: 3000,
    period: 'year',
    trialDays: 7,
  },
  {
    id: 'monthly',
    productId: 'kintore_premium_monthly',
    label: '月額プラン',
    price: 480,
    period: 'month',
  },
  {
    id: 'lifetime',
    productId: 'kintore_premium_lifetime',
    label: '買い切り',
    price: 7800,
    period: 'lifetime',
  },
]

export const DEFAULT_PLAN = 'annual'

// 無料版で使える上限
export const FREE_LIMITS = {
  routines: 3, // マイセット
}

// プレミアムの機能（有料の画面で上から順に並べる）
export const FEATURES = [
  { key: 'menu', icon: '🤖', label: 'メニュー自動作成（スタンダード・アドバンス）', desc: '部位を選ぶだけで、種目・セット数・回数まで決めてくれる' },
  { key: 'trainer', icon: '🧑‍🏫', label: '体型別トレーナーの週メニュー', desc: '目指す体型から1週間の計画を作って、曜日に入れてくれる' },
  { key: 'routines', icon: '📋', label: 'マイセット無制限', desc: '無料版は{n}つまで' },
  { key: 'recovery', icon: '🗺️', label: '回復マップ', desc: '部位ごとの回復具合をひと目で' },
  { key: 'nutrition', icon: '🥗', label: '食事のPFC分析・点数・カレンダー', desc: 'たんぱく質・脂質・炭水化物を目標と比べる' },
  { key: 'sync', icon: '☁️', label: 'クラウド同期', desc: 'スマホ・PC・別のブラウザで同じ記録' },
  { key: 'theme', icon: '🎨', label: 'テーマカラー・壁紙', desc: '好きな色と写真で自分仕様に' },
]

// 無料で使える見た目（それ以外の色・壁紙はプレミアム）
export const FREE_ACCENTS = ['indigo', 'blue']
export const FREE_WALLPAPERS = ['none']

// 円の表示（¥3,000）
export function yen(n) {
  return `¥${Math.round(n).toLocaleString('ja-JP')}`
}

// 年額を月あたりにしたとき、月額よりどれだけ安いか（%）
export function annualSavingPct(plans = PLANS) {
  const m = plans.find((p) => p.id === 'monthly')?.price
  const y = plans.find((p) => p.id === 'annual')?.price
  if (!m || !y) return 0
  return Math.round((1 - y / (m * 12)) * 100)
}
