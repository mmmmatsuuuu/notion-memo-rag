# UI Rules

## /（ログイン後の検索画面）

- 検索UIは `/` に統合する（`/search` ページは作らない）
- 単一入力 `query` 用 textareaを画面下部固定ツールバーに配置
- 実行ボタンをツールバーに配置（`fetch_k=20`, `answer_k=8`）
- `/admin` への導線ボタンをツールバーに配置
- 生成文 + 根拠カード表示

カード内容：
- book_titleリンク
- memo_url
- tags（表示のみ）
- note（ページ数）
- 先頭400文字プレビュー
- relevance_reason（このカードを根拠に使った理由）
- 一次資料クエリ候補（カード内）
- Scholarリンク（カード内）

---

## /admin

- Sync latest 50
- Sync all
- 同期結果表示（件数 + エラーID）
