---
title: Research Mission Control Knowledge Index
status: active
language: en
updated: 2026-08-23
---

# Research Mission Control Knowledge Index

This directory contains the publication Knowledge Core of the reusable method. The repository is authoritative for role contracts, initialization, communication, and verification behavior. Source artifacts, generated workspaces, tests, and inspected Git state provide the evidence for implemented behavior.

## Entry and integration

| Document | Function | Authority |
| --- | --- | --- |
| [`project.md`](project.md) | purpose, system boundary, role model, completion, and publication boundary | canonical project description |
| [`integration.md`](integration.md) | component, knowledge, transport, grounding, and write-back relationship | canonical repository integration contract |

## Core method

| Document | Function |
| --- | --- |
| [`orchestration-architecture.md`](orchestration-architecture.md) | role, authority, exchange, scaling, and verification model |
| [`research-to-operations-handoff.md`](research-to-operations-handoff.md) | assignment, result, finding, acceptance, and callback contract |
| [`project-governance.md`](project-governance.md) | optional project authority, rights, publication, and write-back rules |
| [`orchestration-thresholds.md`](orchestration-thresholds.md) | criteria for direct work, delegation, hierarchy, and verification form |
| [`method-specification.md`](method-specification.md) | portable requirements, reference deployment, and method decisions |

## Observed operation

[`observed-context-stream-operation.md`](observed-context-stream-operation.md) records de-identified evidence from a two-orchestrator Context Stream pilot. Observations support specific protocol claims after review. They do not establish universal behavior for models, harnesses, permissions, or notification routes.

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
