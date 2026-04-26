# DECISIONS

このファイルは、事実ではなく「なぜそうしたか」を残す。

## 採用している判断

### 1. 公開ページを主導線にする

- `/@username` がユーザー体験の中心
- 編集も可能な限り公開ページ上で行う
- `/dashboard` は主導線ではなく、過去互換寄り

### 2. Apps を独立価値として伸ばす

- プロフィール単体ではなく、Apps 群を価値の中心に含める
- 学生向け実用面を積み上げる方針

### 3. 説明文は減らし、UI で意味を出す

- 固定の薄いラベルや補助説明はなるべく減らす
- 迷うなら、まず UI / 色 / レイアウトで解決を試す

### 4. Supabase schema は再実行可能に保つ

- `supabase/schema.sql` を単一ソースにする
- migration 断片より、現時点では全文再適用可能な schema を優先する

### 5. 2つのAIが同時に同じファイルを触らない

- 衝突回避を最優先する
- 並行作業はブランチと担当ファイルを分ける

### 6. project-local skill は初版を lean に作る

- `skills/` 配下の skill は、まず workflow と判断基準を中心に置く
- 初版は「監査 + 安全修正」に寄せ、過剰な自動修正や重い依存前提は避ける
- 長い検出ルールや framework 別の注意点は `references/` に分離する

### 7. skill の正本は repo 側に置く

- project-local skill は repo 内 `skills/` を正本にする
- `~/.codex/skills/` 側は実行用の同期先として扱う
- Codex が広く誤発火しないよう、明示呼び出し中心の skill は `allow_implicit_invocation: false` を基本にする

### 8. リサーチプログレスは「研究管理全部入り」にしない

- v1 は招待制グループ内の週次チェックイン + 停滞把握 + owner レビューに絞る
- コメント、通知、ランキング、AI 要約、複雑な会議支援は初版から外す
- まず「主催が 30 秒で危険箇所を把握できること」を優先する

### 9. 半クローズド app は `/apps` の非公開一覧に置く

- リサーチプログレスのような招待制 app は公開アプリ一覧ではなく `非公開アプリ一覧` で案内する
- route 自体は存在しても、閲覧や書き込みは auth + group membership 前提で制御する

### 10. リサーチプログレスは案件ポートフォリオを主役にする

- 研究室管理で最優先で見たい主語は週報ではなく project と考える
- 研究計画から研究費申請、ポスター、論文投稿までを 1 本の研究ラインとして扱う
- `%` は自由入力の全体進捗ではなく、段階内進捗と自動計算の補助値にとどめる
- 週次チェックインは残すが、パイプライン管理の補助ログとして位置づける

### 11. 物理コンテンツは「見方の切替 UI」を主役にする

- `/apps/physics` は物理単元を並べる辞書ではなく、同じ scene の上に law を重ねる app として育てる
- 初版は高精度 solver よりも、`Sandbox / Guided Lab / Math Link / Theory Map` の学習導線を優先する
- scene はバラバラの教材集にせず、再生制御・表示切替・グラフ・数式接続を共通 runner にそろえる
- 最初の核は `放物運動`, `衝突`, `単振動`, `理想気体`, `波の反射・屈折`, `ローレンツ変換`, `1D量子井戸` の 7 scene とする

### 12. build 不要の standalone game は `public/` に切り出す

- `賽の河原` のように HTML / CSS / JS だけで即動くゲームは `public/` 配下に置く
- site 側の React は導線と埋め込みにとどめ、ゲーム本体の複雑さを Next の route から切り離す
- これにより local でも単体で確認しやすく、Games ハブからも一貫した見せ方を保てる

### 13. 英語 app は「単語帳」ではなくチャンク中心で作る

- `/apps/english` は単語リスト暗記ではなく、`chunk -> high constraint context -> shadowing -> diverse review` の順で回す
- ログイン時は `english_progress` に同期し、未ログインまたは live schema 未適用時は `localStorage` に退避する
- 感情設計は強刺激ではなく、不安を下げる説明と軽い達成感を優先する

### 14. 英語 app の復習は可変 ease ではなく固定段階で回す

- `/apps/english` の復習は、ユーザーが理解しやすい 5 段階で扱い、標準は `当日 -> 3日後 -> 7日後 -> 14日後 -> 30日後` とする
- 5段階の間隔はユーザーが変更できるようにし、短期集中型の `当日 -> 翌日 -> 2日後 -> 3日後 -> 7日後` もプリセットとして扱う
- 初回で正解した語は長期記憶として通常キューから除外し、一度間違えた語だけ 5 ステージの復習コースへ入れる
- 復習コースの語は正解すると次ステージへ進み、間違えたときは戻さず現在ステージに留める
- 30日後ステージを正解で抜けた語は長期記憶として通常キューから除外する
- 日時つきの生ログは内部保存しつつ、UI では「間違えた単語一覧」を主に見せて認知負荷を上げすぎない

### 15. 英語 app の語族は表示統合から始める

- `/apps/english` は同じ `family` の語を1つの出題グループにまとめ、正誤記録も語族単位で持つ
- 大きく表示される語は、語族内の派生語から出題ごとにランダムに選ぶ
- `family` の機械生成だけで 1900 見出し語へ畳むと誤グループ化や分離漏れがあるため、完全な 1900 グループ化は原本見出し語IDの整備後に行う
- ランダム表示、主語と派生語の入れ替え、品詞別プレイは `family` と `pos` を使う

### 16. AI 協調用の状態管理は既存ファイルを正本にする

- `PROJECT.md` は作らず、現在の状態と目的は `CONTEXT.md` に集約する
- `TASKS.md` は作らず、進行中作業は `CURRENT_TASK.md` に集約する
- 役割定義は `agents/`、再利用プロンプトは `prompts/`、実行ハーネスは `scripts/harness/` に分離する
- `logs/` はローカル実行ログ用に確保するが、`.gitkeep` 以外は commit しない
- `npm run preflight` は `scripts/harness/preflight.mjs` を入口にし、env / 運用ファイル / schema 変更の付随更新を確認する

### 17. 推論深度は作業リスクで切り替える

- 全タスクを高推論で扱わず、`low / medium / high / xhigh` の4段階で作業深度を決める
- 低リスクの文言・画像・既知CSS変更は shallow に処理し、DB / 認証 / RLS / 同期 / 本番影響は high 以上に上げる
- モデル設定そのものを常に変えられない環境でも、読む範囲・検証量・計画の厚さを変えることで token 消費を抑える
- 判断基準は `skills/reasoning-effort-router/` に置き、CLI で確認したい時は `npm run harness:classify -- "task text"` を使う

### 18. 実装依頼は commit / push / 必要な live DB 反映まで一連で完了させる

- 公開サイト運用では「修正済みだが本番未反映」や「コードだけ入ったが DB が古い」の状態が混乱を生むため、ユーザーが止めない限り実装・修正依頼は `build -> commit -> 必要な live schema / data 反映 -> origin/main 反映 -> 暫定 production branch と作業ブランチ push -> 対象URL / API確認` まで進める
- `push` は作業ブランチへの退避だけを意味しない。`https://archteia.com/...` が対象の時は、本番反映先である `origin/main` まで届ける
- schema / seed / live data の反映が依頼達成に必要なら、それも「実装の一部」として扱い、別タスクに逃がさない
- 2026-04-15 時点では `origin/main` だけでは本番URLが更新されず、`origin/codex/resolve-untracked-files` fast-forward 後に反映されたため、Vercel production branch を確認・修正するまでは両方へ同じ commit を届ける
- 同じ SHA を作業ブランチへ先に push すると Vercel が preview deployment status をその SHA に結び、あとから `origin/main` へ同じ SHA を push しても production domain が差し替わらない場合があるため、公開URL向け変更は `origin/main` への push を最初に行う
- `public-site` は過去の運用名が残っているだけなので、デフォルトでは触らない。Vercel production branch が変わったと確認できた時だけ、`CONTEXT.md` とこの判断を更新する
- ただし、build 失敗、未確認の無関係差分、schema の live 適用判断、live credential 不足、別AIとの衝突リスクがある場合は commit / push / DB反映をせず、人間判断へ戻す
- stage は関連差分だけを明示し、既存の未追跡ファイルや他作業の差分は巻き込まない

### 19. ドイツ語 app は英語 app の学習導線を踏襲し、訳データ補完を前提にする

- `/apps/german` は英語 app と同じく、単語表示、自動読み上げ、自己判定、見直しリスト、長期記憶リスト、5ステージ復習で回す
- 現 seed は日本語訳・例文・名詞性別が未補完なので、UI は先に学習器として成立させつつ、`meaning_ja`, `example_de`, `article`, `gender`, `plural` を後から足せる構造にする
- 進捗は `german_progress` へ同期し、live schema 未適用時は `localStorage` に退避して学習自体を止めない

### 20. マーケットプレイス基盤は Supabase 正本で実装する

- 依頼文は Prisma / TypeScript を想定していたが、この repo の正本は `JavaScript + Supabase Auth/RLS + supabase/schema.sql` であるため、既存構成を優先する
- 共通部分は `listings`, `applications`, `message_threads`, `messages`, `reviews`, `reports`, `notifications`, `admin_actions`, `payment_intents` に置く
- サービス固有情報は `room_details`, `car_details`, `dating_profiles` に分離し、`service_type` / `listing_type` で横展開する
- カーシェア / マッチングアプリは専用MVP実装前でもルームシェアへ流さず、それぞれのサービス固有の準備面を見せる
- 自分の掲載のお気に入りは MVP では不可にして、通知や人気指標が自己操作で歪まないようにする
- 本人確認書類の実データは MVP では保存せず、`identity_verifications` のステータスと metadata に運用状態だけ残す

### 21. ドイツ語の同音異義語は別カード + 答え時注意で扱う

- `der See` と `die See` のように冠詞で意味が分かれる語は、同じ見出しでも seed 上は別 entry として持つ

### 22. default search は生成物より実装本体を優先する

- Codex / Claude が普段使う default search では、`.codex-deploy/`、`public/english-decks/`、`lib/german-vocabulary.js` のような巨大生成物や複製物を `.rgignore` / `.ignore` で外す
- 生成データが必要な時は ignore を外して広く検索するのではなく、対象ファイルの path を明示して直接開く
- 英語 app はすでに `public/english-decks/*.json` を runtime 正本として使っているため、repo 内の巨大 JS dump は残さず、編集時の token 消費と accidental search hit を減らす

### 23. prefix が明確な UI は feature sheet へ切り出す

- `english-*` / `german-*` のように prefix がまとまっていて surface も限定されるスタイルは、`app/globals.css` に居続けさせず feature sheet へ分離する
- まずは英語/ドイツ語の学習画面スタイルを `app/english-vocabulary.css` へ出し、巨大 global CSS を少しずつ薄くする
- feature sheet は可能な限り nearest route から読む。今回の `app/english-vocabulary.css` は `/apps/english` と `/apps/german` だけで読む
- `die Bank / Bänke` と `die Bank / Banken` や `das Schloss` のように冠詞だけでは区別できない語は、答え表示時に `冠詞同じ` の注意を出す
- 暗記画面はシンプルに保ち、同音異義の注意は答え表示後だけ見せる

### 22. GenerativeArtWithMath は Processing output を正本にする

- 作品制作は Processing sketch を通し、生成済み output を `public/` に置いて gallery に表示する
- `/apps/generative-art-with-math` は作品ごとの gallery とし、最初は `Spiral Polygon` を大きな作業面として見せる
- Web 上では PDE を直接実行しないため、React Canvas 版はパラメータ遊び用の live preview として併置する

### 23. signature カレンダーは日付セルを詳細表示の入口にする

- 月間カレンダーの各セルへ直接長文入力を詰め込まず、日付クリックで月間表示を1日表示へ切り替え、24 時間予定を表で扱う
- 1日表示では横スクロールの日付バーで月内の各日に移動し、`カレンダー` ボタンで月間表示へ戻る
- 既存の日付メモは `note` として残し、新しい時間別予定は `hours` に分けて保存する

### 24. 英語 app の巨大語彙拡張は deck 切り替えで扱う

- `大学受験みそ` と `英単語ガチ勢界隈` は別アプリではなく、同じ `/apps/english` の語彙セットとして扱う
- `mode` は `単語 / 見直しリスト / 長期記憶リスト` の画面切り替えに残し、語彙の切り替えは `deckId` として分ける
- `英単語ガチ勢界隈` は既存 deck と同じ暗記・復習・見直し・長期記憶導線を使うが、`deckId` と prefixed id で基本語彙進捗とは混ぜない
- 指定ページ間の重複は1カードにまとめ、意味の差分は同じカードの意味欄へ追記する
- 速読英熟語などの phrase 系は `phrase` として扱い、品詞フィルタには `熟語` を追加する

### 25. root 直下の外部素材・試作はそのまま tracking しない

- `GenerativeArtWithMath/` のような外部サンプル全体や、単独試作フォルダは local/reference source tree として扱う
- repo に入れる時は、必要な成果物だけを `app/`, `components/`, `public/`, `scripts/`, `docs/` など既存の責務ディレクトリへ昇格させる
- 設計メモとして継続利用するものは、`docs/` または専用の tracked 文書ディレクトリに整理してから残す

### 26. 英単語ガチ勢界隈の主訳は 1 カード 1 表示に寄せる

- 多義語をそのまま `/` や `・` で並べると暗記カードの視認性が崩れるため、カード表面の `meaning` は原則 1 つの主訳に絞る
- 意味が遠い別義や文脈依存の訳は `meaningAlternates` と `nuance` に逃がし、スクレイプ元の生訳は `meaningRaw` に残して失わない
- 一括ヒューリスティックで荒く整えつつ、`reception` のような重要な多義語は `英単語/hardcore_meaning_overrides.tsv` で手動補正する
- 綺麗な 1 対 1 表示を保ちながら、監査用には `npm run audit:english-hardcore-meanings` で低信頼候補を継続抽出する

### 27. 英語 app の巨大 deck は public JSON と遅延読込で扱う

- `use client` の学習 UI へ巨大語彙配列を直 import すると、文言変更だけでも Next build が重くなるため、runtime では `public/english-decks/*.json` を fetch する
- 初期表示では `basic` だけ読み込み、`hardcore` は deck 切り替え時に遅延読込する
- deck 件数や先頭 chunk id のような軽い情報だけを `lib/english-deck-manifest.json` に置き、client bundle には巨大語彙本体を入れない
- 語彙の正本や生成スクリプトは維持しつつ、配信経路だけを `lib/*.js` 直 import から static JSON 配信へ切り替える

### 28. 日本版・世界大学ランキングは単純投票 MVP から始める

- 初版では複雑な評価軸、ペアワイズ比較、学部別ランキングを入れず、「どの大学が一番いいか」を一票で選ぶ
- 集計は大学別の総票数に絞り、`university_ranking_votes.user_id` を primary key にして一アカウント一回を保証する
- 不正対策や詳細ランキング制度は、実際の利用と荒れ方を見てから追加する

### 29. UI は学生コミュニティの道具箱として整理する

- New Commune は匿名掲示板、汎用SNS、SaaS LP ではなく、学生の公開ページ・研究ログ・学内アプリ棚がゆるく接続された場所として見せる
- 参照軸は Are.na の知的な静けさ、Cargo の個人ポートフォリオ感、Raycast Store のアプリ棚に絞り、グロー・ガラス・グラデーション・英語ラベルを一律に盛らない
- `/apps` は全アプリを同じ重さで並べず、検索、カテゴリ、公開中/準備中/準備室/管理用の状態で棚として整理する
- signature プロフィールは `CURRENT COORDINATES` の派手なカードではなく小さな事実表、`IDENTITY` はカード羅列ではなく自己紹介 + 属性メモ、`CURRENT` は短い近況ログとして扱う

### 30. 公開UIの言葉は説明ではなく棚札に寄せる

- UI 上の文章は、使い方の説明よりも短い名詞、状態、件数、1行メモを優先する
- `/apps` は Raycast Store の拡張一覧のように、名前・カテゴリ・状態・短い用途だけで判断できるようにする
- signature プロフィールは Cargo / Are.na 的に、作品、リンク、ログ、現在地のような標識を置き、自己説明の長文でページを埋めない

### 31. signature hero とプロフィール本文を分ける

- hero は名前、handle、短い headline だけを置く名札として扱う
- 自己紹介本文は `プロフィール` セクションだけに置き、同じ bio を上下で繰り返さない
- 編集時の bio 入力も `プロフィール` セクション側に置き、読む場所と書く場所をそろえる

### 32. 生成PNG素材は薄い紙片として使う

- `素材pngのコピー/` の代表10枚を `public/textures/new-commune/` に置き、配信可能な英数字パスで扱う
- 背景画像を主役にせず、Apps / signature / Research Progress / 深夜徘徊 / GenerativeArtWithMath に薄い紙片として重ねる
- 画像レイヤーは `pointer-events: none` と低 opacity を前提にし、リンク、フォーム、表、カレンダー操作を塞がない
- モバイルでは装飾画像を非表示にし、狭い画面で本文や操作を邪魔しない
- Next の巨大CSS chunk が同じURLで残る場合に備え、texture 用の静的CSSを `public/textures/new-commune/site-textures.css` として分けて layout から読む
