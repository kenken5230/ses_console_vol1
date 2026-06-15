# Status Docs

このフォルダは、現在の実装状態、復旧レポート、再テスト結果、次のSprint Backlogを見る入口です。

## Files

| File | Purpose |
|---|---|
| `current-feature-status-2026-06-15.md` | 機能ごとの実装済み/設計のみ/未実装/要再テストの現状表 |
| `dependency-security-audit-2026-06-15.md` | npm audit結果、依存更新タスク、検証結果 |
| `search-history-db-backed-2026-06-15.md` | SearchHistory DB-backed API/UI 実装タスクと検証結果 |
| `recovery-main-alignment-report-2026-06-15.md` | clean worktree復旧、未実装UI撤去、検証結果、残課題 |

## Rules

- DB write、migration、実データ更新、worktree削除はここに手順とrollback方針を書いてから実行する。
- UIに出す機能は、実装・認可・テストが揃っているかをこのstatus docsで確認する。
- 設計のみの機能は、画面に出す前に `implemented` へ更新し、task test と group test を残す。
