---
title: Research Mission Control Integration
status: active
language: en
updated: 2026-10-18
related: [project, orchestration-architecture, research-to-operations-handoff, observed-context-stream-operation, observed-live-demo-operation]
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

## Second Brain deployment

Second Brain is the personal research environment in which the vault pilot operates. Its maintained vault holds cross-project knowledge and operational sources. Project repositories maintain their own implementation knowledge. Research Mission Control supplies the reusable coordination method. The private ACTIVE-WORK interface provides the deployment's Mission Control views and knowledge interface.

- This source repository maintains the method, its executable contracts and the operator-data adapter in `dashboard/make_lab_lanes.py`.
- The private interface repository maintains the running interface, its source adapters, answer inbox, design, implementation plan and browser checks. Its `knowledge/INDEX.md` is the entry point for current interface behavior.
- The pilot's operator files hold assignment and report state. Their technical addresses support routing. Descriptive role titles support human recognition. A generated view presents the adapter-captured source state with an inspectable reference and revision. It does not establish current session activity or receipt by another operator.
- An answer saved by the interface, an answer received by the responsible operator and its adoption into canonical work are distinct events. Their evidence belongs in the deployment's integration contract.
- Public Second Brain templates and the public Research Mission Control distribution have separate publication boundaries. A source-repository change neither publishes a release nor transfers private interface data into it.

The dated console contract, fixture inventory and migration plan in this source knowledge folder remain proposals. Their historical observations do not specify the current interface. Reconciliation of assignment, lane and workstream terminology requires an explicit method decision before changing portable contracts or generated workspaces.

## Initialization relationship

A working context is one separately open Codex task, Claude Code conversation, or equivalent harness context with its own context window and one assigned Research Mission Control role. The project workspace is the shared local folder and Git worktree. In a new standard setup, the first context invokes the initializer and remains the Research Orchestrator. It progressively establishes the topic, first useful result, inputs and workspace in the human user's language, one necessary question at a time. It shows the current setup phase and next action, accepts exploratory projects and moves to configuration once a bounded first assignment is clear. After authorization it creates a new shared local repository. Two generated contracts initialize Operations and Verification in separate contexts. An existing Operations or Verification context follows its verified start contract. It does not silently become Research or initialize the workspace again. The initializer refuses an existing target.

The initialized repository contains one maintained Promptotyping knowledge core, the project-specific `knowledge/integration.md`, Context Stream directories, and role start contracts. It contains no remote until the human user authorizes ownership and visibility.

## Knowledge relationship

Promptotyping is the default project-bound knowledge profile. Its Knowledge Documents permit reconstruction of accepted project state and continuation after context loss only to the extent that decisions, evidence and unfinished actions were recorded. The repository knowledge acts as operational memory for the active project.

Grounded Vault is activated only by a project-specific binding. The binding names the claims, evidence objects, identifiers, validation responsibilities, and write-back relationship covered by grounding. Until that contract is established and verified, its state remains `required; project-specific binding pending` or inactive.

A private, institutional, or project Vault can serve as an optional long-term knowledge source only when the project integration contract names its exact source, selection boundary, read and write authority, and write-back rule. It remains outside the portable method contract and cannot override project authority or inspected artifact state. The presence of a readable Vault path does not configure or activate it.

The [configurable knowledge adapter](knowledge-adapters.md) implements a bounded read-only selection from arbitrary local Markdown layouts. It emits the existing UI catalog and source-response formats. Its configuration does not grant write-back or publication authority, activate Grounded Vault, or create a portfolio from notes. Project and operator adapters remain separate.

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

## Operator briefing transport

The deployment records its operator registry, verified context identities, permitted dispatch and read-back capabilities, and unavailable routes. Prefer an existing context whose role is evidenced. A cross-harness continuation is valid only when the installed client supports it, the exact existing session has been identified, and the requested permissions preserve the briefing's read-only scope. Do not substitute an unrelated active context or create a new one merely to fill a missing reply. A skill or installed client grants no additional authority.

A briefing record retains the requested round, actual response identity and timestamp, attributed status, project and assignment references, completed results and result material, genuine questions, gaps, continuation or halt, and the scope of checks actually performed. Preserve the separation of the next authorized action, additional proposals and required human contributions defined in the [operator briefing contract](research-to-operations-handoff.md#operator-briefing). Retain a requested self-assessment as the operator's attributed judgement, with its scope, source date, evidence and limits, separately from Next action. A coordinator's own report is identified as such rather than attributed to a dispatched counterpart. Claims newly reported and work newly verified are separate facts.

Where an interface stores briefing snapshots, retain a completed round as an immutable source artifact and update a stable current-round reference only after validation succeeds. Bind displayed excerpts to the canonical report, project and assignment revisions they describe. Reject a mismatched binding and fall back to the explicitly dated canonical report. A missing or invalid current reference must not silently relabel old replies as fresh. Keep historical rounds accessible without treating their questions as current authority.

These artifacts are a deployment adapter for the [operator briefing workflow](research-to-operations-handoff.md#operator-briefing). Private context identifiers, portfolio reports and machine-specific invocation details remain outside the portable method and its publication bundle.

## State-specific source precedence

Source precedence follows the state being claimed.

- Authority comes from current human user decisions, applicable governance, and the project integration contract within their respective scope.
- Epistemic claims come from direct sources and evidence, then their maintained interpretation in project knowledge.
- Operational claims come from inspected artifacts, repositories, data, and running systems; messages and dashboards report that state but do not establish it.
- Verification claims come from the complete finding and cited evidence for its examined scope, followed by any documented recheck. Human acceptance remains a separate authority judgement.

When same-class sources conflict, the responsible role exposes the conflict and records the interpreted transition in the canonical target. Recency alone does not allow a message or report to supersede a direct source or actual artifact.

## Canonical ownership and write-back

Canonical project files use one responsible writer at a time. Operations returns results and proposed knowledge changes through its role-owned transport. Research verifies and integrates conceptual or project-level knowledge in its canonical location. Research is the default owner of maintained project knowledge. Operations integrates implementation state inside its authorized artifact scope and may write technical knowledge only at exact paths explicitly assigned to it by the integration contract. Conceptual and scholarly consequences return to Research. Each path retains one responsible writer at a time. Verification reports findings through its own transport and never produces a correction or alters the evaluated target. It may recheck a correction produced by the responsible Research or Operations context.

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

Research and Operations can perform bounded production checks in their current context. Those checks do not constitute Independent Verification. A separate Verification Agent receives only the evaluation context required by the criterion. It returns a compact finding with target, criterion, observed state, evidence, consequence, and recommended integration role. The complete finding goes first and only to the human user.

Independent, Blind, and Shadow describe different controls.

- Independent Verification separates the assessment context from production and keeps it read-only against evaluated artifacts. It may receive the complete Result with Evidence and does not conceal its existence.
- Blind Verification adds a declared reading-order restriction to Independent Verification. Named producer reasoning, reports, earlier findings, or preferred conclusions are withheld until the initial finding is sealed. It does not conceal the verifier's existence or create secrecy.
- Shadow Verification adds human user-controlled visibility and technical isolation. It requires a technically separate context, read-only target access, a private return route to the human user, and omission of the verifier's identity and route from production contracts. If these properties are unavailable, report the missing control. Use the Independent or Blind label only when a separate read-only review context and the required human-only initial return route are verified. Shadow and Blind may be combined when both triggers hold.

An automatic child-agent callback to a producer does not satisfy the requirement that the complete finding go first and only to the human user. If a separate review context or that return route is unavailable, report the limitation and describe only the check actually performed. The private pilot callback follows a separate deployment contract and does not establish conformance with this portable route.

The human user decides whether a finding enters active work or canonical knowledge and which production role receives it. Verification never implements that consequence.

## Publication relationship

The public method release includes only allowlisted instructions, source code, the generated skill package, and evidence suitable for redistribution. Operational views, live portfolio data, private project decisions, runtime messages, and inaccessible Vault references remain outside that release. A separate publication process can publish an operational view after replacing its state with verified synthetic data.

## Synthetic UI distribution input

The separately maintained UI exports a self-contained demo through an exact file list. This repository stages only that explicitly selected package under the ignored demo/ directory and retains its exact export manifest as demo-export-manifest.json. The publication manifest enumerates every delivered demo file and its license. The release builder verifies the staged bytes, file set, source revision and clean source flag against that pin before adding them to the ordinary distribution. A public clone already contains these demo sources and can rebuild their synthetic data with the bundled tools. The private source repository requires the explicitly supplied, pinned export input; it does not discover or read any personal portfolio source.

Publication requires the fixed package and its review evidence. A draft export can be inspected while its source is dirty, and the non-draft builder rejects that state.

Release metadata identifies both the method source commit and the UI source commit and export-manifest digest. These are separate provenance claims. After source-history consolidation, former revisions remain historical evidence anchors. Refresh the current distribution from the selected clean interface checkout through the same exporter, exact manifest pin and byte checks. A changed history identifier alone establishes no product change; a separate byte comparison can identify unchanged product files. Earlier checks and reviews retain their examined revision and scope. Optional operator briefings enrich a canonical first render without blocking it. Their pending or unavailable status stays explicit. A valid late snapshot updates affected projections while preserving personal conversation drafts, keyboard focus and selected scope. Sources and required results retain independent availability. The shared application contract is exercised against delayed and rejected synthetic reads. The demo is a read-only synthetic example with local browser preferences and drafts. It cannot deliver messages, activate operators or claim real calendar, model or acceptance observations.

## Public HTML documentation

The public reading route has two primary pages. index.html introduces the method through the connected requirements-study and workshop example; the generated docs/knowledge/system-description.html follows the practical assignment, examination and setup. Reference documents remain directly linked. Their navigation and optional collapsed contents share the same static reading layout without a persistent sidebar. The existing document manifest carries validated aliases for earlier section URLs.

The practical example supplies original fictional records, a completed authored requirements matrix and dependent workshop materials. Its material-rule change traces R5 through Research-owned RQ-06 and Operations-owned exercise, worksheet, briefing and training cases. The complete source pack under examples/workshop-example/ remains reusable without the browser. The first local exercise creates only results/handover-requirements.md in a copied workspace, derives a fresh result from records before consulting the matrix and leaves every supplied source unchanged. A separate Independent Verification finding goes first to the human owner; classroom peer feedback and local source checks do not constitute that review. Local adaptation follows three existing boundaries: an editable demo copy, a reader-only catalog with authored profiles disabled, and a separate method workspace. The example guide maintains the complete commands. Neither catalog generation nor initialization binds portfolio data or launches an agent.

The publication builder renders the Markdown documents selected by web-docs/documents.json from the already allowlisted bundle. The maintained Markdown remains canonical and downloadable without byte changes. Generated pages retain stable section links, original metadata and the distinction between package version and a document's recorded version. A different package version does not update historical evidence.

Python-Markdown is a pinned build-only dependency recorded in pyproject.toml and uv.lock. Rendering runs without network discovery. Unsafe schemes, escaping paths, unselected source reads and active raw HTML are rejected or rendered inert under the documented contract. Generated HTML, CSS and reports use LF bytes. Original Markdown downloads and pinned demo members retain their exact source bytes, including existing CRLF line endings. The publication builder writes a separate package `.gitattributes` with `* -text` before hashing the bundle, so ordinary Git staging and checkout do not convert those line endings. Source-repository and initializer attributes retain their own rules. The release regression compares raw file bytes with actual staged blobs, a committed archive and a fresh checkout under both `core.autocrlf` settings, then rebuilds the checked-out package. These checks establish the package EOL contract within the examined Git configuration; separately configured content filters require their own verification. The generated report binds the examined source and output hashes. Original file licences also govern their rendered text. Supplied font and DHCraft brand assets retain their explicit separate assignments and notices.

The static example and initializer need no Markdown parser at runtime. Public source-package rebuilding uses the documented web-docs extra. A generated release target containing Git state is preserved and requires a fresh output directory.


## Recorded vault pilot

Since 14 October 2026 the method runs as a pilot in the author's Obsidian vault, a Second Brain instance, with several AI harnesses at once (Claude Code, Codex, Gemini). The pilot draws on the method's role prompts and adds a flatter operating layer with deployment-specific contracts. Those contracts do not agree with every portable return route:

- An operator has one state file with a stable technical address. Its descriptive role title is a separate field for human-facing views. For example, `build` remains a routing address while Developer names its function. The persona defines responsibility and authority. The head table records the role source, execution environment, session and aliases.
- In the pilot, an assignment is recorded as a lane row with its identifier, expected result, state and project. Its contract defines execution scope, verification, acceptance responsibility and stopping point. Technical verification and human acceptance remain separate judgements. The portable method's broader workstream meaning of lane is described in [`orchestration-architecture.md`](orchestration-architecture.md#lane). Reconciling these meanings remains proposal work.
- Messages go into the sender's own file and are receipted in the recipient's. The human user is a recipient like any other.
- The operator adapter `dashboard/make_lab_lanes.py` reads these files for the private Mission Control interface of the Second Brain instance. The interface also has its own adapters for portfolio and knowledge sources. Its current implementation and checks are maintained in that interface's repository.

The pilot's bounded reviewer is instructed to deliver its finding to coordination. The portable Independent Verification Agent must deliver the complete finding first and only to the human user, who controls subsequent routing. These are different authority and communication contracts. The direct pilot callback cannot be represented as conformance with the portable route without an explicit reconciliation decision. Monitoring has its own communication contract and does not supply that decision.

The pilot's observations are recorded in its lab documents and in the source repository's journal. Its dated reconciliation and migration proposals remain outside the publication bundle. They have not migrated the private interface into this repository or replaced the portable role contracts. [the Second Brain deployment](#second-brain-deployment) defines the component boundary.
