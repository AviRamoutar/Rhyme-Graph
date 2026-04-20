---
id: train
title: Run Training
context_files:
  - "configs/**/*.yaml"
  - "logs/**/*.log"
tools_required:
  - run_terminal_command
  - read_file
success_criteria: "Training completed without errors, checkpoints saved"
---

Launch the training run with the configured parameters. Monitor loss curves and resource utilization. Save checkpoints at regular intervals for evaluation.
