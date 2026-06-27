# PowerShell 実行ポリシー標準化案 2026-06-27

## 目的

AI作業で `scripts/*.ps1` を使う際に、Windows環境差で止まらず、かつ危険操作を実行ポリシーの緩和で誤魔化さないための標準案です。

この文書は手順案です。マシンの実行ポリシー変更、証明書作成、署名設定、権限変更は行いません。

## 前提

- 対象repo: `kenken5230/ses_console_vol1`
- 現在の標準コマンド例: `powershell -ExecutionPolicy Bypass -File scripts/safety-gate.ps1 -SessionStartRef <sha>`
- `scripts/` は初期配置後、Codexは読み取り検証のみ
- H2完了までは、`scripts/` 自体をCodex書込不可にする隔離が未完了

## 基本方針

PowerShell実行ポリシーは、セキュリティ境界ではなく誤実行防止の仕組みとして扱います。

AI作業では、マシン全体の設定を変えず、プロセス単位で明示的に実行します。

推奨:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File <script-path> <args>
```

理由:

- 現在のプロセスに限定される
- OS設定を変更しない
- コマンド履歴上で「このps1を明示的に実行した」ことが残る
- CIや別端末へ影響しない

## 使用してよい場面

以下のような、repo内の既知スクリプトで、目的と影響が明確な場合に限定します。

- `scripts/safety-gate.ps1`
- `scripts/codex-notify.ps1`
- docs-only / read-only / dry-run の補助
- CI前のローカル検証
- secret値を出力しない診断

## 標準コマンド

### safety-gate

commit後に回す場合は、必ずセッション開始時のHEADを渡します。

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\safety-gate.ps1 -SessionStartRef <session-start-head>
```

### 通知ヘルパー

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\codex-notify.ps1 -Status complete -Message "作業が完了しました"
```

通知本文には、secret、DB値、token、cookie、個人情報、顧客情報、ログ全文、diff全文を含めません。

## 署名運用を検討すべき場面

以下に該当する場合は、`Bypass` ではなく署名運用を検討します。

- 長期常駐ジョブ
- タスクスケジューラ登録
- 複数端末での運用
- 権限変更、DB write、deploy、cleanupなど外部影響があるスクリプト
- 人間以外が継続実行する自動化
- `scripts/` の書込隔離が完了した後の本格運用

署名運用では、人間が証明書、信頼設定、署名更新、失効方法を管理します。

## Codexがしてはいけないこと

- `Set-ExecutionPolicy` を実行する
- MachinePolicy / UserPolicy / LocalMachine / CurrentUser のポリシーを変更する
- 証明書を作る
- 証明書を信頼ストアへ入れる
- 秘密鍵を作る、読む、保存する
- ps1署名をAI単独で更新する
- 実行ポリシーの緩和を、削除、DB write、deploy、secret読取の承認代替にする

## 人間が決めること

- 短期標準を `Bypass -File` にするか
- 長期で署名運用へ移すか
- 署名証明書を誰が管理するか
- タスクスケジューラ運用を許可するか
- H2の `scripts/` 書込隔離方法

## 推奨結論

短期は `powershell -NoProfile -ExecutionPolicy Bypass -File` を標準にします。

中長期は、H2で `scripts/` をCodex書込不可にした後、常駐/定期実行対象だけ署名運用へ移すのが安全です。

## 判定

この文書で H4 の「標準化案」は完了です。

実際のPowerShell実行ポリシー変更、署名運用、証明書管理は `NEEDS_HUMAN` のままです。
