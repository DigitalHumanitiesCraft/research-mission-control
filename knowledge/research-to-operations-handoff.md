---
title: Collaboration among Research, Operations, and Verification
project:
  name: Research Mission Control
  repository: https://github.com/DigitalHumanitiesCraft/research-mission-control
status: active
language: en
created: 2026-08-17
updated: 2026-10-17
related: [orchestration-architecture, project-governance, integration, method-specification]
---

# Collaboration among Research, Operations, and Verification

## Shared workflow

The human user defines direction, delegation, and acceptance. Research Director remains a proposed title whose suitability is an open question. The Research Orchestrator works directly with the human user to develop the objective. When the next useful step is sufficiently clear, authorized, proportionate, and verifiable, Research issues an Implementation Brief and Operations acts. Remaining low-risk uncertainty becomes a bounded experiment; consequential uncertainty becomes a Human Decision Point.

```text
human user <-> Research --Implementation Brief--> Operations
Research <--Operations Result Notice-- Operations
Operations --Result with Evidence--> Verification
Verification --complete Verification Finding--> human user
human user --optional authorized routing--> Research or Operations
```

The exchange may remain in one conversation for a contained task. Persistent artifacts are useful when several agents, states, or write targets must remain distinguishable.

## Operator briefing

A requested briefing collects current, attributable reports from the existing working contexts. It supplies orientation and prepares the next conversation. A status request alone neither starts a new implementation assignment nor reopens a completed one. When the human user also explicitly assigns continuation, carry out the authorized work and its verification before reporting the resulting state. A briefing does not constitute verification, acceptance, canonical write-back or standing monitoring.

1. Establish the requested scope from registered roles and their actual project and assignment bindings. Verify the existing context identity, available return route and permission boundary before dispatch.
2. Request one compact first-person status paragraph, delivered results with material references, unresolved gaps, the next authorized action or explicit halt, separately identified additional proposals and genuine human user questions, and what the operator actually reread or checked. Include a reasoned self-assessment when requested. Ask for substantive project state rather than the administrative act of writing the briefing.
3. Separate required Human Input, Decision, Authorization or Action from optional discussion and possible result assessment. For each question record its exact text, assignment or project reference and whether it blocks the next authorized action. A delivered result awaiting assessment does not by itself establish a required answer. Historical open acceptance retains its recorded state and becomes a current question only when a concrete contribution is needed for the present work.
4. Retrieve the actual completed response. Keep request, dispatch, receipt, retrieval, source verification and integration distinguishable. A successful send acknowledgement proves neither receipt nor the content of a reply. Record the responding context, message identity and actual response timestamp.
5. Check reported material and assignment bindings against the current sources. Preserve the distinction between the time of the response and the scope and date of the work actually examined. Reading yesterday's successful test log today does not establish a new successful test. Return unsupported or contradictory claims for correction before using them as current findings.
6. Preserve the operator's own status wording and provenance. Integrate a closed, dated round only after its available responses and known gaps have been checked. Unreachable contexts remain explicit; an older report may be shown only with its actual source date. The deployment's integration contract defines storage, a current-round reference and failed-refresh behavior.
7. Show the new report, genuine questions, result materials and limits together. A prepared conversation prompt includes the exact fresh question and briefing source alongside separately identified canonical project and assignment context. Copying it does not answer the question or authorize execution.
8. Stop after the requested round. The responsible authorized context adopts actual decisions or corrections into canonical sources under the existing write-back contract. A briefing alone cannot close a task, change acceptance, advance a recipient cursor or resolve a disagreement between sources. Repeat on an explicit request or an already authorized re-entry trigger.

The current status includes completed assignment results, their usable artifacts and verification limits. Continuation distinguishes the next already authorized action, an additional proposal outside that assignment and any genuinely required human contribution with its consequence. Use the human user's language for these functions, such as Stand and Weiter in a German deployment. The existing Result with Evidence, Next action and Human Decision Point fields carry them without a new mandatory schema. State none when no action or contribution is required.

Production carries out clear, reversible routine corrections within its assigned subject and write scope and verifies the affected result. A required independent check or reserved decision remains binding. An additional proposal does not authorize execution or expand the assignment.

Keep the operator's own self-assessment separate from Next action and human acceptance. It states the examined scope and source date, whether the work serves the user's objective, whether the result and evidence support the reported state, and whether continuation and its prerequisites are clear. Use a requested scale only with a reasoned subjective judgement. A score is not a measurement, and technical checks support only the properties they examined. Missing assessment remains neutral and does not imply poor quality, an open task or a request for user action.

The [briefing transport contract](integration.md#operator-briefing-transport) specifies the deployment boundary. This status exchange does not change the private initial return route of a complete Verification Finding.

## Research to Operations

Every Implementation Brief provides the same minimum context needed for reliable action:

- objective and intended use;
- relevant context and canonical sources;
- authority, write boundary, and exclusions;
- expected result;
- verification criteria;
- decisions reserved for the human user.

Data, dependencies, versions, reference state, canonical write-back target, and a persistent brief file are added when the assignment requires them.

When an existing artifact constrains the result, the brief names that artifact and its required relationship to the output: preserve, reuse, adapt, or replace. It records the relevant acceptance or reference boundary. Operations inventories the actual baseline and resolves this relationship before generating a substitute. An available input does not imply that every part must be retained; the brief identifies the parts that carry content, structure, style, provenance, or acceptance value.

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

Every independent assignment has a bounded target, criterion, evidence packet, and completion condition. A standing heartbeat, progress watch, or repair loop is operational monitoring and requires its own responsibility and authority. It does not become Independent Verification by assigning it to the Verification Agent.

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

When a result requires human acceptance, the orchestrator presents a concise synthesis suited to the artifact and the decision. It states what is complete, explains the substantive result and inspectable evidence, and identifies reserved decisions with a recommendation where warranted. A linked review location includes the relevant content, why it matters, and what requires human judgement.

An acceptance sheet can organise this information. Its form, length, labels, inspection sequence, and response format follow the task and the human user's needs. Personal quality criteria that remain unsettled stay open. Any labels used follow the human user's selected language.

The synthesis goes to the conversation and can also appear as a rendered page when links matter. The human user may accept, redirect, qualify the result, or request clarification. The attributable decision returns to the configured canonical Human Decision Point or project knowledge. Acceptance remains with the responsible human authority, and the presentation introduces no additional acceptance field. Operational detail remains with Research and Operations.

## Persistence

The context window carries current working context. The repository `knowledge/` directory is persistent project working memory. Results and findings remain in the conversation, project knowledge, or canonical lane entry according to their reuse and evidence value. A dedicated brief, handoff, or verification report is created only when coordination, context loss, version distinction, or durable evidentiary use requires it.

Promptotyping and Grounded Vault are composable knowledge profiles. Promptotyping maintains the knowledge and structured data used to develop research artifacts. A Grounded Vault is required when substantive claims need machine-resolvable grounding and attributable human verification. That trigger records a pending project-specific binding; evidence-bound grounding becomes active after the binding has been established and verified. Any other Vault remains an optional long-term source and is used only when the project integration contract names its source, selection boundary, authority, and write-back rule.
