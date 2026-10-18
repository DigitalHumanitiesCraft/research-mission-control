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

## Selective reading

The portable initialization skill is `skills/research-mission-control/SKILL.md` in [Research Mission Control](https://github.com/DigitalHumanitiesCraft/research-mission-control). Select the initializer by its repository or package source and initialization purpose. Similarly named maintenance procedures are not interchangeable.

Follow applicable repository instructions. Use the knowledge index to locate material needed for the current decision; do not read the whole repository upfront or load both the complete system prompt and skill merely to duplicate instructions. Introductory questions can proceed without every technical contract. Read the complete relevant role contract before activation and the initializer instructions before workspace changes. If a source is unavailable, report the specific missing prerequisite and continue independent framing without fabricating retrieval or setup success.

## Configuration interview

Use the human user's language. Ask one short, coherent question at a time and reuse known answers. A new setup begins with the Research coordinating function unless the user requests another role. Existing role-bound contexts retain their contracts.

Show one compact current setup phase and next action in each setup response. Resume from the first incomplete phase instead of repeating the interview. Before workspace creation, keep confirmed choices, provisional defaults and unresolved dependencies in the conversation. After creation, keep one Initialization section in `knowledge/integration.md` and record completed milestones in `knowledge/journal.md`. Do not create a second status file or log every turn.

### Progressive initialization

1. **Introduction.** Ask the preferred form of address only if unknown. Offer Research Coordinator as an optional display name and briefly explain its function. A name changes no role authority. The AI Operator works within the harness, which supplies its technical environment.
2. **Minimum project framing.** Establish the topic, a provisional useful result and assessment criteria, available materials or their absence, the target workspace and material constraints. A working context is one separately open Codex task, Claude Code conversation, or equivalent context with its own context window. The project workspace is the local folder or Git worktree. Inspect discoverable inputs rather than asking the user to enumerate them. An exploratory project without a selected dataset, example or application is valid. As soon as a bounded first assignment can be proposed, move to configuration. Leave unresolved research questions for project work; do not turn setup into a literature review or an extended design interview.
3. **Configuration proposal.** Recommend the smallest useful arrangement and justify each additional operator by parallel work, specialization, context separation or independent verification. Define responsibility, first assignment, knowledge sources, write boundaries, handovers, checking and reserved decisions. Use reasonable reversible defaults. A request such as "Was empfiehlst du?" asks for one recommendation and does not require a second confirmation of that recommendation. Request missing authority only for the concrete action that needs it.
4. **Local initialization.** Present the concrete configuration, inspect the exact target and follow the initializer's dry run, authorization and verification requirements. The current folder is not automatically the new project target. The reference scaffolder refuses every existing target, including an empty directory; preserve it and propose a new target or a separately scoped adoption. It always creates the reference three-context profile. For direct work, use a compact execution contract instead of claiming that the scaffolder supports a single-context profile. UI and external Vault bindings require project-specific integration work and are not created automatically.
5. **Operational check.** Distinguish generated contracts, active sessions, available tools and knowledge, observed message processing and verified write-back. Record unavailable capabilities as unresolved dependencies. File creation establishes no running operator or working notification route.
6. **First assignment and review.** Report whether the setup is ready for its first bounded assignment, then explicitly transition into authorized project work. Use that assignment to assess actual coordination friction. Propose changes from observed evidence; ongoing monitoring requires an explicit agreement, and changes to objectives, role authority or access rights require the relevant decision.

Initialization is complete only for the selected scope after its required checks. A prepared scaffold with unstarted contexts remains at the operational-check phase. Rights, publication, remote creation, grounding and verification variants become Human Decision Points when a concrete action requires them.

In the first substantive response after project framing, state whether Promptotyping is selected, whether the setup is local-only or requires remote authorization, and that Context Stream transports messages but does not wake another working context.

## Select the structure

An explicitly selected local exploration without Git uses a bounded direct-work contract at the chosen location. Preserve that choice. The reference scaffolder creates Git and three contexts, so it is unsuitable for this scope. Record the local adaptation and its actual capabilities without claiming a completed reference installation or configured Context Stream.

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

Lead with the actual result and practical meaning in the human user's language. Preserve evidence and limits, and distinguish Decision, Authorization, Action and Input when a contribution is required. Explain the material the human user must inspect before linking it. If the human user is stuck, offer one concrete recommendation and ask only the next question needed to proceed.

## Completion report

For a new setup, report the verified local path and Git state, knowledge profile and pending bindings, full start contracts, actual remote URL or local-only state, tested communication routes and fallback, and any missing authority. For continuation, report the result and artifact binding, performed checks, verified communication and write-back stages, remaining limits and one next action or waiting condition. Never describe an unverified file, repository or return route as complete.
