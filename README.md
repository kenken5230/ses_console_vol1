# SES Console

SES営業支援コンソールのアプリ・運用ドキュメント・安全ゲートを管理するリポジトリです。

現在の作業状態はコードより先に [PROGRESS.md](./PROGRESS.md) を確認してください。古い作業ブランチやdirtyなworkspaceが残っているため、新しい作業は必ず最新 `origin/main` からclean worktreeを作って始めます。

## Start Here

| 知りたいこと | 見る場所 | 用途 |
|---|---|---|
| 現在の進捗・残タスク | [PROGRESS.md](./PROGRESS.md) | 最新の基準commit、重要な未完了事項、次の作業候補 |
| ドキュメント全体の入口 | [docs/README.md](./docs/README.md) | status、themes、shared、releaseなどの案内 |
| 進捗ログ・承認ゲート | [docs/status/README.md](./docs/status/README.md) | 日付別ログ、復旧記録、DB/write/cleanupなどの安全ゲート |
| テーマ別ドキュメント | [docs/themes/README.md](./docs/themes/README.md) | SES console、Gmail、Matching、Market analysisなど |
| 共通ルール・品質方針 | [docs/shared/README.md](./docs/shared/README.md) | テスト方針、複数チャット連携、運用ルール |
| AI作業ルール | [AGENTS.md](./AGENTS.md), [AI_WORK_RULES_SHORT.md](./AI_WORK_RULES_SHORT.md), [AI_WORK_RULES.md](./AI_WORK_RULES.md) | 秘密情報、DB write、merge、cleanup、サブエージェント運用 |

## Safety Gates

以下は軽く見えても重要操作です。必ず該当するゲート文書と承認ルールに従います。

- 秘密情報・`.env*`・DB接続文字列・token・cookie・passwordの読取や出力
- DB write、fixture作成、cleanup、migration、schema変更
- production / staging / shared DB 操作
- deploy、Ready化、merge、close
- worktree削除、branch削除、`git clean`、`git reset --hard`、`--force`
- auth / 権限 / 公開範囲 / guarded write route に関わる変更

通常のdocs整理、read-only確認、低リスクなテスト追加、Draft PR作成は、ルールに沿って自律的に進めます。

## Development Notes

- 古いdirty workspaceを新規作業baseにしません。
- `PROGRESS.md` は現在地の地図、`docs/status/` は履歴とゲート記録です。
- 静的docsにopen PR一覧を長く複製せず、必要ならGitHubのlive viewへ誘導します。
- 実装や検証を行う場合は、関連テーマdocsと [docs/shared/quality/two-pass-task-test-policy-v0.1.md](./docs/shared/quality/two-pass-task-test-policy-v0.1.md) を確認します。
