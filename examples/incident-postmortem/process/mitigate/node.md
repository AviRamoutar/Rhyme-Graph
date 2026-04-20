---
id: mitigate
title: Mitigate Impact
context_files:
  - "src/**/*.ts"
  - "configs/**/*.yaml"
tools_required:
  - read_file
  - write_file
  - run_terminal_command
success_criteria: "User-facing impact eliminated or significantly reduced"
---

Apply immediate fixes to stop the bleeding: rollback, feature flag toggle, traffic rerouting, or hotfix deployment. The goal is to restore service, not to find the perfect fix.
