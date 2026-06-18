# Worktree Cleanup Ledger Plan

worktree は、同じ repository で別 branch を別フォルダとして開くための作業フォルダです。削除すると未保存の調査結果や未push commit を失う可能性があるため、台帳と承認フローを先に作ります。

## 台帳項目

| Field | 内容 |
|---|---|
| worktree path | 対象フォルダ |
| branch | 紐づく branch |
| base commit | 作成元 commit |
| latest commit | worktree の最新 commit |
| PR / issue | 関連する PR や issue |
| owner | 作業担当者 |
| status | active / merged / abandoned / unknown |
| dirty status | 未commit変更があるか |
| untracked files | 未追跡ファイルがあるか |
| unpushed commits | push されていない commit があるか |
| contains generated files | `.next` や `node_modules` など生成物の有無 |
| contains private files | secret、credential、DB dump などの可能性 |
| delete candidate | 削除候補か |
| approval | 承認者と承認日 |
| command plan | 実行予定コマンド。実行前にレビューする |
| rollback / backup | 削除前に必要な退避方針 |
| result | 実施結果 |

## 削除不可条件

- dirty status がある。
- untracked files の中身が未確認。
- unpushed commits がある。
- open PR や未完了タスクに紐づいている。
- owner が不明。
- secret、credential、DB dump、private env などが含まれる可能性がある。
- 参照中の docs、画像、調査ログが残っている。
- 削除コマンドの対象パスが絶対パスで確認できていない。

## 承認フロー

1. worktree 一覧を作る。
2. 各 worktree の branch、PR、dirty、untracked、unpushed を確認する。
3. 削除候補だけを台帳にまとめる。
4. 削除不可条件に該当しないかレビューする。
5. 削除予定コマンドを dry-run 相当で確認する。dry-run は「実際には消さず、対象だけ確認する」こと。
6. ユーザーまたは親PMの明示承認を得る。
7. 承認後にだけ削除する。
8. 削除後、worktree 一覧と repository 状態を再確認する。

## 今回の扱い

- worktree削除は未実施。
- `git reset`、`git clean`、`git checkout --`、`git stash` は行っていない。
- この docs-only PR では台帳計画だけを残す。
