// Excel・Googleスプレッドシートで開けるCSVを作る
import { nm, t } from '../i18n'
import { e1rm, isCardioSet, sortSessionsDesc } from './stats'

function cell(v) {
  if (v == null) return ''
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function toCsv(rows) {
  // 先頭のBOMで、Excelでも日本語が文字化けしない
  return '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n')
}

const SET_TYPE = { warmup: 'ウォームアップ', drop: 'ドロップセット' }

export function workoutsCsv(sessions, exercises, bodyParts) {
  const rows = [
    [
      t('日付'),
      t('部位'),
      t('種目'),
      t('セット'),
      t('種類'),
      t('重量（kg）'),
      t('回数'),
      t('推定1RM（kg）'),
      t('時間（分）'),
      t('距離（km）'),
      'kcal',
      t('メモ'),
    ],
  ]
  for (const s of sortSessionsDesc(sessions).reverse()) {
    for (const en of s.entries) {
      const ex = exercises.find((e) => e.id === en.exerciseId)
      const part = bodyParts.find((p) => p.id === ex?.bodyPartId)
      en.sets.forEach((set, i) => {
        const base = [s.date, nm(part), ex ? nm(ex) : t('（削除された種目）'), i + 1]
        if (isCardioSet(set)) {
          rows.push([...base, t('有酸素'), '', '', '', set.min, set.km, set.kcal, i === 0 ? en.note : ''])
        } else {
          rows.push([
            ...base,
            set.type ? t(SET_TYPE[set.type]) : t('通常'),
            set.weight,
            set.reps,
            set.type === 'warmup' ? '' : e1rm(set.weight, set.reps),
            '',
            '',
            '',
            i === 0 ? en.note : '',
          ])
        }
      })
    }
  }
  return toCsv(rows)
}

export function bodyCsv(bodyLogs) {
  const rows = [[t('日付'), t('体重（kg）'), t('体脂肪率（%）')]]
  for (const l of [...bodyLogs].sort((a, b) => (a.date < b.date ? -1 : 1))) {
    rows.push([l.date, l.weight, l.fat])
  }
  return toCsv(rows)
}

export function downloadFile(name, content, type) {
  const blob = new Blob([content], { type })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
