# AGENTS.md — Codex / AIエージェント運用ルール

このファイルは、Codexおよび `AGENTS.md` を自動読み込みするAIエージェントが起動時に読むプロジェクトルールです。

詳細な体制、進め方、安全ゲートは以下を参照してください。

- `AI_WORK_RULES.md`
- `AI_WORK_RULES_SHORT.md`
- `AI_PROJECT_PROFILE.md`

## 1. 最優先

安全性、復元可能性、秘密情報保護、ユーザー作業の保護を最優先してください。

その範囲内では、ユーザー確認を待たずに自律的に作業を進めてください。

## 2. 秘密情報・機微ファイルは読まない / 出力しない

明示承認なしに、以下を読み取り、表示、コピー、要約、外部送信しないでください。

- `.env`, `.env.*`
- `*.pem`, `*.key`, `*.p12`, `*.pfx`
- `*secret*`, `*credentials*`
- `*.db`, `*.sqlite`, `*.sqlite3`, `*.dump`
- SSH、cloud、DB、deploy、notificationの資格情報
- `AI_PROJECT_PROFILE.md` で指定された秘密ファイル、個人情報、顧客情報

値が必要な場合でも、値そのものは出力せず、設定済み / 未設定などの存在確認にとどめてください。

## 3. 破壊的・外部影響操作

以下は、ユーザー承認と `AI_PROJECT_PROFILE.md` で明示された安全手順なしに実行しないでください。

`AI_PROJECT_PROFILE.md` は判断基準と確認手順を定義するものであり、共通ルールでユーザー承認必須の操作を緩和するものではありません。

特に以下は、Profileに手順があっても、実行直前の明示承認や共通ゲートの代替にしないでください。

- 再帰削除、ワイルドカード削除、大量削除、データ削除
- `git reset --hard`, `git clean`, force push
- worktree削除、branch削除
- production / staging / shared DB write
- DB write、migration / schema変更、データ削除
- deploy、または production deploy を起動し得る merge
- deploy単独操作
- 権限、認証、公開範囲、セキュリティ設定の変更
- 秘密情報、個人情報、顧客情報の閲覧、出力、外部送信

commit、PR、merge前には、必ず削除差分を確認してください。

```bash
git diff --name-status --diff-filter=D
```

## 4. 作業体制

重要な作業は、親PM、監査サブ、監視サブ(PMO)、テクニカルリード、実行者の役割セットで進めてください。

実行者は複数いて構いません。

監査、PMO、テクニカルリードは、単に確認するだけでなく、差し戻し、次タスク、残リスク、未検証、承認待ちを自発的に出してください。

## 5. dirty workspace

active workspaceがdirtyな場合、未コミット差分は原則ユーザー作業として扱ってください。

新規作業は、可能な限りlatest mainからclean worktreeまたはclean branchで開始してください。

ユーザー作業の可能性がある差分を、reset、clean、checkout、restore、stash、削除で勝手に整理しないでください。

## 6. プロジェクト固有設定

このプロジェクト固有の以下は、`AI_PROJECT_PROFILE.md` を正としてください。

- main mergeとproduction deployの関係
- CI / test / buildコマンド
- DB / 永続データの環境分類
- AIが内部承認だけでmergeしてよい範囲
- けんさん確認が必須な範囲
- heartbeat頻度、通知、PROGRESS / docsの場所
- プロジェクト固有の危険領域

不明な場合は、AIがread-onlyで調査し、非エンジニアにも分かる選択肢でけんさんに確認してください。
