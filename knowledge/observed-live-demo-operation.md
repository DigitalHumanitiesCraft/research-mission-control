---
title: Observed Live-Demo Operation
status: observed-operation
language: en
updated: 2026-10-17
related: [project, method-specification, research-to-operations-handoff, observed-context-stream-operation]
---

# Observed Live-Demo Operation

## Observation scope

The public video [*Research Mission Control: Eine Forschungsleitstelle mit mehreren KI-Agenten | Live-Demo*](https://www.youtube.com/watch?v=B7TCJjcVA2k) records an uncut German-language working session of approximately 93 minutes. The session applies an earlier Research Mission Control configuration to the preparation of research and teaching material. It shows human direction, conceptual synthesis, operational production, specialist delegation, file-based exchange, verification activity, and artifact review in one continuous case.

The recording is an observation source. It does not define the current method contract. The current system prompt, role contracts, and Knowledge Core govern where the recorded terminology or behavior differs from the maintained RC2 method.

## Observed sequence

| Segment | Observed operation | Evidentiary value |
| --- | --- | --- |
| [00:00–11:15](https://www.youtube.com/watch?v=B7TCJjcVA2k&t=0s) | The session introduces the research-group metaphor, separate working contexts, shared repository knowledge, and the Context Stream. | Shows that role separation and persistent knowledge can be explained to a human user as one operating model. |
| [15:10–25:45](https://www.youtube.com/watch?v=B7TCJjcVA2k&t=910s) | The project workspace and communication routes are initialized while the human user steers the agents. | Exposes the practical importance of explicit recipients, observed wake behavior, and compact status reporting. |
| [26:04–52:18](https://www.youtube.com/watch?v=B7TCJjcVA2k&t=1564s) | Research develops concepts and criteria, delegates bounded inquiries, and transfers work toward implementation. | Supports the distinction between conceptual synthesis, bounded specialist work, and implementation. |
| [56:49–1:20:23](https://www.youtube.com/watch?v=B7TCJjcVA2k&t=3409s) | Existing teaching materials enter the task; a newly generated presentation and frontend are inspected and rejected. | Shows that technically produced artifacts can fail intended-use and human-acceptance criteria when the implementation does not preserve the relevant reference material. |
| [1:21:27–1:28:47](https://www.youtube.com/watch?v=B7TCJjcVA2k&t=4887s) | The session reviews the architecture, derived dashboard, and voice interaction. | Records discussion and inspection of a compact human-facing control view. Its usability and benefit require separate assessment. |

The later general discussion about AI development lies outside this method evaluation because it does not test Research Mission Control behavior.

## Supported observations

The recording supports five case-specific findings.

1. The human user repeatedly redirected role interpretation, artifact scope, and presentation quality. Human direction was an active control function in the observed session.
2. The session discussed separate conceptual and operational contexts and questioned the need for additional hierarchy on small subtasks. That question informed the proportional-orchestration and direct-work threshold. The case supplies no comparative measurement of their benefit.
3. File-based messages carried state, but the session did not establish a general autonomous wake mechanism. Observed transport and observed notification require separate claims.
4. The generated presentation existed and could be inspected, yet it did not satisfy the intended use. Formal generation, technical verification, domain validation, and human acceptance remained distinct states.
5. Existing artifacts became decisive only after a substitute had been produced. Reliable implementation therefore requires an explicit preserve, reuse, adapt, or replace decision for relevant project inputs before substitute generation.

## Recorded deviations from the current contract

| Recorded behavior or terminology | Current RC2 contract |
| --- | --- |
| The explanation can be heard as three equivalent top-level agents. | Research and Operations are the two primary production orchestrators. Independent Verification is a cross-cutting read-only control function. |
| Verification is used at points as a standing observer, heartbeat, or potential repair actor. | An independent verification assignment has a bounded target, criterion, evidence packet, and completion condition. Operational monitoring is a separate responsibility. Verification reports a finding and never produces the correction. |
| Shared files and messaging are discussed as though they might sustain an active loop by themselves. | Shared files transport state. Each direction requires observed wake behavior and a polling, re-entry, or human-mediated fallback. |
| Agent-specific knowledge areas are considered during the live exploration. | Durable knowledge has one canonical project location and one responsible writer per file. Role-owned outboxes carry proposals and transient exchange. |
| The derived dashboard is treated as a central control surface. | A dashboard is a derived view. Inspected artifacts and canonical project knowledge remain authoritative for operational and epistemic state. |

These deviations make the recording useful as an evaluation case: it exposes plausible role drift and implementation failure that the maintained contracts must prevent.

## Method consequences

The reviewed case adds one durable requirement and sharpens one existing boundary.

- **Artifact relationship before generation.** When an existing artifact constrains the result, Research records whether it must be preserved, reused, adapted, or may be replaced. Operations inventories that baseline and resolves the relationship before producing a substitute.
- **Bounded independent verification.** Independent Verification examines a named target against a criterion and completion condition. A standing heartbeat, progress watch, or implementation repair loop belongs to operational monitoring and must have its own authority and role contract.

The case also reinforces existing requirements for proportional orchestration, explicit wake fallbacks, human-readable status, canonical write-back, and separation of technical conformance from human acceptance.

## Evidence limits

The video demonstrates one project, one set of harness conditions, and one evolving method configuration. It provides no universal evidence about model quality, cross-harness portability, scholarly validity, notification reliability, or the current RC2 package. The public release tests and fresh-context probes establish separate technical and observed-operation claims. Human assessment remains necessary for intended use and version 1.0 acceptance.
