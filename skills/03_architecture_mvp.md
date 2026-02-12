# MVP Architecture（設計原則）

## インデックス（同期）

1. NotionメモDBからページ取得
2. ブロックを再帰的に取得
3. テキストを改行結合
4. content_hashを作成
5. embedding生成
6. Supabaseへupsert

※ 1メモ = 1ベクトル
※ chunkingは行わない

---

## 検索

1. 文脈入力をembedding
2. ベクトル近傍検索（topK=6）
3. メモカード表示（先頭400文字）

---

## 一次資料導線

- クエリ候補を3〜6個生成
- Google Scholarリンクを表示
- Webスクレイピングはしない
