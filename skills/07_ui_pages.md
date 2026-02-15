# UI Rules

## /（ログイン後の検索画面）

- 検索UIは `/` に統合する（`/search` ページは作らない）
- 長文入力textareaを画面下部固定ツールバーに配置
- Searchボタンをツールバーに配置（topK=6）
- `/admin` への導線ボタンをツールバーに配置
- topK=6カード表示

カード内容：
- book_titleリンク
- memo_url
- tags（表示のみ）
- note（ページ数）
- 先頭400文字プレビュー
- 一次資料クエリ候補（カード内）
- Scholarリンク（カード内）

---

## /admin

- Sync latest 50
- Sync all
- 同期結果表示（件数 + エラーID）
