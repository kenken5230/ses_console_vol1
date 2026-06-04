# Gmail Unlinked Extraction Quality BK v0.1

作成日: 2026-06-04
親research: `docs/themes/gmail-remediation/research/gmail-unlinked-extraction-quality-research-v0.1.md`
入力BK: `docs/themes/gmail-remediation/BK/backups/2026-06-04-deep-research-report-bk-v0.1.md`

## 1. 目的

Gmail未リンクメールの新規抽出品質改善を、実装可能なBK/タスク/2周テストへ落とす。

## 2. スコープ

対象:

- `gmail:extract:unlinked` のread-only dry-run観測。
- project/person分類改善。
- 人名抽出改善。
- roleHeadline改善。
- reviewReasons / classificationWarning整理。
- skillOverExtraction抑制。
- 匿名化research artifact検討。

対象外:

- DB更新。
- apply。
- 既存データ削除。
- 既存person/projectの大量修正。
- 外部AI API。
- メール送信。
- secretやDB接続URLの記録。

## 3. BK一覧

| BK ID | 優先度 | 内容 | 状態 |
|---|---|---|---|
| BK-GMAIL-QUALITY-001 | P0 | 評価母集団を本当に新規作成候補へ限定する | 未着手 |
| BK-GMAIL-QUALITY-002 | P0 | projectness/personness二系統分類スコア | 未着手 |
| BK-GMAIL-QUALITY-003 | P0 | 人名抽出の優先順とsubject-like hard reject | 未着手 |
| BK-GMAIL-QUALITY-004 | P1 | roleHeadline本文優先化 | 未着手 |
| BK-GMAIL-QUALITY-005 | P1 | reason registry / warning registry | 未着手 |
| BK-GMAIL-QUALITY-006 | P0 | skill過剰抽出抑制 | 未着手 |
| BK-GMAIL-QUALITY-007 | P1 | 匿名化dry-run research artifact | 未着手 |

## 4. BK-GMAIL-QUALITY-001 評価母集団の純化

### 要件

- UI上の未リンクbucketではなく、CLIが本当に新規作成候補と判定したメールだけを評価対象にする。
- `source_mail_id` と `mail_entity_links` の意味を混同しない。
- linked/not-creatableは抽出品質失敗として数えない。

### タスク

- [ ] `gmail:extract:unlinked --limit=50 --type=all` の出力列を確認する。
- [ ] skip/candidate/reasonを匿名化して集計できる形に整理する。
- [ ] linked/not-creatableを評価対象外にするルールをdocsへ追記する。

### 2周テスト

1周目:

- dry-runで候補とskip reasonを確認する。
- DB更新なし、applyなしを確認する。

2周目:

- 同条件で再dry-runし、評価対象件数の考え方が再現することを確認する。

Owner確認:

- なし。業務判断なしでCodex側確認可能。

## 5. BK-GMAIL-QUALITY-002 projectness/personness二系統分類スコア

### 要件

- 件名だけで分類しない。
- projectnessScoreとpersonnessScoreを別々に出す。
- 差が小さい場合は強制分類せず `NEEDS_REVIEW` とする。
- conflict warningを残す。

### タスク

- [ ] 案件シグナル辞書を定義する。
- [ ] 要員シグナル辞書を定義する。
- [ ] 本文、件名、署名、差出人表示名の重みを分ける。
- [ ] conflict warningを追加する。
- [ ] fixtureを追加する。

### 2周テスト

1周目:

- 案件境界ケース、要員境界ケース、混在ケースをfixtureで確認する。

2周目:

- 同じfixtureでsnapshotが安定することを確認する。
- dry-runでclassificationWarningが過不足なく出ることを確認する。

Owner確認:

- 分類が営業感覚と合うかの最終確認のみ。

## 6. BK-GMAIL-QUALITY-003 人名抽出優先順とsubject-like hard reject

### 要件

- name候補は署名、差出人表示名、本文冒頭、件名の順に評価する。
- 件名由来候補は最後のfallbackに限定する。
- 件名らしい長文、案件語、スキル語、条件語、金額、勤務地、記号多めの文字列はhard rejectする。
- reject理由をreviewReasonsへ残す。

### タスク

- [ ] 署名ブロック抽出を強化する。
- [ ] 差出人表示名cleanupを追加する。
- [ ] subject-like判定を強化する。
- [ ] rejectedNameCandidateを安全に短縮/匿名化する。
- [ ] fixtureを追加する。

### 2周テスト

1周目:

- 件名長文がnameに入らないことを確認する。
- 署名末尾の人名が回収されることを確認する。

2周目:

- same fixtureでnameConfidence、nameSource、reviewReasonsが安定することを確認する。
- dry-runでsubject_leak_rateが0であることを確認する。

Owner確認:

- 実名/initials/placeholder表示の営業運用判断。

## 7. BK-GMAIL-QUALITY-004 roleHeadline本文優先化

### 要件

- roleHeadlineは本文の職種/担当/工程/経験/ポジション/得意領域を優先する。
- 件名しか根拠がない場合はsubject-only reasonを残す。

### タスク

- [ ] role抽出対象セクションを定義する。
- [ ] 件名fallbackの発火条件を限定する。
- [ ] `PERSON_ROLE_FROM_SUBJECT_ONLY` 相当のreasonを安定化する。
- [ ] fixtureを追加する。

### 2周テスト

1周目:

- 本文に職種があるケースで本文側を採用する。

2周目:

- 件名fallback時にreasonが必ず出ることを確認する。

Owner確認:

- roleHeadlineの表示文言が営業利用に合うか。

## 8. BK-GMAIL-QUALITY-005 reason registry / warning registry

### 要件

- reviewReasonsとclassificationWarningの命名と発火条件を整理する。
- fallback、override、矛盾、抽出窓不足、HTML由来、重複候補、subject-like rejectを理由として残す。

### タスク

- [ ] reason registry mdを作る。
- [ ] reason生成を集約する。
- [ ] snapshot testを追加する。

### 2周テスト

1周目:

- 代表fixtureで理由が出ることを確認する。

2周目:

- 同じfixtureで理由の順序/命名が安定することを確認する。

Owner確認:

- UIで見せるreasonの日本語表現。

## 9. BK-GMAIL-QUALITY-006 skill過剰抽出抑制

### 要件

- skill抽出を本文全体からではなく、スキル/経験/担当工程/環境セクション周辺に寄せる。
- denylist、上限、同義語正規化、周辺文脈必須化を検討する。
- skillOverExtractionを検知だけでなく予防寄りにする。

### タスク

- [ ] 抽出窓を定義する。
- [ ] 汎用語denylistを作る。
- [ ] skill最大件数を設定する。
- [ ] context word必須ルールを追加する。
- [ ] over-extraction fixtureを追加する。

### 2周テスト

1周目:

- 偽陽性が多い件名/本文でskill数が抑制されることを確認する。

2周目:

- 必要なskillが落ちすぎないことを確認する。

Owner確認:

- 主要スキルの取り逃がし許容範囲。

## 10. BK-GMAIL-QUALITY-007 匿名化dry-run research artifact

### 要件

- dry-run結果から、本文全文、メールアドレス、会社名、氏名原文を保存しない研究artifactを作る。
- sample ID、分類結果、confidence、nameSource、reviewReasons、warning、roleHeadline source、skills count、duplicate candidate flag程度に限定する。

### タスク

- [ ] artifact schemaをmd化する。
- [ ] `--report-json` などのCLI案を検討する。
- [ ] redaction testを追加する。

### 2周テスト

1周目:

- artifactに本文全文/メールアドレス/secretが入らないことを確認する。

2周目:

- 同条件で再生成し、比較可能なsummaryになることを確認する。

Owner確認:

- artifactをPR本文へ出してよい粒度。

## 11. 次PRの推奨順

1. BK-GMAIL-QUALITY-001で評価母集団を固定する。
2. BK-GMAIL-QUALITY-003でsubject-like name leakを先に潰す。
3. BK-GMAIL-QUALITY-002で分類の二系統スコアを追加する。
4. BK-GMAIL-QUALITY-006でskill過剰抽出を抑える。
5. BK-GMAIL-QUALITY-004/005でroleHeadlineとreason/warningを安定化する。
6. BK-GMAIL-QUALITY-007で匿名化artifactを追加する。

## 12. 完了条件

- deep research reportの内容が実装可能なBKへ分解されている。
- 各BKに要件、タスク、2周テスト、Owner確認がある。
- 既存データ更新/削除を含まない。
- applyや外部送信を含まない。
- secret、DB接続URL、token、password、本文全文、メールアドレス原文を含まない。
