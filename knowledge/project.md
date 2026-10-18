---
title: Research Mission Control Project
status: active
language: en
updated: 2026-10-17
related: [integration, orchestration-architecture, method-specification, observed-live-demo-operation]
---

# Research Mission Control Project

## Purpose

Research Mission Control provides a model-independent and harness-portable architecture for agentic research orchestration. It connects conceptual work, implementation, bounded specialist work, independent verification, and human direction through explicit role and communication contracts.

The repository is the canonical source for the general method. Its executable artifacts are the complete system prompt, installable skill, transactional workspace scaffolder, role contracts, and tests. The publication package also contains the communication protocol, maintained method knowledge, and technical start interface. The working source repository can carry internal operational references outside the publication package.

## Documentation and manuscript outcome

The commissioned documentation outcome connects a usable README, an extended factual [system description](system-description.md), and the source-only method-paper draft. The README provides entry and usage, the system description explains the working relationships through the maintained knowledge and execution cycle, and the manuscript develops the argument and proposed evaluation. Formal contracts remain at their current maintenance locations. The paper remains a draft until its scholarly claims and presentation have been assessed; the planned experiments are unperformed.

## Knowledge transfer as the methodological aim

The method organises the production, examination, and reuse of knowledge contributions across people, AI operators, and projects. A contribution can be a source-supported finding, interpretation, methodological choice, or artifact-related insight. Its representation in a maintained document does not establish scholarly validity.

Luhmann's account of communication with a linked note collection describes combinations becoming productive through inquiry and evaluation (Luhmann, 1981). Research Mission Control extends this insight as a methodological proposal. It treats transfer between working contexts as a point where the grounds, scope, and uncertainty of a contribution must remain inspectable. This analogy is not evidence of improved AI-assisted research.

A transfer is adequate for a particular use when the recipient can identify the claim and its grounds and determine what must be re-examined in the receiving context. Context selection, bounded delegation, proportionate verification, and canonical write-back implement the proposed working cycle. Projects may reuse contributions without acquiring a new mandatory hierarchy. Existing role, authority, and verification-return contracts remain in force.

The working hypothesis is that this arrangement can support useful recombination while reducing loss of context. The proposed Agentic Zettelkasten framing makes the knowledge interaction concrete through maintained Markdown documents in Obsidian and selective reads and authorised writes through an AI harness. Relations are explained in the surrounding prose, including what supports a decision or constrains an implementation. A link supplies navigation and cannot by itself establish entailment, authority, or automatic correction propagation. This is a concrete profile of the portable method, not a requirement to use Obsidian.

The source-only manuscript Research Mission Control: Coordinating Research with an Agentic Zettelkasten, in research-artefacts/research-mission-control-method-paper.md, explains the method through explicit terminology, a process figure and the implemented repository. The human user confirmed the process model and inspectable implementation as the central methods contribution. A worked, explicitly constructed research-synthesis example follows a changed inclusion criterion through selection decisions, interpretation, verification and authorized write-back. It asserts no completed experiment or supplied synthesis application. The process figure in research-artefacts/agentic-zettelkasten-process.svg follows the current integration and verification-return contracts.

The proposed evaluation compares a well-organised single document with linked notes containing matched substantive information and explanatory wording. Candidate tasks concern resumption and correction with dependent consequences. The human user confirmed knowledge structure as the subject of the first proposed comparison. Role contracts, assignments, verification and write-back procedures remain constant across conditions. Model configuration, tools, permissions and execution budget would also be held constant in agent comparisons. The comparison therefore cannot establish the independent contribution of roles, verification or the complete coordination method. Assessment includes correctness, evidence recovery, missed dependencies, unnecessary changes and maintenance effort. These measures require operational definitions and a pilot. The next complete manuscript is authorised to remain a methods account with an evaluation plan and does not depend on a completed comparative study. The synthesis illustration is the agreed explanatory case, while empirical study material remains unselected and experiments remain unperformed. The earlier correspondence-evaluation-plan.md is retained as an unselected candidate after the human user rejected that running example for the paper. Existing assignment, independent-verification and publication contracts remain unchanged. The manuscript and figure stay outside the publication bundle.

Luhmann, N. (1981). Kommunikation mit Zettelkästen. Ein Erfahrungsbericht. In *Öffentliche Meinung und sozialer Wandel / Public Opinion and Social Change* (pp. 222–228). Westdeutscher Verlag. [Full text](https://ckrybus.com/static/papers/luhmann1981.pdf).

## System boundary

The method governs the transition from a human user's objective to an implemented and verified project state. It defines responsibility, authority, minimum exchange, evidence, escalation, and canonical write-back. It does not establish scholarly truth through technical checks, confer authority through tool access, or guarantee cross-session notification through shared files.

A deployment may use one context for contained work. The reference configuration uses a shared project repository and three contexts. Their responsibilities can be assigned to different frontier models or agentic coding harnesses without changing the method contract. Since October 2026 the method is also applied as an active installation outside a project repository, in a vault-based research lab whose lanes keep their state in files with one writer each and where each lane completes its assigned verification and scoped write-back, while the coordinating session resolves cross-project dependencies and conflicts under the deployment contract.

## Relationship to Second Brain

The vault pilot applies the method within Second Brain, a personal research environment spanning maintained vault knowledge and project repositories. Its private Mission Control interface presents operational sources and results for human judgement. The reusable method, that private interface and public template distributions have separate implementation and publication scopes. Their maintained relationship is defined in [`integration.md`](integration.md#second-brain-deployment).

Human-facing assessment needs an identifiable result, its intended use, a concrete criterion and a direct way to inspect it. The existing Human Decision Point contract supplies these requirements. A completed implementation or a passing check alone does not establish that the interface meets them for its user.

Current operator reports include completed results and keep the next authorized action, additional proposals and genuine human user questions distinguishable. A reasoned self-assessment describes the operator's view of the examined work and its limits. The [operator briefing contract](research-to-operations-handoff.md#operator-briefing) maintains these reporting functions and their relationship to routine work and acceptance.

## Functional research group

| Level | Role | Responsibility |
| --- | --- | --- |
| Research direction | Human user (Research Director remains a proposed title) | directs the work and defines delegation, authority, assessment, and acceptance |
| Postdoc | Research Orchestrator, an LLM-based AI agent in an AI harness | develops concepts, sources, criteria, and executable briefs with the human user |
| Postdoc | Operational Orchestrator, an LLM-based AI agent in an AI harness | changes actual project state, coordinates implementation, and integrates bounded results |
| Predoc | Specialist or subagent | completes one bounded research, implementation, or verification assignment |
| Independent control | Independent Verification Agent, an LLM-based AI agent in a separate working context | checks results against criteria and evidence, then reports the complete finding first and only to the human user |

Research Director remains an open naming question. Human direction, delegation and acceptance do not depend on adopting that label.

Monitoring examines the whole course of work and offers the human user a second opinion. It compares what coordination understands about the user, decisions and plans with the original statements, maintained documents and observed actions. Findings distinguish what the user said, the coordinator's interpretation and material taken over from another source. A monitor may evaluate alignment, omissions and discrepancies, while reporting its evidence and limits. Operational observations, such as stale reports or unanswered messages, provide context for that assessment. The monitor can send notices and evidence to coordination under an explicit communication contract, but cannot assign work, release results or grant acceptance. Its remit complements bounded verification and human judgement. A separate session does not guarantee independent reasoning, especially when it shares a model family with coordination.

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
- **Shadow Verification** is a human-commissioned visibility and isolation profile. It requires a technically separate context, read-only target access, a private return route to the human user, and omission of its identity and route from production contracts. If those properties cannot be verified, report the missing capability. Independent or Blind Verification still requires a separate assessment context, read-only target access and the portable human-only initial return route. A production self-check or automatic callback to its parent does not establish that conformance.

A Verification Agent never becomes the producer of a correction. It reports and rechecks; the human user routes an accepted finding to Research or Operations for interpretation and implementation.

## Completion criteria

The method is release-ready when the following results agree.

- The role prompts, initializer, generated workspace, and maintained knowledge describe one architecture.
- Contract tests and clean-workspace initialization establish the executable behavior claimed by the documentation.
- A fresh Codex context and a fresh Claude Code context can initialize and operate the same representative project from the published materials.
- Public repository content contains no private portfolio state, machine-specific paths, or unlicensed material.
- The publication manifest assigns MIT to project code and the installable skill and CC BY 4.0 to project documentation, prompts, evaluation material, release metadata and the website. Supplied fonts retain OFL-1.1. DHCraft logos and marks retain the separate [brand terms](../LICENSES/DHCraft-Brand.txt). Reuse follows the exact file-level assignments and their notices.

Technical validation establishes the first two criteria. A local draft-package probe has established representative operation across fresh Claude Code and Codex tasks for one bounded technical assignment. The public RC2 bundle and its release provenance have been verified from a fresh clone. Fresh Codex and Claude Code initialization with the same new project and human acceptance of the published interface remain separate findings.

## Evaluation evidence

The Knowledge Core separates current method requirements from observed cases. `observed-context-stream-operation.md` records a de-identified transport pilot and portable-package probe. `observed-live-demo-operation.md` evaluates a public uncut working session recorded with an earlier method configuration. The live case demonstrates human steering, proportionality problems, role drift, and rejection of a technically generated artifact. It does not validate the current RC2 package. Its accepted method consequences enter the current specification and role contracts; its recorded deviations remain case evidence.

## Publication boundary

The public method consists of the repository instructions, downloadable skill, skill source, portable prompts, technical start interface, Knowledge Core, and tests. Operational views can contain local project names, paths, decisions, and evidence references. They remain non-delivered source-repository components unless a separate publication process replaces their state with verified synthetic data.

The public repository and release use the exact file-level assignments defined in [LICENSE](../LICENSE) and [publication-manifest.json](../publication-manifest.json). Project code uses MIT and project documentation CC BY 4.0. Included fonts retain OFL-1.1, and DHCraft logos and marks have separate [usage terms](../LICENSES/DHCraft-Brand.txt). An adaptation uses its own identity unless permission covers those marks. The builder and release tests require one assignment for every delivered path and exclude operational dashboard state, private project data, runtime messages and source-only history from the public bundle.

## Synthetic interface example

The candidate synthetic UI package illustrates the shared project, source, strategy, operator and conversation renderers using authored fictional examples. Its read-only static adapter has no private source, account or live operator connection. The manifest-pinned package and release metadata identify its exact source provenance separately from the method source commit. The publication boundary excludes actual portfolio and operational dashboard state. A staged draft remains unpublished until its clean source, exact package and required verification are established. Interface operation and technical checks establish their stated scope. Scholarly effectiveness and human acceptance remain unestablished.
