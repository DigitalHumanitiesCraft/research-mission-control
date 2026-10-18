---
title: Project Governance
project:
  name: Research Mission Control
  repository: https://github.com/DigitalHumanitiesCraft/research-mission-control
status: active
language: en
created: 2026-08-17
updated: 2026-10-18
method:
  name: Promptotyping
  url: https://dhcraft.org/Promptotyping/
related: [project, integration, orchestration-architecture, orchestration-thresholds, method-specification]
---

# Project Governance

This Action Document defines how Research Mission Control applies a project-specific `knowledge/governance.md` to an Implementation Brief, implementation, verification, and write-back. Project Governance contains the rules of one project. Research Mission Control assigns roles, workstreams, and evidence so those rules govern every state change.

## Governance object

An executable governance document covers:

- roles and authority
- canonical knowledge and artifact locations
- source, evidence, uncertainty, and maturity status
- read, write, and execution boundaries
- deterministic verification, agent review, subject-matter validation, and acceptance
- write-back and conflict resolution among knowledge locations
- privacy, rights, attribution, and disclosure
- publication conditions
- escalation to the human user or named domain authority

The project Action Layer may narrow these boundaries for a specific session. Expanding them requires a documented decision by the human user or named authority.

## Role integration

The [complete role contracts](../orchestrators/README.md) govern role authority. Project Governance adds the rules of the particular project.

### Research Orchestrator

Research maintains Project Governance with the human user for its configured projects. Each Implementation Brief references applicable authority, source hierarchy, interpretation boundaries and publication conditions.

### Operational Orchestrator

Operations reads that governance before decomposing the assignment and names the authorized write scope, external boundaries, expected evidence and write-back target in its tasks.

### Independent Verification Agent

The [verification contract](research-to-operations-handoff.md#independent-verification) keeps the context read-only and the complete finding's initial return human-only. Governance supplies the project-specific criteria for two separate questions:

1. Does the actual end state satisfy operational rules and acceptance criteria?
2. Are statements, representations and interpretations supported and validated under the named subject-matter rules?

A passed technical criterion establishes conformance only to that criterion. Subject-matter acceptance remains a separate decision.

## Governance in the Implementation Brief

Use the [Implementation Brief contract](research-to-operations-handoff.md#research-to-operations). Reference dedicated Project Governance when rights, authority, external services or persistent state changes require it. The governance reference identifies:

- the canonical path and a version or commit when several relevant states exist;
- applicable roles and reserved decisions;
- allowed sources, data and required checks;
- authorized locations, tools and external services, with excluded state changes;
- documents and evidence objects requiring write-back;
- conditions requiring Research, the human user or a named domain authority.

## Lane contract mapping

Existing fields express governance without a new mandatory schema:

| Governance question | Lane field |
|---|---|
| Which objective is authorized? | `goal` |
| Which decision may the lane make? | `authority` |
| Which sources and governance state apply? | `inputs` |
| Which artifacts should result? | `outputs` |
| How is the work assessed? | `verification`, with consequential subject-matter judgement at its canonical Human Decision Point |
| Which evidence is required? | `evidence` |
| Which knowledge locations and lanes require write-back? | `touches` |

A complex project may represent governance as a subordinate Research workstream. That workstream maintains the confirmed project contract and checks its consistency. It does not create additional decisions.

## Field ownership

| Information | Authoritative source |
|---|---|
| Project status | configured canonical project document, usually `knowledge/project.md` |
| human user point and decision | one named canonical location in maintained project knowledge |
| Objective and expected result | canonical task context or Implementation Brief when persistence is required |
| Authority, write boundaries, escalation, and write-back | task instructions and Project Governance where required |
| Workstream objective, activity, next action, result, evidence, and verification | named assignment or optional lane record |
| Observable work state | Git, worktree, and leaf artifacts |
| Technical currency | generators and tests |
| Subject-matter acceptance | human user or named domain authority |

The project-specific `knowledge/integration.md` is the binding source map. This table adds the governance-specific owners.

A lane report may update current state, next action, result, blockers, decision needs, and evidence references. It does not silently change objectives, authority, hierarchy, write boundaries, or explicit acceptance criteria. A separate version is useful only when several relevant states must remain distinguishable.

## Status model

Project status, lane activity, evidence, and subject-matter judgement remain separate statements. Report, evidence, and contract status are optional technical reconciliation diagnostics. Human Decision Points are `open` or `closed` at their canonical location. Research Mission Control does not infer subject-matter validity from technical status.

## Write-back

Apply the [finding and return contract](research-to-operations-handoff.md#finding-routes) before integrating an independent finding. A Result with Evidence identifies the production finding's canonical target:

- a project rule or authority boundary belongs in `governance.md`;
- a requirement or clarified subject-matter decision belongs in the responsible knowledge document;
- a chronological work finding belongs in the journal;
- a source or evidence relation belongs in a Grounded Vault instance after verified project binding;
- a cross-project method finding belongs in Promptotyping or Research Mission Control knowledge;
- a change affecting another lane requires a documented handoff to its responsible role.

A write-back with significant subject-matter or public consequences becomes an open human user point. Keep that point and its eventual decision at one [canonical location](research-to-operations-handoff.md#human-decision-points), linked from dependent projects and lanes.

## Escalation

Escalate when at least one condition applies:

- sources or definitions conflict on a consequential issue
- available evidence does not support a central statement
- rights, privacy, attribution, or disclosure remain unclear
- an action is external, public, destructive, identity-bearing, or difficult to reverse
- the assignment exceeds a repository, artifact, or authority boundary
- subject-matter validity and operational correctness produce different findings
- a project finding would change the general Promptotyping or Research Mission Control method

The human user point names context, recommended state, concrete object, criterion, consequence, and expected answer.

## Acceptance criteria

Project Governance applies when every relevant brief references its rules, implementation exposes authority and write scope, verification separates substantive and operational findings, and each write-back and human user point has one canonical target. The existing [human-controlled finding route](research-to-operations-handoff.md#finding-routes) remains binding, including read-only Verification and human authorization before a production role receives its finding.
