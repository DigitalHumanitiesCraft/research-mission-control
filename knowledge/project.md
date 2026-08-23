---
title: Research Mission Control Project
status: active
language: en
updated: 2026-08-23
related: [integration, orchestration-architecture, method-specification]
---

# Research Mission Control Project

## Purpose

Research Mission Control provides a model-independent and harness-portable architecture for agentic research orchestration. It connects conceptual work, implementation, bounded specialist work, independent verification, and human direction through explicit role and communication contracts.

The repository is the canonical source for the general method. Its executable artifacts are the complete system prompt, installable skill, transactional workspace scaffolder, role contracts, and tests. The publication package also contains the communication protocol, maintained method knowledge, and technical start interface. The working source repository can carry internal operational references outside the publication package.

## System boundary

The method governs the transition from a human user's objective to an implemented and verified project state. It defines responsibility, authority, minimum exchange, evidence, escalation, and canonical write-back. It does not establish scholarly truth through technical checks, confer authority through tool access, or guarantee cross-session notification through shared files.

A deployment may use one context for contained work. The reference configuration uses a shared project repository and three contexts. Their responsibilities can be assigned to different frontier models or agentic coding harnesses without changing the method contract.

## Functional research group

| Level | Role | Responsibility |
| --- | --- | --- |
| Research direction | Human user as Research Director | directs the work and defines delegation, authority, assessment, and acceptance |
| Postdoc | Research Orchestrator, an LLM-based AI agent in an AI harness | develops concepts, sources, criteria, and executable briefs with the human user |
| Postdoc | Operational Orchestrator, an LLM-based AI agent in an AI harness | changes actual project state, coordinates implementation, and integrates bounded results |
| Predoc | Specialist or subagent | completes one bounded research, implementation, or verification assignment |
| Independent control | Independent Verification Agent, an LLM-based AI agent in a separate working context | checks results against criteria and evidence, then reports the complete finding first and only to the human user |

The academic labels are a functional metaphor. They describe scope, synthesis responsibility, supervision, and escalation.

## Decision routing

Predoc roles decide details inside a bounded assignment and its configured authority. The two Postdoc roles resolve more complex conceptual or operational questions inside their configured responsibilities. The human user directs the work and defines which decisions remain human and which are delegated. Agents stop before actions for which the project contract supplies no authority.

A Human Decision Point presents the concrete object, relevant context, assessment criterion, material consequences, uncertainty, supported options, a recommendation, and the expected answer format. Other work continues when it is authorized and independent of the open point.

## Knowledge profile

The current context window holds selected working context. The project repository preserves maintained knowledge across sessions. Promptotyping supplies the project-bound reconstruction basis and functions as operational memory for the active work.

Grounded Vault is optional long-lived knowledge infrastructure. It becomes relevant when substantive claims require machine-resolvable grounding and attributable human verification. The requirement remains pending until the deployment defines and verifies a project-specific binding.

Another private, institutional, or project Vault is also an optional long-term knowledge source. A deployment may read or write it only after `knowledge/integration.md` names the exact source, selection boundary, authority, and write-back rule. An available Vault path alone does not activate that source.

## Verification profile

Verification follows the likely failure mode, required context, consequences, and value of independence. A working-context check suits bounded mechanical claims. A fresh context can reveal assumptions in prose, usability, and architecture. Consequential factual, scholarly, security, or data-quality claims can require independent specialist review. Context-dependent work with substantial consequences can use two stages.

The three separate controls have distinct meanings.

- **Independent Verification** uses a separate assessment context and read-only access to the evaluated target. It may receive the complete Result with Evidence and does not imply concealment from production roles.
- **Blind Verification** is Independent Verification with a declared reading-order restriction. The verifier forms an initial finding before reading named producer reasoning, reports, earlier findings, or preferred conclusions. It does not imply secrecy.
- **Shadow Verification** is a human-commissioned visibility and isolation profile. It requires a technically separate context, read-only target access, a private return route to the human user, and omission of its identity and route from production contracts. Without verified infrastructure for those properties, the review must be described as Independent or Blind rather than Shadow.

A Verification Agent never becomes the producer of a correction. It reports and rechecks; the human user routes an accepted finding to Research or Operations for interpretation and implementation.

## Completion criteria

The method is release-ready when the following results agree.

- The role prompts, initializer, generated workspace, and maintained knowledge describe one architecture.
- Contract tests and clean-workspace initialization establish the executable behavior claimed by the documentation.
- A fresh Codex context and a fresh Claude Code context can initialize and operate the same representative project from the published materials.
- Public repository content contains no private portfolio state, machine-specific paths, or unlicensed material.
- The publication manifest assigns MIT to code and the installable skill and CC BY 4.0 to documentation, prompts, evaluation material, release metadata, and the website; public reuse is authorized under those assignments.

Technical validation establishes the first two criteria. A local draft-package probe has established representative operation across fresh Claude Code and Codex tasks for one bounded technical assignment. The public RC2 bundle and its release provenance have been verified from a fresh clone. Fresh Codex and Claude Code initialization with the same new project and human acceptance of the published interface remain separate findings.

## Publication boundary

The public method consists of the repository instructions, downloadable skill, skill source, portable prompts, technical start interface, Knowledge Core, and tests. Operational views can contain local project names, paths, decisions, and evidence references. They remain non-delivered source-repository components unless a separate publication process replaces their state with verified synthetic data.

The public repository and release use the file-level MIT and CC BY 4.0 assignments defined in `LICENSE` and `publication-manifest.json`. The RC2 builder and release tests establish exactly one assignment for every delivered path and exclude operational dashboard state, private project data, runtime messages, and source-only history from the public bundle.
