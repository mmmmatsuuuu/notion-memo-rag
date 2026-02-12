# Supabase Vector Rules

## Embedding仕様

- モデル: text-embedding-3-small
- 次元数: 1536（固定）

## テーブル設計（memos）

必須カラム：

- id（text, PK）= Notion page id
- memo_url
- book_id
- book_title
- book_url
- tags
- note
- content_text
- content_hash
- embedding（vector(1536)）
- created_time
- last_edited_time

## 検索

- match_memos RPC関数を使用
- デフォルト topK=6
- HNSWインデックスを使用（MVP）
