# SES Console Docs

このフォルダは、SES Consoleの要件・設計・運用メモ・検証結果を用途別に整理する入口です。

現在の進捗や残タスクは、まず [../PROGRESS.md](../PROGRESS.md) と [status/README.md](./status/README.md) を確認してください。

## Main Entry Points

| 用途 | 場所 | 内容 |
|---|---|---|
| 現在の進捗 | [../PROGRESS.md](../PROGRESS.md) | 最新の基準commit、重要な未完了事項、次の作業候補 |
| 進捗・安全ゲート | [status/README.md](./status/README.md) | 日付別ログ、復旧記録、DB/write/cleanupなどの承認ゲート |
| テーマ別docs | [themes/README.md](./themes/README.md) | SES console、Gmail、Matching、Source tracking、Market analysis |
| 共通ルール | [shared/README.md](./shared/README.md) | 品質方針、複数チャット連携、read-only/dry-run方針 |
| Gmail関連 | [gmail/](./gmail/) | Gmail取込、分類、抽出、分析に関する設計・実装メモ |
| 公開準備 | [release/](./release/) | 社内外公開前チェック、公開準備、ユーザー確認タスク |

## Important Documents

| ファイル | 用途 |
|---|---|
| [../AGENTS.md](../AGENTS.md) | Codex / AI エージェントが最初に読む安全ルール |
| [../AI_WORK_RULES_SHORT.md](../AI_WORK_RULES_SHORT.md) | AI作業ルールの短縮版 |
| [../AI_WORK_RULES.md](../AI_WORK_RULES.md) | AI作業ルールの詳細版 |
| [shared/quality/two-pass-task-test-policy-v0.1.md](./shared/quality/two-pass-task-test-policy-v0.1.md) | 実装・設計・運用タスクの2周テスト方針 |
| [shared/operations/chat-progress-coordination-v0.1.md](./shared/operations/chat-progress-coordination-v0.1.md) | 複数チャット/サブエージェント作業時の進捗連携ルール |
| [status/current-feature-status-2026-06-15.md](./status/current-feature-status-2026-06-15.md) | 機能ごとの実装済み・設計のみ・未実装・要テストの整理 |
| [status/recovery-main-alignment-report-2026-06-15.md](./status/recovery-main-alignment-report-2026-06-15.md) | `origin/main` clean worktreeによる復旧・検証レポート |

## Folder Map

| パス | 内容 |
|---|---|
| `docs/status/` | 現在の状態、進捗ログ、復旧記録、未完了課題、承認ゲート |
| `docs/themes/` | テーマ別の要件、設計、BK、テスト方針 |
| `docs/shared/` | 横断運用ルール、品質方針、テスト方針 |
| `docs/gmail/` | Gmail取込、分類、抽出、会社/要員補完に関するメモ |
| `docs/release/` | 公開前チェック、公開準備、レビュータスク |
| `docs/pmo/` | 親PM/PMO向けの承認パケット、運用引き継ぎ、判断材料 |

## Safety Notes

- 秘密情報、DB接続URL、cookie、token、password、raw personal dataはdocsに保存しません。
- DB write、migration、production/staging/shared操作、deploy、Ready/merge/close、worktree削除は、該当ゲートと承認ルールに従います。
- open PR状態は変わりやすいため、長期docsには詳細表を複製せず、GitHubのlive viewや日付付きPMOメモへ誘導します。
