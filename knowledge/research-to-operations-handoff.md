---
title: Collaboration among Research, Operations, and Verification
project:
  name: Research Mission Control
  repository: https://github.com/DigitalHumanitiesCraft/research-mission-control
status: active
language: en
created: 2026-08-17
updated: 2026-08-23
related: [orchestration-architecture, project-governance, integration, method-specification]
---

# Collaboration among Research, Operations, and Verification

## Shared workflow

The human user serves as Research Director. The Research Orchestrator works directly with the human user to develop the objective. When the next useful step is sufficiently clear, authorized, proportionate, and verifiable, Research issues an Implementation Brief and Operations acts. Remaining low-risk uncertainty becomes a bounded experiment; consequential uncertainty becomes a Human Decision Point.

```text
human user <-> Research --Implementation Brief--> Operations
Research <--Operations Result Notice-- Operations
Operations --Result with Evidence--> Verification
Verification --complete Verification Finding--> human user
human user --optional authorized routing--> Research or Operations
```

The exchange may remain in one conversation for a contained task. Persistent artifacts are useful when several agents, states, or write targets must remain distinguishable.

## Research to Operations

Every Implementation Brief provides the same minimum context needed for reliable action:

- objective and intended use;
- relevant context and canonical sources;
- authority, write boundary, and exclusions;
- expected result;
- verification criteria;
- decisions reserved for the human user.

Data, dependencies, versions, reference state, canonical write-back target, and a persistent brief file are added when the assignment requires them.

Decision routing follows the configured authority boundary, consequence, and reversibility. Predoc specialists resolve details inside their bounded assignments. The two Postdoc roles, Research and Operations, resolve more complex questions within their configured responsibilities. The human user defines which decisions remain human and which are delegated. Research converts a required human contribution into a concrete Human Decision Point only when it blocks or materially changes the next useful action.

For complex assignments, Research may also identify the reference state against which implementation proceeds and the canonical write-back target for interpreted findings. These are optional context, not mandatory lane fields.

## Persistent assignment and transport

A persistent assignment lives in the initialized project's maintained knowledge or in a named Implementation Brief. A deployment may add its own operational view, but that view does not define the portable method.

Research delivers the concrete execution request to Operations through the configured task route. The message provides transport and notification and points to the canonical assignment. It never becomes a second source of project truth.

A persistent cross-context loop uses the Context Stream Protocol. Each role publishes immutable messages in its own outbox, while each recipient advances its sender-specific cursor only after processing succeeds. Messages use stable thread identifiers and reference the canonical assignment, result, evidence, or finding. They do not duplicate durable project knowledge.

`communication/INDEX.md` locates active threads and completed capsules. A capsule records the verified result and canonical references when a thread closes or the deployment's configured re-entry condition applies. Numerical thresholds belong to the project profile. The Direct Communication Protocol observed in the two-orchestrator experiment is one concrete implementation of this generic contract.

The harness or workspace must also establish sender, receiver, delivery direction, wake behavior, and the condition for continued processing. A file write alone does not establish that the counterpart has been notified. `knowledge/integration.md` records explicit fields for the Implementation Brief recipient, Result with Evidence recipient, Operations Result Notice recipient, initial Verification Finding recipient, any human-routed finding recipient, observed wake route, and fallback. When a route is asymmetric or depends on an active session, it names a polling, re-entry, or human-mediated fallback.

Each canonical file has one responsible writer at a time. Operations sends proposed knowledge changes through its immutable outbox, and Research verifies and integrates them. `knowledge/handoff.md` is the Research-owned inbox for unresolved received deltas only. Research removes a point after integrating or rejecting it and preserves any required provenance in `knowledge/journal.md`; the handoff is not an archive. Any other shared append path is permitted only when the integration contract defines collision-safe ownership and verification for that exception.

## Lane brief contract

A bounded assignment carries the following information when each item is relevant.

1. Assignment identity and objective.
2. Repository, artifact, and write scope.
3. Path ownership in a shared working tree. An agent stages only its own paths and never reverts another context's work. Canonical shared files retain one responsible writer.
4. Publication and external-effect boundaries.
5. Explicit exclusions covering other workstreams, repositories, data, or research sources.
6. The required result, evidence, verification, deviations, next action, and human user contribution.
7. Subagent authority, including the permitted purpose, scope, and responsibility for synthesis. A bounded specialist receives no implicit authority to delegate further.

## Browser work in a lane

A browser assignment names the target URL or authorized local server, evaluation criteria, source artifacts, and instrument. The agent confirms that navigation reached the intended page, inspects the rendered state and browser errors, and compares relevant findings with source files. A screenshot alone is insufficient evidence for page behavior or long-document completeness. A change of browser instrument is reported with its limitations.

## Operations to Verification

Operations returns:

- actual result;
- directly inspectable evidence;
- deviations from the clarified objective;
- new substantive or technical findings.

Evidence depth follows the object and possible consequences.

When the Operational Orchestrator coordinates subagents, it integrates their bounded results before responding and remains responsible for the assignment. The response to the originating context is compact and machine- and human-readable. It contains:

- stable `lane_id` and current state;
- actual result and directly inspectable evidence;
- verification performed or still required;
- material deviation;
- one next action;
- the open Human Decision Point, if any;
- canonical write-back completed in lane state and project artifacts.

Operations updates the actual project artifacts inside its authorized scope. In the reference three-context profile, it addresses the complete immutable Result with Evidence to Verification and a concise Operations Result Notice to Research. The notice references the result and canonical artifacts and provides transport or notification; it is not the responsible result and does not become project knowledge. A contained profile uses the recipients named in its integration contract.

Production checks precede a completion claim. The Independent Verification Agent reports its complete finding to the human user before any production role integrates an interpreted consequence into canonical knowledge. Only the human user decides disclosure and routing. Commits, pushes, publication, and other external effects follow the authority boundary of the assignment.

## Independent verification

Verification is a cross-cutting control function across Research and Operations. Routine production checks may run in the working context. Independent, Blind, and Shadow define separate controls.

- Independent Verification uses a separate read-only assessment context and may receive the complete Result with Evidence. Its existence need not be concealed.
- Blind Verification adds a declared reading order. The verifier seals an initial finding before reading the named producer reasoning, reports, earlier findings, or preferred conclusion. It does not imply secrecy.
- Shadow Verification adds verified technical isolation, a private route to the human user, and omission of the Independent Verification Agent's working context and route from production contracts. It may use ordinary or Blind reading order.

A separate verifier receives:

- target and scope;
- criteria;
- artifacts and evidence;
- binding constraints and decisions;
- exclusions.

The complete work history is optional. A fresh perspective is useful when the artifact should be understandable on its own or shared assumptions are a likely failure mode.

### Optional Shadow Verification

The human user may commission Shadow Verification when disclosure to the working agents could affect the work or when shared context could reproduce assumptions. This profile is available only when the harness provides a technically separate context, read-only target access, and a private direct human user return route.

The context receives read-only access to the authorized target, criteria, artifacts, and evidence. Its existence, task, intermediate state, and findings are omitted from production contracts and routes. It reports the complete finding directly to the human user. Only the human user decides disclosure, routing to Research or Operations, and entry into canonical project knowledge. Prompt separation and asymmetric routes provide no secrecy or security guarantee. Without verified isolation and a private return route, describe the assignment as Independent or Blind Verification.

## Finding routes

- The Independent Verification Agent reports every complete finding directly to the human user.
- The finding may recommend Operations for implementation and technical consequences or Research for conceptual and substantive consequences.
- Only the human user decides whether to disclose or route the finding.
- A receiving production role acts within its existing authority, and corrected points are checked again at the necessary scope.

Verification identifies the finding. The human user controls its disclosure and routing. A receiving context-bearing orchestrator decides how to integrate the delivered finding within its existing authority.

Verification never produces the correction it recommends. Research or Operations interprets and implements a human-routed finding within its authority; Verification may then recheck the corrected points.

The complete feedback path is:

```text
Observation -> Verification Finding -> interpreted consequence -> canonical write-back
```

Technical conformance findings cover specified tests, schemas, formats, permissions, and workflow rules. Scholarly validation findings cover the support and disciplinary adequacy of claims, interpretations, methods, and representations. They remain separate even when one review produces both.

## Human Decision Points

Each Human Decision Point is `open` or `closed` at one canonical location. Dependent projects and lanes link to it. An open point blocks a lane only when no other useful authorized action can continue.

## human acceptance

Verification states which specified properties an artifact satisfies and provides inspectable evidence. Validation asks whether the artifact serves its intended scholarly, teaching, or operational use. human acceptance records the responsible judgement that the presented result is suitable as the accepted working state.

The handoff should present the smallest complete artifact that supports this judgement. For slide work, that unit contains final visible text, speaker notes, sources, and the intended visual composition. For a document, it contains finished prose and its evidence. An outline supports sequence decisions; the finished artifact supports acceptance.

human user feedback becomes implementation input for the next revision. Operations applies the change, verification checks the affected properties, and the human user accepts or redirects the result. The decision remains at the existing canonical Human Decision Point or source of truth, so this cycle introduces no mandatory acceptance field.

## Acceptance sheet

When a lane ends in a result the human user must accept, the orchestrator delivers an acceptance sheet in a fixed form that is readable in seconds. Translate all three labels into the human user's selected language and use the chosen wording consistently. Their semantic functions are:

- **Done** states what is complete, in one to three lines.
- **Review** names two to five places to inspect. Each item gives a one-to-three-sentence substantive synthesis, explains why the place matters and what the human user should assess, and then provides the link. Internal identifiers or file locations alone are insufficient.
- **Decide** lists the decisions that stand, each with the orchestrator's default proposal.

The human user answers per item with one word. The sheet goes to the conversation and can also appear as a rendered page when links matter. The answers return to the configured canonical Human Decision Point or project knowledge.

The acceptance sheet concentrates human user attention on the integrated result, inspectable evidence, and reserved decisions. Operational detail remains with Research and Operations.

## Persistence

The context window carries current working context. The repository `knowledge/` directory is persistent project working memory. Results and findings remain in the conversation, project knowledge, or canonical lane entry according to their reuse and evidence value. A dedicated brief, handoff, or verification report is created only when coordination, context loss, version distinction, or durable evidentiary use requires it.

Promptotyping and Grounded Vault are composable knowledge profiles. Promptotyping maintains the knowledge and structured data used to develop research artifacts. A Grounded Vault is required when substantive claims need machine-resolvable grounding and attributable human verification. That trigger records a pending project-specific binding; evidence-bound grounding becomes active after the binding has been established and verified. Any other Vault remains an optional long-term source and is used only when the project integration contract names its source, selection boundary, authority, and write-back rule.
