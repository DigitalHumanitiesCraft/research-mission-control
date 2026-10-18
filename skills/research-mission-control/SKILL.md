---
name: research-mission-control
description: Initialize and operate a shared Research Mission Control workspace for Codex, Claude Code, or compatible coding agents. Use whenever the user asks to start, configure, scaffold, or reuse a Forschungsleitstelle, coordinate Research and Operational Orchestrators in one repository, add an Independent Verification Agent, or create a Promptotyping-based multi-agent research project. Also use for requests such as "set up three agent contexts", "initialize the shared agent repo", or "give every orchestrator its start prompt". Do not activate when the user only asks to review or edit the prompt or skill as an object.
metadata:
  short-description: Initialize a shared research control workspace
---

# Research Mission Control

Initialize or continue the smallest workspace that preserves research direction, implementation authority, evidence, and checking. The human user directs the work. A working context is one separately open Codex task, Claude Code conversation, or equivalent context with its own context window.

## Activation boundary

Activate only for requested configuration, initialization, or operation. Treat supplied prompt text as an object during review, comparison, explanation, or editing. Inspect the target read-only first. Never overwrite an existing directory, create a remote repository, publish, or change rights without explicit authority. A skill, tool, or writable path grants no additional authority.

For an existing workspace, continue from the current human instruction, assigned role, actual artifact and project `knowledge/integration.md`. Load the matching complete role contract and `communication/PROTOCOL.md`; use the routing table below to locate their bundled sources. Ask no initialization questions, change no role, and recreate no start files when the assignment is established. Reconcile a later bounded instruction with an older pause by scope and date, preserving restrictions outside the renewed assignment.

The bundled contracts remain available inside the installed skill. Read only the contract needed for the current action. After initialization, the generated project files carry its verified bindings.

| Action | Bundled contract | Generated project path |
| --- | --- | --- |
| Research | [Full Research role](assets/templates/mission-control/roles/research-orchestrator.md.tmpl) | `mission-control/roles/research-orchestrator.md` |
| Implementation | [Full Operations role](assets/templates/mission-control/roles/operational-orchestrator.md.tmpl) | `mission-control/roles/operational-orchestrator.md` |
| Independent checking | [Full Verification role](assets/templates/mission-control/roles/independent-verification-agent.md.tmpl) | `mission-control/roles/independent-verification-agent.md` |
| Authority, sources, ownership and returns | [Integration contract](assets/templates/knowledge/integration.md.tmpl) | `knowledge/integration.md` |
| Sending, receipt and processing | [Context Stream Protocol](assets/templates/communication/PROTOCOL.md.tmpl) | `communication/PROTOCOL.md` |

## Configuration interview

For a new setup, identify [Research Mission Control](https://github.com/DigitalHumanitiesCraft/research-mission-control) as the method. Ask in the human user's language and preserve the supporting explanations when translating. Language selection never consumes one of the three questions. Ask only unanswered questions in one batch. Ask no more than three initial configuration questions in total.

1. Which role should this working context assume within Research Mission Control (https://github.com/DigitalHumanitiesCraft/research-mission-control): Research Orchestrator, Operational Orchestrator, or Independent Verification Agent?
   The working context is this separately open Codex task, Claude Code conversation, or equivalent context with its own context window. A new standard setup begins with the Research Orchestrator.
2. What is the project, what observable result should it produce, and what criteria will the human user use to accept that result?
   Describe the intended result and its acceptance criteria. Derive implementation steps only after this boundary is clear.
3. Where is the shared project workspace, and which existing data, documents, materials, code, repositories, or knowledge sources belong to the project?
   The project workspace is the local folder or Git worktree shared by the selected contexts. Inspect and inventory material already present there; ask the human user to name only relevant inputs that cannot be discovered from the workspace.

The human user may answer any numbered item with "Was empfiehlst du?". Recommend one evidence-supported default and treat it as the answer. Do not ask the human user to confirm that default. Ask for a choice only when the unresolved alternative changes the configuration materially. Ask later for Decision, Authorization, Action, or Input only when a concrete action requires it.

## Select the structure

Supply these defaults when the user has no preference:

- Use direct work when one context can clarify, implement and check the contained assignment. Use separate Research and Operations contexts when their distinct working state is needed, with fresh-context Independent Verification as the standard shared-workspace profile.
- Use [Promptotyping](https://github.com/DigitalHumanitiesCraft/Promptotyping) for maintained project knowledge across sessions. Add knowledge documents only when their function is needed.
- Record [Grounded Vault](https://github.com/DigitalHumanitiesCraft/grounded-vault) as required with project-specific binding pending when claims need machine-resolvable evidence and attributable human verification. Describe it as active only after verifying that binding. Other external Vaults stay inactive until the integration contract defines the exact source, selection boundary, authority and write-back rule.
- Reversible local work inside the accepted brief is agent-owned. External effects, publication, rights, attribution and difficult-to-reverse actions require explicit authority. A GitHub remote also requires its owner, name and visibility.

In the first substantive response after the answers, state whether Promptotyping is selected, whether the setup is local-only or still requires remote authorization, and that the Context Stream transports messages but does not wake another working context.

## Initialize the local workspace

The initializer creates new targets only and refuses every existing target. Adopting an existing repository needs a separately scoped migration. After configuration and authorization, run from the skill directory:

```text
python scripts/init_workspace.py \
  --target <new-local-folder> \
  --project-name <project-name> \
  --objective <observable-result> \
  --research-harness <codex|claude-code|other> \
  --operations-harness <codex|claude-code|other> \
  --verification-harness <codex|claude-code|other> \
  --verification-mode <independent|blind> \
  --canonical-input <path-or-url> \
  --dry-run
```

Repeat `--canonical-input` for several sources. Add `--grounded-vault` only when its evidence trigger holds. It records a pending requirement and does not activate an integration. Independent is the default. Blind adds a declared reading-order restriction for named producer reasoning or reports until the initial finding is sealed; it does not imply secrecy. Shadow adds verified technical isolation, a private human user route and omission from production contracts. The initializer does not activate Shadow. No mode provides a security or secrecy guarantee. Excluding producer reasoning before the initial finding belongs only to Blind mode.

Inspect the dry-run's configuration and complete output inventory. Run the same command without `--dry-run` only when they match the authorized setup. The scaffolder transactionally creates a local Git repository, maintained knowledge, Context Stream transport, complete role contracts and three start bindings. Its directly readable sources are in `assets/templates/`; maintain them rather than embedding Markdown in the renderer.

Inspect every created path and run the bundled tests from the skill directory before reporting success:

```text
python -m unittest discover -s tests -p "test_*.py"
```

Create an explicitly authorized GitHub remote only after the local scaffold passes. Verify its URL and record each observed wake route and fallback in the generated integration contract. File creation alone establishes neither an active context nor a working return route.

## Start the three contexts

The three files under `mission-control/roles/` are complete, local role contracts. Never replace the full local role contract with a shortened role summary. Return the full generated `mission-control/start-research.md`, `mission-control/start-operations.md` and `mission-control/start-verification.md` in separate copyable code blocks. In the standard setup, keep the first context as Research and start Operations and Verification in fresh contexts at the same workspace.

Use the assigned role and integration contract for execution, source precedence, write ownership and exchange. Research is the single writer for maintained knowledge by default; Operations writes technical knowledge only at exact paths assigned by integration. Predoc Specialists have bounded assignments and gain no authority or canonical write target through delegation. Verification remains read-only against production artifacts and never produces corrections.

An Implementation Brief carries objective and use, context and canonical sources, authority, write boundary and exclusions, expected result, criteria and reserved decisions. State which existing parts must be preserved, reused, adapted, or may be replaced. Operations inspects that baseline before generating a substitute.

Operations addresses the complete Result with Evidence to Verification and an Operations Result Notice to Research in the standard profile. Verification returns its complete finding directly to the human user as its first and only recipient. The human user controls disclosure and routing. An automatic child callback to the producer does not satisfy that route. If the separate context or permitted return is unavailable, report the limitation and only the check performed. Private Lab callbacks follow their deployment contract and do not establish portable conformance.

Every independent assignment needs a bounded target, criterion, evidence packet, and completion condition. Standing watches and repair loops are operational monitoring requiring separate responsibility and authority. Technical conformance, domain validation and human acceptance remain separate judgements.

## Continue and close an assignment

Inspect actual artifacts before treating a result notice as completion. Distinguish queued dispatch, the intended recipient's response, processing, verification and canonical integration. Observe every requested direction and target; omitted recipients stay unchecked. Use the configured wake route or authorized read fallback. An unavailable or rejected callback authorizes no repeated attempt, relay or broader permission.

Bind review evidence to the examined artifact and revision. Reuse earlier checks only after actual byte equivalence is established, disclosing differences and retaining failed observations and unexecuted cases. Diagnose the specific artifact, transport, environment or test prerequisite before a justified repeat.

Close after the required result, verification and canonical write-back have been read back. Research uses `knowledge/handoff.md` only for unresolved received deltas, removes integrated or rejected points and records durable provenance in `knowledge/journal.md`. Preserve continuation in existing knowledge. Add no second handoff file, schedule or monitor merely because the context waits. Publication and human acceptance may remain open after a scoped assignment finishes.

## Human communication

Lead with the actual result and practical meaning in the human user's language. Preserve evidence and limits, and distinguish Decision, Authorization, Action and Input when a contribution is required. Explain the material the human user must inspect before linking it. After configuration, if the human user is stuck, ask up to five short conceptual questions answerable without technical detail; recommend one course when asked.

## Completion report

For a new setup, report the verified local path and Git state, knowledge profile and pending bindings, full start contracts, actual remote URL or local-only state, tested communication routes and fallback, and any missing authority. For continuation, report the result and artifact binding, performed checks, verified communication and write-back stages, remaining limits and one next action or waiting condition. Never describe an unverified file, repository or return route as complete.
