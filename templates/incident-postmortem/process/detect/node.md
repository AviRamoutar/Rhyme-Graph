---
id: detect
title: Detect the Incident
context_files:
  - "logs/**/*"
  - "alerts/**/*.yaml"
tools_required:
  - read_file
  - grep
success_criteria: "Incident confirmed with initial severity assessment"
---

Identify the incident from alerts, user reports, or monitoring dashboards. Confirm the impact scope and establish initial severity level. Begin the incident timeline.
