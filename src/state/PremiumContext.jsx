import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { createBilling, isActive, loadEntitlement, resetTestPurchase } from '../lib/billing'
import { FREE_LIMITS } from '../lib/pricing'
import Paywall from '../components/Paywall'

const PremiumContext = createContext(null)

export function PremiumProvider({ children }) {
  const [billing] = useState(createBilling)

  // 起動直後は前回の状態で表示（オフラインでもプレミアムが外れない）
  const [entitlement, setEntitlement] = useState(() =>
    billing.kind === 'beta' ? { active: true, source: 'beta' } : loadEntitlement()
  )
  const [paywall, setPaywall] = useState(null) // { feature } のとき有料の画面を出す

  useEffect(() => {
    billing
      .init()
      .then((e) => e !== undefined && setEntitlement(e))
      .catch(() => {})
  }, [billing])

  const premium = isActive(entitlement)

  // 使えるなら true。使えなければ有料の画面を開いて false
  const gate = useCallback(
    (feature, count) => {
      if (premium) return true
      if (feature === 'routines' && count != null && count < FREE_LIMITS.routines) return true
      setPaywall({ feature })
      return false
    },
    [premium]
  )

  const value = useMemo(
    () => ({
      premium,
      entitlement,
      kind: billing.kind,
      gate,
      openPaywall: (feature = null) => setPaywall({ feature }),
      getPlans: () => billing.getPlans(),
      async purchase(planId) {
        const e = await billing.purchase(planId)
        if (e) setEntitlement(e)
        return isActive(e)
      },
      async restore() {
        const e = await billing.restore()
        if (e) setEntitlement(e)
        return isActive(e)
      },
      resetTest() {
        resetTestPurchase()
        setEntitlement(null)
      },
    }),
    [premium, entitlement, billing, gate]
  )

  return (
    <PremiumContext.Provider value={value}>
      {children}
      {paywall && <Paywall feature={paywall.feature} onClose={() => setPaywall(null)} />}
    </PremiumContext.Provider>
  )
}

export function usePremium() {
  const ctx = useContext(PremiumContext)
  if (!ctx) throw new Error('usePremium must be used within PremiumProvider')
  return ctx
}
