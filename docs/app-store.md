# App Store に出す手順

Web版（GitHub Pages）はそのまま動き続けます。iPhoneアプリ版は `ios/` フォルダ（Capacitor）から作ります。

## 料金プラン（`src/lib/pricing.js`）

| プラン | 製品ID | 価格 | 備考 |
|---|---|---|---|
| 年額 | `kintore_premium_annual` | ¥3,000/年 | 主力。導入オファーで「7日間無料」 |
| 月額 | `kintore_premium_monthly` | ¥480/月 | 年額を安く見せるための基準 |
| 買い切り | `kintore_premium_lifetime` | ¥7,800 | 非消耗型。約2.6年分 |

- 年額と月額は、同じ「サブスクリプショングループ」に入れる（途中でプランを変えられるように）
- ローンチ記念：最初の1ヶ月だけ、年額の導入オファーを「初年度 ¥2,400」にするのもおすすめ
- 無料版の上限：マイセット3つ。記録・履歴・グラフ・バックアップは無制限

## 1. 準備（お金がかかるのはここだけ）
1. Apple Developer Program に登録（年 $99）。個人で登録すると、App Store に本名が表示される
2. App Store Connect →「契約／税金／口座情報」で有料Appの契約・銀行口座・税務情報（W-8BEN）を入力する。これをしないと課金が動かない
3. 「App Store Small Business Program」に申し込む（手数料が30% → 15%になる）

## 2. App Store Connect
1. 新規App：バンドルID `io.github.yusuke827827.kintore`（`capacitor.config.json` と同じ）
2. アプリ内課金に上の3つの製品を作る（名前・説明・価格・審査用スクリーンショット）
3. プライバシーポリシーURL：`https://yusuke827827.github.io/kintore-app/privacy.html`
4. Appのプライバシー：「データを収集しない」に近い。購入履歴のみ RevenueCat が扱う（ユーザーとは紐付けない・トラッキングなし）

## 3. RevenueCat（無料枠あり。レシート検証・解約・返金の管理を代わりにしてくれる）
1. revenuecat.com でプロジェクトを作り、App Store のアプリを追加（App Store Connect の「アプリ内課金キー」を登録）
2. Entitlement を `premium` という名前で作り、3つの製品をすべて紐付ける
3. Offering（current）に Package を3つ：`$rc_annual`・`$rc_monthly`・`$rc_lifetime`
4. iOS 用の公開APIキー（`appl_` で始まる）をコピー

## 4. アプリを作る（Mac が必要）
```sh
npm install
echo "VITE_REVENUECAT_IOS_KEY=appl_xxxxxxxx" > .env.production.local
npm run ios        # ビルド → ios/ へコピー → Xcode が開く
```
Xcode で：
1. Signing & Capabilities → Team を選ぶ、「+ Capability」で **In-App Purchase** を追加
2. アイコン（1024×1024）を Assets に入れる
3. Product → Archive → App Store Connect へアップロード → TestFlight で自分のiPhoneで確認（サンドボックスでは課金は無料）

Mac がない場合は、GitHub Actions の macOS ランナーや Codemagic などのクラウドビルドでも作れます（証明書の設定が必要）。

## 5. 審査に出す
- スクリーンショット（6.9インチ・6.5インチ）、説明文、キーワード、サポートURL
- 審査メモに「ログイン不要。プレミアムはサンドボックスで購入できます」と書く
- 審査は多くが1〜3日。初回は指摘が来ることもある

## Web版の課金まわり
- 通常：ベータ扱いで全機能無料（今のユーザーは何も変わらない）
- `?paywall=test` を付けて開く：有料化のテストモード（お金は動かない模擬購入）。`?paywall=off` で元に戻る
