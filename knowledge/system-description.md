---
title: Research Mission Control in practice
status: draft
language: en
created: 2026-10-17
updated: 2026-10-18
related: [project, integration, orchestration-architecture, research-to-operations-handoff]
---

# Research Mission Control in practice

Research Mission Control connects project knowledge with bounded AI assignments and examined results. Atlas provides a small working example. Its invented inventory notes, comparison and reports let you follow the evidence and prepare the next contribution. They are authored demonstration material, rather than a record of agents conducting research.

## Begin with a question and its sources

Atlas asks what two similar inventory descriptions establish about form, function and possible object identity. In the [project record](../demo/mission-control/projekte.html?lang=en&projekt=demo-atlas), open the comparison and follow its source reference.

Both notes are written inside the [example guide](../demo/sources/demo-guide.md). Note A describes a blue cube as a game piece. Note B describes a blue cube as a sample. Colour and shape agree, while the attributed function differs. There is no common object identifier. The comparison therefore leaves object identity unresolved.

The [source reader](../demo/research.html?lang=en#view=context&source=demo-guide&read=1&bezug=demo-atlas&anchor=Beispielergebnis) keeps the original German wording available beside the interpretation. A link gets you to the passage. Reading that passage establishes how far it supports the claim.

Project folders, linked notes and shared sources offer different places to maintain the same guide. Select them in the example to inspect the difference. Its logical source identity and research result remain constant. An Obsidian vault is one possible knowledge environment, while the portable method also works with ordinary project files.

## Give an operator a bounded assignment

An assignment specifies the expected contribution and the authority to produce it. This brief could be used for an Atlas comparison in a separately configured working environment:

```text
Read sources/atlas-guide.md in the new workspace described below.
Compare its invented inventory notes A and B.
Deliver results/atlas-comparison.md with a table separating
stated attributes from interpretations.
Cite the source passages and record the source revision.
Preserve the missing object identifier as an unresolved limit.
Create results/ if needed; write only results/atlas-comparison.md.
Preserve the guide and all other project files.
Check each table row against the quoted passage and report deviations.
```

The existing [Atlas result](../demo/mission-control/abnahme.html?lang=en&lane=demo-research&kennung=DEMO-COMPARE#vorstellung) shows the kind of artifact to inspect. It was authored for this demonstration. Copying the brief or the interface's [prepared conversation](../demo/mission-control/operatoren.html?lang=en&operator=demo-research) leaves execution with your chosen AI harness, its tools and permissions.

The role defines responsibility, the project supplies context, and the assignment sets the actual work and writing boundary. Within that assignment, an operator can inspect existing solutions and correct a relevant defect. A proposed extension needs its corresponding authority. Questions, suggestions and personal feedback become decisions only when the responsible person adopts them. An explicit pause remains effective until a new assignment changes it.

## Examine the result and its consequences

Check the [comparison](../demo/mission-control/abnahme.html?lang=en&lane=demo-research&kennung=DEMO-COMPARE#vorstellung) against the guide. Do the rows accurately distinguish shared attributes from incompatible or uncertain interpretations? Does the conclusion preserve the unresolved identity? Software checks can confirm references and file structure. Source examination and human judgement determine whether the interpretation serves the investigation.

[Exhibit](../demo/mission-control/projekte.html?lang=en&projekt=demo-exhibit) reuses Atlas as input to a public label. Its label assignment remains unexecuted in the authored example. The label must retain the unresolved identity, while the institutional wording choice remains a human contribution.

To practise a correction, suppose your local comparison mistakenly says that the notes describe the same object. Follow this route in the separately initialized workspace; it is an exercise, not a recorded agent run:

1. Operations submits `results/atlas-comparison.md` with its source revision and checks to Verification, and sends Research a notice pointing to that result.
2. Verification checks it against `sources/atlas-guide.md` without editing either file. Its complete finding goes first to the human user: shared colour and form do not establish identity without a common identifier.
3. The human user routes the finding to Operations for the result correction and to Research for the maintained interpretation. Operations corrects its assigned result. Research records the qualified statement in `knowledge/atlas.md`, links its source and corrected result, and adds it to `knowledge/INDEX.md`: “The notes share colour and form but assign different functions. Object identity remains unresolved because no common identifier is supplied.”
4. Research checks the dependent Exhibit use. If its wording assumes identity, it prepares a bounded correction to `results/exhibit-label.md` for Operations within the authorized label assignment. The institutional wording decision stays with the human user. The browser example itself remains unchanged.
5. Read the corrected result, maintained interpretation and any resulting label together. Check their source references, retained uncertainty and actual changes. Research records the adopted consequence and remaining decision in `knowledge/journal.md`. Subsequent work reads that maintained state.

The [canonical write-back contract](integration.md#canonical-ownership-and-write-back) defines ownership. The links help locate affected work; the responsible writer examines and checks each correction. Copying a prompt or creating a workspace does not perform this sequence.

A monitor can compare recorded plans and interpretations with original statements and observed actions, then explain discrepancies to the human user. Its evidence supports a second opinion. Bounded verification examines an assigned result against criteria. Human acceptance remains its own judgement, and an unsettled personal criterion stays open.

Communication also needs evidence. A send operation establishes only the transport status reported by the configured route. Receipt and processing require their own evidence. Shared files alone do not wake a session. The [handoff contract](research-to-operations-handoff.md) specifies the result, evidence, receipt and return obligations.

## Run it locally

Start with a method package containing `demo/`; check its release metadata and the required files in the [adaptation guide](../examples/knowledge/README.md#prerequisites). The [public repository](https://github.com/DigitalHumanitiesCraft/research-mission-control) distributes the method. The example and catalog need Python 3.11 or later; editing and rebuilding the example also needs Node.js. Workspace initialization additionally needs Git. No account or runtime package installation is needed for the browser example.

Name the unpacked method directory `rmc-method`. Run the commands from there, using new destination folders under its existing parent. Earlier releases without `demo/` do not support this route. Copy and serve the example:

```sh
python -c "import shutil; shutil.copytree('demo', '../my-rmc-ui')"
cd ../my-rmc-ui
python -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000/`. Keep the server running, or stop it with Ctrl+C when finished. In a second terminal inside `my-rmc-ui`, edit `DEMO.sourceTitle` in `example-data.json` to `Beispielquelle: Atlas der Dinge (local copy)`, then rebuild and check it:

```sh
node tools/rebuild-example.cjs
node --test tools/check-adapter.cjs check-profiles.cjs
```

Refresh the source reader and confirm the changed title beside the original text. The [example guide](../demo/README.md) explains the editable inputs, generated views and source contract. To connect selected Markdown files, return from `my-rmc-ui` to the method directory and build a separate catalog:

```sh
cd ../rmc-method
python tools/build_knowledge_catalog.py --config examples/knowledge/sources.json --target ../knowledge-preview
```

The output contains `coverage.json`, `source-map.json` and source-response files. Continue with [Select your own Markdown sources](../examples/knowledge/README.md#select-your-own-markdown-sources): copy the reader independently, replace its catalog and source files, and disable its authored layout profiles so it actually reads the new root catalog. Open the documented `question` source and expand Full source text. This connects the reader only. Project, operator, assignment and calendar views retain their authored data until their separate contracts are deliberately adapted. Keep personal inputs and their outputs outside any public package.

Return to `rmc-method` if you followed the reader-copy instructions. For a separate workspace with reference role and communication contracts, inspect the initializer plan:

```sh
python skills/research-mission-control/scripts/init_workspace.py --target ../my-research-workspace --project-name "Synthetic source comparison" --objective "Keep observations and interpretations distinguishable" --research-harness other --operations-harness other --verification-harness other --dry-run
```

Inspect the plan, then repeat without `--dry-run` to create the files. For the Atlas exercise above, copy the fictional guide into that new workspace, still from `rmc-method`:

```sh
python -c "from pathlib import Path; import shutil; root=Path('../my-research-workspace'); (root/'sources').mkdir(); shutil.copyfile('demo/sources/demo-guide.md', root/'sources/atlas-guide.md')"
```

Configure the generated integration contract and use its start prompts in the actual working environments you choose. The proposed assignment permits the result path above; Research retains knowledge ownership. Inspect the copied source and generated contracts before execution. The initializer creates no agents, remote or commit and does not connect the workspace to the copied interface. [Setup](../README.md#start-a-project) documents role binding; [the adaptation guide](../examples/knowledge/README.md) maintains the complete local commands.

## Responsibilities and further evidence

The reference roles divide the work. Research develops the question, evidence and executable brief with the human user. Operations implements authorised changes and returns their evidence. Independent Verification examines a bounded result in a separate read-only context and returns its complete finding first to the human user, who controls subsequent routing. A contained task may use one context for clarification, implementation and production checks. Independent Verification requires a separate review context. The [role architecture](orchestration-architecture.md) and [specification](method-specification.md) maintain these responsibilities.

The portable Context Stream uses role-owned outboxes and recipient-owned processing records. Operations sends its complete result with evidence to Verification and a separate result notice to Research. [Integration](integration.md#context-stream-relationship) defines the actual routes, notification requirements and fallback. A separately configured monitor has its own communication contract and grants no acceptance or authority.

The public interface is a wholly synthetic example. The private Second Brain pilot uses a flatter operator arrangement and different review-return rules. Its [recorded deployment](integration.md#recorded-vault-pilot) preserves those differences. Neither the example nor a separate session establishes independent reasoning or a measured research benefit. [Recorded Context Stream operation](observed-context-stream-operation.md), [analysis of an earlier demonstration](observed-live-demo-operation.md) and the [project's evidence limits](project.md) state what was observed and what remains untested. Proposed comparative studies remain unperformed.

The knowledge arrangement draws on Luhmann's account of stable addresses and cross-references in a note collection ([1981, pp. 224–227](https://ckrybus.com/static/papers/luhmann1981.pdf)). [Obsidian's local Markdown files](https://help.obsidian.md/Files+and+folders/How+Obsidian+stores+data), [internal links](https://help.obsidian.md/Linking+notes+and+files/Internal+links) and [stated principles](https://obsidian.md/about) provide one implementation environment. Ango's [How I use Obsidian](https://stephango.com/vault) and [File over app](https://stephango.com/file-over-app) describe related personal practice and durable-file commitments. [Promptotyping](integration.md#knowledge-relationship) supplies the project-bound knowledge arrangement. These sources explain the rationale without establishing comparative effectiveness. [Gas Town](https://github.com/gastownhall/gastown) provides a related versioned-file approach through installed multi-agent runtime infrastructure; Research Mission Control supplies portable role and verification contracts. No measured performance comparison is implied.
