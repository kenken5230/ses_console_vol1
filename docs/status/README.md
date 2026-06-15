# Status Docs

このフォルダは、現在の実装状態、復旧レポート、再テスト結果、次のSprint Backlogを見る入口です。

## Files

| File | Purpose |
|---|---|
| `current-feature-status-2026-06-15.md` | 機能ごとの実装済み/設計のみ/未実装/要再テストの現状表 |
| `dependency-security-audit-2026-06-15.md` | npm audit結果、依存更新タスク、検証結果 |
| `recovery-main-alignment-report-2026-06-15.md` | clean worktree復旧、未実装UI撤去、検証結果、残課題 |
| `ui-change-ledger-2026-06-15.md` | #53/#54/#55 の追加/削除/非表示/導線/API/package/rollback台帳 |
| `ui-regression-restore-2026-06-15.md` | ユーザー確認済みbaseline snapshot（PR #49 merge直後commit `71b9a09b`）以降で消えたUI導線の復旧履歴、原因範囲、テスト計画 |
| `ui-restore-plan-2026-06-15.md` | 勝手に消えた/変わったUIをどのPRで戻すか、承認後に非表示/削除するかの計画 |

## Rules

- DB write、migration、実データ更新、worktree削除はここに手順とrollback方針を書いてから実行する。
- UIに出す機能は、実装・認可・テストが揃っているかをこのstatus docsで確認する。
- 既存画面に出ていた導線を消す場合は、過去チャット・docs・追加開発ブランチを確認し、削除理由と代替導線をstatus docsへ残す。
- 設計のみ、no-write placeholder、implementedの区分を画面導線ごとに明記し、task test と group test を残す。
