# Safe Output Contract Test Plan v0.1

作成日: 2026-06-24

## 1. 目的

Gmail、CSV、運用CLI、監査レポートが、調査や運用に必要な根拠を残しつつ、本文全文、件名、送信者、secret、connection string、DB URL、cookie/token、生エラースタックを出力しないことを契約テストとして固定する。

この文書はdocs-onlyの計画であり、実装、DB/API接続、秘密情報の読み取りは行わない。

## 2. 対象候補

| 領域 | 候補 | 確認したい契約 |
|---|---|---|
| Gmail extraction / classification | preview、audit、quality report、entity extraction CLI | メール本文全文、件名、送信者、message id、thread id、raw payloadをstdout、stderr、JSON、Markdownへ出さない |
| CSV import / dry-run | import preview、duplicate detection、source tracking report | CSVセルの生値、メールアドレス、URL、備考自由文、外部IDを必要以上に出さない |
| 運用CLI | preflight、dry-run、apply guard、batch summary | secret、DB URL、connection string、cookie/token、生スタックを出さず、件数とsanitized keyだけを出す |
| 監査レポート | Markdown/JSON report、CI artifact候補、PR貼付用summary | 証跡は短い分類、件数、ハッシュ、固定サンプルIDに限定し、本文断片やcredential形状を含めない |
| API/route error handling | route handler、server action、CLIから呼ばれる内部関数 | thrown errorのraw stack、driver error、環境変数値、接続先URLをそのまま返さない |

## 3. 禁止出力

契約テストは、以下がstdout、stderr、戻り値JSON、生成Markdown、ログ文字列、snapshotに混入しないことを確認する。

| 種別 | 禁止例の方針 | 備考 |
|---|---|---|
| メール本文全文 | fixture本文を丸ごと含む出力 | 断片一致ではなく、長文全体や複数文連続を禁止する |
| 件名 | raw subject、返信/転送prefix付きsubject | subject hashや分類ラベルは許可する |
| 送信者 | raw From、メールアドレス、表示名 | domain分類も必要最小限にする |
| secret | API key、bearer token、password、session secret | 実値ではなくダミーfixtureで検査する |
| connection string / DB URL | protocol、user、password、host、databaseを含む接続文字列 | `postgres://`、`mysql://`、`DATABASE_URL=`形状を禁止する |
| cookie / token | Cookie header、JWT、OAuth token、CSRF token | prefixだけの表示も原則禁止する |
| 生エラースタック | `at ...`が連続するstack trace、driver stack、framework stack | error code、safe message、trace idは許可する |
| raw payload | Gmail API/CSV/API response全体 | safe schemaへ変換後のsummaryだけ許可する |

## 4. 許可されるsanitized evidence

テストやレビューで必要な証跡は、以下のような形式に限定する。

| Evidence | 許可例 | 条件 |
|---|---|---|
| 件数 | `scanned=100 matched=12 skipped=3` | 個別本文や個人識別子を伴わない |
| 分類 | `classification=company_candidate reason=domain_match` | raw subject/from/bodyに依存する文字列を混ぜない |
| 安全なID | `fixtureId=gmail-safe-output-001` | 本番ID、message id、thread idを使わない |
| ハッシュ | `subjectHash=sha256:...` | salt/方式を固定し、元値を復元できる短い生値を併記しない |
| redaction marker | `[REDACTED_SUBJECT]`、`[REDACTED_DB_URL]` | marker名に秘密値を含めない |
| error summary | `errorCode=DB_CONFIG_INVALID safeMessage=configuration unavailable` | raw stack、connection string、env値を含めない |
| aggregate report | Markdown tableの件数、pass/fail、対象コマンド名 | raw fixture payloadを添付しない |

## 5. 契約テスト方針

1. ダミーfixtureに、本文、件名、送信者、token形状、DB URL形状、生スタック形状を意図的に入れる。
2. 対象CLI/API/report generatorを、DB/API接続なしで呼べる純粋関数またはdry-run entrypointへ分離して検査する。
3. 出力全体を文字列化し、禁止語句、正規表現、fixture raw値の完全一致をdenylistで検査する。
4. 同時に、sanitized evidenceが残っていることをallowlistで検査する。
5. 失敗時のテストメッセージもraw値を出さず、`forbidden output kind: subject`のような種別だけを出す。
6. 監査レポート生成はsnapshotを使う場合でも、snapshotにraw fixture値が入らないことを別テストで固定する。

## 6. テスト対象の分割案

| 将来PR | Scope | 追加する主なテスト |
|---|---|---|
| PR-A: shared sanitizer contract | 共通redaction helperとsafe evidence型 | forbidden pattern table、allowlist evidence、error summary |
| PR-B: Gmail CLI/report contract | Gmail preview/audit/reportの出力 | subject/from/body/message id/thread id非出力、件数と分類のみ出力 |
| PR-C: CSV import contract | CSV dry-run/reportの出力 | raw cell、email、URL、free text非出力、row countとsafe row keyのみ出力 |
| PR-D: operations CLI contract | preflight/apply guard/batch summary | DB URL、connection string、cookie/token、raw stack非出力 |
| PR-E: CI/report gate | safe-output contract testのCI実行 | artifact/snapshotにraw fixture値が入らないこと |

各PRはコード変更を含むため、この計画PRとは分ける。DB/API接続が必要な検証は対象外とし、fixtureとpure output contractで先に安全柵を作る。

## 7. 検証コマンド例

実装PRでの想定例。現時点では計画のみで実行しない。

```powershell
npm.cmd run test:safe-output-contract
npm.cmd run test:gmail-extraction-quality
npm.cmd exec -- tsc --noEmit
git diff --check
git diff --name-status --diff-filter=D
```

DB/API接続が必要なコマンド、`.env`の読み取りが必要なコマンド、実データを読み込むコマンドはsafe-output契約テストの基本検証には含めない。

## 8. レビュー観点

- docs-only PRでは、新規ファイル以外の差分がないこと。
- 実装PRでは、禁止出力のdenylistと許可証跡のallowlistが両方あること。
- fixtureはダミー値のみで、実メール、実DB URL、実token、実cookieを使っていないこと。
- テスト失敗時のmessage、snapshot、CI logにもraw値が出ないこと。
- reportやPR本文に貼るsummaryが、本文全文、件名、送信者、secret、connection string、DB URL、cookie/token、生エラースタックを含まないこと。
- DB/API接続なしで再現できる契約テストになっていること。
- 将来の本番/共有環境検証が必要な場合は、別PR、別runbook、Owner確認として切り出されていること。

## 9. 完了条件

- `docs/shared/quality/safe-output-contract-test-plan-v0.1.md`のみを追加している。
- 実装、DB/API接続、秘密情報ファイル閲覧を行っていない。
- `git diff --check`が成功している。
- `git diff --name-status --diff-filter=D`で削除差分がない。
- 表とリンクを目視確認し、Markdownとして読める構成になっている。
