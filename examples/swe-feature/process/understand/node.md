---
id: understand
title: Understand the Problem
context_files:
  - "src/**/*.ts"
  - "docs/**/*.md"
tools_required:
  - read_file
  - grep
success_criteria: "Clear problem statement documented with identified constraints and edge cases"
---

Read the relevant source code and documentation to understand the current behavior and the desired change. Identify the modules and interfaces that will be affected.

## Common Pitfalls

- Jumping to implementation before understanding existing patterns
- Missing edge cases in the current error handling
- Not checking for related tests that exercise the affected code paths
- Overlooking configuration or environment-specific behavior
