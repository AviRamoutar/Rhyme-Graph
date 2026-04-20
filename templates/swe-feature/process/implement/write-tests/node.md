---
id: write-tests
title: Write Tests First
context_files:
  - "src/**/*.test.ts"
tools_required:
  - read_file
  - write_file
  - run_terminal_command
success_criteria: "Test cases covering the new behavior are written and initially failing"
---

Write test cases that describe the expected behavior of the new feature. These tests should fail initially since the feature hasn't been implemented yet.

Focus on:
- Happy path scenarios
- Edge cases identified during the understand phase
- Error handling behavior
- Integration with existing components
