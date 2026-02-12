# Notion Flatten Rules

## 前提

- メモ本文はページブロックにある
- プロパティではない

## 処理方法

- 子ブロックを再帰取得
- 以下をテキスト化：
  - paragraph
  - heading_1/2/3
  - bulleted_list_item
  - numbered_list_item
  - quote
  - callout
  - code
- 改行で連結する

## 無視するもの

- 画像本体（captionがあれば取得）
- embed本体（URLのみ取得可）

## 補助処理

- 20文字未満なら book_title や note を追加
- 極端に長い場合は文字数で切る（MVP）
