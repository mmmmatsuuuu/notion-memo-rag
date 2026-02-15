# 開発フロー

## 目的
本ドキュメントは、Notion Memo RAG を MVP 方針で実装するための標準手順を定義する。

## 実装ロードマップ（MVP）
1. 環境構築
2. UI作成
3. ベクトルDB更新機能の実装（`/api/sync`）
4. 検索 + 生成機能の実装（`/api/assist`）

## 1. 環境構築
1. Docker で Next.js の起動確認を行う。  
   例: `docker compose up --build`
2. Supabase プロジェクトを作成し、`pgvector` と `memos` テーブル/RPC（`match_memos`）を準備する。
3. Notion API と OpenAI API のシークレットキーを取得する。
4. `.env` を設定し、ローカルで API と Supabase の接続を確認する。
5. Vercel へデプロイし、環境変数と OAuth 設定を反映する。

## 2. UI作成
1. `/` に検索UIを作成する（ログイン後のみ表示）。
   - 画面下部固定ツールバーに単一入力 `query` 用 textarea
   - 同ツールバーに実行ボタン（`fetch_k=20`, `answer_k=8`）
   - 同ツールバーに `/admin` 導線ボタン
   - 生成文エリア（問いの整理・示唆）
   - 根拠カード（書誌情報、400文字プレビュー、関連理由、一次資料導線）
   - 一次資料導線は各根拠カード内に表示
2. `/admin` の最小画面を作成する。
   - `Sync latest 50`
   - `Sync all`
   - 同期結果（件数、失敗ID）

## 3. ベクトルDB更新機能（`/api/sync`）
1. 認証確認と `ALLOWED_EMAIL` の検証を実装する。
2. Notion ページを取得し、ブロックを再帰展開して flatten する。
3. embedding を生成する。
4. Supabase `memos` へ upsert する（1メモ=1ベクトル）。
5. `limit=50/all` の手動同期として完結させる。

## 4. 検索 + 生成機能（`/api/assist`）
1. 認証確認と `ALLOWED_EMAIL` の検証を実装する。
2. 入力 `query` から embedding を生成する。
3. `match_memos` を実行し、`fetch_k=20` を取得する。
4. 上位 `answer_k=8` をコンテキストに生成文を作る。
5. `response` / `evidence_cards[]` / `used_memo_ids[]` を返却し、一次資料導線（Scholar クエリ）を提示する。

## 実装順の補足
- UI と API は並行可能だが、手戻りを減らすために「API最小実装 -> UI接続」を推奨する。
- セキュリティ要件（秘密情報の非公開、認証、allowlist、ログ方針）は初期段階で入れる。

## 日次開発フロー
1. `main` を最新化する。  
   例: `git checkout main && git pull --ff-only`
2. 作業ブランチを切る。  
   例: `git checkout -b feature/<topic>`
3. 小さな差分で実装する（MVP優先）。
4. ローカル確認を行う。
   - `docker compose up --build`
   - `npm run lint`
   - `npm run typecheck`
5. コミットする。
6. ブランチを push し、日本語で PR を作成する。
7. レビュー対応後、`main` へマージする。
