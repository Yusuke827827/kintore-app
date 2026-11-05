// はじめてガイドの開始（ガイドの表示は components/Tour）
export const TOUR_KEY = 'kintore-tour'

export function startTour() {
  try {
    localStorage.setItem(TOUR_KEY, '0')
  } catch {
    // 保存できなくても、今回は表示できる
  }
  window.dispatchEvent(new Event('kintore-tour'))
}
