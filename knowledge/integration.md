---
title: Research Mission Control Integration
status: active
language: en
updated: 2026-08-23
related: [project, orchestration-architecture, research-to-operations-handoff, observed-context-stream-operation]
---

# Research Mission Control Integration

## Components

| Component | Canonical source | Function |
| --- | --- | --- |
| Reusable method | this repository | initializer, role contracts, protocol, knowledge, and tests |
| Promptotyping | [Promptotyping repository](https://github.com/DigitalHumanitiesCraft/Promptotyping) | maintained project knowledge and iterative artifact development |
| Grounded Vault | [Grounded Vault repository](https://github.com/DigitalHumanitiesCraft/grounded-vault) | optional evidence-bound long-lived knowledge structure |
| AI harness | configured Codex, Claude Code, or compatible environment | contexts, tools, permissions, execution feedback, and notification behavior |
| Initialized project repository | generated local repository | canonical project state, active knowledge, communication, and role start contracts |

This repository defines the portable method. Each initialized project repository defines its own objective, authority, evidence, integration, and write-back boundaries.

## Initialization relationship

A working context is one separately open Codex task, Claude Code conversation, or equivalent harness context with its own context window and one assigned Research Mission Control role. The project workspace is the shared local folder and Git worktree. The first context invokes the initializer and remains the Research Orchestrator. It gathers up to three configuration answers in the human user's language and creates a new shared local repository after authorization. Two generated contracts initialize Operations and Verification in separate contexts.

The initialized repository contains one maintained Promptotyping knowledge core, the project-specific `knowledge/integration.md`, Context Stream directories, and role start contracts. It contains no remote until the human user authorizes ownership and visibility.

## Knowledge relationship

Promptotyping is the default project-bound knowledge profile. Its Knowledge Documents preserve the information required to reconstruct the accepted project state and continue work after context loss. The repository knowledge acts as operational memory for the active project.

Grounded Vault is activated only by a project-specific binding. The binding names the claims, evidence objects, identifiers, validation responsibilities, and write-back relationship covered by grounding. Until that contract is established and verified, its state remains `required; project-specific binding pending` or inactive.

A private, institutional, or project Vault can serve as an optional long-term knowledge source only when the project integration contract names its exact source, selection boundary, read and write authority, and write-back rule. It remains outside the portable method contract and cannot override project authority or inspected artifact state. The presence of a readable Vault path does not configure or activate it.

## Context Stream relationship

The Context Stream transports current assignments, results, notices, and findings among persistent contexts. It has four integrity rules.

1. Each role appends only to its own immutable outbox.
2. Each recipient owns and advances its own sender cursor after successful processing.
3. Each message uses a stable thread identifier and references canonical artifacts.
4. Durable findings enter project knowledge only through verified canonical write-back.

Task and result notices provide notification and routing. They are never the source of project truth. A thread capsule records the verified outcome, canonical references, unresolved points, and final message identifiers when the thread closes or when the deployment's configured re-entry condition applies. Numeric compaction thresholds are project-profile settings and have no universal value.

The standard route sends an `Implementation Brief` from Research to Operations, the complete `Result with Evidence` from Operations to Verification, an `Operations Result Notice` from Operations to Research, and the complete `Verification Finding` from Verification first and only to the human user. The notice points to the responsible result and canonical artifacts; it does not duplicate or replace the Result with Evidence. A contained profile without a separate Verification Agent may return a bounded result to Research or the human user as defined by its integration contract.

The filesystem transports messages without waking a dormant context. This statement does not constrain polling or reads performed by a running context. Every deployment observes its actual delivery directions and records the wake route. An asymmetric route requires a polling, re-entry, or human-mediated fallback.

`communication/INDEX.md` is a compact Research-owned registry of active threads and completed capsules. Recipient-owned cursor files establish processing state. The registry is not a latest-message cursor and does not transfer cursor ownership to Research.

Every project integration contract records explicit return-channel fields. At minimum these fields identify `implementation_brief_recipient`, `operations_result_recipient`, `operations_result_notice_recipient`, `verification_finding_initial_recipient`, `human_routed_finding_recipient`, the observed wake or notification route for each direction, and the polling, re-entry, or human-mediated fallback. `human_routed_finding_recipient` remains unset until the human user makes a routing decision.

## State-specific source precedence

Source precedence follows the state being claimed.

- Authority comes from current human user decisions, applicable governance, and the project integration contract within their respective scope.
- Epistemic claims come from direct sources and evidence, then their maintained interpretation in project knowledge.
- Operational claims come from inspected artifacts, repositories, data, and running systems; messages and dashboards report that state but do not establish it.
- Verification claims come from the complete finding and cited evidence for its examined scope, followed by any documented recheck. Human acceptance remains a separate authority judgement.

When same-class sources conflict, the responsible role exposes the conflict and records the interpreted transition in the canonical target. Recency alone does not allow a message or report to supersede a direct source or actual artifact.

## Canonical ownership and write-back

Canonical project files use one responsible writer at a time. Operations returns results and proposed knowledge changes through its role-owned transport. Research verifies and integrates conceptual or project-level knowledge in its canonical location. Operations integrates implementation state inside its authorized artifact scope. Verification reports findings through its own transport and never produces a correction or alters the evaluated target. It may recheck a correction produced by the responsible Research or Operations context.

A multi-writer exception must be explicit, append-only or otherwise collision-safe, and covered by a verified concurrency rule. A successful pilot write does not establish a general shared-write contract.

Claims that a protected file or directory remained unchanged require a pre-action baseline covering the complete claimed scope. A declared write set is producer evidence and does not prove that no other path changed. Git diff evidence must account for untracked files. Reports distinguish substantive source material from workflow provenance and reserve `verbatim` for exact quotation.

The minimum write-back routes are as follows.

| Finding | Responsible integration target |
| --- | --- |
| project objective, concept, accepted interpretation, or human user decision | maintained project knowledge |
| implementation result and technical constraint | actual artifact and its responsible technical knowledge |
| evidence relation covered by an active grounding contract | Grounded Vault instance |
| protocol or general method finding | this repository after method review |
| transient assignment, notification, or result notice | Context Stream |

## Verification relationship

Research and Operations can verify bounded work in their current context. A separate Verification Agent receives only the evaluation context required by the criterion. It returns a compact finding with target, criterion, observed state, evidence, consequence, and recommended integration role. The complete finding goes first and only to the human user.

Independent, Blind, and Shadow describe different controls.

- Independent Verification separates the assessment context from production and keeps it read-only against evaluated artifacts. It may receive the complete Result with Evidence and does not conceal its existence.
- Blind Verification adds a declared reading-order restriction to Independent Verification. Named producer reasoning, reports, earlier findings, or preferred conclusions are withheld until the initial finding is sealed. It does not conceal the verifier's existence or create secrecy.
- Shadow Verification adds human user-controlled visibility and technical isolation. It requires a technically separate context, read-only target access, a private return route to the human user, and omission of the verifier's identity and route from production contracts. Without those verified properties, use the Independent or Blind label. Shadow and Blind may be combined when both triggers hold.

The human user decides whether a finding enters active work or canonical knowledge and which production role receives it. Verification never implements that consequence.

## Publication relationship

The public method release includes only allowlisted instructions, source code, the generated skill package, and evidence suitable for redistribution. Operational views, live portfolio data, private project decisions, runtime messages, and inaccessible Vault references remain outside that release. A separate publication process can publish an operational view after replacing its state with verified synthetic data.
