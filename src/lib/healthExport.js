// iPhoneの「ヘルスケア → すべてのヘルスケアデータを書き出す」でできる export.zip（中の export.xml）を読む。
// ファイルが大きい（数百MB）ことがあるので、少しずつ読みながらワークアウトと体重だけを拾う。

// zip の中から名前が export.xml のファイルを探して、中身の流れ（ReadableStream）を返す
async function zipEntryStream(file, wanted = /(^|\/)export\.xml$/) {
  const u8 = async (start, end) => new Uint8Array(await file.slice(start, end).arrayBuffer())
  const tailLen = Math.min(file.size, 66000 + 22)
  const tail = await u8(file.size - tailLen, file.size)
  const dv = new DataView(tail.buffer)
  let eocd = -1
  for (let i = tail.length - 22; i >= 0; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error('zip')
  let cdOffset = dv.getUint32(eocd + 16, true)
  let cdSize = dv.getUint32(eocd + 12, true)
  // ZIP64（4GBを超える書き出し）
  if (cdOffset === 0xffffffff || cdSize === 0xffffffff) {
    const loc = eocd - 20
    if (loc >= 0 && dv.getUint32(loc, true) === 0x07064b50) {
      const z64 = Number(dv.getBigUint64(loc + 8, true))
      const rec = new DataView((await u8(z64, z64 + 56)).buffer)
      cdSize = Number(rec.getBigUint64(40, true))
      cdOffset = Number(rec.getBigUint64(48, true))
    }
  }
  const cd = await u8(cdOffset, cdOffset + cdSize)
  const cdv = new DataView(cd.buffer)
  const dec = new TextDecoder()
  for (let p = 0; p + 46 <= cd.length && cdv.getUint32(p, true) === 0x02014b50; ) {
    const method = cdv.getUint16(p + 10, true)
    let comp = cdv.getUint32(p + 20, true)
    const nameLen = cdv.getUint16(p + 28, true)
    const extraLen = cdv.getUint16(p + 30, true)
    const commentLen = cdv.getUint16(p + 32, true)
    let local = cdv.getUint32(p + 42, true)
    const name = dec.decode(cd.subarray(p + 46, p + 46 + nameLen))
    if (wanted.test(name)) {
      // ZIP64 の追加情報（大きさ・位置が 0xffffffff のとき）
      let e = p + 46 + nameLen
      const end = e + extraLen
      while (e + 4 <= end) {
        const id = cdv.getUint16(e, true)
        const size = cdv.getUint16(e + 2, true)
        if (id === 1) {
          let q = e + 4
          if (cdv.getUint32(p + 24, true) === 0xffffffff) q += 8
          if (comp === 0xffffffff) {
            comp = Number(cdv.getBigUint64(q, true))
            q += 8
          }
          if (local === 0xffffffff) local = Number(cdv.getBigUint64(q, true))
        }
        e += 4 + size
      }
      const lh = new DataView((await u8(local, local + 30)).buffer)
      const start = local + 30 + lh.getUint16(26, true) + lh.getUint16(28, true)
      const raw = file.slice(start, start + comp).stream()
      if (method === 0) return raw
      if (method === 8 && typeof DecompressionStream !== 'undefined') return raw.pipeThrough(new DecompressionStream('deflate-raw'))
      throw new Error('zip-method')
    }
    p += 46 + nameLen + extraLen + commentLen
  }
  throw new Error('no-export-xml')
}

const attrs = (tag) => Object.fromEntries([...tag.matchAll(/(\w+)="([^"]*)"/g)].map((m) => [m[1], m[2]]))

const toKm = (v, unit) => (unit === 'mi' ? v * 1.609344 : unit === 'm' ? v / 1000 : unit === 'yd' ? v * 0.0009144 : v)
const toKcal = (v, unit) => (unit === 'kJ' ? v / 4.184 : v)
const toMin = (v, unit) => (unit === 's' ? v / 60 : unit === 'hr' || unit === 'h' ? v * 60 : v)

// 「2024-05-01 07:00:00 +0900」→ 時刻（ミリ秒）
function hkTime(s) {
  const m = String(s).match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2}) ([+-])(\d{2})(\d{2})/)
  if (!m) return new Date(s).getTime()
  return Date.parse(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}${m[7]}${m[8]}:${m[9]}`)
}

// HKWorkoutActivityTypeRunning → running（プラグインと同じ名前にそろえる）
const hkType = (s) => {
  const name = String(s).replace('HKWorkoutActivityType', '')
  return name.charAt(0).toLowerCase() + name.slice(1)
}

function workoutFrom(text) {
  const head = attrs(text.slice(0, text.indexOf('>')))
  const w = {
    type: hkType(head.workoutActivityType),
    date: String(head.startDate).slice(0, 10),
    start: hkTime(head.startDate),
    end: hkTime(head.endDate),
    min: head.duration ? toMin(Number(head.duration), head.durationUnit) : null,
    km: head.totalDistance ? toKm(Number(head.totalDistance), head.totalDistanceUnit) : null,
    kcal: head.totalEnergyBurned ? toKcal(Number(head.totalEnergyBurned), head.totalEnergyBurnedUnit) : null,
    source: head.sourceName,
  }
  // iOS 16以降は距離・カロリーが WorkoutStatistics に入っている
  for (const m of text.matchAll(/<WorkoutStatistics[^>]*>/g)) {
    const a = attrs(m[0])
    if (!a.sum) continue
    if (/Distance/.test(a.type) && !w.km) w.km = toKm(Number(a.sum), a.unit)
    if (/ActiveEnergyBurned/.test(a.type) && !w.kcal) w.kcal = toKcal(Number(a.sum), a.unit)
  }
  if (!w.min && w.end > w.start) w.min = (w.end - w.start) / 60000
  return w
}

// file: export.xml か export.zip。since（YYYY-MM-DD）より後だけ。onProgress(0〜1)
export async function readHealthExport(file, { since = null, onProgress } = {}) {
  const isZip = /\.zip$/i.test(file.name) || file.type.includes('zip')
  const stream = isZip ? await zipEntryStream(file) : file.stream()
  const reader = stream.pipeThrough(new TextDecoderStream()).getReader()
  const workouts = []
  const weights = new Map() // 日付 → kg（その日の最後の値）
  let buf = ''
  let read = 0
  const total = file.size
  const sinceTime = since ? Date.parse(`${since}T00:00:00`) : 0
  for (;;) {
    const { value, done } = await reader.read()
    if (value) {
      buf += value
      read += value.length
      onProgress?.(Math.min(0.99, isZip ? read / (total * 8) : read / total))
    }
    // ワークアウト（中に子要素があるので </Workout> まで）
    for (;;) {
      const i = buf.indexOf('<Workout ')
      const r = buf.indexOf('<Record type="HKQuantityTypeIdentifierBodyMass"')
      if (r >= 0 && (i < 0 || r < i)) {
        const e = buf.indexOf('>', r)
        if (e < 0) break
        const a = attrs(buf.slice(r, e))
        const date = String(a.startDate).slice(0, 10)
        const kg = a.unit === 'lb' ? Number(a.value) * 0.45359237 : Number(a.value)
        if (kg > 0 && hkTime(a.startDate) >= sinceTime) weights.set(date, Math.round(kg * 10) / 10)
        buf = buf.slice(e + 1)
        continue
      }
      if (i < 0) break
      const headEnd = buf.indexOf('>', i)
      if (headEnd < 0) break
      const selfClose = buf[headEnd - 1] === '/'
      const end = selfClose ? headEnd + 1 : buf.indexOf('</Workout>', headEnd)
      if (end < 0) break
      const w = workoutFrom(buf.slice(i, selfClose ? end : end + 10))
      if (w.start >= sinceTime) workouts.push(w)
      buf = buf.slice(selfClose ? end : end + 10)
    }
    // 次の読み込みで続きを探せるよう、最後の要素の途中だけ残す
    const keep = Math.max(buf.lastIndexOf('<Workout '), buf.lastIndexOf('<Record type="HKQuantityTypeIdentifierBodyMass"'))
    buf = keep >= 0 ? buf.slice(keep) : buf.slice(-200)
    if (done) break
  }
  onProgress?.(1)
  return {
    workouts,
    bodyLogs: [...weights].map(([date, weight]) => ({ id: `hk-bw-${date}`, date, weight, updatedAt: Date.now() })),
  }
}
