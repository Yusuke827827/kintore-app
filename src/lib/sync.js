// GitHub Gist（非公開）を保存先にした、端末・ブラウザ間の同期。
// サーバーを用意しなくても、自分のGitHubアカウントにデータを置いて共有できる。
const CONFIG_KEY = 'kintore-sync-v1'
const FILE_NAME = 'kintore-data.json'
const API = 'https://api.github.com'

export function loadSyncConfig() {
  try {
    return JSON.parse(localStorage.getItem(CONFIG_KEY)) ?? null
  } catch {
    return null
  }
}

export function saveSyncConfig(config) {
  try {
    if (config) localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
    else localStorage.removeItem(CONFIG_KEY)
  } catch {
    // 保存できない環境
  }
}

async function api(token, path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    cache: 'no-store',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
  })
  if (res.status === 401) throw new Error('トークンが正しくないか、期限切れです')
  if (res.status === 404) throw new Error('同期先が見つかりません（トークンに gist 権限があるか確認してください）')
  if (!res.ok) throw new Error(`GitHubとの通信に失敗しました（${res.status}）`)
  return res.json()
}

// すでに同期用Gistがあればそれを使い、なければ作る（2台目以降の端末は自動で同じものにつながる）
export async function connect(token, initialData) {
  const gists = await api(token, '/gists?per_page=100')
  const found = gists.find((g) => g.files && g.files[FILE_NAME])
  if (found) return { token, gistId: found.id }
  const created = await api(token, '/gists', {
    method: 'POST',
    body: JSON.stringify({
      description: '筋トレ記録アプリの同期データ（kintore-app）',
      public: false,
      files: { [FILE_NAME]: { content: JSON.stringify(initialData) } },
    }),
  })
  return { token, gistId: created.id }
}

export async function pull({ token, gistId }) {
  const gist = await api(token, `/gists/${gistId}`)
  const file = gist.files?.[FILE_NAME]
  if (!file) return null
  let content = file.content
  if (file.truncated) {
    const res = await fetch(file.raw_url, { cache: 'no-store' })
    content = await res.text()
  }
  try {
    return JSON.parse(content)
  } catch {
    return null
  }
}

export async function push({ token, gistId }, data) {
  await api(token, `/gists/${gistId}`, {
    method: 'PATCH',
    body: JSON.stringify({ files: { [FILE_NAME]: { content: JSON.stringify(data) } } }),
  })
}
