---
id: evaluate
title: Evaluate Results
context_files:
  - "results/**/*"
  - "logs/**/*.log"
tools_required:
  - read_file
  - run_terminal_command
success_criteria: "Results analyzed against hypothesis metrics, decision made on next steps"
---

Run evaluation on the trained model. Compare against baselines and the metrics defined in the hypothesis. If results are inconclusive or suggest a new direction, transition back to the hypothesis node to iterate.
