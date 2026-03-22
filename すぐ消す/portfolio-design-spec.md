# 個人ホームページ兼ポートフォリオサイト デザイン設計書

## 1. サイトの核となる体験

### 目的
- 研究者・開発者としての輪郭を短時間で伝える
- 制作実績から「考えて作れる人」であることを示す
- ブログ的な記録から思考の深さと継続性を見せる
- 気軽に相談できる入口をつくる

### 体験コンセプト
静かな白い余白の中に、研究の精密さと実装の手触りが同居する1ページサイト。第一印象は上品で理知的、読み進めるほどに人柄と実践性が見えてくる構成にする。情報は整理されているが無機質ではなく、現在進行で活動している温度が伝わることを重視する。

### 印象キーワード
- Minimal
- Intellectual
- Experimental
- Refined
- Technical
- Calm but active

## 2. ビジュアル方針

### カラーパレット
- Base White: `#F7F7F3`
- Surface: `#FFFFFF`
- Soft Gray: `#E7E7E1`
- Text Main: `#171717`
- Text Sub: `#5C5F62`
- Gold Accent: `#B89A5D`
- Cyan Accent: `#8FD3E8`
- Cyan Deep: `#2E8CA3`

### タイポグラフィ
- 見出し: 高級感のあるセリフ体または品のあるディスプレイ体
- 本文: 可読性の高いサンセリフ体
- ラベル / 補助情報 / ログ: 端正なモノスペース体

### レイアウト原則
- 大きめの余白で情報の密度を制御する
- 線、境界、タイポグラフィの強弱で階層を作る
- 角丸は小さめ、影はごく薄くする
- カードは「浮かせる」より「整理する」方向
- ゴールドは重要な視線誘導、シアンは動きや知性の補助に使う

## 3. ページ全体構成

1. Fixed Header
2. Hero
3. About
4. Schedule / Todo
5. Portfolio
6. Skills
7. Logged / Currently
8. Testimonials
9. Blog / Insights
10. Contact
11. Footer

### スクロール体験
- セクションごとに十分な上下余白を確保
- 画面に入る直前から、上方向へ8〜16pxほど滑るようにフェードイン
- ヘッダーはスクロール開始後に半透明白背景と細いボーダーを持つ
- 右下の「Top」ボタンは Hero を抜けたあたりで表示

## 4. 固定ヘッダー仕様

### 構成
- 左: ロゴまたは名前
- 中央または右: `About / Schedule / Works / Skills / Log / Blog / Contact`
- 右端: 小さな `Open to collaboration` インジケーター

### 状態
- 初期: 背景ほぼ透明、文字は濃色
- スクロール後: 半透明白、ぼかし、下線、上下余白を少し縮める
- ホバー: テキスト色がわずかにシアン寄りに変化
- アクティブ: 現在セクションを示す下線または小さなドット

### モバイル
- 左に名前、右にハンバーガー
- タップでフルスクリーンメニューを開く
- メニュー内にナビ、SNS、CTAをまとめる

## 5. Hero セクション

### 役割
数秒で「研究者でもあり実装者でもある」人物像を理解させる。

### 画面構成
- 左: バッジ、メインコピー、自己紹介、CTA、SNS
- 右: プロフィールカード
- 背景: 極薄いグリッドやノイズ、シアンとゴールドの淡い光

### 見出しサンプル
`Researching interaction, building thoughtful systems.`

### 肩書きラベル
`Researcher / Developer / Prototyping Partner`

### 協業バッジ
`Open to collaboration`

### 自己紹介文サンプル
人と技術のあいだにある体験を、研究と実装の両方から設計しています。  
HCI、プロトタイピング、Web/App開発を横断しながら、考えることと作ることを切り離さずに仕事をしています。

### CTA
- Primary: `つくったものを見る`
- Secondary: `連絡する`

### SNSリンク例
- GitHub
- X
- LinkedIn
- Note / Blog

### 右側プロフィールカード
- アバターまたはイニシャル
- 名前: `Sado Kaito`
- 所属: `Graduate Researcher, Human-Computer Interaction`
- 専門: `HCI / Creative Coding / Full-stack Prototyping`
- Status
  - `Now playing: Ryuichi Sakamoto`
  - `Reading: The Design of Everyday Things`
  - `Base: Tokyo / Remote`
  - `Available for: research prototyping, design engineering`

### Heroの印象設計
- 最初にコピーで知性を出す
- 次に本文で実務性を伝える
- 最後にカードで人物像に具体性を与える

## 6. About セクション

### 役割
何を専門にし、どんな姿勢でものづくりしているかを信頼感のある文章で伝える。

### 見出し
`研究と実装を、往復しながら進める。`

### 導入文サンプル
研究では、人の行動や認知を観察し、どのような体験設計が有効かを探っています。実装では、その仮説を素早く形にし、触れるプロトタイプとして検証します。論文のための研究でも、プロダクトのための開発でもなく、そのあいだにある実践を大切にしています。

### 続き文サンプル
私は、整理された設計と試行錯誤の両方を必要とするプロジェクトに強く惹かれます。正しさだけではなく、使いたくなる感触や、考えたくなる余白まで含めて設計したいと考えています。

### 関心領域タグ
- Human-Computer Interaction
- Prototyping
- Design Engineering
- Cognitive Science
- Web Interfaces
- Creative Tools
- Visualization
- Interaction Design

### Open to 項目
- 研究プロトタイプの共同開発
- 実験用UIの設計と実装
- 研究内容の可視化・Web化
- 個人開発や文化系プロジェクトの技術相談

### 情報カード
- Affiliation: `Graduate School of ...`
- Lab: `Interactive Systems Lab`
- Focus: `HCI / Interface Design / Rapid Prototyping`
- Based in: `Tokyo, Japan`

## 7. Schedule / Todo セクション

### 役割
現在進行で活動している人であることを、整った生活感として見せる。

### レイアウト
- 左: Weekly Schedule
- 右: Current Todo
- 2カラムだがカード感は控えめ

### セクション見出し
`This week, in motion`

### 説明文
研究、制作、読書、打ち合わせ。日々の時間の使い方にも、その人の姿勢は表れます。

### 週間スケジュール例
- Mon: `Lab meeting / literature review`
- Tue: `Prototype implementation / advisory meeting`
- Wed: `User interview / notes整理`
- Thu: `Interface design / writing`
- Fri: `Experiment prep / development sprint`
- Sat: `Reading / side project`
- Sun: `Archive / reset / planning`

### Todo例
- `[x]` 実験用ダッシュボードの初稿
- `[ ]` インタビュー結果の整理
- `[ ]` ポートフォリオケーススタディ追記
- `[x]` ブログ下書き公開
- `[ ]` 共同研究の資料更新

### 見せ方
- 完了項目は文字色を薄くし、チェックをゴールドで表示
- 未完了項目は通常色
- 進行中タスクに小さなシアンインジケーター

## 8. Portfolio セクション

### 役割
研究寄り、アプリ寄り、Web寄りの仕事を横断的に見せる。

### 見出し
`Selected works`

### 補助文
研究のために作ったもの、使われるために設計したもの、その両方を掲載しています。

### フィルター
- All
- App
- Research
- Web

### フィルター仕様
- 選択中は背景色が変わる
- 切り替え時にカードが並び替わるように見える穏やかなアニメーション
- カテゴリ数が減ってもレイアウトが崩れない

### カード共通要素
- カテゴリ
- 年
- タイトル
- 1〜2行の説明
- 技術タグ
- ホバー時CTA

### 実績カード文言サンプル

#### 1
- Category: `Research`
- Year: `2026`
- Title: `Adaptive Interface for Reflective Reading`
- Description: `読書中の注釈行動を支援するインターフェースの研究プロトタイプ。観察と実装を往復しながら検証。`
- Tags: `HCI / React / Visualization`
- Hover CTA: `詳しく見る`

#### 2
- Category: `App`
- Year: `2025`
- Title: `Fieldnote Companion`
- Description: `研究メモと現地観察を素早く記録するための軽量モバイルツール。`
- Tags: `React Native / SQLite / UX`
- Hover CTA: `View Project`

#### 3
- Category: `Web`
- Year: `2025`
- Title: `Laboratory Archive Website`
- Description: `研究室の活動・論文・展示記録を横断して見せるアーカイブサイト。`
- Tags: `Next.js / CMS / Motion`
- Hover CTA: `詳しく見る`

#### 4
- Category: `Web`
- Year: `2024`
- Title: `Experimental Portfolio for Creative Technologist`
- Description: `文章とコードの距離感をテーマにした、静かなモーションの個人サイト。`
- Tags: `TypeScript / GSAP / Editorial UI`
- Hover CTA: `View Project`

### セクション末尾導線
- Text Link: `All Works`
- 補足: `より詳細なケーススタディとアーカイブを見る`

## 9. Skills セクション

### 役割
何ができるかを俯瞰で一目把握させる。

### 見出し
`Skills & tools`

### 表示方式
カテゴリごとのタグ群。小さく整然としていて、視線が走りやすい構成。

### カテゴリ例

#### Research
- HCI
- User Research
- Interview Design
- Experiment Design
- Information Architecture
- Interaction Evaluation

#### Development
- TypeScript
- React
- Next.js
- Node.js
- Python
- Swift
- Firebase
- PostgreSQL

#### Design / Tools
- Figma
- Framer
- Adobe CC
- Notion
- Obsidian
- GitHub

### タグの見せ方
- 小さな角丸
- モノスペースのラベル
- ホバーでごく薄い背景変化
- 強い色は使わず、整然と見せる

## 10. Logged / Currently セクション

### 役割
個性と現在進行感を出す遊びのある場所。

### 見出し
`Logged / Currently`

### UI方針
- 白ベースのターミナル風パネル
- 左に時刻または日付
- 中央にラベル
- 右に内容
- 最終行に点滅カーソル

### 表示サンプル
- `2026.03.22  READING    Katherine Hayles, How We Think`
- `2026.03.21  WATCHING   Perfect Days`
- `2026.03.20  LISTENING  Ryuichi Sakamoto, async`
- `2026.03.19  PLAYING    Mini Metro`
- `2026.03.18  STATUS     polishing a prototype for next week's review`
- `2026.03.18  NOTE       thinking about interfaces that invite slower attention`
- `2026.03.22  LIVE       _`

### 演出
- 最後の `_` またはブロックカーソルが点滅
- 1行ずつ遅れて現れる
- モノスペースと罫線で軽いテック感を出す

## 11. Testimonials セクション

### 役割
客観的な信頼を自然に補強する。

### 見出し
`Trusted by collaborators`

### カード仕様
- 3枚横並び、モバイルでは縦並び
- コメントは短め
- 下部にイニシャルアイコン、名前、関係性

### コメント例

#### 1
- Comment: `抽象的な研究テーマを、議論できるプロトタイプに落とし込む速さと精度が印象的でした。`
- Name: `A. Mori`
- Relation: `共同研究者`

#### 2
- Comment: `設計意図と実装の細部が一貫していて、安心して任せられる開発者です。`
- Name: `K. Tanaka`
- Relation: `デザインパートナー`

#### 3
- Comment: `観察、整理、実装までを自走できるので、探索フェーズのプロジェクトと非常に相性が良いです。`
- Name: `M. Chen`
- Relation: `プロジェクト協業先`

## 12. Blog / Insights セクション

### 役割
この人が何を考えているかを伝え、継続的に見たくなる導線にする。

### 見出し
`Notes, essays, and working thoughts`

### 上部導線
- Link: `View All Articles`

### カード項目
- カテゴリ
- 日付
- タイトル
- 短い概要
- `Read more`

### 記事例

#### 1
- Category: `Research`
- Date: `Mar 12, 2026`
- Title: `反応の速さではなく、考える余白を支えるUIについて`
- Summary: `情報をすばやく届けるだけでなく、あえて立ち止まれるインターフェースの価値を考える。`
- CTA: `Read more`

#### 2
- Category: `Development`
- Date: `Feb 28, 2026`
- Title: `プロトタイプは、未完成なまま対話を始めるためにある`
- Summary: `研究でも開発でも、早く作ることと雑に作ることは同じではないという話。`
- CTA: `Read more`

#### 3
- Category: `HCI`
- Date: `Feb 10, 2026`
- Title: `観察メモをそのまま設計資産に変えるワークフロー`
- Summary: `フィールドノート、図解、UIラフを往復しながら考えを育てる方法の記録。`
- CTA: `Read more`

## 13. Contact セクション

### 役割
相談の心理的ハードルを下げ、実際の問い合わせへつなぐ。

### レイアウト
- 左: 連絡先情報
- 右: フォーム

### 見出し
`Let’s build something thoughtful`

### 説明文
研究の相談、試作の依頼、Web実装、共同プロジェクトの話まで歓迎しています。まだ輪郭の曖昧な段階でも問題ありません。

### 左側情報
- Email: `hello@example.com`
- Base: `Tokyo / Remote`
- Available: `Weekdays 10:00–19:00 JST`
- Response: `通常24時間以内に返信します`

### フォーム項目
- 名前
- 所属（任意）
- メールアドレス
- 相談の種類
- メッセージ

### 相談の種類の選択肢例
- 研究プロトタイプについて
- Webサイト / アプリ制作について
- 共同研究 / 協業について
- 登壇 / 執筆 / その他

### ボタン文言
- Default: `Send Message`
- Loading: `Sending...`
- Success: `Message Sent`

### 安心感の補足
- `相談ベースの短い連絡でも歓迎しています`
- `内容が固まっていなくても大丈夫です`

## 14. Footer

### 内容
- 名前またはロゴ
- `Privacy Policy`
- `Terms`
- SNSリンク
- コピーライト
- 一言: `Designed & Built by Sado Kaito`

## 15. 必要なインタラクション仕様

### 1. スクロール連動
- 全セクションは下からではなく、わずかに上へ滑るように出る
- 発火は要素が20〜30%見えたタイミング
- 一斉表示ではなく、見出し→本文→カードの順で少しずつ遅延

### 2. 固定ヘッダー変化
- スクロール0付近では透明
- しきい値を超えると背景、ボーダー、軽いぼかしを付与
- ロゴとナビの余白を少し圧縮

### 3. アンカー遷移
- スムーススクロール
- 遷移後に見出しがヘッダーで隠れないオフセットを確保
- 現在位置に応じてヘッダーのアクティブ状態を更新

### 4. カスタムカーソル
- 通常カーソルを邪魔しない小さな淡色サークル
- 追従は少し遅れて動く
- リンク上でわずかに拡大
- モバイルでは非表示

### 5. Portfolio カードホバー
- カード全体が1〜2pxだけ持ち上がる印象
- 枠線または背景が少し濃くなる
- `View Project` がフェードイン

### 6. Topへ戻るボタン
- Hero を抜けた後に右下表示
- 押すとスムースに最上部へ
- 常時主張しないサイズと透明度

### 7. Contact フォーム状態
- 入力中: ラベルが整然と上がる
- 送信中: ボタン内ローディング
- 成功時: チェックと短い完了メッセージ

### 8. 編集モード
- 有効時は編集可能テキストに薄いアウトライン
- ホバーで「編集可能」と分かる
- 変更済み箇所に小さなドット

## 16. モバイル時の見せ方

### 全体
- 1カラム前提で組み直す
- セクション間余白は維持しつつ、左右余白を狭める
- 見出しサイズは落とすが、ヒエラルキーは保持

### Header
- ハンバーガーでフルスクリーンメニュー
- メニュー内の並び:
  - 名前
  - ナビ一覧
  - `つくったものを見る`
  - `連絡する`
  - SNS

### Hero
- 左右2カラムを縦積み
- 先にコピー、次にCTA、最後にプロフィールカード
- プロフィールカードは横幅いっぱいで読みやすく

### About
- テキストブロックの改行を増やし、読書負荷を下げる
- 情報カードは2列ではなく縦積み

### Schedule / Todo
- 上にスケジュール、下にTodo
- 曜日行とタスク行を広めに取る

### Portfolio / Blog / Testimonials / Contact
- すべて1カラム
- カード間隔を少し広めに
- フィルターは横スクロールか2段折返し

### Logged / Currently
- 横に長いログ表現を避け、2行組にしてもよい
- 日付とラベルを上段、内容を下段に

### カスタムカーソル
- モバイルでは無効

## 17. 管理者向け簡易編集モード仕様

### 目的
一般公開用サイトに、管理者だけが使う簡易CMS的な編集体験を与える。

### 起点
- 左下に固定ボタン: `Edit Content`
- 通常時は小さめで控えめ
- 編集モード時は `Editing` 状態に変わる

### 編集対象
- 見出し
- 本文
- ボタンラベル
- タグ名の一部
- プロフィールカードのステータス
- 実績カードのタイトル、説明、タグ
- 記事カードのタイトル、概要
- 連絡先のテキスト

### 編集モード中の見え方
- 編集可能箇所に薄い枠
- フォーカス時にゴールドのアウトライン
- 上部または下部に管理バーを表示
- 管理バー内:
  - `Editing Mode`
  - `Save Changes`
  - `Cancel`

### 操作仕様
- テキストを直接クリックして編集
- 改行可能な本文と、1行向きのラベルを区別
- 保存前はページ離脱時に警告
- `Save Changes` 押下で保存成功トーストを表示

### 保存後の状態
- `Saved at 14:32`
- 変更箇所のハイライトが数秒で消える

### セキュリティ上の前提表現
- 一般ユーザーには見せない管理者専用UI
- 公開ビューとは視覚的に明確に分ける

## 18. セクションごとの推奨トーン

### Hero
簡潔で強い。肩書きより視点を見せる。

### About
知的だが硬すぎない。なぜ研究と実装を両立しているかが伝わる。

### Schedule / Todo
生活感はあるが、整理されている。忙しさの誇示にはしない。

### Portfolio
事実ベースで簡潔に。説明しすぎず、続きを見たくさせる。

### Logged / Currently
少し遊び心を入れてよい。ただし世界観は壊さない。

### Contact
営業感を薄め、相談の入口として開く。

## 19. このサイトで最終的に与えたい印象

- 研究も実装もできる
- 美意識と整理力がある
- 継続して考え、継続して作っている
- 一緒に進める相手として信頼できる
- もう少し見たい、話してみたいと思わせる
