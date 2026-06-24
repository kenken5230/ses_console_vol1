# Shared Docs

複数テーマで共通利用する品質方針・運用ルール・進捗連携ルールを置く場所です。

テーマ固有の要件や設計は [../themes/README.md](../themes/README.md) から確認し、本当に横断で使うものだけをこのフォルダに置きます。

## Folders

| フォルダ | 内容 |
|---|---|
| [quality/](./quality/) | 2周テスト、owner確認を減らす方針、read-only/dry-run、安全確認方針 |
| [operations/](./operations/) | 複数チャット/サブエージェント作業時の進捗共有、衝突回避、引き継ぎ運用 |

## Main Documents

| ファイル | 内容 |
|---|---|
| [../../PROGRESS.md](../../PROGRESS.md) | 現在の基準commit、重要な未完了事項、次の作業候補 |
| [quality/two-pass-task-test-policy-v0.1.md](./quality/two-pass-task-test-policy-v0.1.md) | 実装・設計・運用タスクの2周テスト方針 |
| [operations/chat-progress-coordination-v0.1.md](./operations/chat-progress-coordination-v0.1.md) | 作業開始時、作業中、完了時の進捗連携ルール |

## Safety Notes

- このフォルダにも秘密情報、DB接続URL、cookie、token、password、raw personal dataは置きません。
- DB write、migration、production/staging/shared操作、deploy、Ready/merge/close、worktree削除は、必ず該当ゲートに従います。
- テーマ固有の判断は、shared docsへ広げる前に対象テーマ側へ記録します。
