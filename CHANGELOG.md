# CHANGELOG

変更履歴を、人間とAIの両方が追える形で残す。

| date | agent | area | summary | verify |
| --- | --- | --- | --- | --- |
| 2026-04-15 | codex | english app ui | `/apps/english` の学習カード下ボタン列に `⇦ミス ↑スルー ⇨クリア` の小さな操作説明を追加 | `npm run build` |
| 2026-04-15 | codex | english app ui | `/apps/english` の右サイドバー上部に語彙セット切り替えを追加し、`大学受験みそ` を active、`英単語ガチ勢界隈` を語彙投入前の準備中入口として表示。`mode` とは別に `deckId` を保存する形へ準備 | `npm run build` |
| 2026-04-15 | codex | git hygiene | root 直下の外部サンプル/単独試作ディレクトリを `.gitignore` に追加し、既に一部 tracked だった `経済設計/` の README 群を追跡対象に整理 | `npm run build` |
| 2026-04-15 | codex | signature profile schedule | マイページ / signature プロフィールのカレンダーを月間/1日表示の切り替えに変更。日付クリックで1日予定表へ移り、横スクロールの日付バーで月内の日別予定を移動できるようにした | `npm run build` |
| 2026-04-15 | codex | git hygiene | ローカルの agent worktree、deploy scratch、語彙抽出中間物、翻訳 cache / test file を `.gitignore` に追加し、`der Rock = スカート` の名詞性チェックCSVを seed と整合させた | `npm run build` |
| 2026-04-15 | codex | signature profile schedule | マイページ / signature プロフィールの月間カレンダーで、日付クリック後の 00:00-23:00 予定を「時間 / 予定」の表として表示・編集できるように変更 | `npm run build` |
| 2026-04-15 | codex | signature profile schedule | マイページ / signature プロフィールの月間カレンダーを、日付クリックで選択日の 00:00-23:00 予定を表示し、編集時に時間別予定と日メモを編集できる形に変更 | `npm run build` |
| 2026-04-15 | codex | generative art app | `/apps/generative-art-with-math` の `Spiral Polygon` に作者・MIT License 元サンプル・書籍 inspiration のクレジット表記を追加 | `npm run build` |
| 2026-04-15 | codex | generative art app | `/apps/generative-art-with-math` に GenerativeArtWithMath gallery を追加し、`Spiral Polygon` を Processing CLI で PNG 出力する sketch と Canvas live preview つきで実装。アプリ一覧とホームの Apps 導線にも追加 | `Processing cli --run`, `npm run build`, `curl -I http://127.0.0.1:3000/apps/generative-art-with-math` |
| 2026-04-14 | codex | german app data | ドイツ語 seed に `See`, `Leiter`, `Band`, `Bank`, `Gehalt`, `Erbe`, `Kiefer`, `Schloss` の同音異義情報を追加・補正し、答え表示時だけ冠詞違い/同冠詞の別義を `同音異義` として出すようにした。seed は 1604 語、訳確認候補は 436 件に更新 | `node scripts/build-german-vocabulary.mjs`, `npm run audit:german-meanings`, `npm run build` |
| 2026-04-14 | codex | german app data | ドイツ語訳のAI補助確認用に `npm run audit:german-meanings` を追加し、1593語から訳確認候補438件、高確度自動修正候補16件をCSV/JSONへ出力できるようにした | `npm run audit:german-meanings`, `npm run build` |
| 2026-04-14 | codex | german app data | `einsteigen` の訳を機械翻訳由来の `入れ` から `乗り込む、乗車する` に補正し、翻訳補正ルールにも追加 | `node scripts/build-german-vocabulary.mjs`, `npm run build` |
| 2026-04-14 | codex | german app ui | `/apps/german` の品詞フィルタから、現在0件の `その他` と `性未登録` を削除。古い保存フィルタは起動時に `すべて` へ戻る | `npm run build` |
| 2026-04-14 | codex | german app data | `der Meter` の訳を機械翻訳由来の `メーター` から単位として自然な `メートル` に補正し、翻訳補正ルールにも追加 | `node scripts/build-german-vocabulary.mjs`, `npm run build` |
| 2026-04-14 | codex | german app data | `/apps/german` の品詞フィルタに `間投詞` を追加し、`danke`, `hallo`, `ach`, `oh` を間投詞として分類。`ach` / `oh` は副詞リストから外した | `node scripts/build-german-vocabulary.mjs`, `npm run build` |
| 2026-04-14 | codex | german app data | `Beamte` を `der Beamte / 公務員` に補正し、答え下に `形容詞変化` の変化メモを表示できるようにした | `node scripts/build-german-vocabulary.mjs`, `npm run build` |
| 2026-04-14 | codex | marketplace routing | `/apps/carshare` と `/apps/matching` を `/apps/roomshare` へのリダイレクトから、それぞれ専用の準備面に戻した。カーシェアは車両・予約・免許確認・事故対応、マッチングは相互いいね・Match・チャット制限・通報ブロックを表示 | `npm run build` |
| 2026-04-13 | codex | profile copy | マイページの hero action 文言を `作品を見る` -> `記事`, `思考を読む` -> `記録したいこと` に変更 | `npm run build` |
| 2026-04-13 | codex | german app ui | `/apps/german` の答え表示後チップを複数形だけに絞り、訳で判断できる品詞表示を暗記画面から削除 | `npm run build` |
| 2026-04-13 | codex | german app ui | `/apps/german` の答え表示後チップから `男性/女性/中性 + 性` の性別表示を削除し、冠詞色だけで性を伝える形に整理 | `npm run build` |
| 2026-04-13 | codex | marketplace routing | MVP段階では `/apps/carshare` と `/apps/matching` の説明ページを挟まず、アプリ一覧から即 `/apps/roomshare` へ遷移するようリダイレクトへ変更 | `npm run build` |
| 2026-04-13 | codex | german app copy | `/apps/german` の説明セクションを「科学的に最適化できるパーソナライズドイツ単語アプリ」に差し替え、忘却曲線・フラッシュ式・弱点管理・フィードバック・性の色つけの5項目で説明する形に更新 | `npm run build` |
| 2026-04-13 | codex | german app data | `der Rock` の機械翻訳が `ロック` になっていたため、ドイツ語単語帳文脈に合わせて `スカート` に補正し、翻訳補正ルールにも追加 | `node scripts/import-german-meanings-google.mjs --apply --refresh`, `node scripts/build-german-vocabulary.mjs`, `npm run build` |
| 2026-04-13 | codex | german app queue | `/apps/german` で同じ単語が同一セッション内に早く戻りすぎないよう、回答済み単語を一周するまで一時的に出題キューから外す制御を追加 | `npm run build` |
| 2026-04-13 | codex | german app ui | `/apps/german` で `語形` ラベルだけを消したまま、品詞・性・複数形の小さな変化情報チップを答え表示後に戻した | `npm run build` |
| 2026-04-13 | codex | german app ui | `/apps/german` の名詞カードを `der Nachbar` 型で表示し、冠詞を `der=青`, `die=赤`, `das=黄` で色分け。答え下の重複ドイツ語表示と `語形` ブロックを削除 | `npm run build` |
| 2026-04-13 | codex | german app data | ドイツ語 seed 1593 語に日本語訳 draft を全件補完し、名詞 843 語中 842 語に冠詞・性、790 語に複数形を反映。訳は `machine_translated` として後から校正できるようにした | `node scripts/import-german-noun-articles.mjs /tmp/german-nouns.csv`, `node scripts/import-german-meanings-google.mjs --apply --refresh`, `node scripts/build-german-vocabulary.mjs`, `npm run build` |
| 2026-04-13 | codex | marketplace foundation | `/apps/roomshare` にルームシェアMVPを追加し、Supabase schema に `listings` / `room_details` / `applications` / `message_threads` / `messages` / `reviews` / `identity_verifications` / `admin_actions` / `payment_intents` などの共通マーケットプレイス基盤と `/apps/carshare`, `/apps/matching` の準備面を追加 | `npm test`, `npm run build` |
| 2026-04-13 | codex | german app | `ドイツ単語帳抜き出しフォルダ/ドイツ単語_app_seed.json` から 1593 語の `lib/german-vocabulary.js` を生成し、`/apps/german` に英語 app 型の自動読み上げ・正誤判定・SRS・見直し/長期記憶リスト・Supabase `german_progress` 同期を追加 | `node scripts/build-german-vocabulary.mjs`, `npm run build` |
| 2026-04-12 | codex | branding | Safari が `/favicon.ico` を優先しても新ロゴになるよう `app/favicon.ico` を追加し、metadata の icon 指定も ico + png の両方に更新 | `npm run build` |
| 2026-04-12 | codex | branding | Safari / browser tab icon 用に `app/icon.png` と `app/apple-icon.png` を生成し、古い `app/icon.svg` を外して metadata icon をPNGに固定 | `npm run build` |
| 2026-04-12 | codex | research progress ui | 研究進捗カードに内側余白を戻し、丸い枠やテーブル内ステータスチップの文字が左端で見切れないよう修正 | `npm run build` |
| 2026-04-12 | codex | workflow | 実装・修正依頼は原則 `build -> commit -> push` まで一連で進める運用ルールを `AGENTS.md`, `CLAUDE.md`, `CONTEXT.md`, `DECISIONS.md` に明文化 | `npm run build` |
| 2026-04-12 | codex | research progress ui | 研究室パイプラインとメンバー別現在地の小型ラベル見切れを修正し、プロジェクト名 placeholder を卒論向けに変更 | `npm run build` |
| 2026-04-12 | codex | agent harness | `reasoning-effort-router` skill と `harness:classify` を追加し、作業リスクに応じた推論深度・探索量・検証量の切替を標準化 | `npm run harness:classify -- "ロゴを差し替えて"`, `npm run harness:classify -- "Supabase RLS を変更して"` |
| 2026-04-12 | codex | branding | header / favicon 用ロゴを透過背景版に差し替え、ヘッダー側の白い台座を削除 | `npm run build` |
| 2026-04-12 | codex | branding | header / favicon 用ロゴを `public/brand/commune-logo.png` に差し替え | `npm run build` |
| 2026-04-11 | codex | agent harness | `agents/`, `prompts/`, `scripts/harness/`, `logs/` を追加し、`npm run preflight` を AI 協調用ハーネス入口へ整理 | `npm run preflight`, `npm run build` |
| 2026-04-11 | codex | english app / supabase | `/apps/english` に自動読み上げON/OFF・停止、復習間隔カスタム、復習予定日前の再出題抑制、Supabase `english_progress` 同期を追加 | `npm run build` |
| 2026-04-11 | codex | english app | `/apps/english` に出題表示時間・答え表示時間のユーザー設定を追加し、英語表示後に自動で日本語答えへ切り替わるよう変更 | `npm run build` |
| 2026-04-11 | codex | english app | `/apps/english` を語族単位の出題に変更し、自動読み上げ、左右判定、user/guest別localStorage保存、3列見直しリスト、品詞フィルタ整理を追加 | `npm run build` |
| 2026-04-11 | codex | english app | `/apps/english` に `長期記憶リスト` を追加し、初回正解語と5ステージ完了語を通常出題キューから除外して残り単語数が減るよう変更 | `npm run build` |
| 2026-04-11 | codex | english app | `/apps/english` に `当日 -> 3日後 -> 7日後 -> 14日後 -> 30日後` の固定SRS、間違い時ステージ維持、復習優先シャッフルキュー、品詞フィルタ、派生語チップのシャッフル表示を追加 | `npm run build` |
| 2026-04-11 | codex | english app | `/apps/english` の `n / 3441` 表示を累積学習済み数ではなく、現在セッションで進んだカード番号に変更 | `npm run build` |
| 2026-04-11 | codex | english app | `/apps/english` の上部カウントを並び順 index ではなく学習済み単語数に変更し、説明文・`DECK`・`切替 view` などの不要テキストを削除 | `npm run build` |
| 2026-04-11 | codex | english app | `/apps/english` の単語カードに同一 `family` の派生語チップを追加し、現データの `family` 畳み込み数が 2686 グループであることを文書化 | `awk` 集計, `npm run build` |
| 2026-04-11 | codex | english app | `英単語/target1900_normalized.tsv` から 3441 語の `lib/english-target1900.js` を生成する script を追加し、`/apps/english` が大語彙データを優先して読むようにした。進捗保存も全件保存から学習済み差分保存へ軽量化 | `node scripts/build-english-vocabulary.mjs`, `npm run build` |
| 2026-04-11 | codex | english app | `/apps/english` の学習フローを `英単語表示 -> 次へ -> 1対1の日本語答え表示 -> ○×判定 -> 次単語` へ組み替え、例文表示ではなく答え表示中心のカードに変更 | `npm run build` |
| 2026-04-11 | codex | english app | `/apps/english` の右側に再度出ていた重複 `見直しリスト` を削除し、見直し対象の一覧は `見直しリスト` タブ本体だけに集約 | `npm run build` |
| 2026-04-11 | codex | english app | `/apps/english` の右側 `見直しリスト` を戻しつつ、切替先の `見直しリスト` 本体は 2 列寄りの密な羅列レイアウトにして大量語でも縦に伸びすぎないよう調整 | `npm run build` |
| 2026-04-11 | codex | english app | `/apps/english` の右側に重複していた `見直しリスト` カードを削除し、上部切替を 1 行の羅列ナビへ圧縮して空間効率を上げた | `npm run build` |
| 2026-04-11 | codex | english app | `/apps/english` の上部切替を `単語` と `見直しリスト` に絞り、`日本語` / `シャドー` を主導線から外して古い保存状態でも hidden モードに戻らないよう調整 | `npm run build` |
| 2026-04-11 | codex | english app | `/apps/english` の記録面を正解表示なしの `間違えた単語一覧` 専用に絞り、件数増加時はコンパクトな行表示と折りたたみで見やすさを保つ形へ調整 | `npm run build` |
| 2026-04-11 | codex | english app | `/apps/english` の正誤ログを日時つきで内部保存したまま、UI では日時非表示の `間違えた単語一覧` を見せる形に切り替え、復習を `学習直後 -> 1日 -> 3日 -> 8日 -> 30日` の固定 5 段階へ変更 | `npm run build` |
| 2026-04-11 | codex | english app | `/apps/english` の UI を単語カード主役のノート風レイアウトへ整理し、上部説明帯を削って右レール中心のミニマル構成にした | `npm run build` |
| 2026-04-11 | codex | english app | `/apps/english` の主導線を単語暗記カードへ寄せ、○×判定で例文を開き、再押下で次単語へ進む UI と正誤履歴一覧を追加 | `npm run build` |
| 2026-04-11 | codex | english app | `/apps/english` に `English Chunks Lab` を追加し、チャンク中心・高制約文脈・シャドーイング・多文脈レビュー・軽量 SRS を持つ client-side MVP を実装 | `npm run build` |
| 2026-04-10 | codex | games | `賽の河原` の配置操作をドラッグ主体に変え、石が 1 個でも台から落ちたら即終了するルールへ調整 | `node --check public/games/sainokawara/script.js`, `npm run build` |
| 2026-04-10 | codex | games | `賽の河原` の static asset 参照を相対パスから `/games/sainokawara/...` の絶対パスへ切り替え、trailing slash の有無で CSS/JS が落ちる不具合を修正 | `npm run build` |
| 2026-04-10 | codex | games | `賽の河原` の Matter.js 読み込みを CDN から `public/games/sainokawara/vendor/matter.min.js` のローカル同梱へ切り替え、開始ボタンが外部 script 失敗で止まらないようにした | `node --check public/games/sainokawara/script.js`, `npm run build` |
| 2026-04-10 | codex | games | `賽の河原` の石形状を増やし、game over 判定を緩和しつつ、月夜と霧の背景・危険度メーター・高さ連動の微風・危険成功時の倍率を追加した | `node --check public/games/sainokawara/script.js`, `npm run build` |
| 2026-04-10 | codex | games | `/games/sainokawara/` に standalone な静的ゲーム `賽の河原` を追加し、`/apps/games` から埋め込み・単独起動できるようにした | `node --check public/games/sainokawara/script.js`, `npm run build` |
| 2026-04-09 | codex | physics app | `/apps/physics` を `Sandbox / Guided Lab / Math Link / Theory Map` 中心の Physics Playground に再構成し、放物運動・衝突・単振動・理想気体・波の反射 / 屈折・ローレンツ変換・1D量子井戸の 7 scene を共通 runner に実装 | `npm run build` |
| 2026-04-09 | codex | physics app | `/apps/physics` を `Emergence Lab` 方向へ拡張し、剛体・流体・電磁波・不可逆性・相転移・ローレンツ変換・前期量子論・1D量子・量子調和振動子・カオスの 10 scene を共通 runner 上に実装 | `npm run build` |
| 2026-04-09 | codex | physics app | `/apps/physics` を overlay 中心の Physics Playground へ組み替え、`Playground / Law View / World Shift` と `Motion / Collision / Rotation / Gas / Relativity / Quantum` の章構成に刷新 | `npm run build` |
| 2026-04-09 | codex | physics app | `/apps/physics` に `Physics Playground` を追加し、放物運動・バネ振動・電場・幾何光学の MVP と Sandbox / Guided Lab / Theory Map を実装 | `npm run build` |
| 2026-04-09 | codex | apps copy | `/apps/math` とアプリ一覧での名称を `数学コミュニティ` から `数学コンテンツ` に変更 | `npm run build` |
| 2026-04-09 | codex | research progress ui | 研究室パイプラインの各 project に全体進捗シークバーを追加し、段階ラベルと全体％を同時に見えるようにした | `npm run build` |
| 2026-04-09 | codex | research progress | `/apps/research-progress` を研究ライン中心の研究室ポートフォリオに拡張し、`research_projects` / `research_project_members` / project 管理 API・UI を追加 | `npm run build` |
| 2026-04-09 | codex | research progress | 招待制の研究進捗 app `/apps/research-progress` を追加し、group / membership / weekly update / owner review 用 API・UI・Supabase schema を実装 | `npm run build` |
| 2026-04-09 | codex | apps | `/apps` に公開アプリ一覧の下で内部・招待制ツールを示す `非公開アプリ一覧` セクションを追加 | `npm run build` |
| 2026-04-08 | codex | branding | ブランド名を `FieldCard Social` から `New Commune` に変更し、header mark・tagline・metadata・README / legal copy を同期 | `npm run build` |
| 2026-04-08 | codex | skills | `frontend-structure-optimizer` を明示呼び出し中心に調整し、repo 正本から `~/.codex/skills` へ同期する `scripts/sync-skill-to-codex.sh` を追加 | `sh scripts/sync-skill-to-codex.sh frontend-structure-optimizer`, `ruby YAML parse`, `npm run build` |
| 2026-04-08 | codex | skills | `skills/frontend-structure-optimizer` の初版 draft を追加し、project-local skill 用の構造を `CONTEXT.md` / `DECISIONS.md` に反映 | `ruby YAML parse`, `npm run build` |
| 2026-04-08 | codex | apps copy | `/apps` のタイトル系とホームの `Apps` 見出しを `アプリ一覧` に統一 | `npm run build` |
| 2026-04-04 | codex | coordination | `CONTEXT.md`, `CLAUDE.md`, `AGENTS.md`, `DECISIONS.md`, `CURRENT_TASK.md`, `HANDOFF.md`, `CHECKLIST.md`, `supabase/README.md` を追加 | `npm run build` |
