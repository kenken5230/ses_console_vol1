# Workspace Folder Organization 2026-06-12

## 方針

削除はしない。今後使わない作業用フォルダや一時ファイルは、各階層の `old/` に退避する。

Git worktree は通常の folder move ではなく、必ず `git worktree move` で移動する。これにより `.git/worktrees` の管理情報も保たれる。

## テーマ別の置き場所

| 種別 | 置き場所 | 用途 |
| --- | --- | --- |
| active app source | `app/`, `components/`, `lib/`, `scripts/`, `prisma/`, `tests/`, `data/` | 現在のアプリ本体とテスト |
| docs entry | `docs/README.md`, `docs/themes/README.md` | docs の入口 |
| matching docs | `docs/themes/matching/` | matching dry-run、saved suggestion、review update |
| Gmail remediation docs | `docs/themes/gmail-remediation/` | Gmail抽出・分類・remediation |
| SES sales console docs | `docs/themes/ses-sales-console/` | 全体要件、業務UI、統合console |
| shared docs | `docs/shared/` | theme 横断の品質・運用ルール |
| screen references | `gamen_sankou/` | 画面参考画像 |
| retired worktrees | `old/worktrees/<theme>/` | 過去PRや検証用 worktree |
| retired logs | `old/logs/` | 失敗ログなど |
| retired local SQL | `old/sql/` | 今後直接使わない一時SQL |
| retired tool settings | `old/tooling/` | Claude Code など過去ツールのローカル設定 |

## old/worktrees の分類

| theme | 対象 |
| --- | --- |
| `market-analysis` | `__market_analysis_*` |
| `matching` | match suggestion、matching review、saved suggestion 関連 |
| `source-import` | PR21-23 など source/import review 関連 |
| `staging-migration` | staging migration 検証用 worktree |

## 今後の運用

- ルート直下に新しい `__*_worktree` を増やさない。
- 新しい worktree が必要な場合は、最初から `old/worktrees/<theme>/...` または workspace 外の temp path に作る。
- 判断に迷うファイルは削除せず、同階層または近い階層の `old/` に退避する。
- `.env*`, `private/`, `secrets/`, `.vercel/` は整理対象に含めない。
- real CSV、DB dump、token、password、connection string は docs に貼らない。
- next PR の実装メモは対象 theme の docs に残す。
