# API Routes Rules

## /api/assist

入力:
- query: string

処理:
1. 認証確認 + allowlist確認
2. embedding生成
3. match_memos呼び出し（`fetch_k=20`）
4. 上位`answer_k=8`で生成
5. 生成文 + 根拠カード返却

返却:
- response
- evidence_cards[]
- used_memo_ids[]

---

## /api/sync

入力:
- limit: 50 or all

処理:
1. 認証確認 + allowlist確認
2. Notionメモ取得（created_time desc）
3. 各メモ:
   - flatten
   - content_hash確認
   - embedding生成
   - upsert
4. 件数を返す
