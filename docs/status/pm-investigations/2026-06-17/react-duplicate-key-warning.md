# React Duplicate Key Warning

React の duplicate key warning は、同じ一覧の中で `key` が重複したときに出ます。`key` は React が行やチップを見分けるための識別子です。重複すると、表示更新時に別の行・別のチップとして扱われる可能性があります。

## 優先度

| Priority | Area | 確認内容 |
|---|---|---|
| P0 | ProjectTable locations | 勤務地・場所の配列を表示する箇所で、同じ文字列を `key` にしていないか確認する |
| P0 | DetailPane tags | 詳細ペインのタグ表示で、同じタグ名が複数回出ても重複しない key にする |
| P1 | table row key | 行の key が `name` や表示文言だけになっていないか確認する。DB id や安定した id を優先する |
| P1 | SearchHistory chips | 検索条件 chip は同じ文言が並ぶことがあるため、履歴id + chip位置などで区別する |
| P2 | market labels / reasons | 市場分析の labels / reasons は同じ理由文が並ぶ可能性がある。表示順や分類と組み合わせる |

## 見る順番

1. Console warning の発生画面と stack を控える。
2. 同じ一覧内で `key={label}` や `key={tag}` になっている箇所を探す。
3. DB id、内部 id、または親id + index のように、同じ一覧内で重複しない値へ変える。
4. 表示文言そのものを key にしない。表示文言は重複や変更が起きやすい。
5. Browser QA で warning が消えたことを確認する。

## 今回の扱い

この docs-only PR ではコード修正しません。上記の優先度だけを残し、実装修正は別PRで行います。
