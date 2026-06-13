# test/ KNOWLEDGE BASE

## OVERVIEW

`test/` combines Tree-sitter golden corpus fixtures with parse-only zsh files used for smoke and real-world coverage.

## STRUCTURE

```text
test/
  corpus/          # expected parse trees inline with fixtures
  samples/         # real-world parse-only zsh samples
  spec-smoke.zsh   # single representative smoke fixture
```

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| Add exact parse expectations | `corpus/*.txt` | Use Tree-sitter corpus format with inline expected trees. |
| Cover real-world startup/plugin syntax | `samples/*.zsh` | Parse-only fixtures; no tree snapshots. |
| Add broad smoke coverage | `spec-smoke.zsh` | One zsh file checked by `scripts/spec-smoke.sh`. |
| Run all golden tests | `../package.json` | `npm test` runs `tree-sitter test`. |
| Run sample parse gate | `../scripts/sample-parse.sh` | `npm run test:samples`; supports `SAMPLE_DIR`. |
| Run spec smoke gate | `../scripts/spec-smoke.sh` | `npm run test:spec-smoke`. |

## CONVENTIONS

- Corpus files are the only tests with committed expected parse trees.
- Sample fixtures and `spec-smoke.zsh` must pass `zsh -n` before Tree-sitter parsing is checked.
- The custom runners fail when `tree-sitter parse -q` output contains `ERROR`.
- Add `.zshrc`-style coverage when real-world failures are discovered; this is a first-class project goal.
- Prefer small focused corpus cases for grammar regressions, then add sample fixtures for broad source realism.

## ANTI-PATTERNS

- Do not paste expected trees into `samples/*.zsh`; samples are source fixtures only.
- Do not add runtime-behavior assertions here. These tests validate parse structure and parse success.
- Do not make a sample syntactically invalid for zsh unless the runner is changed intentionally, because `zsh -n` is part of the gate.
- Do not update corpus expectations without also rerunning `npm test`.

## NOTES

- Existing corpus groups cover commands, compliance, control flow, functions, regressions, and general zsh syntax.
- `test-zsh-regressions.txt` is for previously broken parser-visible forms.
- The sample runner auto-discovers `*.zsh` under `test/samples/` unless `SAMPLE_DIR` is set.
