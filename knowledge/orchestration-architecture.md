---
title: Orchestration Model of Research Mission Control
status: active
language: en
updated: 2026-10-18
related: [project, integration, research-to-operations-handoff, orchestration-thresholds]
---

# Orchestration Model of Research Mission Control

## Purpose

Research Mission Control connects clarification, implementation, and proportionate verification. It is an action model for one or several project contexts. One context can clarify the objective, implement an authorized change and perform production checks in sequence. Independent Verification requires a separate review context. Work can be distributed across orchestrators, specialists and responsible workstreams when those boundaries are useful.

Its roles are contracts defined by responsibility, authority, input, and output. They are independent of a particular model and AI harness. A specific harness supplies context, tools, isolation, and permission enforcement without redefining the roles.

This document defines the role model and the choice of working structure. The [complete executable role contracts](../orchestrators/README.md), [exchange contract](research-to-operations-handoff.md) and [deployment bindings](integration.md) retain their respective authority. `knowledge/INDEX.md` is the knowledge entry point, and `AGENTS.md` is the repository action layer. Inspect actual project artifacts and Git state before resuming recorded work.

## Operator, session and working instructions

An AI Operator is an agent configured for a defined responsibility and authority boundary, with access to maintained knowledge, applicable skills and a working protocol. The term describes an assigned working function. It makes no claim about consciousness, human understanding or scholarly accountability.

A role defines responsibility and limits. A session is a concrete execution context in an AI harness through which an operator performs assigned work. A new session reconstructs relevant instructions, assignments and evidence from maintained records and checks their current validity. A prior conversation is not automatically restored. The operator-file convention below adds a registered identity and a single-session occupancy rule for deployments that use it.

Operator Knowledge is the maintained instruction and context content that guides how an operator works. It describes the role and remit, working principles, relevant standing context and interaction with the human user. It may refer to role contracts, skills and project sources without duplicating their maintained content. Project knowledge holds the research material and its grounds. The current assignment defines the work to perform.

A deployment can supply Operator Knowledge through supported instruction channels or through files read by the session. The content and its delivery mechanism are distinct. A file name, a persona or a request to read a document does not give that material system-message priority, activate an assignment or enlarge permissions. Confirmed human instructions and the operator's attributed interpretations remain distinguishable.

## Functional levels

Research Mission Control adapts the Knowledge Level and Implementation Level distinction associated with Allen Newell and used in AIMA. The Knowledge Level describes action through available knowledge, intentions, and criteria. The Implementation Level realizes those commitments through representations, procedures, tools, and actual state changes.

This is a functional mapping, not a claim that an orchestrator possesses human understanding, stable beliefs, or autonomous intentions. The Research Orchestrator carries knowledge, intention, and criteria in collaboration with the human user. The Operational Orchestrator realizes authorized action in the actual state. The Independent Verification Agent supplies an additional control perspective required by responsible research work. It is not derived from the two-level distinction and does not become another orchestrator role.

## Distributed world model

The working world model is distributed across:

- epistemic state: sources, claims, uncertainty, interpretations, and criteria;
- operational state: files, data, tools, systems, and performed actions;
- authority state: permissions, boundaries, reserved decisions, rights, and external effects;
- verification state: evidence, tested claims, deviations, validation status, and open findings.

Canonical documents and actual artifacts retain recorded parts of these states. A later context can reconstruct decisions, evidence and unfinished actions only to the extent that they were recorded. Role contexts retrieve the subset required for an action; no single agent or prompt is presumed to hold the complete model.

## AI Harness

The AI Harness is the technical cross-layer that supplies context, tool access, permission enforcement, execution feedback, and observations to all roles. It includes retrieval, prompts, tool adapters, execution environments, logging, and feedback channels. It realizes access and control conditions but does not determine research intent or scholarly validity.

## Knowledge architecture

The context window is the selected working context for the current action. It is temporary and may contain excerpts from several canonical sources. The repository `knowledge/` directory is persistent project working memory. It preserves recorded methods, specifications, decisions and interpretations across sessions and agents.

Promptotyping is a composable profile for iteratively developing research artifacts from maintained project knowledge and structured data. A Grounded Vault is an optional evidence-bound long-term knowledge profile. Its trigger records that a project-specific binding is required and pending. Grounding becomes active after that binding has been established and verified. The profiles can be selected separately or together. The evidence boundary follows the selected project profile.

## Reference initialization

The standard distributed deployment uses one shared local Git repository and three open working contexts. A working context is one separately open Codex task, Claude Code conversation, or equivalent harness context with its own context window and one assigned Research Mission Control role. In a new standard setup, the first context is the Research Orchestrator and remains the human user's direct conversation partner. The second context is the Operational Orchestrator. The third is the Independent Verification Agent, a separate read-only control perspective outside the two primary postdoctoral roles.

Existing Operations or Verification contexts continue under their verified start contracts, without silent role conversion or a second initialization. The initializer only creates new targets.

The initializer identifies Research Mission Control with its repository URL and progressively establishes the role, a provisional first result and assessment criteria, and the workspace with its discoverable or explicitly supplied inputs. It asks one necessary question at a time in the human user's language, reuses known answers and shows the current phase and next action. Exploratory projects need no fully specified research design before configuration. It then creates the Promptotyping core, one `knowledge/integration.md` contract, the Context Stream transport under `communication/`, and three role-specific start contracts. All contexts read the same project and Integration Documents, so the start contracts assign responsibility without copying project state.

Local initialization and remote publication have different authority boundaries. The local scaffolder creates a new folder and Git worktree only after authorization and refuses an existing target. Creating a GitHub remote additionally requires explicit owner and visibility. Shared files transport state between contexts but provide no wake guarantee; every deployment verifies its notification route and defines a fallback.

## Context Stream Protocol

The Context Stream Protocol is the generic file-based transport for current work among Research, Operations, and the Independent Verification Agent. Promptotyping remains the canonical store for durable project knowledge. Actual outputs remain at their project paths.

Each role writes new messages only to its own immutable outbox. Each recipient owns its state file and advances a sender-specific cursor only after processing succeeds. Messages use stable thread identifiers and point to canonical artifacts instead of copying durable knowledge. `communication/INDEX.md` locates active threads and completed capsules.

A capsule records the verified outcome, canonical references, unresolved points, and final message identifiers when a thread closes or the deployment's configured re-entry condition applies. Numerical size thresholds are project-profile settings. The method sets no universal value. The integration contract records the observed harness wake route and its polling, re-entry, or human-mediated fallback because filesystem transport alone cannot wake a session.

The Direct Communication Protocol observed in the two-orchestrator experiment is one concrete implementation and evidence source. Its immutable outboxes, recipient cursors, threads, and capsules informed the generic Context Stream contract. `observed-context-stream-operation.md` records the de-identified operational evidence and the limits established by that pilot.

Canonical files use one responsible writer at a time. Results and proposed knowledge changes travel through the sender's immutable outbox. The responsible role verifies and integrates them at the canonical target. Any multi-writer exception must be explicit, collision-safe, and supported by direct concurrency evidence.

## Monitoring across the work

Monitoring examines the whole course of work and offers the human user a second opinion. It compares what coordination understands about the user, decisions and plans with the original statements, maintained documents and observed actions. Findings distinguish what the user said, the coordinator's interpretation and material taken over from another source. A monitor may evaluate alignment, omissions and discrepancies, while reporting its evidence and limits. Operational observations, such as stale reports or unanswered messages, provide context for that assessment. The monitor can send notices and evidence to coordination under an explicit communication contract, but cannot assign work, release results or grant acceptance. Its remit complements bounded verification and human judgement. A separate session does not guarantee independent reasoning, especially when it shares a model family with coordination.

## Roles

### Human user

The human user develops objectives with the Research Orchestrator and defines the project's delegation and authority boundaries. Research Director remains a proposed title whose suitability is an open question. Domain judgement remains attributable to the human user or another named domain authority.

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

The operator investigates unresolved questions within the assignment and available authority. A bounded experiment is appropriate when it can supply missing evidence without exceeding that scope. Human input is required when the next action depends on reserved judgement, unavailable authorization, or an assumption whose consequences make proceeding inappropriate. Independent authorized work can continue. Further planning must resolve a named uncertainty or reduce a material risk.

Decision routing considers consequence, reversibility, and available authority. Predoc specialists resolve reversible routine decisions inside their bounded assignments. The Research and Operational Orchestrators resolve more complex questions inside their respective responsibilities. A matter escalates when it exceeds the acting role's authority, materially changes the objective or subject-matter position, creates an external effect, or would be difficult to reverse. Research formulates the resulting Human Decision Point and works through it directly with the human user.

### Describing uncertainty and selecting the next action

Uncertainty about a claim names the affected assertion and the available grounds. Missing operational observations name what has not been inspected or received. Missing authority names the reserved action and its decision holder. An outstanding verification names the artifact revision and criterion still to be examined. These descriptions can coexist and do not collapse into one confidence score.

Walker et al. (2003) distinguish uncertainty by location, level and nature in model-based decision support. Their conceptual framework separates limitations of knowledge from inherent variability and allows overlapping forms. The TEI Consortium's certainty element associates an assessment with a target and a specific aspect, with optional alternatives, conditions and a numerical degree. These sources motivate precise attachment and differentiated descriptions. The following routing is an RMC design proposal, not a validated taxonomy derived from either source.

For claim uncertainty, missing evidence, imprecision, competing interpretations, contradiction and variability are provisional, combinable descriptions. Record only the distinctions that change the next action or interpretation. A numerical probability needs a stated estimation basis and scope. An LLM's unsupported confidence value does not supply either.

Choose the route that can supply the missing evidence within the assignment.

- Read maintained project knowledge for local definitions and recorded decisions. A bound Vault can supply this knowledge. Check its applicable revision and cited basis. Storage in a Vault confers no general superiority over original evidence.
- Inspect external primary sources when the unresolved claim concerns evidence beyond the maintained project record. Retain conflicting grounds when the comparison does not resolve them.
- Run a bounded experiment for an observable technical question, such as whether an export preserves characters. State what the observed cases do and do not establish.
- Delegate a concrete counterargument or specialist question when another context can contribute evidence. Make the purpose and returned state visible. Examine the returned grounds before integration. A critical persona or automatic callback alone does not meet the Independent Verification contract.
- Ask the human user for the smallest required decision, authorization, action or input when the next step depends on it. Supply a supported recommendation or a concrete visual example when that makes the judgement easier.

A compact message states the unresolved question, its consequence and the next action, with a reference to the relevant record. Detailed alternatives and evidence can remain at that record. For example, “The worksheet still invites project excerpts, contrary to R5. Materials can correct that passage after the owner routes the finding.” This describes an observed deviation and pending authority. It does not recast the defect as low confidence.

The interface should name a pending inspection, an unresolved interpretation and an owner decision in their own terms. Show what can continue independently. Preserve uncertainty that survives further research rather than forcing a resolved status. The description belongs alongside the affected claim or artifact in existing project knowledge. A separate uncertainty register is needed only if cross-record dependencies justify it. Communication economy and reader comprehension remain evaluation questions.

### Timing

- Implement internal and reversible work, then verify the result.
- Use a bounded experiment to resolve low-risk uncertainty.
- Verify public, destructive, identity-bearing, or difficult-to-reverse effects before they occur.
- Escalate subject-matter questions through Research when the next action requires reserved judgement or cannot responsibly proceed within the available evidence and authority.

## Collaboration cycle

```text
Human user <-> Research Orchestrator
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
             Human user
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

### Revision-bound transitions

A recorded transition identifies the acting role and session where applicable, the affected artifact and revision, the action, its evidence and the authority under which it occurred. A revision identifies the examined contents through a stable reference, such as a retained version or content hash. Evidence supports the named claim and scope. Authority establishes who may perform the action or make the decision. These references can be expressed in ordinary project records and require no additional event database.

Prepared means an identifiable result is available for submission. Submitted records that the result and evidence were handed to the designated route, with receipt and processing still requiring their own observations. Examined means a finding names the revision and criteria actually assessed. Correction-required records a supported deviation from those criteria. A finding can recommend a correction, but the responsible production role receives independent findings only through the human user's disclosure and routing decision.

Revised identifies changed contents produced within the assigned write boundary. Rechecked requires a new finding tied to that revision and its relevant criteria. A revision does not inherit an earlier finding's conclusion automatically. Unchanged parts may retain their evidence when the new assessment states and justifies that scope. Human accepted records a human judgement about a named revision and intended use. Authorized write-back records the resulting consequence at its maintained target and includes read-back of that change. Examination, a successful recheck and a recorded acceptance establish different facts.

A transition is valid only when its actor has the required authority, its target and prior state are identifiable, and evidence supports the claimed action. A change in operational state does not establish an epistemic claim, a permission or an acceptance. The labels describe inspectable events within an assignment and do not form a compulsory global progression. A required correction can return work to production, while an unrelated decision remains open.

The [workshop process walkthrough](../examples/workshop-example/process-walkthrough.md) instantiates these distinctions with disjoint production assignments and revision-specific findings. Its proposed omission, correction and material acceptance are authored teaching events. Playback pauses at reserved decision gates, which require an explicit illustrative choice. Revisiting an earlier snapshot invalidates later simulated choices before replay. The interactive presentation exposes source selection, assignments, artifact changes, handovers, findings and decisions. It cannot expose hidden LLM reasoning through an animation. Replaying the deterministic scenario supplies no evidence of harness execution, successful coordination or empirical benefit.

### Feedback and write-back

```text
Observation -> Verification Finding -> interpreted consequence -> canonical write-back
```

An observation becomes persistent knowledge only after verification and interpretation by the role holding the relevant epistemic, operational, and authority context. For an independent finding, the human user first decides disclosure and routing. The receiving role then interprets the finding and writes the resulting consequence to the named canonical target. Complex assignments may identify a reference state and write-back target in their brief or lane context. Both are optional and introduce no mandatory lane fields.

Technical conformance establishes compliance with specified schemas, tests, formats, permissions, or workflow rules. Scholarly validation evaluates claims, interpretations, methods, and representations against appropriate sources and disciplinary criteria. Each receives its own finding.

## Verification selection

Choose the verification form by asking:

1. Can the result be judged from the artifact and explicit criteria?
2. How much implicit project context is necessary for a sound judgement?
3. Is the main risk a mechanical defect, a factual error, or a shared assumption?
4. What are the consequences of a missed error?
5. Would an outside perspective or another expertise add material information?

| Form | Suitable conditions |
| --- | --- |
| Working-instance production check | bounded, reversible, mechanically checkable, or strongly context-dependent work |
| Fresh-context review | prose, documentation, usability, or architecture where an outside perspective exposes assumptions |
| Independent specialist verification | consequential factual, scientific, security, or data-quality claims |
| Two-stage verification | work that is both context-dependent and consequential |

### Context required for independent verification

A separate verifier needs sufficient evaluation context:

- target and scope;
- criteria;
- artifacts and direct evidence;
- binding constraints and decisions;
- exclusions.

The full process history can weaken an outside perspective by reproducing the same assumptions. Supply it only where it is necessary for the criterion. The Independent Verification Agent remains read-only against production artifacts and reports its complete finding directly to the human user. The [independent verification contract](research-to-operations-handoff.md#independent-verification) governs the assignment and return route.

### Shadow verification

An optional shadow-verification lane supports independent review when disclosure to the working agents could alter the work or when shared context could reproduce assumptions. It is activated only when the AI harness can establish a separate context and a direct human user return route. The lane receives read-only access to the authorized target and evidence. Its existence, task, intermediate state, and findings are omitted from production contracts and routes. It reports the complete finding directly to the human user, who decides disclosure and routing to Research or Operations.

Shadow verification is an operating mode of independent verification. Prompt separation and asymmetric routes provide no secrecy or security guarantee. When the harness cannot establish the required context separation or human-only initial return route, report the missing control and describe only the check actually performed. A same-session production check is neither Independent nor Shadow Verification. A disclosed Independent review still requires a separate read-only context and the human-only initial return route. An automatic child-agent callback to a producer does not satisfy the human-only initial return route. The private pilot callback follows a separate deployment contract and does not establish conformance with this portable route.

## Lane

A lane is a responsible workstream with a comprehensible objective, observable result, and appropriate verification. It is not inherently an agent, session, repository, or report. Small tasks need no lane.

The default lane state foregrounds objective, activity, next action, result, evidence, verification, blocker, and Human Decision Point. Extended contracts and reconciliation metadata are optional implementation instruments.

## Operating levels

The following operator-file convention applies to deployments that use it. It describes four operating levels without requiring portable workspaces to adopt those files or migrating private pilot state. Each level has its own canonical location.

- Role. A role is one of the contracts described under Roles, fixed for the deployment as responsibility, write scope, limits, and start prompt. Each operator has exactly one role source, its persona. A role changes only by decision of the human user.
- Operator. An AI Operator carries a defined responsibility and authority boundary, realized through a session in an AI harness. It keeps one operator file that carries state only, namely its lanes, its current report, and its messages. The operator file links to the persona and does not repeat it. Its stable technical address identifies the state file and message routes. Its descriptive role title names the function shown to the human user. A display-title change does not itself rename files or alter role authority.
- Session. A session is the working context occupying a registered operator identity at a given time. On start it registers in the head table of its operator file with harness, working folder, and start time taken from the system clock, and it deregisters at the end. At most one session occupies a registered operator identity at a time. Separate operator identities may share a functional role when their responsibilities and write boundaries are explicit. Work that an unregistered session performs in the deployment's repositories does not count as work of the deployment, and the sync probe of the coordinating operator reports it as unregistered.
- Lane. A lane, the workstream defined under Lane, is recorded as one assignment row in an operator file with its contract, project, and state. The contract stands with the lane in the recipient's operator file. A message from the coordinating operator only announces it.

In deployments using this operator-file convention, operators start from one shared start prompt shape with the role as parameter. The persona adds the role-specific lines and may carry part of Operator Knowledge. Existing knowledge and contract sources remain linked at their maintained locations.

## Human Decision Point

A Human Decision Point is a specific question requiring responsible human judgement. It is `open` or `closed` and has exactly one canonical location. Other projects and views link to it.

## Scaling

The useful structure depends on project context. These criteria support judgement rather than a scoring rule.

### Direct work

Use one working context when the next action is clear, the artifact space is contained, relevant knowledge fits reliably, and the result can be checked directly. One context can clarify the objective, implement an authorized change and perform production checks in a visible sequence. Independent Verification requires a separate review context.

Direct work remains appropriate for substantial tasks when their reasoning and artifact state are tightly coupled. Agent count and general complexity do not establish a need for orchestration.

### Delegation

Delegate when at least one concrete benefit exceeds handoff and integration cost:

- independent workstreams can proceed in parallel;
- a question needs specialist expertise or a distinct source space;
- context separation protects focus or reveals hidden assumptions;
- another agent can produce an independently inspectable result.

Keep work together when every delegate would need the same evolving context or continuously change the assumptions of the others.

### Hierarchy

Add another orchestration layer only when it performs synthesis, conflict resolution, context reduction, responsibility management, or verification for a coherent subarea. Remove a layer that mainly forwards status.

A milestone is an observable result gate. Calendar phases, task schemas, and persistent documents are introduced only when they improve execution, verification, or later reconstruction.

### Coordination warning

Repeated planning is useful only when it resolves a named uncertainty, reduces material risk, or prepares a consequential decision. A clarification cycle should produce implementation, an experiment, evidence, a Verification Finding, or a Human Decision Point.

### Reduction principle

Use the smallest structure that preserves objective, authority, evidence, and responsibility. Expand it when another context creates material value and reduce it when coordination becomes the dominant output.

## Core statements

1. Research works directly with the human user and can connect several project contexts.
2. Clear, authorized, proportionate, and verifiable work moves into implementation.
3. Operations implements within a named scope and returns the actual result with evidence.
4. Verification form follows expected failure mode, context dependence, and consequences.
5. Independent verification reports the complete finding directly to the human user, who alone decides disclosure and routing for integration.
6. Human Decision Points are open or closed at one canonical location.
7. Reports, IDs, contracts, Git anchors, and detailed status fields are optional instruments.
8. Research Orchestrator behavior has an activation boundary, preserves human user authority, scales structure to the assignment, and reports only the result maturity supported by evidence.

## References

1. Malone, T. W., and Crowston, K. (1990). *What Is Coordination Theory and How Can It Help Design Cooperative Work Systems?* https://doi.org/10.1145/99332.99367
2. Galbraith, J. R. (1974). *Organization Design: An Information Processing View.* https://doi.org/10.1287/inte.4.3.28
3. Kim, Y. et al. (2025). *Towards a Science of Scaling Agent Systems.* https://arxiv.org/abs/2512.08296
4. Anthropic (2025). *How We Built Our Multi-Agent Research System.* https://www.anthropic.com/engineering/multi-agent-research-system

5. Walker, W. E., et al. (2003). *Defining Uncertainty: A Conceptual Basis for Uncertainty Management in Model-Based Decision Support.* [Full text](https://repository.tudelft.nl/file/File_f19ef7d6-bb60-40ac-9a62-99a47341bf4f).
6. TEI Consortium (2026). *TEI P5 Guidelines, certainty element reference*, version 4.12.0. https://www.tei-c.org/release/doc/tei-p5-doc/en/html/ref-certainty.html
