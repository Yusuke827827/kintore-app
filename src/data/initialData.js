// 部位マスタ（付録A・要件定義書 3章の分割方針に対応）
export const initialBodyParts = [
  { id: 'chest', name: '胸', group: 'upper' },
  { id: 'back', name: '背中', group: 'upper' },
  { id: 'shoulder', name: '肩', group: 'upper' },
  { id: 'arm', name: '腕', group: 'upper' },
  { id: 'legs', name: '脚', group: 'lower' },
  { id: 'core', name: '体幹（腹筋）', group: 'core' },
]

// 種目マスタ 初期データ（要件定義書 付録B）
// type: 'compound'(複合関節) | 'isolation'(単関節)
function ex(id, name, bodyPartId, equipment, type) {
  return { id, name, bodyPartId, equipment, type, active: true }
}

export const initialExercises = [
  // 胸
  ex('chest-01', 'チェストプレス', 'chest', 'マシン', 'compound'),
  ex('chest-02', 'ペックフライ', 'chest', 'マシン', 'isolation'),
  ex('chest-03', 'ベンチプレス', 'chest', 'バーベル', 'compound'),
  ex('chest-04', 'インクラインベンチプレス', 'chest', 'バーベル', 'compound'),
  ex('chest-05', 'デクラインベンチプレス', 'chest', 'バーベル', 'compound'),
  ex('chest-06', 'スミスマシンベンチプレス', 'chest', 'スミスマシン', 'compound'),
  ex('chest-07', 'スミスマシンインクラインプレス', 'chest', 'スミスマシン', 'compound'),
  ex('chest-08', 'ダンベルベンチプレス', 'chest', 'ダンベル', 'compound'),
  ex('chest-09', 'インクラインダンベルプレス', 'chest', 'ダンベル', 'compound'),
  ex('chest-10', 'ダンベルフライ', 'chest', 'ダンベル', 'isolation'),
  ex('chest-11', 'ケーブルクロスオーバー', 'chest', 'ケーブル', 'isolation'),
  ex('chest-12', 'ケーブルフライ', 'chest', 'ケーブル', 'isolation'),
  ex('chest-13', 'ケーブルプレス', 'chest', 'ケーブル', 'compound'),
  ex('chest-14', 'インクラインチェストプレス（プレートロード式）', 'chest', 'マシン', 'compound'),

  // 背中
  ex('back-01', 'ラットプルダウン', 'back', 'マシン', 'compound'),
  ex('back-02', 'ロー', 'back', 'マシン', 'compound'),
  ex('back-03', 'ベントオーバーロウ', 'back', 'バーベル', 'compound'),
  ex('back-04', 'デッドリフト', 'back', 'バーベル', 'compound'),
  ex('back-05', 'スミスマシンベントオーバーロウ', 'back', 'スミスマシン', 'compound'),
  ex('back-06', 'ワンハンドダンベルロウ', 'back', 'ダンベル', 'compound'),
  ex('back-07', 'ダンベルデッドリフト', 'back', 'ダンベル', 'compound'),
  ex('back-08', 'シーテッドケーブルロー', 'back', 'ケーブル', 'compound'),
  ex('back-09', 'ケーブルラットプルダウン', 'back', 'ケーブル', 'compound'),
  ex('back-10', 'ストレートアームプルダウン', 'back', 'ケーブル', 'isolation'),
  ex('back-11', 'フロントラットプルダウン', 'back', 'その他', 'compound'),
  ex('back-12', 'Tバーロー', 'back', 'その他', 'compound'),
  ex('back-13', 'バックエクステンション', 'back', 'その他', 'isolation'),

  // 肩
  ex('shoulder-01', 'ショルダープレス', 'shoulder', 'マシン', 'compound'),
  ex('shoulder-02', 'リアデルト', 'shoulder', 'マシン', 'isolation'),
  ex('shoulder-03', 'バーベルショルダープレス', 'shoulder', 'バーベル', 'compound'),
  ex('shoulder-04', 'アップライトロウ', 'shoulder', 'バーベル', 'compound'),
  ex('shoulder-05', 'スミスマシンショルダープレス', 'shoulder', 'スミスマシン', 'compound'),
  ex('shoulder-06', 'ダンベルショルダープレス', 'shoulder', 'ダンベル', 'compound'),
  ex('shoulder-07', 'サイドレイズ', 'shoulder', 'ダンベル', 'isolation'),
  ex('shoulder-08', 'リアレイズ', 'shoulder', 'ダンベル', 'isolation'),
  ex('shoulder-09', 'フロントレイズ', 'shoulder', 'ダンベル', 'isolation'),
  ex('shoulder-10', 'ケーブルサイドレイズ', 'shoulder', 'ケーブル', 'isolation'),
  ex('shoulder-11', 'フェイスプル', 'shoulder', 'ケーブル', 'isolation'),
  ex('shoulder-12', 'ケーブルリアデルトフライ', 'shoulder', 'ケーブル', 'isolation'),

  // 腕
  ex('arm-01', 'ダンベルカール', 'arm', 'ダンベル', 'isolation'),
  ex('arm-02', 'ハンマーカール', 'arm', 'ダンベル', 'isolation'),
  ex('arm-03', 'フレンチプレス', 'arm', 'ダンベル', 'isolation'),
  ex('arm-04', 'キックバック', 'arm', 'ダンベル', 'isolation'),
  ex('arm-05', 'バーベルカール', 'arm', 'バーベル／EZバー', 'isolation'),
  ex('arm-06', 'プリーチャーカール', 'arm', 'バーベル／EZバー', 'isolation'),
  ex('arm-07', 'ケーブルカール', 'arm', 'ケーブル', 'isolation'),
  ex('arm-08', 'ケーブルプレスダウン', 'arm', 'ケーブル', 'isolation'),
  ex('arm-09', 'ケーブルキックバック', 'arm', 'ケーブル', 'isolation'),
  ex('arm-10', 'ベンチディップス', 'arm', 'その他', 'compound'),

  // 脚
  ex('legs-01', 'インナーサイ・アウターサイ', 'legs', 'マシン', 'isolation'),
  ex('legs-02', 'レッグカール', 'legs', 'マシン', 'isolation'),
  ex('legs-03', 'レッグエクステンション', 'legs', 'マシン', 'isolation'),
  ex('legs-04', 'レッグプレス', 'legs', 'マシン', 'compound'),
  ex('legs-05', 'バックスクワット', 'legs', 'バーベル', 'compound'),
  ex('legs-06', 'フロントスクワット', 'legs', 'バーベル', 'compound'),
  ex('legs-07', 'ルーマニアンデッドリフト', 'legs', 'バーベル', 'compound'),
  ex('legs-08', 'ヒップスラスト', 'legs', 'バーベル', 'compound'),
  ex('legs-09', 'スミススクワット', 'legs', 'スミスマシン', 'compound'),
  ex('legs-10', 'スミスランジ', 'legs', 'スミスマシン', 'compound'),
  ex('legs-11', 'スミスヒップスラスト', 'legs', 'スミスマシン', 'compound'),
  ex('legs-12', 'ダンベルスクワット', 'legs', 'ダンベル', 'compound'),
  ex('legs-13', 'ダンベルランジ', 'legs', 'ダンベル', 'compound'),
  ex('legs-14', 'ブルガリアンスクワット', 'legs', 'ダンベル', 'compound'),
  ex('legs-15', 'ダンベルルーマニアンデッドリフト', 'legs', 'ダンベル', 'compound'),
  ex('legs-16', 'レッグプレス（プレートロード式）', 'legs', 'その他', 'compound'),
  ex('legs-17', 'ステップアップ', 'legs', 'その他', 'compound'),

  // 体幹（腹筋）
  ex('core-01', 'アブドミナル', 'core', 'マシン', 'isolation'),
  ex('core-02', 'トーソローテーション', 'core', 'マシン', 'isolation'),
  ex('core-03', 'ケーブルクランチ', 'core', 'ケーブル', 'isolation'),
  ex('core-04', 'ウッドチョッパー', 'core', 'ケーブル', 'isolation'),
  ex('core-05', 'シットアップ', 'core', 'その他', 'isolation'),
  ex('core-06', 'クランチ', 'core', 'その他', 'isolation'),
  ex('core-07', 'レッグレイズ', 'core', 'その他', 'isolation'),
  ex('core-08', 'ケトルベルスイング', 'core', 'その他', 'compound'),
]
