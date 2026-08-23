# Research Mission Control

**Version 0.9.0, release candidate.** The public repository is [`DigitalHumanitiesCraft/research-mission-control`](https://github.com/DigitalHumanitiesCraft/research-mission-control).

Research Mission Control is an executable method for agentic research. One accountable operator works directly with a Research Orchestrator. An Operational Orchestrator changes project artifacts and coordinates bounded specialist assignments. A separate Verification Context assesses results against explicit criteria and reports complete findings to the operator.

The operator retains research objectives, consequential scholarly positions, rights, publication, external effects, and difficult-to-reverse changes. Orchestrators resolve complex questions inside their assigned responsibility. Specialists decide reversible details inside bounded assignments.

## Start

Choose one initializer.

- Open the complete [`research-mission-control` skill source](skills/research-mission-control/). A built publication bundle also provides the deterministic installable package at `downloads/research-mission-control.skill`.
- Copy the complete [`system prompt`](orchestrators/bootstrap.md) when the harness cannot install skills.
- Open [`index.html`](index.html) for the technical reading and copy interface. Its package download becomes active in the built publication bundle.

The initializer begins by identifying Research Mission Control and its [public repository](https://github.com/DigitalHumanitiesCraft/research-mission-control). It asks up to three unanswered questions in the operator's language. These establish the role of the currently open Codex task or Claude Code conversation, the intended result and acceptance criteria, and the shared project workspace with its existing data, documents, materials, code, repositories, or authorized knowledge sources. Material already present in the workspace is inspected and inventoried rather than requested item by item.

The copy and download controls in `index.html` require the repository to be served over HTTP because common browsers block JavaScript from reading the adjacent Markdown file in a direct `file://` view. In a direct file view, use the **Open the complete prompt file** link and copy the Markdown manually. To enable the controls locally, run the following command from the repository root and open the displayed local address.

```powershell
python -m http.server
```

A working context is one separately open Codex task, Claude Code conversation, or equivalent harness context with its own context window and one assigned role. The project workspace is the shared local folder and Git worktree used by the selected working contexts.

After authorization, the initializer creates a new local Git repository with maintained project knowledge, a Context Stream, role start contracts, and an LF line-ending contract for cross-harness work. It creates no commit, remote, or public resource. Rights, publication, remote creation, grounding, and verification variants are raised later only when a concrete action requires an Operator decision.

After initialization, open the generated repository in three persistent contexts.

1. Keep the first context as the operator-facing Research Orchestrator.
2. Paste `mission-control/start-operations.md` into the Operations context.
3. Paste `mission-control/start-verification.md` into the independent Verification context.

## Operating model

```text
Operator as Research Director <-> Research Orchestrator
        ^                              |
        |                              | Implementation Brief
        |                              v
        |                    Operational Orchestrator --> specialists
        |                              |
        |                              | Result with Evidence
        |                              v
        +-- Verification Finding -- Verification Context
```

The standard persistent route is `Research -> Operations -> Verification -> Operator`. The minimum exchange is `Implementation Brief -> Result with Evidence -> Verification Finding`. These labels identify information functions. A contained project can perform them sequentially in one context. Separate contexts add value through specialist knowledge, parallel execution, context separation, synthesis, or independent review.

The shared repository persists maintained project knowledge and transports current exchange. It does not wake dormant sessions. A running context may still observe messages through active polling. Each deployment records its tested notification route and a polling, re-entry, or operator-mediated fallback.

## Knowledge and transport

Promptotyping supplies the maintained project-bound reconstruction basis. The initialized `knowledge/` directory records objectives, accepted decisions, methods, integration rules, and durable findings required for continuation.

A [Grounded Vault](https://github.com/DigitalHumanitiesCraft/grounded-vault) is optional. It becomes active after the project defines and verifies a binding among claims, evidence objects, identifiers, validation responsibility, and write-back.

The Context Stream carries current assignments, results, notices, and findings. Each role owns an immutable outbox. Each recipient owns its cursor state. Messages use stable thread identifiers and reference canonical artifacts. Verified durable findings enter the responsible Knowledge Document through a controlled write-back.

## Public method package

The publication bundle contains the technical website, role contracts, initializer source, downloadable skill package, Knowledge Core, and contract tests. Its source list is an exact positive list in [`publication-manifest.json`](publication-manifest.json). Operational dashboard data, situation views, reports, shared runtime messages, and work directories remain source-repository components and are omitted from the bundle.

Create a local review bundle with the standard-library builder.

```powershell
python tools/build_public_release.py --draft
```

The builder permits targets only below `dist/`, rejects configured absolute home-directory markers in distributed text, verifies local HTML and Markdown link targets, and creates `downloads/research-mission-control.skill` deterministically from the copied skill source. The marker scan is a bounded publication-path check and does not claim general secret detection. The draft flag permits a local review build from an uncommitted or dirty source state without asserting publication authorization. A release build requires the committed source worktree to be clean.

Run the release contracts with `python -m pytest tests/test_public_release.py`. Official skill validation remains a separate quality gate because it depends on the target harness and its current validator.

## Canonical sources

| Path | Function |
| --- | --- |
| [`skills/research-mission-control/`](skills/research-mission-control/) | initializer, transactional scaffolder, templates, evals, and tests |
| [`orchestrators/bootstrap.md`](orchestrators/bootstrap.md) | complete portable initialization prompt |
| [`orchestrators/`](orchestrators/) | canonical role contracts and harness adapters |
| [`knowledge/INDEX.md`](knowledge/INDEX.md) | map of the publication Knowledge Core |
| [`knowledge/project.md`](knowledge/project.md) | purpose, system boundary, completion, and publication boundary |
| [`knowledge/integration.md`](knowledge/integration.md) | component, transport, grounding, and write-back relationship |

## Verification boundary

Automated checks establish formal conformance of the packaged artifacts. Observed operation in a fresh Codex context and a fresh Claude Code context is a separate release criterion. The file-level MIT and CC BY 4.0 assignments are fixed; scholarly validation, operator acceptance, and publication authorization remain human-controlled findings.
