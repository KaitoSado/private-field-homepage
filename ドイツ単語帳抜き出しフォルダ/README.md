# ドイツ単語データ運用

このフォルダのアプリ用正本は `ドイツ単語_app_seed.json`。
`/apps/german` はこの seed から生成した `lib/german-vocabulary.js` を読む。

## 補完の流れ

1. `ドイツ単語_enrichment.csv` に日本語訳・冠詞・性・複数形を入れる
2. `node scripts/apply-german-vocabulary-enrichment.mjs`
3. 必要なら `node scripts/import-german-noun-articles.mjs /path/to/german-nouns.csv`
4. 必要なら `node scripts/import-german-meanings-google.mjs --apply --refresh`
5. `node scripts/build-german-vocabulary.mjs`
6. `npm run build`

## 入力ルール

- `article` は `der`, `die`, `das`
- `gender` は `masculine`, `feminine`, `neuter`
- `article` と `gender` は片方だけでもよい
- `article` があれば `gender` は自動補完される
- `gender` があれば `article` は自動補完される
- 名詞で `article/gender` がない語は `needs_gender: true` のまま残る
- Google Translate で入れた日本語訳は `machine_translated` として扱い、あとで人間レビューする
- 翻訳候補だけ見たい場合は `node scripts/import-german-meanings-google.mjs --export-only` で `ドイツ単語_meaning_candidates.csv` を更新する

## 冠詞・性・複数形の補完元

- `german-nouns`: https://github.com/gambolputty/german-nouns
- WiktionaryDE 由来の名詞CSVで、ライセンスは CC BY-SA 4.0

## 主なファイル

- `ドイツ単語_enrichment.csv`: 補完入力用
- `ドイツ単語_app_seed.json`: アプリ用 seed
- `ドイツ単語_名詞_性チェック用.csv`: 名詞だけの確認用
- `ドイツ単語_enrichment_report.json`: 補完状況の集計
