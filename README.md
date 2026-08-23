# Research Mission Control

**Version 0.9.0 RC2.** This is a release candidate for model-level acceptance testing. The public repository is [`DigitalHumanitiesCraft/research-mission-control`](https://github.com/DigitalHumanitiesCraft/research-mission-control).

Research Mission Control is a reusable method for agentic research orchestration. It organizes a human user, LLM-based AI agents, project knowledge, implementation, and independent verification around one shared project repository. This repository provides the method as one complete system prompt, an installable skill, generated role contracts, a file-based communication protocol, and tests.

## Start

Open the [technical interface](https://dhcraft.org/research-mission-control/) to read and copy the complete system prompt or download the installable skill. The canonical Markdown source is [`SYSTEM-PROMPT.md`](SYSTEM-PROMPT.md).

Paste the complete system prompt into a new Codex task, Claude Code conversation, or comparable AI harness. The agent identifies Research Mission Control and asks at most three unanswered questions:

1. Which Research Mission Control role should this working context assume?
2. What project result should be produced, and how will the human user assess it?
3. Which shared project workspace and existing inputs belong to the project?

A **working context** is one separately open task or conversation with its own context window and one assigned role. The **project workspace** is the shared local folder and Git worktree. Existing data, documents, materials, code, repositories, and configured knowledge sources are inspected before further input is requested.

After the human user authorizes local initialization, the system prompt uses the packaged skill or its scaffolder to create a new local Git repository. It creates no remote, publication, commit, or destructive overwrite unless the human user explicitly requests that action.

The standard persistent setup uses three working contexts over the same repository:

| Context | Role | Function |
| --- | --- | --- |
| 1 | **Research Orchestrator** | LLM-based AI agent in an AI harness; works directly with the human user on objectives, concepts, evidence, criteria, and executable briefs |
| 2 | **Operational Orchestrator** | LLM-based AI agent in an AI harness; changes authorized project artifacts and coordinates bounded specialist agents |
| 3 | **Independent Verification Agent** | LLM-based AI agent in a separate, read-only working context; evaluates results against explicit criteria and reports its complete finding to the human user |

The human user directs the work and defines how decisions and authority are delegated. The role contracts keep the resulting boundaries explicit. A contained project may perform the same functions sequentially in one context when separate contexts would add no useful specialization, execution capacity, or independent assessment.

## Operating model

```text
PRIMARY ROUTE

User as Research Director ↔ Research Orchestrator
                                  │ Implementation Brief
                                  ▼
                          Operational Orchestrator
                                  │ Result with Evidence
                                  ▼
                      Independent Verification Agent
                                  │ Verification Finding
                                  ▼
                        User as Research Director

SUPPORTING ROUTES

Operational Orchestrator ↔ Specialist Agents
Operational Orchestrator ── Operations Result Notice ──→ Research Orchestrator
User as Research Director ── optional finding route ──→ Research or Operations
```

The three exchange products are information functions:

- **Implementation Brief:** objective, context, authority, expected result, and verification criteria.
- **Result with Evidence:** actual result, changed artifacts, checks, deviations, and new findings.
- **Verification Finding:** criterion, observed state, evidence, impact, and assessment for the examined scope.

## Project knowledge and communication

[Promptotyping](https://github.com/DigitalHumanitiesCraft/Promptotyping) supplies maintained, project-bound working knowledge. The initialized `knowledge/` directory records the objective, specification, accepted decisions, integration contract, unresolved handoff state, and durable findings needed for continuation.

The **Context Stream** is the file-based protocol for current exchange among working contexts. Each role writes immutable messages to its own outbox; each recipient maintains its own cursor state. Messages use stable thread identifiers and reference canonical artifacts. Shared files transport state but do not wake an inactive AI session, so each project records its observed notification route and a polling, re-entry, or human-mediated fallback.

[Grounded Vault](https://github.com/DigitalHumanitiesCraft/grounded-vault) is optional long-term evidence infrastructure. It becomes active only after a project defines and verifies a binding among claims, evidence objects, identifiers, validation responsibility, and write-back.

## System prompt and skill

[`SYSTEM-PROMPT.md`](SYSTEM-PROMPT.md) is the single user-facing initialization contract. It configures the smallest sufficient structure, preserves existing project instructions, and produces ready-to-paste project bindings for the selected roles.

[`skills/research-mission-control/`](skills/research-mission-control/) packages the same initialization logic as an installable skill with a transactional scaffolder, templates, evals, and tests. The skill is the automated execution form of the system prompt; it is not a second method or competing entry point.

Generated workspaces contain the complete local role contracts in `mission-control/roles/` and concise project bindings in `mission-control/start-*.md`. The Research context continues in the first task; the human user pastes the Operations and Verification bindings into fresh contexts opened at the same repository.

## Public package

The publication bundle contains the technical website, system prompt, role contracts, skill package, Knowledge Core, and contract tests. [`publication-manifest.json`](publication-manifest.json) is its exact positive file list. Operational dashboards, reports, shared runtime messages, and work directories remain private-source components.

Create a local review bundle and run the public contracts:

```powershell
python tools/build_public_release.py --draft
python -m pytest
```

Release builds require a clean committed source worktree. The builder validates distribution paths, local links, licenses, deterministic skill packaging, and bounded private-path markers.

## Canonical sources

| Path | Function |
| --- | --- |
| [`SYSTEM-PROMPT.md`](SYSTEM-PROMPT.md) | complete initialization and operating contract |
| [`skills/research-mission-control/`](skills/research-mission-control/) | installable execution package, templates, evals, and tests |
| [`orchestrators/`](orchestrators/) | canonical role contracts and harness adapters |
| [`knowledge/INDEX.md`](knowledge/INDEX.md) | map of the publication Knowledge Core |
| [`knowledge/project.md`](knowledge/project.md) | purpose, boundary, completion, and publication status |
| [`knowledge/integration.md`](knowledge/integration.md) | component, communication, grounding, and write-back relations |

## Maturity and licensing

Automated checks establish formal conformance of the packaged artifacts. Fresh Codex and Claude Code trials establish observed model behavior. Human assessment of those trials remains the final criterion for version 1.0.

Code and the installable skill are licensed under MIT. Documentation and the website are licensed under CC BY 4.0. Citation metadata is provided in [`CITATION.cff`](CITATION.cff).
