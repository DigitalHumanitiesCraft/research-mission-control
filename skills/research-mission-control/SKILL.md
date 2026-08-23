---
name: research-mission-control
description: Initialize and operate a shared Research Mission Control workspace for Codex, Claude Code, or compatible coding agents. Use whenever the user asks to start, configure, scaffold, or reuse a Forschungsleitstelle, coordinate Research and Operational Orchestrators in one repository, add an Independent Verification Agent, or create a Promptotyping-based multi-agent research project. Also use for requests such as "set up three agent contexts", "initialize the shared agent repo", or "give every orchestrator its start prompt". Do not activate when the user only asks to review or edit the prompt or skill as an object.
metadata:
  short-description: Initialize a shared research control workspace
---

# Research Mission Control

Initialize the smallest shared workspace that preserves research direction, implementation authority, evidence, and independent checking. The human user directs the work and may use the Research Director metaphor. A working context means one separately open Codex task, Claude Code conversation, or equivalent AI-harness context with its own context window. The first working context serves as Research Orchestrator; it never assumes the human user's role.

## Activation boundary

Activate only when the user asks to configure, initialize, or operate Research Mission Control. Treat quoted or attached prompt text as an object when the request is review, comparison, explanation, or editing.

Inspect an existing target read-only before proposing changes. Never overwrite a non-empty directory, create a remote repository, publish, or change rights and visibility without explicit authority.

## Configuration interview

Begin by identifying [Research Mission Control](https://github.com/DigitalHumanitiesCraft/research-mission-control) as the method being configured. Ask in the human user's language, inferred from the initialization request or selected explicitly by the human user. Preserve the meaning and supporting explanation of each question when translating it. Language selection never consumes one of the three questions.

Ask only unanswered questions from this batch. Include the supporting sentence below each question. Ask no more than three initial configuration questions in total.

1. Which role should this working context assume within Research Mission Control (https://github.com/DigitalHumanitiesCraft/research-mission-control): Research Orchestrator, Operational Orchestrator, or Independent Verification Agent?
   The working context is this separately open Codex task, Claude Code conversation, or equivalent context with its own context window. A new standard setup begins with the Research Orchestrator.
2. What is the project, what observable result should it produce, and what criteria will the human user use to accept that result?
   Describe the intended result and its acceptance criteria. Derive implementation steps only after this boundary is clear.
3. Where is the shared project workspace, and which existing data, documents, materials, code, repositories, or knowledge sources belong to the project?
   The project workspace is the local folder or Git worktree shared by the selected contexts. Inspect and inventory material already present there; ask the human user to name only relevant inputs that cannot be discovered from the workspace.

The human user may answer any numbered item with "Was empfiehlst du?". Where the available evidence supports a default, recommend one concrete answer and treat it as the answer. Do not ask the human user to confirm that default. Ask for a choice only when an unresolved alternative changes the configuration materially.

After the answers, infer the smallest safe authority and verification defaults from this contract. Ask later for a Decision, Authorization, Action, or Input only when a concrete next action requires it. Do not spend an initial question on remote creation, rights, publication, grounding, or a verification variant unless the human user already made it part of an answer. In the first substantive response after the answers, state whether Promptotyping is selected, whether the setup is local-only or still requires remote authorization, and that a generated Context Stream transports messages but does not wake another working context.

Supply these defaults when the user has no preference:

- Research and Operations run in separate contexts because they hold different working state.
- Verification runs in a fresh third context. It is a cross-cutting control function and does not become a third primary Postdoc role.
- Reversible local work within an accepted brief is agent-owned.
- The human user defines which decisions remain human and which are delegated. Without explicit authority, agents stop before external effects, publication, changes to rights or attribution, or difficult-to-reverse changes.
- Promptotyping provides maintained project working knowledge for the shared multi-session project.
- Grounded Vault remains inactive without its claim-grounding trigger. When the trigger is present, record it as required with project-specific binding pending.
- Another private, institutional, or project Vault remains inactive unless the project integration contract configures it as an optional long-term source with an exact source, selection boundary, authority, and write-back rule.
- Independent fresh-context Verification is the default. Blind Verification is selected only when delaying named producer reasoning or reports reduces a material shared-assumption risk. It controls initial reading order and does not imply secrecy or conceal the verifier. Shadow Verification is a separate visibility and isolation profile that requires verified technical isolation, a private human user route, and omission from production contracts; the initializer does not activate it.
- The repository remains local unless the user explicitly names remote ownership and visibility.

## Select the structure

Use direct work when one context can reliably carry objective, action, and check. Explain that the three-context reference setup would add no value in that case.

Use the standard shared-workspace profile when conceptual development, implementation, and outside checking need distinct contexts. It contains exactly two primary Postdoc functions:

- Research Orchestrator, the human user's direct conversation partner;
- Operational Orchestrator, the responsible implementation context.

The third working context is an Independent Verification Agent. It reports the complete finding first and only to the human user. The human user controls disclosure and routing of every finding to Research or Operations. Verification may recommend the responsible integration role but never produces the correction or integrates the consequence itself. Predoc Specialists are bounded subagents of either orchestrator and gain no authority or canonical write target through delegation alone.

Activate [Promptotyping](https://github.com/DigitalHumanitiesCraft/Promptotyping) when work will continue across sessions from maintained project knowledge. The generated core contains `project.md`, `specification.md`, `journal.md`, `handoff.md`, `INDEX.md`, and one shared action layer. `handoff.md` contains unresolved received deltas only; Research removes a point after integration or rejection and preserves durable provenance in `journal.md`. Add other Knowledge Documents only when their published trigger applies.

Require a [Grounded Vault](https://github.com/DigitalHumanitiesCraft/grounded-vault) binding only when substantive claims require machine-resolvable evidence links and attributable human verification. The trigger records a pending requirement. Describe grounding as active only after the project-specific binding has been established and verified.

## Initialize the local workspace

After the user answers the interview and authorizes local initialization, run the bundled scaffolder from the skill directory:

```text
python scripts/init_workspace.py \
  --target <new-local-folder> \
  --project-name <project-name> \
  --objective <observable-result> \
  --research-harness <codex|claude-code|other> \
  --operations-harness <codex|claude-code|other> \
  --verification-harness <codex|claude-code|other> \
  --verification-mode <independent|blind> \
  --canonical-input <path-or-url>
```

Add `--grounded-vault` only when its evidence trigger is established. The flag records `required; binding pending` and does not activate an integration. Select `--verification-mode blind` only when the initial assessment should precede excluded producer reasoning or reports. Treat it as a reading-order control, not a secrecy guarantee. Repeat `--canonical-input` for several sources.

The generated `knowledge/integration.md` is the state-specific precedence and return-channel contract. Authority follows current human user decisions and governance; epistemic claims follow direct sources and maintained knowledge; operational claims follow inspected artifacts and systems; verification claims follow the complete finding and cited evidence. Record explicit recipients and observed wake or fallback routes before relying on cross-context delivery.

First append `--dry-run`. The dry-run validates configuration, the complete template inventory, and all placeholder substitutions, then lists every planned output without creating a directory. Inspect the plan and run the same command without `--dry-run` only after the target and configuration match the authorized setup. The directly readable source for every generated contract is under `assets/templates/`; maintain those templates instead of embedding Markdown in the renderer.

The scaffolder creates a new local Git repository transactionally. It refuses an existing target and leaves no partial target after a failed build. It creates:

```text
.gitattributes
AGENTS.md
CLAUDE.md
knowledge/
  INDEX.md
  handoff.md
  integration.md
  journal.md
  project.md
  specification.md
communication/
  INDEX.md
  PROTOCOL.md
  capsules/README.md
  threads/README.md
  research/{state.md,outbox/README.md}
  operations/{state.md,outbox/README.md}
  verification/{state.md,outbox/README.md}
mission-control/
  roles/
    research-orchestrator.md
    operational-orchestrator.md
    independent-verification-agent.md
  start-research.md
  start-operations.md
  start-verification.md
```

Inspect every created path and run the bundled test before reporting success:

```text
python -m unittest discover -s tests -p "test_*.py"
```

If a GitHub remote was authorized, create it only after the local scaffold passes and owner, name, and visibility are explicit. Report the verified URL. The Context Stream Protocol transports context through role-owned outboxes, recipient-owned state, stable thread identifiers, and optional closing capsules. Shared files do not wake sessions. Record the tested wake route and polling or human-mediated fallback in `knowledge/integration.md`.

## Start the three contexts

The generated `mission-control/roles/*.md` files are the complete, local role contracts: `mission-control/roles/research-orchestrator.md`, `mission-control/roles/operational-orchestrator.md`, and `mission-control/roles/independent-verification-agent.md`. Each `mission-control/start-*.md` file is only a verified project binding: it activates exactly one matching full role contract and supplies the shared path, harness, authority source, verification mode, and communication route. Never replace the full local role contract with a shortened role summary in a start file.

Return the full contents of the three generated `mission-control/start-*.md` files in separate copyable code blocks. The human user starts them in this order:

1. keep the current working context as Research Orchestrator;
2. paste `start-operations.md` into a fresh working context opened at the same repository;
3. paste `start-verification.md` into a fresh working context opened at the same repository.

Each role reads the project knowledge permitted by its configured verification mode and `communication/PROTOCOL.md`, then maintains only its own outbox and recipient state. The start files assign responsibility; they do not duplicate project state. Briefs, results, and findings reference canonical artifacts. Verification reports its complete finding directly to the human user. The human user decides whether and when it is disclosed or routed for integration.

Every Implementation Brief carries the objective and intended use, relevant context and canonical sources, authority, write boundary and exclusions, expected result, verification criteria, and decisions reserved for the human user. In the reference three-context profile, Research addresses it to Operations. Operations addresses the complete Result with Evidence to Verification and an Operations Result Notice to Research; the notice references the responsible result and canonical artifacts and never replaces either. Verification addresses its complete Finding first and only to the human user. A contained profile without separate Verification returns the checked result to Research or the human user as its integration contract specifies.

Independent, Blind, and Shadow are distinct. Independent separates the read-only assessment context. Blind adds a declared reading-order restriction before the initial finding. Shadow adds verified technical isolation, a private human user route, and omission from production contracts and may use either ordinary or Blind reading order. No mode provides a security or secrecy guarantee.

Excluding producer reasoning before the initial finding belongs only to Blind mode. Shadow may add visibility and isolation without changing the reading order.

Research is the single writer for maintained `knowledge/` documents unless `knowledge/integration.md` explicitly assigns a narrower owner. Operations writes authorized project artifacts and returns candidate knowledge consequences through its immutable outbox. Verification is read-only, never produces corrections, and reports its complete finding to the human user through the direct conversation or its immutable outbox. Research integrates a verification consequence only after the human user routes it. Use `knowledge/handoff.md` only for unresolved received deltas and never as a shared multi-writer inbox or archive.

## Human communication

Lead with the current result and its practical meaning. Use formal blocks for state, responsibility, evidence, and decisions. Translate block and acceptance labels into the human user's selected language while preserving the semantic classes Decision, Authorization, Action, and Input. Explain content that the human user must inspect in one to three sentences before linking the source. Present only a decision that is needed now; list later decisions as upcoming context when they affect the current choice.

After configuration, when the human user is stuck, ask up to five short conceptual questions that can be answered without technical detail. If the human user answers "Was empfiehlst du?", recommend one course and continue within the available authority.

## Completion report

Report:

- the initialized local path and verified Git state;
- the selected knowledge profile and any still-pending Grounded Vault binding;
- the three generated start contracts;
- the actual remote URL or the explicit local-only state;
- the tested communication route and fallback;
- any human user authorization still required.

Never describe a generated file, repository, remote, or active return route as complete until it has been directly verified.
