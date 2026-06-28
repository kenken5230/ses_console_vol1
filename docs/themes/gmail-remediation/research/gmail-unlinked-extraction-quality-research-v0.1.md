# Gmail Unlinked Extraction Quality Research v0.1

作成日: 2026-06-04
入力元: `deep-research-report.md` / Word版 / PDF版の要点整理
テーマ: `docs/themes/gmail-remediation/`
BK: `docs/themes/gmail-remediation/BK/gmail-unlinked-extraction-quality-bk-v0.1.md`

## 1. 目的

Gmail未リンクメールから新規案件・新規要員を抽出する品質を、DB更新なし、applyなし、外部AI APIなし、メール送信なしで改善するためのResearch-to-PR方針を整理する。

このresearch docは、添付されたdeep research reportとWord/PDF版をそのまま保存するのではなく、次PRで使える要件、失敗モード、評価指標、検証手順へ圧縮したもの。

## 2. 現状認識

すでに入っている安全策:

- `gmail:extract:unlinked` のdry-run CLI。
- `--limit` 必須。
- applyは明示指定。
- HTML本文からの補完。
- `source_mail_id`、`mail_entity_links`、`extraction_results` ベースの重複防止。
- 同一送信者 + 同一件名の候補表示。
- 件名全文を `persons.name` に入れない安全策。
- `nameConfidence`、`reviewReasons`、`roleHeadline`、`classificationWarning`、`skillOverExtraction`。
- `氏名未取得（GMAIL-xxxx）` のplaceholder表示。

次の改善は、仕組みの作り直しではなく、どの証拠をどの順番でどれくらい信用するかの調整。

## 3. 設計原則

- 件名だけで案件/要員を決めない。
- 評価対象は、CLIの重複防止とリンク解釈を通過した「本当に新規作成候補」に限定する。
- 件名由来の長文や案件語/スキル語/条件語は、name候補から強く拒否する。
- `reviewReasons` と `classificationWarning` は、表示補助ではなく監査証跡として扱う。
- skill過剰抽出は検知だけでなく、抽出窓、denylist、上限、文脈条件で事前抑制する。
- ユーザー確認を増やさず、Codex/CLI側でread-only検証、匿名化、テストを細かく回す。

## 4. 優先失敗モード

| ID | 優先度 | 症状 | 改善方針 | テスト観点 |
|---|---|---|---|---|
| FM-CLASS-PROJ-PER | P0 | 案件っぽいメールが要員側に入る、または逆に要員っぽいメールが案件側に入る | `projectnessScore` と `personnessScore` の二系統化。差が小さい場合は `NEEDS_REVIEW` + warning | 案件語が多いメールをpersonへ誤分類しない |
| FM-LINK-EVAL | P0 | 未リンク件数を品質問題として過大評価する | 評価対象を本当に新規作成候補へ限定し、linked/not-creatableを除外する | UI bucket数とCLI対象数がズレても異常扱いしない |
| FM-NAME-SUBJECT | P0 | 件名全文や件名由来の役職文字列がnameへ入る | 署名、差出人表示名、本文冒頭、件名の順にし、subject-like候補をhard reject | 件名長文がnameへ入らずplaceholderへ落ちる |
| FM-NAME-MISSING | P0 | 人名が取れるはずなのにplaceholderへ落ちる | 署名ブロック抽出、差出人表示名cleanup、所属語/役職語除去、和名パターン追加 | 署名末尾の人名を回収する |
| FM-ROLE-SUBJECT | P1 | `roleHeadline` が件名だけに依存する | 本文の職種/担当/工程/経験/ポジション/得意領域を優先し、件名は最終fallback | 本文に職種がある場合は本文由来を採用 |
| FM-REVIEW-COVERAGE | P1 | `reviewReasons` / `classificationWarning` が不足または過剰 | reason registryを定義し、fallback/override/矛盾/抽出窓不足を構造化して残す | 同一fixtureでreasonが安定する |
| FM-SKILL-OVER | P0 | スキルタグが拾われすぎる | スキル/経験/担当工程/環境セクション周辺に抽出窓を絞り、denylist/上限/文脈必須化 | 偽陽性が多い件名でskill数が抑制される |

## 5. 実装候補

| 領域 | 変更案 | 注意 |
|---|---|---|
| 分類 | project/personを別々に採点し、差分と警告を出す | 強制分類を増やしすぎない |
| 人名抽出 | 署名 > 差出人表示名 > 本文冒頭 > 件名の順で候補化する | 件名候補は最終fallbackかつ拒否条件を強くする |
| roleHeadline | 本文セクション優先にする | 件名採用時はsubject-only reasonを必ず付与 |
| reason/warning | reason registryを作る | reason名と発火順をsnapshotテストしやすくする |
| skill抽出 | セクション窓、denylist、採用上限、同義語正規化、周辺文脈必須化 | recall低下をreviewReasonsで補う |
| CLI研究出力 | 匿名化report-jsonを検討する | 本文全文、メールアドレス、会社名、氏名原文は保存しない |

## 6. 評価メトリクス

| metric | 意味 | 目標 |
|---|---|---|
| `classification_accuracy` | project/person分類が正しい割合 | 改善 |
| `project_precision` | project判定の精度 | 改善 |
| `person_precision` | person判定の精度 | 改善 |
| `placeholder_rate` | `氏名未取得` に落ちた割合 | 安全性を保ちつつ低下 |
| `name_low_rate` | nameConfidence LOWの割合 | 安全性を保ちつつ低下 |
| `subject_leak_rate` | 件名由来文字列がnameへ漏れた割合 | 0 |
| `subject_only_role_rate` | roleHeadlineが件名のみ由来の割合 | 低下 |
| `reason_coverage_rate` | 要確認理由が付いている割合 | 改善 |
| `warning_coverage_rate` | warningが必要ケースで付いている割合 | 改善 |
| `skill_false_positive_rate` | skill過剰抽出の割合 | 低下 |
| `failed` | CLI失敗件数 | 0 |

## 7. Research-to-PR Workflow

1. mainを最新化する。
2. DB targetを確認する。
3. dry-runで50件程度を採取する。
4. 出力を匿名化し、研究アーティファクト化する。
5. 失敗モードで分類する。
6. ルール改善を実装する。
7. fixture/snapshotテストを追加する。
8. typecheck/build/testを実行する。
9. 同条件で再dry-runする。
10. before/afterを匿名化サマリで比較する。
11. 1PRに集約する。

## 8. 推奨検証

Codexが実行してよいread-only検証:

```powershell
node scripts\check-db-target.cjs
npm.cmd run gmail:extract:unlinked -- --limit=50 --type=all
npm.cmd run test:gmail-extraction-quality
npm.cmd exec -- tsc --noEmit
npm.cmd run build
```

実行しないもの:

- `--apply`
- 既存データ更新
- 既存データ削除
- 外部送信
- 有料/外部AI API

## 9. PR本文テンプレート

```markdown
## Summary
- Gmail未リンクメールの新規抽出品質を改善しました。
- 対象は分類、人名抽出、roleHeadline、reviewReasons/classificationWarning、skill抽出です。

## Changes
- project/person判定を二系統スコアへ改善
- 人名解決の優先順を見直し、subject-like nameをhard reject
- roleHeadlineを本文優先に変更
- reason/warningの理由付けを安定化
- skill抽出の過剰検知を抑制
- 匿名化dry-run研究用artifactを追加

## Out Of Scope
- DB更新
- apply
- 既存データの大量修正
- 外部AI API
- メール送信

## Validation
- DB target check
- read-only dry-run
- quality test
- typecheck
- build

## Safety
- DB更新なし
- applyなし
- 外部送信なし
- secrets非表示
```
