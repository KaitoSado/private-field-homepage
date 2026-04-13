# CURRENT TASK

このファイルは「今やっていること」だけを書く。

## 現在の優先

1. ルームシェアMVP / マーケットプレイス基盤の schema live 適用判断と、既存ドイツ語差分を混ぜない commit / push 判断
2. ドイツ単語 seed を `/apps/german` の学習アプリとして整え、英語 app と同じ記録・復習導線を追加する
3. 2つのAIで安全に開発できる共通運用を整える
4. `CONTEXT.md` を単一ソースにする
5. 変更履歴・引き継ぎ・設計判断の置き場を固定する

## 現在の注意点

- `app/globals.css` は巨大なので、同時編集衝突が起きやすい
- schema 変更は live 適用漏れが起きやすい
- Apps 系は拡張頻度が高いので、担当範囲を分けること

## 次にやる候補

- CSS の機能単位分割
- `docs/` の詳細文書化
- CHANGELOG 運用の定着
- `supabase/schema.sql` の marketplace 追加分を live Supabase に再適用
- ルームシェアMVPの実データで登録 -> 掲載 -> 問い合わせ -> チャット -> 管理を通し確認
