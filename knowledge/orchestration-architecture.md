---
title: Orchestration Model of Research Mission Control
status: active
language: en
updated: 2026-08-22
related: [project, integration, research-to-operations-handoff, orchestration-thresholds]
---

# Orchestration Model of Research Mission Control

## Purpose

Research Mission Control connects clarification, implementation, and proportionate verification. It is an action model for one or several project contexts. The method can be exercised by one instance in sequence or distributed across orchestrators, specialists, and responsible workstreams.

Its roles are contracts defined by responsibility, authority, input, and output. They are independent of a particular model and AI harness. A specific harness supplies context, tools, isolation, and permission enforcement without redefining the roles.

This document carries the full role definitions. `knowledge/INDEX.md` is the knowledge entry point, and `AGENTS.md` is the canonical repository action layer. Actual project artifacts and Git state verify recorded evidence before work resumes.

## Functional levels

Research Mission Control adapts the Knowledge Level and Implementation Level distinction associated with Allen Newell and used in AIMA. The Knowledge Level describes action through available knowledge, intentions, and criteria. The Implementation Level realizes those commitments through representations, procedures, tools, and actual state changes.

This is a functional mapping, not a claim that an orchestrator possesses human understanding, stable beliefs, or autonomous intentions. The Research Orchestrator carries knowledge, intention, and criteria in collaboration with the human user. The Operational Orchestrator realizes authorized action in the actual state. The Independent Verification Agent supplies an additional control perspective required by responsible research work. It is not derived from the two-level distinction and does not become another orchestrator role.

## Distributed world model

The working world model is distributed across:

- epistemic state: sources, claims, uncertainty, interpretations, and criteria;
- operational state: files, data, tools, systems, and performed actions;
- authority state: permissions, boundaries, reserved decisions, rights, and external effects;
- verification state: evidence, tested claims, deviations, validation status, and open findings.

Canonical documents and actual artifacts persist these states. Role contexts retrieve the subset required for an action; no single agent or prompt is presumed to hold the complete model.

## AI Harness

The AI Harness is the technical cross-layer that supplies context, tool access, permission enforcement, execution feedback, and observations to all roles. It includes retrieval, prompts, tool adapters, execution environments, logging, and feedback channels. It realizes access and control conditions but does not determine research intent or scholarly validity.

## Knowledge architecture

The context window is the selected working context for the current action. It is temporary and may contain excerpts from several canonical sources. The repository `knowledge/` directory is persistent project working memory. It preserves the project's methods, specifications, decisions, and reusable understanding across sessions and agents.

Promptotyping is a composable profile for iteratively developing research artifacts from maintained project knowledge and structured data. A Grounded Vault is an optional evidence-bound long-term knowledge profile. Its trigger records that a project-specific binding is required and pending. Grounding becomes active after that binding has been established and verified. The profiles can be selected separately or together. The evidence boundary follows the selected project profile.

## Reference initialization

The standard distributed deployment uses one shared local Git repository and three open working contexts. A working context is one separately open Codex task, Claude Code conversation, or equivalent harness context with its own context window and one assigned Research Mission Control role. The first context is the Research Orchestrator and remains the human user's direct conversation partner. The second context is the Operational Orchestrator. The third is the Independent Verification Agent, a separate read-only control perspective outside the two primary postdoctoral roles.

The initializer identifies Research Mission Control with its repository URL and asks at most three questions in the human user's language. They establish the current context's role, the project result and acceptance criteria, and the shared project workspace with its discoverable or explicitly supplied inputs. It then creates the Promptotyping core, one `knowledge/integration.md` contract, the Context Stream transport under `communication/`, and three role-specific start contracts. All contexts read the same project and Integration Documents, so the start contracts assign responsibility without copying project state.

Local initialization and remote publication have different authority boundaries. The local scaffolder creates a new folder and Git worktree only after authorization and refuses an existing target. Creating a GitHub remote additionally requires explicit owner and visibility. Shared files transport state between contexts but provide no wake guarantee; every deployment verifies its notification route and defines a fallback.

## Context Stream Protocol

The Context Stream Protocol is the generic file-based transport for current work among Research, Operations, and the Independent Verification Agent. Promptotyping remains the canonical store for durable project knowledge. Actual outputs remain at their project paths.

Each role writes new messages only to its own immutable outbox. Each recipient owns its state file and advances a sender-specific cursor only after processing succeeds. Messages use stable thread identifiers and point to canonical artifacts instead of copying durable knowledge. `communication/INDEX.md` locates active threads and completed capsules.

A capsule records the verified outcome, canonical references, unresolved points, and final message identifiers when a thread closes or the deployment's configured re-entry condition applies. Numerical size thresholds are project-profile settings. The method sets no universal value. The integration contract records the observed harness wake route and its polling, re-entry, or human-mediated fallback because filesystem transport alone cannot wake a session.

The Direct Communication Protocol observed in the two-orchestrator experiment is one concrete implementation and evidence source. Its immutable outboxes, recipient cursors, threads, and capsules informed the generic Context Stream contract. `observed-context-stream-operation.md` records the de-identified operational evidence and the limits established by that pilot.

Canonical files use one responsible writer at a time. Results and proposed knowledge changes travel through the sender's immutable outbox. The responsible role verifies and integrates them at the canonical target. Any multi-writer exception must be explicit, collision-safe, and supported by direct concurrency evidence.

## Roles

### Human user

The human user serves as Research Director, develops objectives with the Research Orchestrator, and defines the project's delegation and authority boundaries. Domain judgement remains attributable to the human user or another named domain authority.

### Research Orchestrator

The Research Orchestrator is the human user's primary conversation partner and carries a postdoctoral function within the research-group metaphor. It clarifies objectives, terms, sources, quality criteria, and uncertainty; connects contexts; examines assumptions; and decides whether the next useful move is implementation, a bounded experiment, or a concrete Human Decision Point. It uses direct handling for contained questions and adds persistent structure only when coordination, risk, reuse, or later reconstruction requires it.

### Operational Orchestrator

The Operational Orchestrator carries the second postdoctoral function within the metaphor. It implements an authorized Implementation Brief within a named coordination scope. It inspects actual state, coordinates implementation when useful, integrates production results, performs production-oriented checks, and returns the actual result with evidence.

### Verification Agent

Research and Operations are the two primary postdoctoral roles. The Independent Verification Agent is a separate read-only control perspective and does not direct production work. Routine production checks may remain in a working instance. Independent verification examines the intended result, actual artifact, and direct evidence from a fresh context or with suitable specialists. It reports the complete finding directly to the human user. Only the human user decides whether to disclose the context or route the finding to Research or Operations for integration.

### Specialist and subagent

A specialist or subagent carries a predoctoral function within the metaphor. It receives a bounded research, implementation, or verification assignment and returns a bounded result with evidence. Responsibility for synthesis and consequential decisions remains with the commissioning orchestrator and human user.

The postdoctoral and predoctoral labels describe functional scope, supervision, and escalation. Academic credentials, employment status, and human-like agency lie outside the metaphor.

This division keeps the human user responsible for research direction and consequential judgement while integrated results and inspectable evidence preserve direct oversight. The two orchestrators and bounded specialists retain the operational detail needed to act within their authority.

## Action transition

Implementation begins when the next useful step is:

1. sufficiently clear;
2. inside available authority;
3. proportionate or reasonably reversible for the project;
4. inspectable or testable.

A low-risk uncertainty becomes a bounded experiment when the experiment can produce the missing evidence. A consequential uncertainty becomes a Human Decision Point. Further planning must resolve a named uncertainty or reduce a material risk.

Decision routing considers consequence, reversibility, and available authority. Predoc specialists resolve reversible routine decisions inside their bounded assignments. The Research and Operational Orchestrators resolve more complex questions inside their respective responsibilities. A matter escalates when it exceeds the acting role's authority, materially changes the objective or subject-matter position, creates an external effect, or would be difficult to reverse. Research formulates the resulting Human Decision Point and works through it directly with the human user.

## Collaboration cycle

```text
human user <-> Research Orchestrator
                 |
                 | clear enough for action?
          +------+------+
          |             |
         yes        uncertainty remains
          |             |
          |       experiment, research,
          |       or Human Decision Point
          v
Operational Orchestrator
          |
          | Result with Evidence
          v
Independent Verification Agent
          |
          | complete Verification Finding
          v
       human user
          |
          | optional disclosure and routing
          v
Research Orchestrator or Operational Orchestrator
```

## Minimum exchange

The method distinguishes three information functions:

```text
Implementation Brief -> Result with Evidence -> Verification Finding
```

They do not prescribe separate files.

### Implementation Brief

The minimum sufficient context for action resolves objective, boundaries, expected result, verification criteria, and decisions reserved for the human user. Sources, data, authority, write targets, and versions are added when required.

A persistent workstream also names its responsible function, material dependencies, directly inspectable artifact, completion criterion, next executable action, and canonical write-back target. These fields are contextual requirements rather than a mandatory schema for contained work.

### Result with Evidence

The result is the actual output. Evidence is a directly inspectable basis for its claimed state, such as files, diffs, tests, data, source locations, visible output, or renderings.

### Verification Finding

The finding records object, criterion, observed state, evidence, deviation or confirmation, recommended integration recipient, and overall assessment. The Independent Verification Agent delivers the complete finding directly to the human user. It remains compact unless durable evidentiary use justifies a human-authorized verification record.

### Result maturity

Reports distinguish the maturity that has actually been established: draft, active installation, formal validation, observed operation, domain validation, and human acceptance. These labels describe different evidence and do not form an automatic progression. Technical conformance, scholarly validation, and human acceptance remain separate findings.

### Feedback and write-back

```text
Observation -> Verification Finding -> interpreted consequence -> canonical write-back
```

An observation becomes persistent knowledge only after verification and interpretation by the role holding the relevant epistemic, operational, and authority context. For an independent finding, the human user first decides disclosure and routing. The receiving role then interprets the finding and writes the resulting consequence to the named canonical target. Complex assignments may identify a reference state and write-back target in their brief or lane context. Both are optional and introduce no mandatory lane fields.

Technical conformance establishes compliance with specified schemas, tests, formats, permissions, or workflow rules. Scholarly validation evaluates claims, interpretations, methods, and representations against appropriate sources and disciplinary criteria. Each receives its own finding.

## Verification selection

| Form | Suitable conditions |
| --- | --- |
| Working-instance production check | bounded, reversible, mechanically checkable, or strongly context-dependent work |
| Fresh-context review | prose, documentation, usability, or architecture where an outside perspective exposes assumptions |
| Independent specialist verification | consequential factual, scientific, security, or data-quality claims |
| Two-stage verification | work that is both context-dependent and consequential |

An Independent Verification Agent receives target, criteria, artifacts and evidence, binding constraints and decisions, and exclusions. Complete process history is optional. It remains read-only against production artifacts and reports its complete finding directly to the human user.

### Shadow verification

An optional shadow-verification lane supports independent review when disclosure to the working agents could alter the work or when shared context could reproduce assumptions. It is activated only when the AI harness can establish a separate context and a direct human user return route. The lane receives read-only access to the authorized target and evidence. Its existence, task, intermediate state, and findings are omitted from production contracts and routes. It reports the complete finding directly to the human user, who decides disclosure and routing to Research or Operations.

Shadow verification is an operating mode of independent verification. Prompt separation and asymmetric routes provide no secrecy or security guarantee. When the harness cannot establish the required context separation and direct human user route, the review remains a disclosed independent specialist review.

## Lane

A lane is an responsible workstream with a comprehensible objective, observable result, and appropriate verification. It is not inherently an agent, session, repository, or report. Small tasks need no lane.

The default lane state foregrounds objective, activity, next action, result, evidence, verification, blocker, and Human Decision Point. Extended contracts and reconciliation metadata are optional implementation instruments.

## Human Decision Point

A Human Decision Point is a specific question requiring responsible human judgement. It is `open` or `closed` and has exactly one canonical location. Other projects and views link to it.

## Scaling

Direct work is appropriate when one context can reliably carry the objective, action, and check. Additional agents or hierarchy require a demonstrable contribution through parallel knowledge gain, specialist expertise, context separation, synthesis, conflict resolution, or verification. Pure status forwarding does not justify another layer.

A milestone is an observable result gate. Calendar phases, task schemas, and persistent documents are introduced only when they improve execution, verification, or later reconstruction.

## Core statements

1. Research works directly with the human user and can connect several project contexts.
2. Clear, authorized, proportionate, and verifiable work moves into implementation.
3. Operations implements within a named scope and returns the actual result with evidence.
4. Verification form follows expected failure mode, context dependence, and consequences.
5. Independent verification reports the complete finding directly to the human user, who alone decides disclosure and routing for integration.
6. Human Decision Points are open or closed at one canonical location.
7. Reports, IDs, contracts, Git anchors, and detailed status fields are optional instruments.
8. Research Orchestrator behavior has an activation boundary, preserves human user authority, scales structure to the assignment, and reports only the result maturity supported by evidence.
