# API Routes Rules

## /api/search

入力:
- contextText: string
- topK?: number

処理:
1. 認証確認 + allowlist確認
2. embedding生成
3. match_memos呼び出し
4. 結果返却

---

## /api/sync

入力:
- limit: 50 or 200

処理:
1. 認証確認 + allowlist確認
2. Notionメモ取得（created_time desc）
3. 各メモ:
   - flatten
   - content_hash確認
   - embedding生成
   - upsert
4. 件数を返す
