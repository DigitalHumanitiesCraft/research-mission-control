---
title: Project Governance
project:
  name: Research Mission Control
  repository: https://github.com/DigitalHumanitiesCraft/research-mission-control
status: active
language: en
created: 2026-08-17
updated: 2026-08-22
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
- escalation to the Critical Expert

The project Action Layer may narrow these boundaries for a specific session. Expanding them requires a documented Critical Expert decision.

## Role integration

### Research Orchestrator

The Research Orchestrator develops and maintains Project Governance with the Critical Expert. Its scope may include one or more projects. Each Implementation Brief references the relevant project authority, source hierarchy, interpretation boundaries, and publication conditions.

### Operational Orchestrator

The Operational Orchestrator reads the applicable governance before decomposing an assignment. Each internal task names its authorized write scope, external boundaries, expected evidence, and write-back target. Practical implementation decisions remain inside this contract.

### Independent Verification Context

The Independent Verification Context is a separate read-only control perspective outside the two Postdoc Orchestrator roles. It reports its complete finding directly to the operator. Only the operator decides whether to disclose the context or route the finding to Research or Operations.

Independent verification asks two separate questions:

1. Does the actual end state satisfy operational rules and acceptance criteria?
2. Are statements, representations, and interpretations supported and validated under the named subject-matter rules?

The Verification Finding keeps these classes distinct. A passed technical criterion establishes conformance only to that criterion. Subject-matter acceptance remains a separate decision. Prompt separation and asymmetric routes provide no secrecy or security guarantee.

## Governance in the Implementation Brief

An Implementation Brief references Project Governance when rights, authority, external services, or persistent state changes require a dedicated rule base:

```text
GOVERNANCE
Canonical path to applicable Project Governance.
Add a version or commit only when several relevant states exist.

AUTHORITY
Roles and decisions that apply to this assignment.

SOURCES AND DATA
Allowed sources, data, and required checks where relevant.

WRITE AND EXECUTION BOUNDARIES
Authorized locations, tools, external services, and excluded state changes.

WRITE-BACK
Documents and evidence objects to update after implementation.

ESCALATION
Concrete conditions that return the work to Research or the Critical Expert.
```

## Lane contract mapping

Existing fields express governance without a new mandatory schema:

| Governance question | Lane field |
|---|---|
| Which objective is authorized? | `goal` |
| Which decision may the lane make? | `authority` |
| Which sources and governance state apply? | `inputs` |
| Which artifacts should result? | `outputs` |
| How is the work assessed? | `verification`, with consequential subject-matter judgement at its canonical Operator Point |
| Which evidence is required? | `evidence` |
| Which knowledge locations and lanes require write-back? | `touches` |

A complex project may represent governance as a subordinate Research workstream. That workstream maintains the confirmed project contract and checks its consistency. It does not create additional decisions.

## Field ownership

| Information | Authoritative source |
|---|---|
| Project status | configured canonical project document, usually `knowledge/project.md` |
| Operator point and decision | one named canonical location in maintained project knowledge |
| Objective and expected result | canonical task context or Implementation Brief when persistence is required |
| Authority, write boundaries, escalation, and write-back | task instructions and Project Governance where required |
| Workstream objective, activity, next action, result, evidence, and verification | named assignment or optional lane record |
| Observable work state | Git, worktree, and leaf artifacts |
| Technical currency | generators and tests |
| Subject-matter acceptance | Critical Expert or named authority |

The project-specific `knowledge/integration.md` is the binding source map. This table adds the governance-specific owners.

A lane report may update current state, next action, result, blockers, decision needs, and evidence references. It does not silently change objectives, authority, hierarchy, write boundaries, or explicit acceptance criteria. A separate version is useful only when several relevant states must remain distinguishable.

## Status model

Project status, lane activity, evidence, and subject-matter judgement remain separate statements. Report, evidence, and contract status are optional technical reconciliation diagnostics. Operator Points are `open` or `closed` at their canonical location. Research Mission Control does not infer subject-matter validity from technical status.

## Write-back

The Result with Evidence assigns each production finding to a canonical target. An independent Verification Finding enters production write-back only after the operator routes it to Research or Operations:

- project rule or authority boundary to `governance.md`
- requirement or clarified subject-matter decision to the responsible knowledge document
- chronological work finding to the journal
- source or evidence relation to the Grounded Vault instance after verified project binding
- cross-project method finding to Promptotyping or Research Mission Control knowledge
- change affecting another lane to a documented handoff to its responsible role

A write-back with significant subject-matter or public consequences becomes an open operator point.

Each operator point has exactly one canonical location. Other projects and lanes link to or transclude it. The point closes after the decision, and the decision text remains at the same location.

## Escalation

Escalate when at least one condition applies:

- sources or definitions conflict on a consequential issue
- available evidence does not support a central statement
- rights, privacy, attribution, or disclosure remain unclear
- an action is external, public, destructive, identity-bearing, or difficult to reverse
- the assignment exceeds a repository, artifact, or authority boundary
- subject-matter validity and operational correctness produce different findings
- a project finding would change the general Promptotyping or Research Mission Control method

The operator point names context, recommended state, concrete object, criterion, consequence, and expected answer.

## Acceptance criteria

The Project Governance interface is complete when every relevant Implementation Brief references applicable governance, each implementation exposes authority and write scope, every Verification Finding separates substantive and operational findings, the Independent Verification Context remains read-only and reports directly to the operator, each independent finding enters production only through an operator decision, each write-back has one canonical target, and every operator point is stored exactly once.
