# CONTEXT

このファイルは、このリポジトリの「事実」を一元管理するための共通コンテキストです。
`CLAUDE.md` と `AGENTS.md` はこのファイルを先に読む前提です。

## 1. プロダクトの要約

- サービス名: `New Commune`
- 性質: 公開プロフィール + 記事 + 学生向け Apps を持つ Next.js アプリ
- ブランドロゴ: `public/brand/commune-logo.png`
- 想定ユーザー: 慶應 / SFC 周辺の学生・院生
- 中心導線:
  - 公開プロフィール `/@username`
  - 発見 `/explore`
  - アプリ `/apps`
  - 通知 `/notifications`
  - マイページ `/me` は補助ハブ

## 2. 技術スタック

- フロント: `Next.js` App Router
- 言語: JavaScript
- 認証 / DB / Storage: `Supabase`
- デプロイ: `Vercel`
- 画像・静的ファイル: `public/`

## 3. よく使うコマンド

- 開発: `npm run dev`
- ビルド確認: `npm run build`
- 事前チェック: `npm run preflight`

## 4. 主要ディレクトリ

- `app/`
  - ルーティングとページ
  - root layout から読む feature sheet として `app/english-vocabulary.css` を持ち、英語/ドイツ語の学習画面スタイルを `app/globals.css` から分離している
- `components/`
  - UI とアプリ機能の本体
- `lib/`
  - データ取得、URL、Supabase クライアント等
- `supabase/`
  - `schema.sql`, `first-admin.sql`
- `public/`
  - アバターや静的アセット
- `docs/`
  - プロジェクト文書
- `経済設計/`
  - ポイント経済、サブスク経済、仮想通貨経済など、このサービスの経済圏設計メモ
- `skills/`
  - Codex / 他エージェント向けの project-local skill
  - 実運用する skill の正本は repo 内 `skills/` に置き、`scripts/sync-skill-to-codex.sh` で `~/.codex/skills/` に同期する
- `agents/`
  - planner / coder / reviewer など、複数AI運用時の軽量な役割定義
- `prompts/`
  - 再利用する短いプロンプトテンプレート
- `scripts/harness/`
  - AI 協調作業用の preflight / context summary / task classifier などの実行ハーネス
- `logs/`
  - harness や試作のローカル実行ログ置き場。`.gitkeep` 以外は commit しない
- `.claude/worktrees/`
  - Claude 側の試作・分岐用
- `.rgignore`, `.ignore`
  - default の探索から deploy 複製、巨大生成語彙、vendor script を外し、必要な時だけ明示パスで開く

## 5. 実装済みの主要面

- 公開プロフィール
  - 通常テーマ
  - `signature` テーマ
  - `signature` テーマの月間カレンダーは日付クリックで1日表示へ切り替わり、横スクロールの日付バーで月内の各日を移動しながら 00:00-23:00 予定を表形式で表示・編集できる
- 記事
- 特別記事
- 匿名質問箱
- 通知
- 管理画面 / 通報
- Apps
  - 裏シラバス `/apps/classes`
  - エッジ情報 `/apps/edge`
  - 助け合いボード `/apps/help`
  - 祈祷と呪詛 `/apps/ritual`
  - Games `/apps/games`
    - `賽の河原` を `/games/sainokawara/index.html` の static HTML/CSS/JS として実装
    - `/apps/games` から iframe と単独起動リンクで遊べる
    - Matter.js ベースの石積み、危険度メーター、微弱な風、次石プレビュー、best score 保存を持つ
    - 置き方はドラッグ主体で、石がどれかひとつでも台から落ちたら即 game over
    - Matter.js は CDN ではなく `public/games/sainokawara/vendor/matter.min.js` を読む
    - `くしさばき` を `/games/comb-sweep/index.html` の static HTML/CSS/JS として追加し、縦長 canvas 上で落ちてくる毛を口へ入る前にくしでさらうゲームとして `/apps/games` から埋め込みと単独起動ができる
  - 物理コンテンツ `/apps/physics`
    - `Physics Playground` として、操作・可視化・数式・理論マップを往復する client-side 物理 app
    - `Sandbox / Guided Lab / Math Link / Theory Map` を上位モードに持つ
    - 現在は `放物運動`, `衝突と運動量保存`, `単振動`, `理想気体`, `波の反射・屈折`, `ローレンツ変換`, `1D量子井戸` の 7 scene を実装
  - GenerativeArtWithMath `/apps/generative-art-with-math`
    - `GenerativeArtWithMath/` フォルダを参照元に、数学ベースの生成作品を並べる gallery として実装する
    - 初期作品は `Spiral Polygon` で、`scripts/processing/SpiralPolygonRender/SpiralPolygonRender.pde` を Processing CLI で PNG 出力し、Web では Processing output と Canvas live preview を並べる
    - `Spiral Polygon` は `Created by Kaito Sado.` / `Based on GenerativeArtWithMath-p5.js Samples by Tetsunori NAKAYAMA, MIT License.` / `Inspired by "Generative Art with Math" by Tatsuki HAYAMA.` のクレジットを表示する
  - 英語コンテンツ `/apps/english`
    - `English Chunks Lab` として、単語暗記カードを主役にしつつ、チャンク中心、高制約文脈、シャドーイング、多文脈レビューを持つ client-side 英語学習 app
    - 進捗はログイン時に Supabase `english_progress` と同期し、未ログイン時または live schema 未適用時は `localStorage` に退避する
    - 現在は `単語` と `見直しリスト` を主導線にし、英単語を自動読み上げして `←/×` または `→/○` で自己判定すると次単語へ進む暗記導線を持つ
    - 単語面では自動読み上げの ON/OFF と停止、出題表示時間、答え表示時間、5ステージ復習間隔をユーザーが変更でき、設定は進捗と一緒に保存される
    - 語彙データの正本は `英単語/target1900_normalized.tsv` で、`scripts/build-english-vocabulary.mjs` により runtime 用の `public/english-decks/basic.json` と `lib/english-deck-manifest.json` を更新する
    - 現在の英単語データは 3441 語を `family` で束ねた 2686 出題グループで、進捗保存は全件ではなく学習済み差分だけ `localStorage` に保持する
    - `family` が同じ語は1つの出題グループとして扱い、実際に大きく表示される派生語は出題ごとにランダムに選ぶ。現データを `family` で畳むと 2686 グループで、原本の 1900 見出し語とはまだ一致しない
    - 正誤ログは各出題グループごとに日時つきで `localStorage` に保持し、復習は `当日 -> 3日後 -> 7日後 -> 14日後 -> 30日後` の固定 5 段階で回す
    - 初回で正解した語は即座に長期記憶へ入り、通常出題キューから除外される
    - 一度間違えた語は 5 ステージを正解で進み、30日後ステージを抜けると長期記憶へ入る。間違えると現在ステージに留まる
    - 出題キューは長期記憶入りの語を除外し、復習期限の来た間違い語を優先してセッションごとにシャッフルする
    - 品詞フィルタで `名詞`, `動詞`, `形容詞`, `副詞`, `その他` に絞れる
    - 品詞フィルタは `熟語` にも対応し、単語帳横断 deck では英熟語を単語と同じ復習導線で扱う
    - UI 上の `長期記憶リスト` には通常キューから除外された正解済み単語を表示する
    - UI 上の `見直しリスト` は日時を見せず、間違えた単語一覧と現在ステージを中心に見直せる
    - 語彙セット切り替えとして `必須単語` と `単語ガチ勢` を持つ
    - `単語ガチ勢` は `scripts/build-english-hardcore-vocabulary.mjs` で `ukaru-eigo.com` と `ejquotes.com` の指定ページをスクレイピングし、`英単語/hardcore_scraped_normalized.tsv` を更新しつつ、runtime 用には `public/english-decks/hardcore.json` と `lib/english-deck-manifest.json` を更新する
    - `単語ガチ勢` は 9 つの単語帳/熟語帳ページから 16386 行を取り込み、同じ見出し語・熟語の重複をまとめた 9179 出題カードとして扱う
    - `単語ガチ勢` のカード表面に出す `meaning` は 1 語 1 主訳を優先し、`/` や `・` を極力出さない。元の複数訳は `meaningRaw`、補足訳は `meaningAlternates`、語感メモは `nuance` に退避する
    - `英単語/hardcore_meaning_overrides.tsv` で `reception` などの多義語の主訳を手動補正し、`npm run audit:english-hardcore-meanings` で低信頼・多義語を `英単語/hardcore_meaning_review_candidates.csv` に抽出できる
    - `/apps/english` の runtime は巨大語彙を client bundle に直 import せず、`lib/english-deck-manifest.json` を読む軽量 helper と `public/english-decks/*.json` の deck 別 lazy load で動かす
  - ドイツ語コンテンツ `/apps/german`
    - `ドイツ単語帳抜き出しフォルダ/ドイツ単語_app_seed.json` を正本 seed とし、`scripts/build-german-vocabulary.mjs` で `lib/german-vocabulary.js` を生成して読む
    - 現在のドイツ語 seed は 1604 語で、`meaning_ja` は全件 machine translated draft または手動補正として補完済み。例文はまだ未登録
    - 名詞は 854 語で、冠詞・性は 854 語、複数形は 801 語まで補完済み。未確認名詞は 0 語
    - `See`, `Leiter`, `Band`, `Bank`, `Gehalt`, `Erbe`, `Kiefer`, `Schloss` など冠詞や文脈で意味が分かれる語は、答え表示時に `同音異義` の注意を出す
    - 英語コンテンツと同じく、自動読み上げ、左右判定、品詞フィルタ、表示時間設定、5ステージ復習間隔、見直しリスト、長期記憶リストを持つ
    - 品詞フィルタは `名詞`, `動詞`, `助動詞`, `形容詞`, `副詞`, `前置詞`, `接続詞`, `代名詞`, `間投詞` を持つ
    - `npm run audit:german-meanings` で訳の怪しい候補を `ドイツ単語帳抜き出しフォルダ/ドイツ単語_訳確認リスト.csv` に出力し、high confidence の自動修正候補と review-required 候補を分けられる。現在は 1604 語から 436 候補、high 13 件
    - 進捗はログイン時に Supabase `german_progress` と同期し、未ログイン時または live schema 未適用時は `localStorage` に退避する
  - 日本版・世界大学ランキング `/apps/university-ranking`
    - まずは大学候補から「一番いい」と思う大学を選んで投票する単純なランキング app として実装する
    - 投票はログイン必須で、Supabase `university_ranking_votes` の `user_id` primary key により一アカウント一回に制限する
    - 公開面では総投票数と大学別ランキングを表示し、ログイン済みユーザーには自分の投票済み大学を表示する
  - リサーチプログレス `/apps/research-progress`
    - 招待制の研究会 / ゼミ / 小規模PJ向け研究ライン + 週次チェックイン面
    - グループ一覧 `/apps/research-progress`
    - グループ別ダッシュボード `/apps/research-progress/[slug]`
    - group owner が研究計画、研究費申請、ポスター、論文投稿までの案件パイプラインを管理できる
    - `/apps` の公開一覧では `coming soon` として案内する
  - 株式投資アプリ
    - `/apps` の公開一覧では `coming soon` として案内する
  - 研究室市場（Labfolio）
    - `/apps` の公開一覧では `coming soon` として案内する
  - ルームシェア `/apps/roomshare`
    - 信頼が必要なマッチング型マーケットプレイス基盤の最初のMVP
    - `Listing / Application / MessageThread / Message / Favorite / Review / Report / Block / Notification / IdentityVerification / AdminAction / PaymentIntent` を横展開前提で扱う
    - ルーム固有情報は `room_details` に分離し、カーシェア用 `car_details` とマッチングアプリ用 `dating_profiles` も schema に用意している
    - 主要導線は検索、掲載作成・編集、プロフィール、マイページ、お気に入り、問い合わせ、チャット、通知、管理画面
  - カーシェア `/apps/carshare`
    - `car_details` と `applications` を使う将来展開用の準備面
    - 車両掲載、予約申請、免許確認、受け渡し、事故報告のカーシェア用導線を表示する
  - マッチングアプリ `/apps/matching`
    - `dating_profiles` と `matches` を使う将来展開用の準備面
    - 相互いいね、Match、マッチ後チャット、通報、ブロックのマッチングアプリ用導線を表示する
  - アプリ一覧 `/apps` は公開中 / 準備中アプリと非公開アプリを分けて表示し、準備中アプリは `coming soon` と公開前状態が分かるカード表現にする

## 6. データベース運用ルール

- DB の単一ソースは `supabase/schema.sql`
- schema 変更時は:
  1. `supabase/schema.sql` を更新
  2. 必要なら `supabase/README.md` と `CHANGELOG.md` を更新
  3. live 環境に再適用が必要な場合は明記
- `if exists` / `drop policy if exists` 前提で、再実行可能な schema を維持する
- `research_*` 系テーブルはリサーチプログレス用の正本で、`research_groups`, `research_group_members`, `research_updates`, `research_projects`, `research_project_members` を含む
- `research_*` 系の変更と `english_progress` / `german_progress` の追加は live 反映に Supabase への schema 再適用が必要
- `university_ranking_votes` は日本版・世界大学ランキングの一アカウント一回投票用テーブルで、追加・変更時は live 反映に Supabase への schema 再適用が必要
- マーケットプレイス基盤の `listings`, `room_details`, `car_details`, `dating_profiles`, `favorites`, `applications`, `matches`, `message_threads`, `messages`, `reviews`, `identity_verifications`, `admin_actions`, `payment_intents` と、`profiles`, `reports`, `notifications`, `blocks` の拡張は live 反映に Supabase への schema 再適用が必要

## 7. デザインと CSS の現状

- 現状のグローバル CSS は `app/globals.css` に集約されている
- まだ機能単位分割は未完了
- 触る際は:
  - どの面を変えるかを明確にする
  - 無関係なセクションをまとめて触らない
  - CSS 変更後は必ず `npm run build` で確認する

## 8. Git / ブランチ運用

- 本番反映先: `origin/main`
- `public-site` は過去の安定運用ブランチとして残っているが、現状のデフォルト本番反映先ではない
- Vercel の production は `origin/main` への push 後に `https://archteia.com/...` へ反映される運用として扱う。設定変更が分かった場合はこの節を更新する
- ただし 2026-04-15 の `/apps/english` 反映では `origin/main` push 後も本番が古い prerender を返し、`origin/codex/resolve-untracked-files` を同じ commit に fast-forward した時点で `https://archteia.com/apps/english` が更新された。Vercel production branch を確認・修正するまでは、公開URL向け変更は `origin/main` と `origin/codex/resolve-untracked-files` の両方へ同じ commit を届ける
- 同じ SHA を先に作業ブランチへ push すると Vercel が preview deployment status をその SHA に結び、あとから `origin/main` へ同じ SHA を push しても production domain が差し替わらない場合がある。公開URL向け変更は commit 後、まず `origin/main`、次に `origin/codex/resolve-untracked-files`、最後に作業ブランチへ push する
- 機能開発ブランチ:
  - `codex/<task>`
  - `claude/<task>`
- 原則:
  - 1タスク = 1ブランチ = 1担当AI
  - 同じファイルを 2 つの AI が同時に編集しない
  - 実装・修正依頼は、ユーザーが明示的に止めない限り `npm run build` 後に関連差分だけ commit し、依頼達成に live schema / data 反映が必要ならそこまで進めた上で、まず `origin/main` へ push し、次に `origin/codex/resolve-untracked-files` と作業ブランチへ同じ commit を届け、対象 URL / API を確認する
  - `https://archteia.com/...` の話題では、ローカル確認や作業ブランチ push だけで完了扱いにしない
  - schema / seed / live data の反映が依頼達成に必要な時は、それも完了条件に含める
  - build 失敗、無関係差分混入、schema live 適用判断、live credential 不足、衝突リスクがある場合は commit / push / DB反映をせず報告する

## 9. AI 協調の基本ルール

- `CONTEXT.md` は事実のみ
- 設計判断は `DECISIONS.md`
- 進行中タスクは `CURRENT_TASK.md`
- 引き継ぎは `HANDOFF.md`
- 変更履歴は `CHANGELOG.md`
- `PROJECT.md` は新設せず、現在の状態・目的は `CONTEXT.md` に寄せる
- `TASKS.md` は現時点では新設せず、進行中の作業は `CURRENT_TASK.md` に置く
- 役割定義は `agents/`、恒常的な workflow は `skills/`、実行系は `scripts/harness/` に分ける
- 推論深度と探索量の切り替えは project-local skill `skills/reasoning-effort-router/` と `npm run harness:classify` で補助する

## 10. いま重要な注意点

- 公開ページ編集が主導線
- `/dashboard` は旧導線が残るだけで主導線ではない
- `@keio.jp / @keio.ac.jp` の扱いは信頼軸に関わるため慎重に変更する
- Apps は学内向けの実用面として拡張中
