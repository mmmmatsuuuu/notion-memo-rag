# Security Rules（セキュリティ規則）

## 秘密情報の扱い

以下は絶対にクライアントへ渡さない：

- NOTION_TOKEN
- OPENAI_API_KEY
- SUPABASE_SERVICE_ROLE_KEY

これらはサーバー側コードのみで使用する。

## 認証

- 本アプリは個人専用
- ALLOWED_EMAIL と一致しないユーザーは拒否する
- すべてのAPI Routeで認証確認を行う

## ログ出力

- APIキーやトークンはログに出さない
- Notion本文の全文はログに出さない
- ログはIDと件数のみ
