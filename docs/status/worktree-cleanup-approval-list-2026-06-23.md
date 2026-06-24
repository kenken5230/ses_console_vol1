# Worktree Cleanup Approval List 2026-06-23

Observed at: 2026-06-23 18:45 JST

Scope: approval list only. No worktree deletion, branch deletion, reset, clean, stash, or file deletion was performed while preparing this document.

これは削除実行ではなく、削除してよい候補を人間が確認するための一覧です。ここにコマンドが載っていても、ユーザーが承認するまで実行禁止です。

## Summary

| Item | Count |
|---|---:|
| Source `POSSIBLE_CLEANUP_CANDIDATE` rows | 63 |
| Approval-ready candidates | 43 |
| Hold / investigate candidates | 20 |

## Approval-Ready Candidates

These candidates were clean at recheck time and their HEAD was already reachable from `origin/main`. The listed command removes only the worktree checkout, not the branch. Branch deletion remains a separate approval gate.

| # | Worktree path | Branch | HEAD | Upstream | Ahead upstream | Exact deletion command |
|---:|---|---|---|---|---:|---|
| 1 | C:/Users/ke919/AppData/Local/Temp/ses_console_main_browserqa_20260620_200600 | detached | cedd740 | none/detached | n/a | `git worktree remove -- "C:\Users\ke919\AppData\Local\Temp\ses_console_main_browserqa_20260620_200600"` |
| 2 | C:/Users/ke919/OneDrive/ドキュメント/1234project/__company_contact_write_contract_20260620 | codex/company-contact-write-contract-20260620 | a78c561 | origin/codex/company-contact-write-contract-20260620 | 0 | `git worktree remove -- "C:\Users\ke919\OneDrive\ドキュメント\1234project\__company_contact_write_contract_20260620"` |
| 3 | C:/Users/ke919/OneDrive/ドキュメント/1234project/__docs_sync_after_pr87_20260620 | codex/docs-sync-after-pr87-20260620 | d104e06 | origin/codex/docs-sync-after-pr87-20260620 | 0 | `git worktree remove -- "C:\Users\ke919\OneDrive\ドキュメント\1234project\__docs_sync_after_pr87_20260620"` |
| 4 | C:/Users/ke919/OneDrive/ドキュメント/1234project/__entity_edit_contract_20260620 | codex/entity-edit-contract-20260620 | a114b71 | origin/codex/entity-edit-contract-20260620 | 0 | `git worktree remove -- "C:\Users\ke919\OneDrive\ドキュメント\1234project\__entity_edit_contract_20260620"` |
| 5 | C:/Users/ke919/OneDrive/ドキュメント/1234project/__gmail_company_candidate_20260619 | codex/gmail-company-candidate-readonly-20260619 | 0489686 | origin/codex/gmail-company-candidate-readonly-20260619 | 0 | `git worktree remove -- "C:\Users\ke919\OneDrive\ドキュメント\1234project\__gmail_company_candidate_20260619"` |
| 6 | C:/Users/ke919/OneDrive/ドキュメント/1234project/__gmail_readonly_preview_20260620 | codex/gmail-readonly-preview-20260620 | cedd740 | origin/main | 0 | `git worktree remove -- "C:\Users\ke919\OneDrive\ドキュメント\1234project\__gmail_readonly_preview_20260620"` |
| 7 | C:/Users/ke919/OneDrive/ドキュメント/1234project/__input_standard_docs_20260619 | codex/input-standard-field-definition-20260619 | c2a1641 | origin/codex/input-standard-field-definition-20260619 | 0 | `git worktree remove -- "C:\Users\ke919\OneDrive\ドキュメント\1234project\__input_standard_docs_20260619"` |
| 8 | C:/Users/ke919/OneDrive/ドキュメント/1234project/__input_standard_impl_20260619 | codex/input-standard-forms-validation-20260619 | 1a06a0d | origin/codex/input-standard-forms-validation-20260619 | 0 | `git worktree remove -- "C:\Users\ke919\OneDrive\ドキュメント\1234project\__input_standard_impl_20260619"` |
| 9 | C:/Users/ke919/OneDrive/ドキュメント/1234project/__link_safety_policy_20260620 | codex/link-safety-policy-20260620 | 8484d8f | origin/codex/link-safety-policy-20260620 | 0 | `git worktree remove -- "C:\Users\ke919\OneDrive\ドキュメント\1234project\__link_safety_policy_20260620"` |
| 10 | C:/Users/ke919/OneDrive/ドキュメント/1234project/__match_docs_current_state_20260620 | codex/match-suggestion-docs-current-state-after-44 | 983db72 | origin/codex/match-suggestion-docs-current-state-after-44 | 0 | `git worktree remove -- "C:\Users\ke919\OneDrive\ドキュメント\1234project\__match_docs_current_state_20260620"` |
| 11 | C:/Users/ke919/OneDrive/ドキュメント/1234project/__notion_import_dry_run_20260620 | codex/notion-import-dry-run-20260620 | 3e7f31d | origin/codex/notion-import-dry-run-20260620 | 0 | `git worktree remove -- "C:\Users\ke919\OneDrive\ドキュメント\1234project\__notion_import_dry_run_20260620"` |
| 12 | C:/Users/ke919/OneDrive/ドキュメント/1234project/__person_candidate_display_readonly_20260620 | codex/person-candidate-display-readonly-20260620 | 63ce270 | origin/codex/person-candidate-display-readonly-20260620 | 0 | `git worktree remove -- "C:\Users\ke919\OneDrive\ドキュメント\1234project\__person_candidate_display_readonly_20260620"` |
| 13 | C:/Users/ke919/OneDrive/ドキュメント/1234project/__person_owner_link_api_20260620_v2 | codex/person-owner-link-api-20260620-v2 | 48d15b9 | origin/codex/person-owner-link-api-20260620-v2 | 0 | `git worktree remove -- "C:\Users\ke919\OneDrive\ドキュメント\1234project\__person_owner_link_api_20260620_v2"` |
| 14 | C:/Users/ke919/OneDrive/ドキュメント/1234project/__person_owner_link_api_contract_20260620 | codex/person-owner-link-api-contract-20260620 | c31a96a | origin/codex/person-owner-link-api-contract-20260620 | 0 | `git worktree remove -- "C:\Users\ke919\OneDrive\ドキュメント\1234project\__person_owner_link_api_contract_20260620"` |
| 15 | C:/Users/ke919/OneDrive/ドキュメント/1234project/__person_owner_link_route_preflight_20260620 | codex/person-owner-link-route-preflight-20260620 | 4d48115 | origin/codex/person-owner-link-route-preflight-20260620 | 0 | `git worktree remove -- "C:\Users\ke919\OneDrive\ドキュメント\1234project\__person_owner_link_route_preflight_20260620"` |
| 16 | C:/Users/ke919/OneDrive/ドキュメント/1234project/__person_owner_link_ui_20260620 | codex/person-owner-link-ui-20260620 | 2375d80 | origin/codex/person-owner-link-ui-20260620 | 0 | `git worktree remove -- "C:\Users\ke919\OneDrive\ドキュメント\1234project\__person_owner_link_ui_20260620"` |
| 17 | C:/Users/ke919/OneDrive/ドキュメント/1234project/__progress_snapshot_log_split_20260620 | codex/progress-snapshot-log-split-20260620 | 28cfd00 | origin/codex/progress-snapshot-log-split-20260620 | 0 | `git worktree remove -- "C:\Users\ke919\OneDrive\ドキュメント\1234project\__progress_snapshot_log_split_20260620"` |
| 18 | C:/Users/ke919/OneDrive/ドキュメント/1234project/__project_company_contact_candidate_ui_20260620 | codex/project-company-contact-candidate-ui-20260620 | c6bcc6e | origin/codex/project-company-contact-candidate-ui-20260620 | 0 | `git worktree remove -- "C:\Users\ke919\OneDrive\ドキュメント\1234project\__project_company_contact_candidate_ui_20260620"` |
| 19 | C:/Users/ke919/OneDrive/ドキュメント/1234project/__project_company_contact_link_api_20260620 | codex/project-company-contact-link-api-20260620 | 49f6269 | origin/codex/project-company-contact-link-api-20260620 | 0 | `git worktree remove -- "C:\Users\ke919\OneDrive\ドキュメント\1234project\__project_company_contact_link_api_20260620"` |
| 20 | C:/Users/ke919/OneDrive/ドキュメント/1234project/__project_company_contact_link_contract_20260620 | codex/project-company-contact-link-contract-20260620 | 429af76 | origin/codex/project-company-contact-link-contract-20260620 | 0 | `git worktree remove -- "C:\Users\ke919\OneDrive\ドキュメント\1234project\__project_company_contact_link_contract_20260620"` |
| 21 | C:/Users/ke919/OneDrive/ドキュメント/1234project/__search_precision_20260619 | codex/search-token-precision-20260619 | a2592e5 | origin/codex/search-token-precision-20260619 | 0 | `git worktree remove -- "C:\Users\ke919\OneDrive\ドキュメント\1234project\__search_precision_20260619"` |
| 22 | C:/Users/ke919/OneDrive/ドキュメント/1234project/__theme_progress_20260619 | codex/theme-progress-status-20260619 | c08b584 | origin/codex/theme-progress-status-20260619 | 0 | `git worktree remove -- "C:\Users\ke919\OneDrive\ドキュメント\1234project\__theme_progress_20260619"` |
| 23 | C:/Users/ke919/OneDrive/ドキュメント/1234project/__validation_main_20260618 | codex/post-merge-validation-fixes-20260619 | 3304749 | origin/codex/post-merge-validation-fixes-20260619 | 0 | `git worktree remove -- "C:\Users\ke919\OneDrive\ドキュメント\1234project\__validation_main_20260618"` |
| 24 | C:/Users/ke919/OneDrive/ドキュメント/1234project/__windows_preflight_docs_20260620 | codex/windows-preflight-docs-refresh-20260620 | c5c385a | origin/codex/windows-preflight-docs-refresh-20260620 | 0 | `git worktree remove -- "C:\Users\ke919\OneDrive\ドキュメント\1234project\__windows_preflight_docs_20260620"` |
| 25 | C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1/old/worktrees/market-analysis/__market_analysis_api_v0_worktree | codex/market-analysis-api-v0 | d4895b9 | origin/codex/market-analysis-api-v0 | 0 | `git worktree remove -- "C:\Users\ke919\OneDrive\ドキュメント\1234project\ses_console_vol1\old\worktrees\market-analysis\__market_analysis_api_v0_worktree"` |
| 26 | C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1/old/worktrees/market-analysis/__market_analysis_filters_v02_worktree | codex/market-analysis-filters-v02 | 9f94fa0 | origin/codex/market-analysis-filters-v02 | 0 | `git worktree remove -- "C:\Users\ke919\OneDrive\ドキュメント\1234project\ses_console_vol1\old\worktrees\market-analysis\__market_analysis_filters_v02_worktree"` |
| 27 | C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1/old/worktrees/market-analysis/__market_analysis_logic_v0_worktree | codex/market-analysis-logic-v0 | 5ceed35 | origin/codex/market-analysis-logic-v0 | 0 | `git worktree remove -- "C:\Users\ke919\OneDrive\ドキュメント\1234project\ses_console_vol1\old\worktrees\market-analysis\__market_analysis_logic_v0_worktree"` |
| 28 | C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1/old/worktrees/market-analysis/__market_analysis_mvp_polish_worktree | codex/market-analysis-mvp-polish | 5ee6270 | origin/main | 0 | `git worktree remove -- "C:\Users\ke919\OneDrive\ドキュメント\1234project\ses_console_vol1\old\worktrees\market-analysis\__market_analysis_mvp_polish_worktree"` |
| 29 | C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1/old/worktrees/market-analysis/__market_analysis_page_usability_v01_worktree | codex/market-analysis-page-usability-v01 | 18c15b4 | origin/codex/market-analysis-page-usability-v01 | 0 | `git worktree remove -- "C:\Users\ke919\OneDrive\ドキュメント\1234project\ses_console_vol1\old\worktrees\market-analysis\__market_analysis_page_usability_v01_worktree"` |
| 30 | C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1/old/worktrees/market-analysis/__market_analysis_page_v0_worktree | codex/market-analysis-page-v0 | 2112a17 | origin/codex/market-analysis-page-v0 | 0 | `git worktree remove -- "C:\Users\ke919\OneDrive\ドキュメント\1234project\ses_console_vol1\old\worktrees\market-analysis\__market_analysis_page_v0_worktree"` |
| 31 | C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1/old/worktrees/market-analysis/__market_analysis_period_charts_copy_worktree | codex/market-analysis-period-charts-copy | 83959f9 | origin/codex/market-analysis-period-charts-copy | 0 | `git worktree remove -- "C:\Users\ke919\OneDrive\ドキュメント\1234project\ses_console_vol1\old\worktrees\market-analysis\__market_analysis_period_charts_copy_worktree"` |
| 32 | C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1/old/worktrees/market-analysis/__market_analysis_safe_drilldown_v03_worktree | codex/market-analysis-safe-drilldown-v03 | 9d8ca82 | origin/codex/market-analysis-safe-drilldown-v03 | 0 | `git worktree remove -- "C:\Users\ke919\OneDrive\ドキュメント\1234project\ses_console_vol1\old\worktrees\market-analysis\__market_analysis_safe_drilldown_v03_worktree"` |
| 33 | C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1/old/worktrees/matching/__match_review_requirements_worktree | codex/match-review-requirements | 1d31102 | origin/codex/match-review-requirements | 0 | `git worktree remove -- "C:\Users\ke919\OneDrive\ドキュメント\1234project\ses_console_vol1\old\worktrees\matching\__match_review_requirements_worktree"` |
| 34 | C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1/old/worktrees/matching/__pr_guarded_match_save_ui | codex/guarded-match-suggestion-save-ui | f33265e | origin/codex/guarded-match-suggestion-save-ui | 0 | `git worktree remove -- "C:\Users\ke919\OneDrive\ドキュメント\1234project\ses_console_vol1\old\worktrees\matching\__pr_guarded_match_save_ui"` |
| 35 | C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1/old/worktrees/matching/__pr_match_suggestion_review_update_api | codex/guarded-match-suggestion-review-update-api | 24a1b4c | origin/codex/guarded-match-suggestion-review-update-api | 0 | `git worktree remove -- "C:\Users\ke919\OneDrive\ドキュメント\1234project\ses_console_vol1\old\worktrees\matching\__pr_match_suggestion_review_update_api"` |
| 36 | C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1/old/worktrees/matching/__pr_match_suggestion_review_workflow | codex/match-suggestion-review-workflow-design | 44cc6eb | origin/codex/match-suggestion-review-workflow-design | 0 | `git worktree remove -- "C:\Users\ke919\OneDrive\ドキュメント\1234project\ses_console_vol1\old\worktrees\matching\__pr_match_suggestion_review_workflow"` |
| 37 | C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1/old/worktrees/matching/__pr30_main_verify_worktree | detached | b4a5bae | none/detached | n/a | `git worktree remove -- "C:\Users\ke919\OneDrive\ドキュメント\1234project\ses_console_vol1\old\worktrees\matching\__pr30_main_verify_worktree"` |
| 38 | C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1/old/worktrees/staging-migration/__staging_migrate_pr29 | detached | 34b75e4 | none/detached | n/a | `git worktree remove -- "C:\Users\ke919\OneDrive\ドキュメント\1234project\ses_console_vol1\old\worktrees\staging-migration\__staging_migrate_pr29"` |
| 39 | C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1_person_owner_link_api | codex/person-owner-link-api-20260620 | 90935e5 | origin/main | 0 | `git worktree remove -- "C:\Users\ke919\OneDrive\ドキュメント\1234project\ses_console_vol1_person_owner_link_api"` |
| 40 | C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1_pr21 | codex/pr21-source-preview | e713282 | origin/main | 0 | `git worktree remove -- "C:\Users\ke919\OneDrive\ドキュメント\1234project\ses_console_vol1_pr21"` |
| 41 | C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1_pr75_review_20260620 | detached | 63ce270 | none/detached | n/a | `git worktree remove -- "C:\Users\ke919\OneDrive\ドキュメント\1234project\ses_console_vol1_pr75_review_20260620"` |
| 42 | C:/Users/ke919/OneDrive/ドキュメント/1234project/sesconsole-dependency-security-20260615 | codex/dependency-security-audit-20260615 | 2e18ca8 | origin/codex/dependency-security-audit-20260615 | 0 | `git worktree remove -- "C:\Users\ke919\OneDrive\ドキュメント\1234project\sesconsole-dependency-security-20260615"` |
| 43 | C:/Users/ke919/OneDrive/ドキュメント/1234project/sesconsole-recovery-main-20260614 | codex/recovery-main-alignment-20260614 | 18f1b88 | origin/codex/recovery-main-alignment-20260614 | 0 | `git worktree remove -- "C:\Users\ke919\OneDrive\ドキュメント\1234project\sesconsole-recovery-main-20260614"` |

## Hold / Investigate

Do not delete these in the first cleanup batch.

| # | Worktree path | Branch | HEAD | Reason |
|---:|---|---|---|---|
| 1 | C:/Users/ke919/OneDrive/ドキュメント/1234project/__ai_rules_formalize_20260623 | codex/formalize-ai-work-rules-20260623 | 6730f5f | HEAD is not an ancestor of origin/main. Keep/investigate for unmerged or historical branch work. |
| 2 | C:/Users/ke919/OneDrive/ドキュメント/1234project/__ai_rules_sequence_theme_20260623 | codex/ai-rules-sequence-theme-20260623 | fe166fd | HEAD is not an ancestor of origin/main. Keep/investigate for unmerged or historical branch work. |
| 3 | C:/Users/ke919/OneDrive/ドキュメント/1234project/__ai_rules_task_cycle_20260623 | codex/ai-rules-task-cycle-20260623 | d727509 | HEAD is not an ancestor of origin/main. Keep/investigate for unmerged or historical branch work. |
| 4 | C:/Users/ke919/OneDrive/ドキュメント/1234project/__gmail_company_apply_design_pack_20260623 | codex/gmail-company-apply-design-pack-20260623 | 41168e1 | HEAD is not an ancestor of origin/main. Keep/investigate for unmerged or historical branch work. |
| 5 | C:/Users/ke919/OneDrive/ドキュメント/1234project/__gmail_company_apply_gate_20260623 | codex/gmail-company-apply-gate-20260623 | be72cde | HEAD is not an ancestor of origin/main. Keep/investigate for unmerged or historical branch work. |
| 6 | C:/Users/ke919/OneDrive/ドキュメント/1234project/__gmail_company_boundary_tests_20260623 | codex/gmail-company-boundary-tests-20260623 | a56de75 | HEAD is not an ancestor of origin/main. Keep/investigate for unmerged or historical branch work. |
| 7 | C:/Users/ke919/OneDrive/ドキュメント/1234project/__person_owner_preflight_hardening_20260623 | codex/person-owner-preflight-hardening-20260623 | 977af46 | HEAD is not an ancestor of origin/main. Keep/investigate for unmerged or historical branch work. |
| 8 | C:/Users/ke919/OneDrive/ドキュメント/1234project/__person_owner_readonly_preflight_20260623 | codex/person-owner-readonly-preflight-20260623 | 4a3f9dc | HEAD is not an ancestor of origin/main. Keep/investigate for unmerged or historical branch work. |
| 9 | C:/Users/ke919/OneDrive/ドキュメント/1234project/__post89_progress_sync_20260623 | codex/post89-progress-sync-20260623 | 83b4bab | HEAD is not an ancestor of origin/main. Keep/investigate for unmerged or historical branch work. |
| 10 | C:/Users/ke919/OneDrive/ドキュメント/1234project/__post95_progress_gate_sync_20260623 | codex/post95-progress-gate-sync-20260623 | 15997dd | HEAD is not an ancestor of origin/main. Keep/investigate for unmerged or historical branch work. |
| 11 | C:/Users/ke919/OneDrive/ドキュメント/1234project/__project_company_contact_link_ui_impl_20260620 | codex/project-company-contact-link-ui-20260620 | 954a5c2 | HEAD is not an ancestor of origin/main. Keep/investigate for unmerged or historical branch work. |
| 12 | C:/Users/ke919/OneDrive/ドキュメント/1234project/__qa_project_company_contact_link_20260621 | detached | c7ef8b6 | HEAD is not an ancestor of origin/main. Keep/investigate for unmerged or historical branch work. |
| 13 | C:/Users/ke919/OneDrive/ドキュメント/1234project/__search_history_apply_filters_20260623 | codex/search-history-apply-filters-20260623 | c1fc13f | HEAD is not an ancestor of origin/main. Keep/investigate for unmerged or historical branch work. |
| 14 | C:/Users/ke919/OneDrive/ドキュメント/1234project/__search_history_status_sync_20260623 | codex/search-history-status-sync-20260623 | f412d79 | HEAD is not an ancestor of origin/main. Keep/investigate for unmerged or historical branch work. |
| 15 | C:/Users/ke919/OneDrive/ドキュメント/1234project/__sequence1_db_pre_gate_20260623 | codex/sequence1-db-pre-gate-20260623 | 768d019 | HEAD is not an ancestor of origin/main. Keep/investigate for unmerged or historical branch work. |
| 16 | C:/Users/ke919/OneDrive/ドキュメント/1234project/__worktree_cleanup_inventory_update_20260623 | codex/worktree-cleanup-inventory-update-20260623 | efdee83 | HEAD is not an ancestor of origin/main. Keep/investigate for unmerged or historical branch work. |
| 17 | C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1/__pr_match_suggestion_review_controls | codex/guarded-match-suggestion-review-controls | bec395b | HEAD is not an ancestor of origin/main. Keep/investigate for unmerged or historical branch work. |
| 18 | C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1/old/worktrees/market-analysis/__market_analysis_url_sync_v04_worktree | codex/market-analysis-url-sync-v04 | 088b08e | HEAD is not an ancestor of origin/main. Keep/investigate for unmerged or historical branch work. |
| 19 | C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1_candidate_ui_20260620 | codex/person-company-contact-candidate-ui-20260620 | bf5fc40 | HEAD is not an ancestor of origin/main. Keep/investigate for unmerged or historical branch work. |
| 20 | C:/Users/ke919/OneDrive/ドキュメント/1234project/sesconsole-integration-20260615 | codex/integration-recovery-deps-search-20260615 | 2ab1c3f | HEAD is not an ancestor of origin/main. Keep/investigate for unmerged or historical branch work. |

## Required User Approval

Before any deletion, the user must approve the exact rows and commands from the approval-ready table. Approval of this document should not be interpreted as approval to delete hold/investigate rows, branches, remote branches, or dirty original workspaces.

## Recovery Plan

- Worktree removal deletes the checkout directory only. It does not delete local or remote branches by itself.
- If a removed worktree is needed again, recreate it from the branch or commit with `git worktree add <path> <branch-or-commit>`.
- Branch deletion is explicitly out of scope and requires a separate approval list.

## Explicit Non-Actions

- No worktree deletion was run.
- No branch deletion was run.
- No reset, clean, stash, checkout restore, or file deletion was run.
- No secret file contents, DB files, keys, credentials, cookies, tokens, or env values were read or printed.
- No production/staging/shared DB operation was performed.
