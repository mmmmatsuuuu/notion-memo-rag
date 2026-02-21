# Notion Memo RAG

Notionに蓄積した読書メモを「意味」で検索し、
根拠付きのサジェストを得ながら一次資料へ辿り着くための
個人用RAGシステムです。

これはチャットボットではありません。
思考の起爆装置です。

---

## 🎯 目的

授業準備やアイデア出しの最中に、

「このテーマについて、どこかの本で面白いことを読んだ気がする」

という状況を素早く解決すること。

本アプリは：

1. ログイン後、`/` 画面で `query` を入力（長文可）
2. 検索で関連メモを広めに取得（`fetch_k=20`）
3. 上位メモを使って思考補助の生成文を作成（`answer_k=8`）
4. 根拠メモカードを提示（理由つき）
5. 各カード内のScholarリンクから一次資料へ移動

という流れを提供します。

思考するのは自分。
このアプリは記憶を引き出す補助輪です。

---

## 🏗 技術構成

- Next.js（App Router / TypeScript）
- Supabase（Postgres + pgvector）
- Supabase Auth（Google OAuth）
- OpenAI Embeddings（text-embedding-3-small）
- OpenAI Chat Completions（gpt-5-mini, 生成文）
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

### 検索 + 生成（`/api/assist`）

1. ユーザー入力 `query` をembedding
2. ベクトル近傍検索（`fetch_k=20`）
3. 上位`answer_k=8`件を生成コンテキストに採用
4. 生成文は問いに対する自然言語回答を作成（根拠カード参照付き）
5. 根拠カードを表示（カードは先頭400文字プレビュー）

API返却の最小形：
- `response`（整理された生成文）
- `evidence_cards[]`（根拠カード）
- `used_memo_ids[]`（生成に使ったメモID）

---

## 🔎 一次資料への導線

各メモカード内で：

- 研究検索用クエリを3〜6件生成（単語組み合わせ）
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
OPENAI_ASSIST_MODEL=gpt-5-mini
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
- 自律的な長時間チャット機能

---

## 📌 設計思想

このアプリは、正解を断定するためのものではありません。

自分の知識の断片を引き出し、根拠付きで整理し、
一次資料へ辿り着くための補助装置です。

思考は自分の仕事。
