# Contributing

## 言語ポリシー
- Issue/PR/レビューコメントは日本語を基本とする。
- PRタイトル・PR本文は日本語で記載する。
- コミットメッセージは日本語で記載する（推奨: Conventional Commits）。

## ブランチ運用
1. `main` から作業ブランチを作成する。
2. ブランチ名は `feature/<topic>` `fix/<topic>` `chore/<topic>` を推奨する。
3. `main` へ直接 push しない。必ずPR経由でマージする。

## 実装方針
- AGENTS.md のMVP方針を最優先する。
- 変更は最小差分で行う。
- 設計変更時は `README.md` と `references/architecture.md` を更新する。

## PR前チェック
1. `docker compose up --build` で起動確認
2. `npm run lint`
3. `npm run typecheck`
4. PRテンプレートに沿って記載

## レビュー基準
- 目的が明確であること
- セキュリティ要件（認証/秘密情報/ログ方針）を満たすこと
- 影響範囲と検証手順が明記されていること
