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
          <li>「＋ セット」でセット追加。セット番号をタップすると、ウォームアップ（W）・ドロップセット（D）の切り替えや削除ができます。ウォームアップは自己ベストやボリュームに数えません</li>
          <li>種目名の横の ↑↓ で順番入れ替え、✕ で外す。「＋ 種目を追加」で途中から追加</li>
          <li>メモ欄にシートの位置やフォームの注意などを書いておくと、次回表示されます</li>
          <li>セットの番号に「PR」と出たら自己ベスト更新です</li>
          <li>最後に右上の「終了」を押すと保存されます</li>
        </ul>
      </>
    ),
  },
  {
    title: '重量の自動アップ・目標・回復マップ',
    body: (
      <ul>
        <li>前回すべてのセットで目標回数（設定で変更、最初は10回）をこなせた種目は、次回の重量が自動で上がって表示されます（最初は +2.5kg）</li>
        <li>設定の「週の目標」で週に何日やるか決めると、ホームに今週の達成状況と「何週連続で達成中か」が出ます</li>
        <li>ホームの人体図は、部位ごとに前回からの日数で色が変わります（赤＝回復中、黄＝もう少し、緑＝回復済み）。図をタップしてもその部位を選べます</li>
      </ul>
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
    title: '有酸素の記録',
    body: (
      <ul>
        <li>部位「有酸素」にトレッドミル・エアロバイクなどが入っています</li>
        <li>時間（分）・距離（km）・kcal を入れて ✓。距離とkcalは空でもOK</li>
        <li>自分で追加するときは、種目の「種類」を「有酸素」にしてください</li>
      </ul>
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
        <li>種目にフォーム動画のURL（YouTubeなど）を入れておくと、記録中に種目名の横の ▶ から開けます</li>
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
        <li>「体重」タブで体重・体脂肪率を記録してグラフで見られます（1日1件、入れ直すと上書き）</li>
        <li>「分析」タブで、週ごと・部位ごとのセット数を前の週と比べられます。鍛え方の偏りに気づけます</li>
        <li>「分析」タブの下に種目ごとの自己ベスト一覧。1週間以内に更新したものには NEW が付きます</li>
        <li>記録の 📤 や終了画面の「画像で共有」で、その日のトレーニングを画像にして LINE や SNS に送れます</li>
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
        <li>CSV（トレーニング記録・体重）は Excel や Google スプレッドシートで開けます</li>
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
        <li>"+ Set" adds a set. Tap a set number to mark it as warm-up (W) or drop set (D), or to delete it. Warm-ups don't count toward personal bests or volume</li>
        <li>Use ↑↓ next to an exercise to reorder, ✕ to remove, and "+ Add exercise" to add one mid-workout</li>
        <li>Notes (seat position, form cues…) are shown next time</li>
        <li>"PR" on a set means a new personal best</li>
        <li>Press "Finish" at the top right to save</li>
      </ul>
    ),
  },
  {
    title: 'Auto weight increase, goals & recovery map',
    body: (
      <ul>
        <li>If you hit the target reps (10 by default, changeable in Settings) on every set last time, next time's weight is raised automatically (+2.5kg by default)</li>
        <li>Set a "Weekly goal" in Settings to see this week's progress and your streak of weeks achieved on Home</li>
        <li>The body figure on Home colors each part by days since you trained it (red = recovering, yellow = almost, green = recovered). Tap it to select that part</li>
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
    title: 'Logging cardio',
    body: (
      <ul>
        <li>The "Cardio" body part includes treadmill, exercise bike and more</li>
        <li>Enter minutes, distance (km) and kcal, then tap ✓. Distance and kcal are optional</li>
        <li>For your own cardio exercise, set its type to "Cardio"</li>
      </ul>
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
        <li>Add a form-video URL (YouTube etc.) to an exercise and open it with ▶ next to its name while logging</li>
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
        <li>The "Body" tab logs body weight and body-fat % with charts (one entry per day; re-entering overwrites)</li>
        <li>The "Analysis" tab compares sets per body part with the previous week, so you can spot imbalances</li>
        <li>Below it is a personal-records list per exercise; records set within the last week are marked NEW</li>
        <li>Use 📤 on a workout or "Share as image" after finishing to send the day's workout as an image to LINE or social media</li>
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
        <li>CSV files (workouts, body weight) open in Excel or Google Sheets</li>
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
