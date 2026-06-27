# Standing Authorization Token 運用方針案 2026-06-27

## 目的

委任オートマージや重要操作をAIチームへ任せる場合でも、取り返しがつかない操作をAI単独判断で実行しないための、人間承認トークン運用案です。

この文書は方針案であり、実トークンの発行、保存、読取、表示は行いません。

## 前提

- 対象repo: `kenken5230/ses_console_vol1`
- 関連Profile: `AI_PROJECT_PROFILE.md` §4
- 現在状態: `PENDING / disabled for now`
- H2: `scripts/` と `docs/ai-queue/DECISIONS.md` の書込隔離が未完了
- H3: standing authorization token の発行・保管方法が未確定

H2/H3 が完了するまで、Ready化 / merge / 本番deploy の完全自動化は有効化しません。

## token の役割

Standing authorization token は、AIに「この1件だけ、このHEADだけ、この操作だけ実行してよい」と伝えるためのワンタイム承認証跡です。

トークンは秘密情報です。AIは値を読まず、保存せず、出力しません。

## 推奨仕様

| 項目 | 推奨 |
|---|---|
| 生成者 | 人間、または人間が管理するsecret manager |
| 乱数 | CSPRNG |
| エントロピー | 128bit以上 |
| 表現 | 32bytes以上のhex/base64/base64urlなど |
| 保存場所 | password manager / OS credential store / secret manager |
| repo保存 | 禁止 |
| chat貼付 | 禁止 |
| PR本文/コメント貼付 | 禁止 |
| `.env` 平文保存 | 原則禁止。使う場合もlocal-onlyかつAIに値を見せない |

## スコープ

1 token は 1 task / 1 branch / 1 HEAD / 1 operation に限定します。

例:

- PR #123 を HEAD `abc123...` の状態で Ready化してよい
- PR #123 を HEAD `abc123...` の状態で mergeしてよい
- local/test DB の fixture 1件だけ write smoke してよい

次の場合は token 無効です。

- branch が変わった
- HEAD が変わった
- 対象PRが変わった
- 操作内容が変わった
- CIやVercel状態が変わった
- 監査結果がNG/保留になった
- 1回使用済み

## 使用前チェック

AIチームは token の値を読まず、以下の非秘密メタデータだけを照合します。

- 対象repo
- 対象PR / branch
- 対象HEAD
- 許可された操作
- CI / Vercel 状態
- safety-gate 結果
- 削除差分
- DB/schema/env/package/lockfile変更
- rollback/revert手順
- 4例外非該当

1つでも不一致があれば実行しません。

## 使用後の記録

使用後は、token値ではなく以下だけを記録します。

- task id
- PR番号
- branch
- HEAD
- 操作内容
- 実行時刻
- 実行者
- 監査者
- 結果
- `token-consumed: yes`

`docs/ai-queue/DECISIONS.md` は Codex 書込不可の前提なので、H2完了後は人間または隔離された承認主体が記録します。

## Codexがしてはいけないこと

- tokenを生成する
- token値を読む
- token値を表示する
- token値をコピーする
- token値を要約する
- token値をrepoへ保存する
- token値をログやPRコメントへ出す
- 使用済みtokenを再利用する
- HEAD不一致のまま実行する

## 人間が決めること

- token生成方法
- token保管場所
- tokenを誰が発行できるか
- tokenを誰が消費済みにするか
- H2の隔離方法
- `DECISIONS.md` への記録主体

## 推奨運用

短期は、Ready化 / merge / 本番deploy を人間承認または明示チャット承認に留めます。

中期は、H2で `scripts/` と `DECISIONS.md` をCodex書込不可にし、H3でsecret managerにtokenを置きます。

長期は、token値そのものをAIに渡さず、検証可能な承認メタデータだけをAIが読める形にするのが安全です。

## 判定

この文書で H3 の「方針案」は完了です。

実際の token 発行、保存、消費、検証経路の有効化は `NEEDS_HUMAN` のままです。
