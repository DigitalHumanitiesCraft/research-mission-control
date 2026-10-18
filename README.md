# Research Mission Control

When a researcher changes the inclusion criterion of a literature review, the selected publications and the claims based on them need to be checked again. Research Mission Control describes how to assign such work to AI Operators, examine their results and record justified changes for subsequent work. An AI Operator has a defined responsibility, authority boundary, working instructions and access to relevant knowledge, skills and tools. The literature-review case illustrates the method; the practical package example below supplies a separate, fully authored handover study.

The method draws on linked-note practices associated with the Zettelkasten. It applies them to work performed through an **AI harness**, an environment that gives an agent a working context, tools and controlled access to files. Connections between documents help a reader reconstruct why a decision was made and what a change may affect. The responsible people and agents must examine those relationships and check the resulting work.

This repository is intended for researchers, research software engineers and teams maintaining projects across multiple sessions. It provides the method, initialization tools and contracts. Obsidian can serve as a reading and editing environment for the Markdown knowledge, but is optional.

The package version and release status are recorded in [release metadata](release-metadata.json). The [public repository](https://github.com/DigitalHumanitiesCraft/research-mission-control), [practical method](knowledge/system-description.md) and [Knowledge Index](knowledge/INDEX.md) distinguish implemented behavior, retained observations and pending acceptance.

## What the package provides

- A [complete initialization prompt](SYSTEM-PROMPT.md) that establishes the working role, intended result and project context.
- An [initializer skill](skills/research-mission-control/SKILL.md) and Python scaffolder that create a new local project repository.
- Markdown templates for project knowledge, integration rules, assignments and communication.
- Role contracts separating conceptual work, implementation and independent verification.
- File-based exchange through the Context Stream, with explicit ownership and receipt records.
- Tests for initialization, contract consistency and the public distribution boundary.

The technical [start page](https://dhcraft.org/research-mission-control/) provides the prompt and downloadable skill. The private Mission Control dashboard is a separate deployment. The package includes a [synthetic interface example](demo/) using the same shared renderers. It offers a project Overview and Calendar, source-bound Strategies, Projects, Operators with contextual project links, Knowledge and Monitor, with English and German UI. Individual conversations prepare complete copyable context. All portfolio content and configuration illustrations are authored fiction. No accounts, live agents, model calls or canonical writes are connected. Technical checks and any independent review apply only to the examined revision. Human acceptance and empirical benefit remain separate.

## Try the connected example

The [handovers study](demo/mission-control/projekte.html?lang=en&projekt=demo-atlas) asks what a colleague needs to resume a project task from a documented handover. Its authored result is a [source-linked requirements matrix](examples/workshop-example/requirements.md#requirements-matrix). The dependent [90-minute workshop](demo/mission-control/projekte.html?lang=en&projekt=demo-exhibit) has a complete agenda, a participant worksheet and a worked handover for university and company contexts.

The [source change](examples/workshop-example/change-case.md#wording-changes) prohibits original project material, including anonymized or transformed excerpts. Follow its consequence through the requirements, exercise, worksheet and fictional training cases. The earlier permission remains visible as superseded evidence. [H-01](examples/workshop-example/records.md#r6-pending-human-choice) leaves the fictional sponsor's room-format choice open, with final printing and case-sheet allocation pending.

These are completed authored example artifacts and a prepared plan. No actual study, workshop delivery, agent run, independent review or human acceptance is recorded. Read the [complete source pack](examples/workshop-example/README.md), then use the [practical walkthrough](knowledge/system-description.md) to inspect the result or create a new source-checked requirements draft locally.

## Start a project

The initializer requires Git and Python 3.11 or later. An agent also needs a harness with the file and execution tools required by its assignment. The package does not install or authenticate a harness.

1. Download or clone this repository into its own directory. The project to be initialized will use a separate, new directory. Forking the method repository is useful when maintaining changes to the method itself, but is not required to start a project.
2. Open a new harness conversation at, or with access to, the cloned method repository. Ask it to configure a new Research Mission Control project and supply the complete contents of `SYSTEM-PROMPT.md`. Supplying the document alone does not activate initialization or elevate it above the harness's governing instructions.
3. Clarify the topic, a provisional first result, available materials and the project location one question at a time. Known answers are reused. An exploratory idea is sufficient to propose a bounded first assignment. The coordinator shows the current setup phase and moves to configuration once that assignment is clear.
4. Inspect the proposed initialization. The scaffolder supports `--dry-run`, requires a new target directory whose parent exists, and refuses to overwrite an existing target. With authorization it creates a local Git repository. It does not create a remote, commit or publish the project.
5. For the reference setup, open the generated Research, Operations and Verification start prompts in separate contexts that share the project repository. Verify their actual permissions and communication routes before relying on them.

The installable skill is an alternative entry point when the harness supports it. Its installation procedure depends on that harness. The source scaffolder can also be invoked directly with its documented arguments and `--help`.

An existing source supplied through `--canonical-input` is recorded as a reference. The initializer does not import its contents or establish synchronization. The responsible agent must inspect relevant material before planning changes.

## How work moves

```text
User as Research Director (proposed title) sets direction and criteria
                  |
                  v
Research reads maintained knowledge and prepares a brief
                  |
                  v
Operations changes authorized artifacts and records evidence
                  |
                  v
Independent Verification examines the bounded result
                  |
                  v
Complete finding returns first to the human user
                  |
                  v
The user routes accepted consequences to Research or Operations
                  |
                  v
Responsible writers update knowledge and artifacts
                  |
                  +----> Subsequent work reads the maintained state
```

The human user sets direction and defines delegated authority and acceptance. Research Director remains an open naming question, not a confirmed designation. Its use in the diagram identifies the proposed label only.

Operations also sends a separate result notice to Research, pointing to the authoritative result. Verification does not repair the artifact it evaluates. Its complete finding goes first to the human user, who controls further routing.

The [role contracts](orchestrators/README.md) define responsibility; an assignment names the actual result, sources, permitted changes and checks. [Operator Knowledge](knowledge/orchestration-architecture.md#operator-session-and-working-instructions) is the maintained instruction and context content that guides how an operator works. It can be provided through supported instruction channels or referenced files. Reading a file does not elevate its authority. A new session must reconstruct the operator's relevant instructions and current work from maintained records. Within that boundary an operator can inspect existing solutions and correct a relevant defect. Planned or paused profiles carry no active assignment. New objectives and reserved judgements keep their own authority requirements.

The [bounded requirements assignment](knowledge/system-description.md#give-an-operator-a-bounded-assignment) produces a new result from the fictional records. A contained task may clarify, implement and check in one context; independent Verification requires a separate read-only context. The initializer supplies the reference three-role structure.

A monitor offers the human user a second opinion on the course of work, comparing plans and interpretations with original statements and actual actions. It neither assigns work nor accepts results. Its [maintained remit](knowledge/project.md#functional-research-group) and deployment communication contract govern any notices. The private pilot's reviewer return differs from portable human-first Verification; [integration](knowledge/integration.md#recorded-vault-pilot) records that difference. A separate session alone establishes no independence of reasoning.

Passing a software check, supporting a scholarly claim and obtaining human acceptance establish different things. The [handoff contract](knowledge/research-to-operations-handoff.md) defines the corresponding result and decision records.

## Maintain knowledge that another session can use

[Promptotyping](https://github.com/DigitalHumanitiesCraft/Promptotyping) supplies the project-bound knowledge arrangement. The generated `knowledge/` directory records project purpose, requirements, integration boundaries and continuation information. Its index directs readers to the relevant documents. Source material, research data and application files retain their own maintained locations.

A useful reference explains its relationship in the surrounding text. A finding may support a design choice, which constrains an implementation brief. If the finding changes, the responsible agent examines affected documents and artifacts, including reuse that has no explicit link. Links do not perform this correction automatically.

Each canonical document has a responsible writer. Research maintains project knowledge within the configured contract. Operations changes authorized implementation artifacts and submits conceptual consequences through its result record. Any exception requires explicit ownership and a safe write arrangement.

The Context Stream stores messages in role-owned outboxes and tracks processing in recipient-owned records. Writing a message, processing it and completing its assignment are separate events. Shared files do not wake an inactive agent. Each deployment must test its actual notification route and record a fallback such as polling, later re-entry or human forwarding.

## Adapt the method to your project

Start by configuring the generated project description, specification and integration contract. They establish the purpose, assessment criteria, permitted inputs, writing responsibilities and tools. Add domain documents where needed and link them from the existing index.

The reference directory structure and role set are fixed by the initializer templates. Changing paths or adding roles requires corresponding updates to templates, prompts, references and tests. These are method changes, not configuration switches already exposed by the initializer.

An external Obsidian vault or institutional knowledge collection becomes an active source only after the integration contract identifies its exact scope, access authority and write-back rules. An available path does not establish permission or reliable synchronization. [Grounded Vault](https://github.com/DigitalHumanitiesCraft/grounded-vault) is an optional integration with its own requirements, not a prerequisite for the basic workflow.

For example, a research synthesis may maintain its selection criteria, source notes and conclusions in separate linked documents. An authorized revision to those criteria should lead to an explicit check of affected selections and conclusions. This illustrates the method. The package does not supply a literature-review application or an experimentally validated synthesis workflow.

The [configurable knowledge adapter](knowledge/knowledge-adapters.md) provides a runnable connection from selected local Markdown files to the existing knowledge reader's data format. It accepts arbitrary folder layouts through an explicit configuration. Run its synthetic example with `python tools/build_knowledge_catalog.py --config examples/knowledge/sources.json --target ../knowledge-preview`. This builds local catalog and source JSON files without changing or publishing the selected documents. Follow the [reader-only local setup](examples/knowledge/README.md#select-your-own-markdown-sources) to connect it to an independent copy of the supplied reader. Portfolio data has a separate source contract.

## Understand the interface boundary

The private Mission Control deployment presents projects, operator reports, results and conversation prompts. These are derived views of maintained sources. A copied prompt does not start an operator or record an answer. A displayed report does not prove that its agent is currently running.

Reusing that interface requires its implementation and adapters for the receiving project's sources. The portable package provides the technical start page and method contracts. Its candidate synthetic interface example illustrates the separately maintained UI. It does not install the private portfolio interface or provide a general dashboard builder. Public demonstration work must use verified synthetic material and distinguish simulated behavior from an actual harness connection.

## Check an adaptation

Run the relevant checks from the repository root. The initializer and prompt checks use Python's standard library.

```sh
python -m unittest discover -s skills/research-mission-control/tests -p "test_*.py"
python orchestrators/test_research_orchestrator_prompt.py
python orchestrators/test_system_prompt.py
```

The broader repository suite uses pytest. Install the pinned build-only documentation dependency with `uv sync --locked --extra web-docs`. Generate a local review bundle with `uv run --locked --extra web-docs python tools/build_public_release.py --draft`. The initializer and static demo do not require this parser. The generated HTML documentation reads only the manifest-selected original Markdown; its source downloads retain the original bytes and recorded document versions. Package 0.9.0rc5 and a document's recorded 0.9.0rc2 identify different scopes. Packaging does not update historical findings. Release builds require a clean committed source worktree. Public-release checks additionally inspect included files, relative links, exclusions and license assignments. A passing suite does not establish that your installed harness can initialize and operate a project. Verify a representative task with the actual tools, permissions and communication routes you intend to use.

## Live demonstration

[Watch the uncut German-language live demonstration](https://www.youtube.com/watch?v=B7TCJjcVA2k). The recording captures an earlier operating state. Its [maintained analysis](knowledge/observed-live-demo-operation.md) documents successful coordination together with role drift, notification uncertainty and an artifact rejected by the human user. The recording does not establish acceptance of the current package.

The resulting method requires a brief to identify which existing material must be preserved, reused, adapted or may be replaced before a substitute is generated. It also distinguishes bounded independent verification from monitoring of the whole work and its alignment with human direction.

## Evidence and further reading

The [practical system description](knowledge/system-description.md) explains the knowledge and execution relationships. The [integration contract](knowledge/integration.md) identifies component boundaries and ownership. The [Knowledge Index](knowledge/INDEX.md) leads to the maintained contracts and observation records.

Retained observations document bounded file-based exchanges, a portable-package probe and problems exposed in an earlier working session. They support the particular findings recorded there. Comparative improvements in research quality, continuation or maintenance effort have not been established. Fresh initialization of the same new project from the published package and human acceptance remain separate pending findings in the [completion criteria](knowledge/project.md#completion-criteria). The source repository contains a draft methods paper and unperformed evaluation proposals outside the publication bundle.

## License and citation

Project code is available under MIT and project documentation under CC BY 4.0. DHCraft logos and marks have [separate usage terms](LICENSES/DHCraft-Brand.txt). Use your own identity for an adaptation unless you have permission. Included fonts and other third-party materials retain their own licences. Exact file-level assignments appear in [LICENSE](LICENSE) and [publication-manifest.json](publication-manifest.json), including the installable skill under MIT and the supplied fonts under OFL-1.1. Use [CITATION.cff](CITATION.cff) for repository citation metadata.
