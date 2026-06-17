# Search History DB-backed Plan

## 結論

#55 は stale として扱います。stale は「古い main を基準に作られていて、latest main とそのまま合わせると衝突や前提ずれが出やすい状態」です。

latest main commit `db0c60b6f0ae3c80bdac9b1dcced2e56794784be` から #55R を作り直し、検索履歴を DB-backed（DBに保存・取得する方式）として再設計・再検証します。

## #55 の扱い

- #55 の既存差分は参考資料として見る。
- そのまま rebase / merge する前提にしない。
- #55R は latest main から新しい branch として作る。
- UI復旧済みの main 状態を壊さないことを優先する。

## 必須方針

| 項目 | 方針 |
|---|---|
| DB write smoke | なし。DBに最低限書き込んで確認する smoke test は未実施扱い |
| migration | なし。DB構造を変える migration は追加しない前提で確認 |
| public response userId | public API response に `userId` を出さない |
| own-user isolation | 自分の検索履歴だけ取得・保存できることを必須条件にする |

## #55R で確認すること

1. `GET /api/search-histories` はログイン中ユーザーの履歴だけ返す。
2. `POST /api/search-histories` はログイン中ユーザーに紐づけて保存する。
3. response には内部識別子としての `userId` を出さない。
4. 他ユーザーの履歴を query や body で指定できない。
5. UI は保存・適用・空状態・エラー状態を区別して表示する。
6. 既存の sample-only SearchHistory 表示と混ざらないようにする。

## テスト方針

- まず unit / script test で own-user isolation を確認する。
- DB write smoke は承認があるまで行わない。
- Browser QA は通常ログインのみで行う。cookie、token、auth proxy は使わない。
- public response の JSON に `userId` が含まれないことを確認する。

## 未実施操作

- DB write は行っていない。
- migration は作っていない。
- schema は触っていない。
- #55 の close / merge / Ready for review は行っていない。
