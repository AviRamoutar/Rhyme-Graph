---
id: root-cause
title: Root Cause Analysis
context_files:
  - "logs/**/*"
  - "src/**/*.ts"
tools_required:
  - read_file
  - grep
success_criteria: "Root cause identified with supporting evidence"
---

With the incident mitigated, investigate the underlying cause. Use the "5 Whys" technique to go beyond the proximate cause. Collect logs, metrics, and code changes that contributed to the failure.
