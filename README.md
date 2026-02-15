# Notion Memo RAG

Notionに蓄積した読書メモを「意味」で検索し、
一次資料へ辿り着くための個人用RAGシステムです。

これはチャットボットではありません。
思考の起爆装置です。

---

## 🎯 目的

授業準備やアイデア出しの最中に、

「このテーマについて、どこかの本で面白いことを読んだ気がする」

という状況を素早く解決すること。

本アプリは：

1. ログイン後、`/` 画面で文脈を入力（長文可）
2. 画面下部固定ツールバーから検索実行（topK=6）
3. 関連するNotionメモ断片をカード表示
4. 各カード内で研究検索用クエリ候補を表示
5. Google Scholar等で一次資料へ移動

という流れを提供します。

思考するのは自分。
このアプリは記憶を引き出す補助輪です。

---

## 🏗 技術構成

- Next.js（App Router / TypeScript）
- Supabase（Postgres + pgvector）
- Supabase Auth（Google OAuth）
- OpenAI Embeddings（text-embedding-3-small）
- Notion API（メモDB + ブロック取得）
- Vercel（ホスティング）

---

## 🔄 コアアルゴリズム

### インデックス（同期時）

1. Notion Data Sourceから `id` と `last_edited_time` を取得（`limit=50` または `all`）
2. Supabaseの `id` と `last_edited_time` を候補IDのみ取得
3. 差分（未登録または更新済み）だけを同期対象に抽出
4. 対象ページ本文（ブロック）を再帰取得し、テキスト整形
5. embedding生成
6. Supabaseへupsert

※ 1メモ = 1ベクトル（MVPでは分割しない）

---

### 検索

1. ユーザーの文脈入力をembedding
2. ベクトル近傍検索（topK=6）
3. メモカード表示（先頭400文字）

---

## 🔎 一次資料への導線

各メモカード内で：

- 研究検索用クエリを複数生成
- Google Scholar検索リンクを提示
- Notion原文へのリンクを表示

Webスクレイピングは行いません。
原典にあたるのは自分自身です。

---

## 🔐 セキュリティ

- 個人専用（許可メールのみ）
- 秘密鍵はサーバー側のみ
- クライアントにAPIキーは渡さない

---

## 🚀 開発

### 必要な環境変数

OPENAI_API_KEY=
NOTION_TOKEN=
NOTION_MEMO_DB_ID=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ALLOWED_EMAIL_OFFICE=
ALLOWED_EMAIL_PRIVATE=


---

## 🧠 MVPの非目標

- メモの分割（chunking）
- タグによるフィルタリング
- 自動バックグラウンド同期
- Web検索結果の自動取得

---

## 📌 設計思想

このアプリは答えを生成するためのものではありません。

自分の知識の断片を引き出し、
一次資料へ辿り着くための補助装置です。

思考は自分の仕事。
