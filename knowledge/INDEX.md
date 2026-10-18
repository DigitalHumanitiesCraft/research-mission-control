---
title: Research Mission Control Knowledge Index
status: active
language: en
updated: 2026-10-18
---

# Research Mission Control Knowledge Index

This directory contains the publication Knowledge Core and source-only evidence, proposals and operational records. The publication manifest selects the distributable subset. The repository is authoritative for role contracts, initialization, communication, and verification behavior. Source artifacts, generated workspaces, tests, and inspected Git state provide the evidence for implemented behavior.

## Entry and integration

| Document | Function | Authority |
| --- | --- | --- |
| [`system-description.md`](system-description.md) | Atlas source, assignment, examination, corrected knowledge, dependent reuse and local setup | explanatory reading route; linked contracts govern |
| [`project.md`](project.md) | purpose, system boundary, role model, completion, and publication boundary | canonical project description |
| [`integration.md`](integration.md) | component ownership, knowledge, transport, write-back and public documentation build | canonical repository integration contract |

## Reading routes

- For the static authored interface example, read [the demo package](../demo/README.md) and its [source contract](../demo/docs/source-contract.md). The release metadata and exact manifests bind the demonstrated code and fiction.
- For an explanatory account of the whole workflow, read `system-description.md`.
- For the purpose and scope, read `project.md`, then `integration.md` for the relationship to the private Second Brain deployment.
- For a requested operator status round, use [Operator briefing](research-to-operations-handoff.md#operator-briefing) and [Operator briefing transport](integration.md#operator-briefing-transport).
- For delegation and assessment, read `research-to-operations-handoff.md` and the relevant role contract. Verification and human acceptance have different authority.
- For current private interface behavior, use the interface repository's own Knowledge Index. The dated console proposals below preserve research inputs and cannot substitute for its maintained specification or browser evidence.
- For source continuation, read `handoff.md`. Its release observations retain their original dates and do not establish a fresh check of this worktree.

## Core method

| Document | Function |
| --- | --- |
| [`orchestration-architecture.md`](orchestration-architecture.md) | role, authority, exchange, scaling, and verification model |
| [`research-to-operations-handoff.md`](research-to-operations-handoff.md) | assignment, result, finding, acceptance, and callback contract |
| [`project-governance.md`](project-governance.md) | optional project authority, rights, publication, and write-back rules |
| [`orchestration-thresholds.md`](orchestration-thresholds.md) | criteria for direct work, delegation, hierarchy, and verification form |
| [`method-specification.md`](method-specification.md) | portable requirements, reference deployment, and method decisions |
| [`deterministic-checks.md`](deterministic-checks.md) | machine-decidable completion criteria per project type, command forms, and the judgment delimitation |
| [knowledge-adapters.md](knowledge-adapters.md) | configurable local Markdown sources and the existing UI catalog contract |

## Observed operation

| Document | Observation scope |
| --- | --- |
| [`observed-context-stream-operation.md`](observed-context-stream-operation.md) | de-identified evidence from a two-orchestrator Context Stream pilot and a portable-package probe |
| [`observed-live-demo-operation.md`](observed-live-demo-operation.md) | evaluated public recording of an earlier live working session, including role drift, artifact rejection, and human steering |

Observed cases support only the protocol or method claims named in their evidence boundaries. They do not establish universal behavior for models, harnesses, permissions, notification routes, scholarly validity, or human acceptance of the current release.

## Source-repository proposals

These four documents preserve the vault pilot's proposal state of 15 October 2026. The proposed contract replacements and repository migration are unexecuted except for the dated optional skill-routing clarification in pilot-reconciliation.md. File inventories, vocabulary and interface observations require reinspection before reuse. They stay outside the publication bundle. They are named without links because the bundle's link check reads this index.

| Document | Function |
| --- | --- |
| `pilot-reconciliation.md` | comparison of the six role contracts with the pilot's flat operator model, with proposed sentence replacements per contract |
| `mission-control-contract.md` | data contract of Mission Control as the console of the method, its operator and vault adapters, the write-back path and what a fork must provide |
| `mission-control-fixtures.md` | inventory of the console repository's tracked files that carry real project statements, with a proposal per file |
| `mission-control-move-plan.md` | unexecuted plan for moving the console repository into `mission-control/` of this repository with its history |

## Internal handoff evidence

`context-regest-findings.md` records the closed transcript-indexing experiment, its reported pilot limits and the comparison with the existing handoff contract. It is internal source-repository knowledge and is excluded from the publication bundle. Its findings do not establish improved continuation or commission a new experiment.

## Source-only manuscript

research-artefacts/research-mission-control-method-paper.md carries the English draft Research Mission Control: Coordinating Research with an Agentic Zettelkasten. Definitions, the source-only process figure research-artefacts/agentic-zettelkasten-process.svg and the repository implementation explain note relationships, harness execution and checked write-back. A constructed synthesis case follows an inclusion-criterion change through dependent records. Proposed resumption and correction experiments compare knowledge structures while holding role and verification procedures constant. They have not been conducted. The manuscript is excluded from the publication bundle. The maintained conceptual scope is in project.md; operational and verification contracts remain at their existing maintenance locations.

correspondence-evaluation-plan.md retains an earlier source-only candidate study design. The human user rejected the correspondence running example for the paper, and the experimental material remains unselected. It specifies matched single-document and linked-note conditions, candidate task families, assessment criteria and execution limits. It is excluded from the publication bundle.

## Source-only navigation

- `skill-workflows.md` explains personal versus portable skills, communication evidence and the scope of their maintenance checks. It is a source-only guide; role and integration contracts govern execution.
- `specification.md` is the compatibility pointer to the internal contract at `dashboard/specification.md`. The portable requirements live in `method-specification.md`.
- `journal.md` preserves dated decisions, implementation transitions and their reported checks.
- `handoff.md` records unresolved continuation inputs and release acceptance work.

These files are named without Markdown links because this index also ships in the public bundle, which excludes them.

## Source-repository boundary

The working source repository can also contain an operational dashboard, situation view, reports, case material, runtime messages, historical interface specifications, and the current `knowledge/handoff.md`. The handoff contains unresolved received deltas only; resolved content belongs in its canonical document and provenance record rather than an archive inside the handoff. These source files can carry local portfolio state or unfinished release information and are excluded from the publication bundle. Their absence does not remove a dependency of the portable method because the published initializer, role contracts, Knowledge Core, and tests are self-contained.

## Source precedence

Resolve a conflict according to the kind of state being claimed. No single document is authoritative for every state class.

| State class | Precedence |
| --- | --- |
| Authority | current explicit human user decisions and applicable governance or local instructions, then the project integration contract; tool access and writable paths never confer authority |
| Epistemic | direct sources and evidence, then maintained project knowledge and the current specification; later interpretation records supersede earlier ones only when they identify the supported transition |
| Operational | inspected artifacts, repositories, data, and running-system state, then tests or captured observations; briefs, notices, dashboards, and reports are claims about that state |
| Verification | the complete finding and its cited evidence for the examined scope, followed by any documented recheck; technical conformance, domain validation, and Human acceptance remain separate judgements |

More specific current instructions govern within their authority boundary. Historical records, observed cases, and messages preserve provenance or direct attention to evidence but do not override current state. When two sources of the same class still conflict, expose the conflict and obtain the responsible integration judgement instead of silently selecting the most convenient record.
