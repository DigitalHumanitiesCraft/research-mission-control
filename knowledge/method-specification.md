---
title: Research Mission Control Method Specification
status: active
language: en
version: 0.9.0rc2
created: 2026-08-23
updated: 2026-10-18
related: [project, integration, orchestration-architecture, research-to-operations-handoff]
---

# Research Mission Control Method Specification

## Scope

This specification defines the portable Research Mission Control method. It covers initialization, responsibility, authority, persistent knowledge, cross-context exchange, verification, reporting, and publication boundaries. It does not define the source repository's internal portfolio dashboard or current operational state.

## Required behavior

### Initialization

- **MS-01:** A fresh user can start from the complete system prompt or the installable skill.
- **MS-02:** Configuration identifies Research Mission Control with its canonical repository URL and uses the human user's language, one necessary question at a time. It reuses known answers, shows the current phase and next action, and establishes the role, a provisional first result and assessment criteria, and the workspace with available inputs. Exploratory projects are valid. Setup moves to configuration once a bounded first assignment is clear; broad subject research follows initialization. After creation, the integration contract holds the compact initialization state. A working context is one separately open Codex task, Claude Code conversation, or equivalent harness context with its own context window. Rights, publication, remote creation, grounding, and verification variants become later Human Decision Points only when a concrete trigger requires them.
- **MS-03:** The initializer creates a new local Git repository transactionally and refuses every existing target without modifying it.
- **MS-04:** Remote creation, publication, rights, and attribution remain separate human-authorized actions.

### Roles and authority

- **MS-05:** The human user directs the work and may use the Research Director metaphor. Research and Operations are LLM-based AI agents in AI-harness working contexts. Bounded specialists or subagents perform Predoc functions. Independent Verification is an LLM-based AI agent in a separate read-only working context and remains a cross-cutting control function.
- **MS-06:** Research is the human-facing conceptual role. Operations changes actual project state within an explicit scope. The canonical prompts are `orchestrators/research-orchestrator.md`, `orchestrators/operational-orchestrator.md`, and `orchestrators/independent-verification-agent.md`.
- **MS-07:** The human user defines delegation and authority in the project contract. Bounded specialists and orchestrators decide within their configured scopes. An agent requests the smallest required human contribution when the next useful action lacks authority.
- **MS-08:** Reviewing, comparing, or editing a role prompt does not activate that role.

### Knowledge and exchange

- **MS-09:** Promptotyping supplies maintained project knowledge for reconstruction across sessions. A Grounded Vault becomes active only after a project-specific binding defines and verifies claims, evidence objects, identifiers, validation responsibility, and write-back. Any other Vault is an optional long-term source and remains inactive until `knowledge/integration.md` names its exact source, selection boundary, authority, and write-back rule.
- **MS-09a:** When an existing artifact constrains the result, the Implementation Brief identifies whether the relevant artifact or part must be preserved, reused, adapted, or may be replaced. Operations inventories the actual baseline and resolves that relationship before generating a substitute.
- **MS-10:** The Context Stream uses immutable role-owned outboxes, recipient-owned cursors, stable thread identifiers, canonical artifact references, and closing capsules when a thread closes or re-entry cost becomes material. `knowledge/handoff.md` contains unresolved received deltas only; processed content is integrated or rejected and then removed rather than archived there.
- **MS-11:** The standard route is `Research --Implementation Brief--> Operations`, `Operations --Result with Evidence--> Verification`, `Operations --Operations Result Notice--> Research`, and `Verification --Verification Finding--> human user`. The notice references the responsible result without replacing it. A contained profile may define a shorter route in its integration contract.
- **MS-12:** Shared files transport state without guaranteeing notification or wake behavior. Each deployment records observed delivery directions and a polling, re-entry, or human-mediated fallback.
- **MS-12a:** The project integration contract records explicit recipients for the Implementation Brief, Result with Evidence, Operations Result Notice, initial Verification Finding, and any human-routed finding, plus an observed wake route and fallback for every direction.

### Evidence and verification

- **MS-13:** Completion claims name their scope, evidence, verification state, and remaining limits. A protected-scope non-change claim requires a complete pre-action baseline. Producer declarations and Git evidence that omits untracked files do not establish a broader historical claim.
- **MS-14:** Reports separate substantive sources from workflow provenance, use observed timestamps, and label exact quotation separately from paraphrase.
- **MS-15:** The Independent Verification Agent remains read-only against evaluated production artifacts. Each assignment has a bounded target, criterion, evidence packet, and completion condition; standing progress monitoring or heartbeat duties require a separate operational responsibility. It may update only its own reporting state and outbox. It reports its complete finding first and only to the human user. Only the human user decides whether to disclose or route that finding to Research or Operations. Verification never produces a correction; it may recheck a correction produced by the responsible production role.
- **MS-16:** Draft, active installation, formal validation, observed operation, domain validation, and human acceptance remain distinct findings.
- **MS-16a:** Independent means separate read-only assessment context. Blind adds a declared reading-order restriction. Shadow adds verified technical isolation, a private human user route, and omission from production contracts. Blind and Shadow are not synonyms, and neither label implies a security guarantee.

### Inspectable state transitions

- **MS-16b:** A transition claim identifies the responsible actor, affected artifact and revision, supporting evidence and applicable authority. Prepared, submitted, examined, correction-required, revised, rechecked, human accepted and written-back describe distinct states within a bounded assignment. Receipt and processing remain separately evidenced. A changed revision requires an assessment of the relevant changed scope before a prior finding can be applied to it.
- **MS-16c:** Correction follows the assigned production write boundary. Independent Verification reports the complete finding first to the human user, who controls its disclosure and routing. A recheck does not grant acceptance. Human acceptance identifies the revision and intended use, and authorized write-back records and reads back the resulting consequence. Epistemic, operational, authority and verification state retain their distinct evidence.
- **MS-16d:** An interface labels authored demonstrations and simulated decisions explicitly. Reserved decision gates require explicit illustrative action, and replay invalidates later choices when returning to an earlier snapshot. Observable actions and cited records support activity claims. Animation establishes neither hidden reasoning nor actual execution. The [workshop process walkthrough](../examples/workshop-example/process-walkthrough.md) illustrates the contract through a revision, a correction and a later session's selective reading. Its material acceptance leaves H-01 open and establishes no executed operator run or evaluation result.

### Unresolved questions

- **MS-16e:** Reports attach unresolved claims to their grounds and affected decisions. Operational observation gaps, missing authority and outstanding revision-specific checks remain separately described. The operator uses authorized source inspection, bounded experiments or specialist work when these can resolve the question, and asks the human user when the next action requires reserved judgement, authority or unavailable input. An unsupported consequential assumption can also require escalation. The [architecture](orchestration-architecture.md#describing-uncertainty-and-selecting-the-next-action) gives provisional descriptions and routing examples. It establishes no calibrated confidence score or validated comprehensive taxonomy.

### Communication and publication

- **MS-17:** Human-facing reports begin with the current result and its practical meaning. Every requested human user contribution is classified as Decision, Authorization, Action, or Input and reduced to the smallest concrete request. Acceptance-sheet and contribution labels are translated into the human user's selected language while preserving these semantic classes.
- **MS-18:** The public bundle uses an exact positive file list. It excludes operational dashboards, live portfolio data, runtime messages, internal handoffs, historical interface specifications, private paths, and unlicensed material.
- **MS-19:** A non-draft release requires a human-approved distribution licence and publication authorization. Technical validation does not imply either approval.

## Reference deployment

The standard persistent deployment uses three fresh contexts in one initialized repository.

| Context | Responsibility | Primary output |
| --- | --- | --- |
| Research | objective, sources, criteria, human user dialogue, and canonical conceptual write-back | Implementation Brief |
| Operations | implementation, bounded delegation, integration, and production checks | Result with Evidence |
| Verification | independent inspection against the supplied criterion and evidence | Verification Finding first and only to the human user |

Contained work may use one context when the result remains directly inspectable and the separation would add no material value. Additional hierarchy requires a concrete contribution through synthesis, context reduction, conflict resolution, specialist work, or independent verification.

## Established implementation state

The initializer, role prompts, Context Stream templates, publication builder, and contract tests are formally validated in the source repository. A local draft-package probe has established one representative Claude Code production exchange followed by fresh Codex verification. A public live-demo recording provides observed-operation evidence for an earlier configuration and has been evaluated for method consequences; it does not validate the current RC2 package. The changed live-demo interface section has been observed from the source and a fresh draft bundle at wide and narrow viewport sizes. The file-level MIT and CC BY 4.0 assignments are established. Domain validation, full human acceptance, and deployment of the current source state remain separate.

## Decision record

### MD-01 Minimal role architecture

Use two responsible production orchestrators and one independent control context. Add specialists and hierarchy only when they create an inspectable contribution.

### MD-02 Maintained knowledge and transient transport

Use Promptotyping knowledge as the reconstructable project state and Context Stream messages as current transport. Messages reference canonical artifacts and do not become a competing knowledge base.

### MD-03 Conditional grounding

Treat Grounded Vault as a composable profile whose evidence boundary is defined by a verified project-specific binding.

### MD-04 human user-controlled verification

Return every independent finding first to the human user. Production roles integrate it only after explicit disclosure and routing.

### MD-05 Reconstructable evidence

Use complete baselines, observed time, exact source attribution, and scope-limited claims so another context can reproduce a reported result.

### MD-06 Publication separation

Build the public method from an exact allowlist. Keep source-repository operations, handoffs, interface history, and live project state outside the release.

### MD-07 State-specific precedence

Resolve authority, epistemic, operational, and verification conflicts from the sources that are authoritative for that state class. Messages and reports never override inspected operational state, and technical verification never substitutes for human acceptance.

### MD-08 Artifact relationship before substitute generation

Record how relevant existing artifacts constrain the expected result. Inspect the baseline and settle preserve, reuse, adapt, or replace boundaries before implementation generates a substitute.
