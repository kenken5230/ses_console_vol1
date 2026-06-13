# Two-Pass Task Test Policy v0.1

作成日: 2026-06-04

## 1. 目的

今後の要件定義、設計、実装、運用タスクは、原則としてCodex側で2周テストする。

ユーザー確認が必要なものだけを明確に残し、それ以外はCodexが確認してからPRまたは報告に進む。

## 2. 基本ルール

- 変更前に対象ファイルと既存仕様を読む。
- 既存データ更新・削除は、明示されたapply系コマンド以外では行わない。
- migration、DB更新、外部secret、production相当操作は安全条件を先に書く。
- テストは1周目で機能確認、2周目で再現性確認を行う。
- 2周目で失敗した場合は、1周目成功扱いにしない。
- ユーザーだけが確認できる項目は `Owner確認` として残す。
- secret、DB接続URL、connection stringはログ、PR本文、mdに書かない。

## 3. 2周テストの定義

1周目:

- 変更した機能の直接テスト。
- 型チェック。
- buildまたは該当コマンド。
- DB更新がないこと、またはDB更新範囲が設計どおりであることの確認。

2周目:

- 同じ主要テストを再実行する。
- 冪等性が必要なものは、2回目で重複・追加更新・件数崩れがないことを確認する。
- read-onlyコマンドは2回ともDB更新なしであることを確認する。
- UIは同じviewportまたは同じ操作で再確認する。

## 4. タスク種別別テスト

| 種別 | 1周目 | 2周目 |
|---|---|---|
| md / 設計書のみ | `rg`でリンク・用語・禁止語確認 | ファイル再読込、タスクID重複確認 |
| TypeScript / CLI | 対象CLI、`tsc --noEmit`、関連test | 対象CLI再実行、`tsc --noEmit`再実行 |
| Next.js UI | build、必要ならBrowser確認 | 別viewportまたは再読み込みで確認 |
| DB read-only CLI | count/preview実行、updated=0確認 | 同コマンド再実行、updated=0確認 |
| DB apply CLI | dry-run/preview、少量apply設計確認 | apply後post-count、同条件preview再確認 |
| migration | local/staging向けplan確認、schema diff | rollback不可ならrestore手順確認 |
| auth/RBAC | role別API/画面確認 | 別roleまたは未ログインで再確認 |
| cron / job | dry-runまたはstaging API確認 | lock/重複実行/ログ確認 |

## 5. 共通コマンド候補

基本:

```powershell
npm.cmd run test:gmail-extraction-quality
npm.cmd exec -- tsc --noEmit
npm.cmd run build
```

Gmail read-only:

```powershell
npm.cmd run gmail:stats
npm.cmd run gmail:classify:audit -- --limit=100
npm.cmd run gmail:extract:preview -- --limit=100
npm.cmd run gmail:extract:duplicates
npm.cmd run gmail:extract:mismatches
```

Gmail person remediation:

```powershell
npm.cmd run gmail:extract:person-remediation -- --scan-limit=1000 --count-only
npm.cmd run gmail:extract:person-remediation -- --limit=10
npm.cmd run gmail:extract:person-remediation -- --batch-preview --scan-limit=5000 --update-limit=2000 --chunk-size=50
```

## 6. Owner確認を減らす設計

Codexが代替確認する:

- 差分レビュー
- 型チェック
- build
- CLI dry-run / preview
- 件数比較
- DB更新前後のsummary
- PR本文のstaging手順
- secretが出ていないこと

Ownerに残す:

- 実stagingでのconfirmありapply
- 実ブラウザでの見た目・業務判断
- 外部サービス管理画面でのsecret/env登録
- 料金プラン変更
- 本番公開判断
- 実メール送信の到達確認

## 7. PR本文テンプレート

```md
## Summary
- 

## Safety
- DB更新:
- 既存データ削除:
- secret出力:
- Owner確認:

## Validation Round 1
- 

## Validation Round 2
- 

## Staging Owner Operation
1. 

## Residual Risk
- 
```

## 8. 完了条件

- 要件または設計がmdに残っている。
- タスクIDがある。
- 2周テスト項目がある。
- Owner確認が必要な項目だけ残っている。
- 既存データ削除を含まない。
- secretを含まない。
