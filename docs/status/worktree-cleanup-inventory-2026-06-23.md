# Worktree Cleanup Inventory 2026-06-23

Observed at: 2026-06-23 18:25 JST

Scope: docs-only sanitized inventory. No worktree deletion, branch deletion, reset, clean, stash, merge, or other-worktree mutation was performed for this document.

これは削除前の安全確認用台帳であり、この文書だけでは何も削除しません。

This inventory intentionally does not print raw git status filenames. It records counts only, so secret-looking filenames and local DB filenames are not exposed.

## Summary

| Category | Count |
|---|---:|
| KEEP_OR_INVESTIGATE | 32 |
| POSSIBLE_CLEANUP_CANDIDATE | 63 |

## Meaning of Categories

| Category | Meaning |
|---|---|
| KEEP | Do not delete. Known active/original workspace or explicitly protected. |
| KEEP_OR_INVESTIGATE | Dirty, untracked, or protected-like entries exist. Do not delete without manual owner review. |
| INVESTIGATE | Status unavailable or ownership unclear. Do not delete yet. |
| POSSIBLE_CLEANUP_CANDIDATE | Clean by sanitized status, but still requires PR/branch ownership review and explicit user approval before deletion. |

## Sanitized Worktree Ledger

| Worktree path | Branch | HEAD | Tracked dirty count | Untracked count | Protected-like path count | Category | Reason |
|---|---|---|---:|---:|---:|---|---|
| C:/Users/ke919/AppData/Local/Temp/ses_console_gmail_person_fix_wt | codex/fix-gmail-person-create-review | 07974c1 | 101 | 0 | 0 | KEEP_OR_INVESTIGATE | Dirty/untracked/protected-like entries present; do not delete without manual review. |
| C:/Users/ke919/AppData/Local/Temp/ses_console_main_browserqa_20260620_195137 | detached | cedd740 | 3 | 2 | 0 | KEEP_OR_INVESTIGATE | Dirty/untracked/protected-like entries present; do not delete without manual review. |
| C:/Users/ke919/AppData/Local/Temp/ses_console_vol1_docs_backlog_worktree | codex/add-remediation-backlog-docs | 0f64c3b | 116 | 0 | 0 | KEEP_OR_INVESTIGATE | Dirty/untracked/protected-like entries present; do not delete without manual review. |
| C:/Users/ke919/AppData/Local/Temp/ses_console_vol1_gmail_quality_worktree | codex/gmail-extraction-quality-audit-eval | ecd10bf | 120 | 0 | 0 | KEEP_OR_INVESTIGATE | Dirty/untracked/protected-like entries present; do not delete without manual review. |
| C:/Users/ke919/AppData/Local/Temp/ses_console_vol1_main_verify_pr16 | detached | f72a93d | 120 | 0 | 0 | KEEP_OR_INVESTIGATE | Dirty/untracked/protected-like entries present; do not delete without manual review. |
| C:/Users/ke919/AppData/Local/Temp/ses_console_vol1_main_verify_pr17 | detached | 547d654 | 125 | 0 | 0 | KEEP_OR_INVESTIGATE | Dirty/untracked/protected-like entries present; do not delete without manual review. |
| C:/Users/ke919/AppData/Local/Temp/ses_console_vol1_main_verify_pr20 | detached | e713282 | 133 | 0 | 0 | KEEP_OR_INVESTIGATE | Dirty/untracked/protected-like entries present; do not delete without manual review. |
| C:/Users/ke919/AppData/Local/Temp/ses_console_vol1_pr13_worktree | codex/add-safe-gmail-remediation-batch-apply | 8f537d3 | 102 | 0 | 0 | KEEP_OR_INVESTIGATE | Dirty/untracked/protected-like entries present; do not delete without manual review. |
| C:/Users/ke919/AppData/Local/Temp/ses_console_vol1_pr14_worktree | codex/supervised-gmail-person-remediation-batch | 8e2d7f4 | 105 | 0 | 0 | KEEP_OR_INVESTIGATE | Dirty/untracked/protected-like entries present; do not delete without manual review. |
| C:/Users/ke919/AppData/Local/Temp/ses_console_vol1_pr17_source_inventory | codex/source-tracking-inventory-docs | a57da41 | 125 | 0 | 0 | KEEP_OR_INVESTIGATE | Dirty/untracked/protected-like entries present; do not delete without manual review. |
| C:/Users/ke919/AppData/Local/Temp/ses_console_vol1_pr18_csv_dry_run | codex/csv-import-dry-run-mvp | 72b73cf | 130 | 0 | 0 | KEEP_OR_INVESTIGATE | Dirty/untracked/protected-like entries present; do not delete without manual review. |
| C:/Users/ke919/AppData/Local/Temp/ses_console_vol1_pr19_csv_dupe_auto | codex/csv-dry-run-duplicate-auto | ebf4172 | 130 | 0 | 0 | KEEP_OR_INVESTIGATE | Dirty/untracked/protected-like entries present; do not delete without manual review. |
| C:/Users/ke919/AppData/Local/Temp/ses_console_vol1_pr20_source_tracking_schema | codex/import-source-tracking-schema | 01a7c05 | 133 | 0 | 0 | KEEP_OR_INVESTIGATE | Dirty/untracked/protected-like entries present; do not delete without manual review. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1 | codex/market-analysis-docs | e067dc9 | 20 | 30 | 0 | KEEP_OR_INVESTIGATE | Dirty/untracked/protected-like entries present; do not delete without manual review. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1/__restore_console_ui_regression_20260615 | main | db0c60b | 19 | 11 | 0 | KEEP_OR_INVESTIGATE | Dirty/untracked/protected-like entries present; do not delete without manual review. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1/old/worktrees/market-analysis/__market_analysis_anonymous_drilldown_v05_clean_worktree | codex/market-analysis-anonymous-drilldown-v05-clean | f803bd2 | 1 | 0 | 0 | KEEP_OR_INVESTIGATE | Dirty/untracked/protected-like entries present; do not delete without manual review. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1/old/worktrees/market-analysis/__market_analysis_anonymous_drilldown_v05_rebased_worktree | codex/market-analysis-anonymous-drilldown-v05-rebased | 82f1ea0 | 1 | 0 | 0 | KEEP_OR_INVESTIGATE | Dirty/untracked/protected-like entries present; do not delete without manual review. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1/old/worktrees/market-analysis/__market_analysis_anonymous_drilldown_v05_worktree | codex/market-analysis-anonymous-drilldown-v05 | b3069a2 | 5 | 3 | 0 | KEEP_OR_INVESTIGATE | Dirty/untracked/protected-like entries present; do not delete without manual review. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1/old/worktrees/matching/__pr_match_suggestion_save_api | codex/supervised-match-suggestion-save-api | 7bb20b4 | 1 | 0 | 0 | KEEP_OR_INVESTIGATE | Dirty/untracked/protected-like entries present; do not delete without manual review. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1/old/worktrees/matching/__pr_saved_match_suggestion_ui | codex/saved-match-suggestion-review-ui | 0e05582 | 1 | 0 | 0 | KEEP_OR_INVESTIGATE | Dirty/untracked/protected-like entries present; do not delete without manual review. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1/old/worktrees/matching/__pr24_worktree | codex/pr24-matching-dry-run | 637cb41 | 1 | 0 | 0 | KEEP_OR_INVESTIGATE | Dirty/untracked/protected-like entries present; do not delete without manual review. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1/old/worktrees/matching/__pr25_worktree | codex/pr25-matching-review-ui | 1b8dfe6 | 1 | 0 | 0 | KEEP_OR_INVESTIGATE | Dirty/untracked/protected-like entries present; do not delete without manual review. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1/old/worktrees/matching/__pr26_worktree | codex/pr26-matching-review-usability | d314632 | 1 | 0 | 0 | KEEP_OR_INVESTIGATE | Dirty/untracked/protected-like entries present; do not delete without manual review. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1/old/worktrees/matching/__pr27_worktree | codex/pr27-match-suggestion-design | dbe2876 | 1 | 0 | 0 | KEEP_OR_INVESTIGATE | Dirty/untracked/protected-like entries present; do not delete without manual review. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1/old/worktrees/matching/__pr28_worktree | codex/pr28-match-suggestion-schema | 75c418d | 1 | 0 | 0 | KEEP_OR_INVESTIGATE | Dirty/untracked/protected-like entries present; do not delete without manual review. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1/old/worktrees/matching/__pr30_match_suggestion_api_worktree | codex/pr30-saved-match-suggestion-apis | 4d3d925 | 1 | 0 | 0 | KEEP_OR_INVESTIGATE | Dirty/untracked/protected-like entries present; do not delete without manual review. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1/old/worktrees/source-import/__pr21_worktree | codex/pr21-source-preview-worktree | 92465ef | 1 | 0 | 0 | KEEP_OR_INVESTIGATE | Dirty/untracked/protected-like entries present; do not delete without manual review. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1/old/worktrees/source-import/__pr22_worktree | codex/pr22-csv-source-apply | 50cb209 | 1 | 0 | 0 | KEEP_OR_INVESTIGATE | Dirty/untracked/protected-like entries present; do not delete without manual review. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1/old/worktrees/source-import/__pr23_worktree | codex/pr23-import-review-ui | 8f40efa | 1 | 0 | 0 | KEEP_OR_INVESTIGATE | Dirty/untracked/protected-like entries present; do not delete without manual review. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1/old/worktrees/staging-migration/__staging_migrate_pr29_neon | detached | 5ee6270 | 1 | 0 | 0 | KEEP_OR_INVESTIGATE | Dirty/untracked/protected-like entries present; do not delete without manual review. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1/old/worktrees/staging-migration/__staging_migrate_pr29_retry | detached | b4a5bae | 1 | 0 | 0 | KEEP_OR_INVESTIGATE | Dirty/untracked/protected-like entries present; do not delete without manual review. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/sesconsole-search-history-20260615 | detached | d44d7e3 | 13 | 0 | 0 | KEEP_OR_INVESTIGATE | Dirty/untracked/protected-like entries present; do not delete without manual review. |
| C:/Users/ke919/AppData/Local/Temp/ses_console_main_browserqa_20260620_200600 | detached | cedd740 | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean detached worktree; still requires owner approval and exact deletion command. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/__ai_rules_formalize_20260623 | codex/formalize-ai-work-rules-20260623 | 6730f5f | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/__ai_rules_sequence_theme_20260623 | codex/ai-rules-sequence-theme-20260623 | fe166fd | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/__ai_rules_task_cycle_20260623 | codex/ai-rules-task-cycle-20260623 | d727509 | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/__company_contact_write_contract_20260620 | codex/company-contact-write-contract-20260620 | a78c561 | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/__docs_sync_after_pr87_20260620 | codex/docs-sync-after-pr87-20260620 | d104e06 | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/__entity_edit_contract_20260620 | codex/entity-edit-contract-20260620 | a114b71 | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/__gmail_company_apply_design_pack_20260623 | codex/gmail-company-apply-design-pack-20260623 | 41168e1 | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/__gmail_company_apply_gate_20260623 | codex/gmail-company-apply-gate-20260623 | be72cde | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/__gmail_company_boundary_tests_20260623 | codex/gmail-company-boundary-tests-20260623 | a56de75 | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/__gmail_company_candidate_20260619 | codex/gmail-company-candidate-readonly-20260619 | 0489686 | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/__gmail_readonly_preview_20260620 | codex/gmail-readonly-preview-20260620 | cedd740 | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/__input_standard_docs_20260619 | codex/input-standard-field-definition-20260619 | c2a1641 | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/__input_standard_impl_20260619 | codex/input-standard-forms-validation-20260619 | 1a06a0d | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/__link_safety_policy_20260620 | codex/link-safety-policy-20260620 | 8484d8f | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/__match_docs_current_state_20260620 | codex/match-suggestion-docs-current-state-after-44 | 983db72 | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/__notion_import_dry_run_20260620 | codex/notion-import-dry-run-20260620 | 3e7f31d | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/__person_candidate_display_readonly_20260620 | codex/person-candidate-display-readonly-20260620 | 63ce270 | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/__person_owner_link_api_20260620_v2 | codex/person-owner-link-api-20260620-v2 | 48d15b9 | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/__person_owner_link_api_contract_20260620 | codex/person-owner-link-api-contract-20260620 | c31a96a | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/__person_owner_link_route_preflight_20260620 | codex/person-owner-link-route-preflight-20260620 | 4d48115 | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/__person_owner_link_ui_20260620 | codex/person-owner-link-ui-20260620 | 2375d80 | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/__person_owner_preflight_hardening_20260623 | codex/person-owner-preflight-hardening-20260623 | 977af46 | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/__person_owner_readonly_preflight_20260623 | codex/person-owner-readonly-preflight-20260623 | 4a3f9dc | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/__post89_progress_sync_20260623 | codex/post89-progress-sync-20260623 | 83b4bab | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/__post95_progress_gate_sync_20260623 | codex/post95-progress-gate-sync-20260623 | 15997dd | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/__progress_snapshot_log_split_20260620 | codex/progress-snapshot-log-split-20260620 | 28cfd00 | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/__project_company_contact_candidate_ui_20260620 | codex/project-company-contact-candidate-ui-20260620 | c6bcc6e | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/__project_company_contact_link_api_20260620 | codex/project-company-contact-link-api-20260620 | 49f6269 | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/__project_company_contact_link_contract_20260620 | codex/project-company-contact-link-contract-20260620 | 429af76 | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/__project_company_contact_link_ui_impl_20260620 | codex/project-company-contact-link-ui-20260620 | 954a5c2 | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/__qa_project_company_contact_link_20260621 | detached | c7ef8b6 | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean detached worktree; still requires owner approval and exact deletion command. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/__search_history_apply_filters_20260623 | codex/search-history-apply-filters-20260623 | c1fc13f | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/__search_history_status_sync_20260623 | codex/search-history-status-sync-20260623 | f412d79 | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/__search_precision_20260619 | codex/search-token-precision-20260619 | a2592e5 | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/__sequence1_db_pre_gate_20260623 | codex/sequence1-db-pre-gate-20260623 | 768d019 | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/__theme_progress_20260619 | codex/theme-progress-status-20260619 | c08b584 | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/__validation_main_20260618 | codex/post-merge-validation-fixes-20260619 | 3304749 | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/__windows_preflight_docs_20260620 | codex/windows-preflight-docs-refresh-20260620 | c5c385a | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/__worktree_cleanup_inventory_update_20260623 | codex/worktree-cleanup-inventory-update-20260623 | 293fa3b | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1/__pr_match_suggestion_review_controls | codex/guarded-match-suggestion-review-controls | bec395b | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1/old/worktrees/market-analysis/__market_analysis_api_v0_worktree | codex/market-analysis-api-v0 | d4895b9 | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1/old/worktrees/market-analysis/__market_analysis_filters_v02_worktree | codex/market-analysis-filters-v02 | 9f94fa0 | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1/old/worktrees/market-analysis/__market_analysis_logic_v0_worktree | codex/market-analysis-logic-v0 | 5ceed35 | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1/old/worktrees/market-analysis/__market_analysis_mvp_polish_worktree | codex/market-analysis-mvp-polish | 5ee6270 | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1/old/worktrees/market-analysis/__market_analysis_page_usability_v01_worktree | codex/market-analysis-page-usability-v01 | 18c15b4 | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1/old/worktrees/market-analysis/__market_analysis_page_v0_worktree | codex/market-analysis-page-v0 | 2112a17 | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1/old/worktrees/market-analysis/__market_analysis_period_charts_copy_worktree | codex/market-analysis-period-charts-copy | 83959f9 | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1/old/worktrees/market-analysis/__market_analysis_safe_drilldown_v03_worktree | codex/market-analysis-safe-drilldown-v03 | 9d8ca82 | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1/old/worktrees/market-analysis/__market_analysis_url_sync_v04_worktree | codex/market-analysis-url-sync-v04 | 088b08e | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1/old/worktrees/matching/__match_review_requirements_worktree | codex/match-review-requirements | 1d31102 | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1/old/worktrees/matching/__pr_guarded_match_save_ui | codex/guarded-match-suggestion-save-ui | f33265e | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1/old/worktrees/matching/__pr_match_suggestion_review_update_api | codex/guarded-match-suggestion-review-update-api | 24a1b4c | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1/old/worktrees/matching/__pr_match_suggestion_review_workflow | codex/match-suggestion-review-workflow-design | 44cc6eb | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1/old/worktrees/matching/__pr30_main_verify_worktree | detached | b4a5bae | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean detached worktree; still requires owner approval and exact deletion command. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1/old/worktrees/staging-migration/__staging_migrate_pr29 | detached | 34b75e4 | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean detached worktree; still requires owner approval and exact deletion command. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1_candidate_ui_20260620 | codex/person-company-contact-candidate-ui-20260620 | bf5fc40 | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1_person_owner_link_api | codex/person-owner-link-api-20260620 | 90935e5 | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1_pr21 | codex/pr21-source-preview | e713282 | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/ses_console_vol1_pr75_review_20260620 | detached | 63ce270 | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean detached worktree; still requires owner approval and exact deletion command. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/sesconsole-dependency-security-20260615 | codex/dependency-security-audit-20260615 | 2e18ca8 | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/sesconsole-integration-20260615 | codex/integration-recovery-deps-search-20260615 | 2ab1c3f | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |
| C:/Users/ke919/OneDrive/ドキュメント/1234project/sesconsole-recovery-main-20260614 | codex/recovery-main-alignment-20260614 | 18f1b88 | 0 | 0 | 0 | POSSIBLE_CLEANUP_CANDIDATE | Clean branch worktree; requires PR/branch ownership review before deletion. |

## Required Approval Before Any Deletion

Before deleting any worktree, prepare a separate approval list with:

1. exact worktree path;
2. branch and HEAD;
3. sanitized dirty/untracked/protected-like counts;
4. related PR/issue, or `none known`;
5. unpushed commit check;
6. explicit deletion command;
7. rollback/recovery plan.

Deletion remains forbidden until the user approves the exact list and commands. Do not delete the original dirty workspace, active worktrees, worktrees with dirty/untracked/protected-like entries, or worktrees with unknown ownership.

## Explicit Non-Actions

- No delete command was run.
- No cleanup command was run.
- No other worktree files were edited.
- No secret file contents, DB files, keys, credentials, or env files were read.
- No raw protected filenames were printed in this inventory.
- No PR, remote branch, local branch, or git ref was changed.
