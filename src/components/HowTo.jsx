import { getLanguage, t } from '../i18n'

// 設定画面の「使い方」。項目をタップすると開く。
const TOPICS_JA = [
  {
    title: 'トレーニングを始める',
    body: (
      <>
        <p>ホームを開くと、休んでいる日数から今日やる部位が最初から選ばれています。</p>
        <ul>
          <li>部位のボタンをタップすると選び直せます（複数選べます）</li>
          <li>「今日のメニュー」には前回やった種目が ✓ オンで並びます。前にやったことのある種目はタップでオン／オフ</li>
          <li>大きいボタン（例：「胸で始める」）を押すと記録画面へ</li>
          <li>新しい種目をやりたいときは「種目を自分で選んで始める」</li>
        </ul>
      </>
    ),
  },
  {
    title: '記録のつけ方',
    body: (
      <>
        <ul>
          <li>入力欄の薄い数字は前回の記録です。同じでよければ ✓ を押すだけで記録されます</li>
          <li>違うときは重量（kg）と回数を入れてから ✓</li>
          <li>✓ を押すと休憩タイマーが始まり、終わると音（Androidはバイブも）で知らせます。±15秒・スキップもできます</li>
          <li>「＋ セット」でセット追加、セット番号をタップで削除</li>
          <li>種目名の横の ↑↓ で順番入れ替え、✕ で外す。「＋ 種目を追加」で途中から追加</li>
          <li>メモ欄にシートの位置やフォームの注意などを書いておくと、次回表示されます</li>
          <li>セットの番号に「PR」と出たら自己ベスト更新です</li>
          <li>最後に右上の「終了」を押すと保存されます</li>
        </ul>
      </>
    ),
  },
  {
    title: '途中でアプリを閉じても大丈夫',
    body: (
      <p>
        入力した数字はその場ですぐ保存されます。アプリを閉じたり電話がきたりしても、開き直せば「記録中」から続きができます。
      </p>
    ),
  },
  {
    title: 'マイセット（決まったメニュー）',
    body: (
      <ul>
        <li>トレーニングを終えると「今回のメニューをマイセットに登録しますか？」と聞かれます。名前を自由につけて「登録する」</li>
        <li>登録したマイセットはホームに並び、タップするだけでそのメニューで始められます</li>
        <li>記録中の画面の「マイセットに登録」からも登録できます</li>
        <li>名前の変更・種目の入れ替え・削除は「カスタマイズ → マイセット」</li>
      </ul>
    ),
  },
  {
    title: '部位・種目を追加・変更する',
    body: (
      <ul>
        <li>ホームの「編集」か、この設定画面の「カスタマイズ」から</li>
        <li>名前をタップすると編集、↑↓で並べ替え</li>
        <li>種目のチェックを外すと、種目選びに出なくなります（記録はそのまま）</li>
        <li>削除しても過去の記録は残ります。間違えて消したら「削除済み」タブから復元できます</li>
      </ul>
    ),
  },
  {
    title: '履歴・グラフを見る',
    body: (
      <ul>
        <li>カレンダーで、トレーニングした日に色がつきます</li>
        <li>「種目の推移」で種目を選ぶと、最大重量・推定1RM（1回だけ上げられる重さの目安）・総ボリュームのグラフ</li>
        <li>記録の「修正」で数字を直せます。「削除」で記録を消せます</li>
      </ul>
    ),
  },
  {
    title: '他のブラウザ・スマホ・PCでも見る（同期）',
    body: (
      <>
        <p>
          記録は普段、そのブラウザの中にだけ保存されています。Safariとホーム画面のアプリも別扱いなので、両方で使うと記録がバラバラになります。
        </p>
        <ul>
          <li>この画面の「クラウド同期」でGitHubのトークンを貼ると、入力するたびに自動で同期されます</li>
          <li>他の端末でも同じトークンを貼れば、同じ記録が見られます</li>
          <li>最初は、記録が入っている方の端末から同期をオンにしてください</li>
        </ul>
      </>
    ),
  },
  {
    title: 'バックアップ',
    body: (
      <ul>
        <li>「ファイルに書き出す」で記録をまるごと保存できます。たまにやっておくと安心です</li>
        <li>「ファイルから読み込む」で戻せます。今ある記録に足される形なので、消えることはありません</li>
      </ul>
    ),
  },
  {
    title: '言語・見た目を変える',
    body: (
      <ul>
        <li>この設定画面の「言語」で日本語／English を切り替えられます</li>
        <li>「見た目」でダーク・ブラック・ライトのモード、テーマカラー、壁紙、文字の大きさを選べます</li>
        <li>壁紙は「＋ 写真」で自分の写真も使えます。濃さはスライダーで調整</li>
      </ul>
    ),
  },
  {
    title: 'ホーム画面に追加する（おすすめ）',
    body: (
      <ul>
        <li>iPhone：Safariで開いて、共有ボタン →「ホーム画面に追加」</li>
        <li>Android：Chromeで開いて、メニュー →「ホーム画面に追加」</li>
        <li>アプリのように全画面で使え、電波が弱いジムの中でも動きます</li>
        <li>更新が反映されないときは、アプリを完全に閉じて開き直してください</li>
      </ul>
    ),
  },
]

const TOPICS_EN = [
  {
    title: 'Starting a workout',
    body: (
      <ul>
        <li>Home pre-selects today's body parts based on how long each has rested</li>
        <li>Tap a body part to change the selection (you can pick several)</li>
        <li>"Today's menu" lists last time's exercises already ✓ on. Other exercises you've done before can be toggled with a tap</li>
        <li>Press the big button (e.g. "Start Chest") to go to logging</li>
        <li>For something new, use "Start and pick exercises myself"</li>
      </ul>
    ),
  },
  {
    title: 'Logging sets',
    body: (
      <ul>
        <li>Faded numbers are last time's values. If they're the same, just tap ✓</li>
        <li>Otherwise type the weight (kg) and reps, then tap ✓</li>
        <li>✓ starts the rest timer, which plays a sound (and vibrates on Android) when done. You can add/subtract 15s or skip</li>
        <li>"+ Set" adds a set; tap a set number to delete it</li>
        <li>Use ↑↓ next to an exercise to reorder, ✕ to remove, and "+ Add exercise" to add one mid-workout</li>
        <li>Notes (seat position, form cues…) are shown next time</li>
        <li>"PR" on a set means a new personal best</li>
        <li>Press "Finish" at the top right to save</li>
      </ul>
    ),
  },
  {
    title: "Closing the app mid-workout is fine",
    body: (
      <p>
        Every number is saved the moment you type it. If the app closes or you get a call, open it
        again and continue from "Live".
      </p>
    ),
  },
  {
    title: 'My Sets (saved menus)',
    body: (
      <ul>
        <li>After a workout you'll be asked whether to save the menu as a My Set. Name it anything and tap "Save"</li>
        <li>My Sets appear on Home; tap one to start that menu</li>
        <li>You can also use "Save as My Set" on the logging screen</li>
        <li>Rename, change exercises or delete them in Customize → My Sets</li>
      </ul>
    ),
  },
  {
    title: 'Adding or changing body parts & exercises',
    body: (
      <ul>
        <li>Open "Edit" on Home or "Customize" in Settings</li>
        <li>Tap a name to edit it; use ↑↓ to reorder</li>
        <li>Uncheck an exercise to hide it from the list (records are kept)</li>
        <li>Deleting keeps past records. Restore mistakes from the "Deleted" tab</li>
      </ul>
    ),
  },
  {
    title: 'History & charts',
    body: (
      <ul>
        <li>Days you trained are highlighted on the calendar</li>
        <li>Pick an exercise under "Progress by exercise" to see max weight, estimated 1RM (a one-rep max estimate) and total volume</li>
        <li>Use "Edit" on a workout to fix numbers, or "Delete" to remove it</li>
      </ul>
    ),
  },
  {
    title: 'Using other browsers, phones or PCs (sync)',
    body: (
      <>
        <p>
          Records are normally stored only in the current browser. Safari and the home-screen app
          count as separate, so using both splits your records.
        </p>
        <ul>
          <li>Paste a GitHub token under "Cloud sync" and every entry syncs automatically</li>
          <li>Paste the same token on other devices to see the same records</li>
          <li>Turn sync on first on the device that already has your records</li>
        </ul>
      </>
    ),
  },
  {
    title: 'Backup',
    body: (
      <ul>
        <li>"Export to file" saves everything. Doing it now and then is a good idea</li>
        <li>"Import from file" restores it. Records are added to what you have, never removed</li>
      </ul>
    ),
  },
  {
    title: 'Language & appearance',
    body: (
      <ul>
        <li>Switch between 日本語 and English under "Language"</li>
        <li>Under "Appearance" choose dark, black or light mode, a theme color, a wallpaper and text size</li>
        <li>Use "+ Photo" to set your own picture as wallpaper and adjust its strength with the slider</li>
      </ul>
    ),
  },
  {
    title: 'Add to Home Screen (recommended)',
    body: (
      <ul>
        <li>iPhone: open in Safari, tap Share → "Add to Home Screen"</li>
        <li>Android: open in Chrome, menu → "Add to Home screen"</li>
        <li>It runs full-screen like an app and works even with weak signal in the gym</li>
        <li>If an update doesn't show, fully close the app and open it again</li>
      </ul>
    ),
  },
]

export default function HowTo() {
  const topics = getLanguage() === 'en' ? TOPICS_EN : TOPICS_JA
  return (
    <section className="card">
      <h2>{t('使い方')}</h2>
      <div className="howto">
        {topics.map((topic) => (
          <details key={topic.title}>
            <summary>{topic.title}</summary>
            <div className="howto-body">{topic.body}</div>
          </details>
        ))}
      </div>
    </section>
  )
}
