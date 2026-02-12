# Debug Playbook

## よくある問題

- 401/403 → 認証またはallowlistミス
- 429 Notion → レート制限（待機を入れる）
- Vercel timeout → 同期件数を減らす
- 検索が空 → embedding or RPC確認

## ログ方針

- request id
- 件数
- 失敗したmemo idのみ
