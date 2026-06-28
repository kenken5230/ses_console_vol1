# AI作業ルール更新 引き継ぎメモ 2026-06-22 Ready/merge/close補強

## 目的

既存ルールの「軽微なmerge/Ready化/closeはユーザー確認なしで進めてよい」という表現が、将来のAIにより承認省略として誤読される可能性を補強した。

Ready化、merge、closeは軽微に見えてもPR状態を変更する重要操作として扱い、内部ゲートを必須化した。

## 体制

- 親PM: 方針統合、最終反映、確認
- 監査サブ: 補強の必要性、安全条件、ユーザー承認代替にならない条件を確認
- 監視サブ(PMO): 記録項目、判断割れ、NG/保留時の停止条件を確認
- テクニカルリード: PR状態、branch、CI、削除差分、DB/schema/env/package/lockfile、main/prod/staging影響の確認項目を整理
- 実行者: 長文版と短縮版の文面案を作成

## 変更ファイル

- `AI_WORK_RULES.md`
- `AI_WORK_RULES_SHORT.md`

## 主な変更

- `Ready化 / merge / close 補強ルール` を長文版の内部承認条件直後に追加
- 短縮版へ同方針を要約して追加
- Ready化、merge、closeは軽微に見えてもPR状態変更として重要操作扱い
- 親PM単独実行を禁止
- 親PM、監査サブ、監視サブ(PMO)、テクニカルリードの内部OKを必須化
- NG、保留、未確認、不在が1つでもあれば実行不可
- 多数決で進めないことを明記
- main merge、production/staging/shared影響、DB write、migration/schema変更、deploy、外部公開、削除差分、package/lockfile変更、env/config変更は別ゲート扱い

## 監査結果

- 4役すべてPASS
- 追加は必要
- 「軽微」表現を残す場合でも、内部ゲート必須と明記すれば実運用上の抜け道を防げる
- 内部OKはユーザー承認必須事項の代替にならない

## 残リスク

- 実運用で「軽微」の範囲が広がりすぎないか継続監視が必要
- merge後に自動deployされるrepoでは、mergeをdeployゲートとして扱う必要がある

## 次に見るべきこと

- Ready/merge/close前にPR状態、branch、CI、削除差分、DB/schema/env/package/lockfile変更、未実行検証、rollback/revert方針が記録されているか
- 判断割れ時に多数決で進めていないか
- main/prod/staging/shared影響が別ゲート扱いになっているか
