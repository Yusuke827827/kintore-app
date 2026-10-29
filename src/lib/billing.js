// 課金のしくみ。どこで動いているかで中身を切り替える。
//  - iPhoneアプリ（Capacitor）：RevenueCat 経由で App Store の課金を使う
//  - Web版（GitHub Pages）    ：ベータ中は全機能無料。?paywall=test でテスト用の模擬購入
import { DEFAULT_PLAN, ENTITLEMENT_ID, PLANS } from './pricing'

const STORE_KEY = 'kintore.premium'
const MODE_KEY = 'kintore.paywallMode'
const DAY = 24 * 60 * 60 * 1000

export function isNativeApp() {
  return !!window.Capacitor?.isNativePlatform?.()
}

// Web版の動き：'beta'（全機能無料）| 'test'（有料化を試す）
// URL に ?paywall=test / ?paywall=off を付けると切り替わり、この端末に記憶される
export function webMode() {
  try {
    const q = new URLSearchParams(location.search).get('paywall')
    if (q === 'test') localStorage.setItem(MODE_KEY, 'test')
    if (q === 'off') localStorage.removeItem(MODE_KEY)
    return localStorage.getItem(MODE_KEY) === 'test' ? 'test' : 'beta'
  } catch {
    return 'beta'
  }
}

// ---- 権利（プレミアムかどうか）の保存。オフラインでも前回の状態で使えるように ----
export function loadEntitlement() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) ?? null
  } catch {
    return null
  }
}

function saveEntitlement(e) {
  try {
    if (e) localStorage.setItem(STORE_KEY, JSON.stringify(e))
    else localStorage.removeItem(STORE_KEY)
  } catch {
    // 保存できなくても、今開いている間は使える
  }
}

export function isActive(e, now = Date.now()) {
  if (!e?.active) return false
  return e.expiresAt == null || e.expiresAt > now
}

// ---- Web版（テストモード）：お金は動かない模擬購入 ----
const testAdapter = {
  kind: 'test',
  async init() {
    return loadEntitlement()
  },
  async getPlans() {
    return PLANS.map((p) => ({ ...p, priceString: null }))
  },
  async purchase(planId) {
    const plan = PLANS.find((p) => p.id === planId)
    const now = Date.now()
    const trial = plan.trialDays && !loadEntitlement()?.trialUsed
    const e = {
      active: true,
      plan: plan.id,
      source: 'test',
      trial: !!trial,
      trialUsed: true,
      since: now,
      expiresAt:
        plan.period === 'lifetime'
          ? null
          : now + (trial ? plan.trialDays : plan.period === 'year' ? 365 : 30) * DAY,
    }
    saveEntitlement(e)
    return e
  },
  async restore() {
    return loadEntitlement()
  },
}

// ---- iPhoneアプリ：RevenueCat（レシートの検証・解約・更新・返金を代わりに管理してくれる） ----
function fromCustomerInfo(info) {
  const ent = info?.entitlements?.active?.[ENTITLEMENT_ID]
  if (!ent) return { active: false, source: 'store' }
  const plan = PLANS.find((p) => p.productId === ent.productIdentifier)?.id ?? DEFAULT_PLAN
  return {
    active: true,
    plan,
    source: 'store',
    trial: ent.periodType === 'TRIAL',
    willRenew: ent.willRenew,
    expiresAt: ent.expirationDateMillis ?? null,
  }
}

function nativeAdapter() {
  let Purchases = null
  let packages = {}

  return {
    kind: 'store',
    async init() {
      const apiKey = import.meta.env.VITE_REVENUECAT_IOS_KEY
      if (!apiKey) throw new Error('RevenueCat の API キーが設定されていません')
      ;({ Purchases } = await import('@revenuecat/purchases-capacitor'))
      await Purchases.configure({ apiKey })
      const { customerInfo } = await Purchases.getCustomerInfo()
      const e = fromCustomerInfo(customerInfo)
      saveEntitlement(e)
      return e
    },
    // App Store に登録した価格（国・税込み）をそのまま表示する
    async getPlans() {
      const { current } = await Purchases.getOfferings()
      packages = {
        annual: current?.annual,
        monthly: current?.monthly,
        lifetime: current?.lifetime,
      }
      return PLANS.filter((p) => packages[p.id]).map((p) => {
        const product = packages[p.id].product
        const intro = product.introPrice
        return {
          ...p,
          price: product.price,
          priceString: product.priceString,
          // 無料お試しは App Store Connect の「導入オファー」で設定する
          trialDays: intro?.price === 0 ? intro.periodNumberOfUnits * (intro.periodUnit === 'WEEK' ? 7 : intro.periodUnit === 'MONTH' ? 30 : 1) : 0,
        }
      })
    },
    async purchase(planId) {
      const pkg = packages[planId]
      if (!pkg) throw new Error('このプランは今は購入できません')
      try {
        const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg })
        const e = fromCustomerInfo(customerInfo)
        saveEntitlement(e)
        return e
      } catch (err) {
        if (err?.userCancelled || err?.code === '1') return null // 自分でキャンセルした
        throw err
      }
    },
    async restore() {
      const { customerInfo } = await Purchases.restorePurchases()
      const e = fromCustomerInfo(customerInfo)
      saveEntitlement(e)
      return e
    },
  }
}

// ---- Web版（ベータ）：買えない。全部使える ----
const betaAdapter = {
  kind: 'beta',
  async init() {
    return { active: true, plan: null, source: 'beta', expiresAt: null }
  },
  async getPlans() {
    return PLANS.map((p) => ({ ...p, priceString: null }))
  },
  async purchase() {
    return null
  },
  async restore() {
    return null
  },
}

export function createBilling() {
  if (isNativeApp()) return nativeAdapter()
  return webMode() === 'test' ? testAdapter : betaAdapter
}

// テストモードの購入状態を消す（無料版に戻して試す）
export function resetTestPurchase() {
  saveEntitlement(null)
}
