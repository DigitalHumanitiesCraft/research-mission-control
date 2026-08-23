# Role and Bootstrap Prompts

This directory contains the portable prompt layer for Research Mission Control.
The three canonical role prompts are:

| Session | Canonical prompt | Accountable function |
| --- | --- | --- |
| 1 | [`research-orchestrator.md`](research-orchestrator.md) | develops objectives, criteria, interpretations, and Implementation Briefs with the operator |
| 2 | [`operational-orchestrator.md`](operational-orchestrator.md) | implements accepted briefs, coordinates bounded Specialists, and returns Results with Evidence |
| 3 | [`verification-context.md`](verification-context.md) | examines artifacts independently and reports Verification Findings directly to the operator |

The Independent Verification Context is a separate read-only control perspective,
not a third Postdoc Orchestrator. Its complete finding goes first and only to the
Operator. Only the Operator decides whether to route its finding to Research or
Operations. Independent mode separates the assessment context. Blind mode adds a
declared reading-order restriction. Shadow mode additionally requires verified
technical isolation, a private Operator route, and omission from production
contracts. None of these labels supplies a secrecy or security guarantee.
Verification reports and rechecks; it never produces the correction.

[`bootstrap.md`](bootstrap.md) selects the smallest sufficient configuration and,
when three separate sessions are justified, binds all three prompts to one verified
workspace and canonical configuration. The installable
`skills/research-mission-control/` initializer creates the corresponding local
project structure. Add exactly one thin harness mapping from
[`adapters/codex.md`](adapters/codex.md) or
[`adapters/claude-code.md`](adapters/claude-code.md).

## Exchange contract

```text
Operator <-> Research Orchestrator
                |
                | Implementation Brief
                v
         Operational Orchestrator
          |                      |
          | Operations Result    | Result with Evidence
          | Notice               |
          v                      v
       Research          Verification Context
                                 |
                                 | complete Verification Finding
                                 v
                              Operator

Operator -- optional disclosure and routing --> Research or Operations
```

Persistent cross-session messages use the Context Stream Protocol:

- each role writes only to its immutable role-owned outbox;
- each recipient advances sender cursors in its own state after successful processing;
- messages keep stable thread identifiers and reference canonical artifacts;
- task notices and result notices may wake a session but are not knowledge sources;
- a shared file never establishes a universal wake guarantee;
- every configured route therefore records observed notification behavior and a polling, re-entry, or operator-mediated fallback;
- capsule thresholds are project-profile settings rather than protocol constants.

Historical paths remain as compatibility pointers:

- `knowledge-orchestrator.md` points to `research-orchestrator.md`;
- `verification-orchestrator.md` points to `verification-context.md`;
- root `ORCHESTRATOR.md` points to `operational-orchestrator.md`.

## Verification

Run from the repository root:

```bash
python orchestrators/test_research_orchestrator_prompt.py
python orchestrators/test_bootstrap_prompt.py
```

The scenario sets are in `evals/research-orchestrator.json` and
`evals/bootstrap.json`. They test review without activation, proportional
orchestration, operator authority, shared-workspace initialization, Context Stream
integrity, notification asymmetry, and independent verification.
