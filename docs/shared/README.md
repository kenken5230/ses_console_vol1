# Shared Docs

複数テーマで共通利用する方針を置く場所です。

GPTへ渡す場合は、対象テーマのフォルダに加えて、本当に必要なshared docsだけを追加します。

## フォルダ

| フォルダ | 内容 |
|---|---|
| `quality/` | 2周テスト、Owner確認、read-only/dry-run、安全確認方針 |
| `operations/` | 複数チャット作業時の進捗共有、衝突回避、引き継ぎ運用 |

## 主要ドキュメント

- `../../PROGRESS.md`
  - 複数チャットで同じrepoを扱うための進捗ボード。各チャットは作業開始時に確認する。
- `quality/two-pass-task-test-policy-v0.1.md`
  - 実装・設計・運用タスクの2周テスト方針。
- `operations/chat-progress-coordination-v0.1.md`
  - 作業開始時、作業中、終了時の進捗連携ルール。
