# Adapt an interface and its knowledge sources

The browser example, the knowledge catalog and the method initializer serve different purposes. A copied interface can be edited and rebuilt. The catalog selects local Markdown sources for its reader. The initializer creates a separate repository with roles and communication contracts. None of these commands starts an agent, uploads files or creates an account.

## Prerequisites

Use a downloaded or cloned method release that contains `examples/workshop-example/`, `demo/`, `example-data.json` inside that directory, its `tools/rebuild-example.cjs`, this example and the method initializer. If `demo/` is absent, that package does not provide the interface-copy route. The release metadata and manifests identify the delivered files; a proposed release is not evidence of their availability.

The commands below start in the method repository root, named `rmc-method`. Its parent directory must exist. Python 3.11 or later and Git support the initializer. Node.js supports the data rebuild and adapter checks. An ordinary browser and a local static HTTP server run the interface without an account or runtime package installation. Choose new target folders because the copy, catalog builder and initializer refuse existing destinations.

## Derive a local requirements result

From `rmc-method`, copy the [complete authored source pack](../workshop-example/README.md) into a new task folder:

```sh
python -c "import shutil; shutil.copytree('examples/workshop-example', '../my-handover-study')"
```

Open `my-handover-study` in an editor or a chosen AI harness. Read `records.md` and follow [First local exercise](../workshop-example/change-case.md#first-local-exercise). Create only `results/handover-requirements.md`, with exact source-section links and explicit distinctions between retained instructions and inferred requirements. Preserve all supplied files. Save the first draft before opening `requirements.md` as the comparison answer.

Check that R5 supersedes R1's earlier permission. Current workshop material must be wholly fictional, including the university and company cases. H-01 leaves the fictional sponsor's format choice open and keeps printing and case-sheet allocation pending. Check every citation, compare the saved draft with the supplied matrix and record any supported correction in the same result file. The stopping point is a source-checked local draft. Independent Verification, workshop delivery and human acceptance are separate and unperformed by these commands.

The supplied pack includes the records, completed requirements analysis, 90-minute plan, blank worksheet, completed model handover and exact before/after change account. These authored artifacts are a comparison basis, without evidence of an actual study or workshop. The copy command starts no agent. Subsequent command blocks begin in `rmc-method` unless they explicitly change directory.

## Copy and run the interface

Create an independent local copy of the delivered demo:

```sh
python -c "import shutil; shutil.copytree('demo', '../my-rmc-ui')"
cd ../my-rmc-ui
python -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000/` in a browser. Stop the server with Ctrl+C when finished. This serves the copied files locally. The original method package remains intact. A different unused port can replace 8000.

The requirements-study project links fictional handover records to a completed authored matrix. The dependent workshop applies those requirements in an agenda, worksheet and model handover. University and company cases preserve their unresolved category decisions. Read the source, inspect both projects and prepare a conversation. Copying a prompt does not deliver it.

## Edit and rebuild your copy

Stop the server or use a second terminal in `my-rmc-ui`. Edit `example-data.json` with a text editor, preserving valid JSON and the existing stable IDs. For a small observable exercise, change `DEMO.sourceTitle` to `Traceable project handovers (local copy)`. This changes the generated source title while preserving the research question and result.

```sh
node tools/rebuild-example.cjs
node --test tools/check-adapter.cjs
```

Restart or refresh the local server, open the source reader and check the changed title and original source text. The rebuild writes the explicit generated data members and refreshes their existing manifest hashes. It refuses unlisted generated assets. Adding code or sources requires their explicit manifest membership and applicable review.

Edit `sources/demo-guide.md` when changing the main authored source. `DEMO.sources` contains additional authored source texts and their individual revision bindings inside `example-data.json`. Source revision means SHA-256 of the exact UTF-8 bytes. Obtain the main source's digest with:

```sh
node -e "console.log(require('node:crypto').createHash('sha256').update(require('node:fs').readFileSync('sources/demo-guide.md')).digest('hex'))"
```

Update `DEMO.sourceRevision` and the intentional current references to that source, including its entries in `RESEARCH_PATHS.sourceRefs`. Preserve line references and quoted wording. Each additional source's `revision` must match its own text. Historical records retain their original revision and must not be rewritten indiscriminately. The rebuild rejects inconsistent main-source and additional-source hashes and invalid reading-path source references. This is not a complete validator of project, report, briefing or quotation bindings. Check those affected references, quoted wording and line locations explicitly, rebuild and inspect the original user action again.

Use the shipped `docs/source-contract.md` to adapt work data. Existing contracts distinguish projects, assignments, operator reports, results and dated configuration. Changing a source title does not rename every project or infer new work. Update the relevant fields deliberately and retain source identities and provenance. The supplied `check-package.cjs` can exercise actual browser routes when Playwright is available, with `DEMO_URL` set to the running copy's URL. Changed examples may need corresponding task-specific browser assertions. Passing technical checks establishes neither scholarly validity nor human acceptance.

## Compare source layouts

Project folders, linked notes and shared sources across project folders are alternative organisations of source material. Keep the question, authored evidence, qualified result and logical identities comparable when comparing them. The work model can remain the same across these arrangements. A new folder structure does not create roles, assignments or running sessions.

Use the selector labels and identifiers documented by the delivered demo rather than introducing another profile registry here. The exact selectors and their implemented scope belong to that package. A local filesystem rearrangement alone does not implement a selectable UI profile.

## Select your own Markdown sources

Return to the method repository root:

```sh
cd ../rmc-method
python tools/build_knowledge_catalog.py --config examples/knowledge/sources.json --target ../knowledge-preview
```

The runnable configuration selects the synthetic notes in `notes/`. For another local collection, prepare a separate configuration with explicit roots and file selections as described in [Configurable Knowledge Sources](../../knowledge/knowledge-adapters.md). Keep IDs stable while changing `root` and `file`. Links require the stated quotation on the stated source line. The adapter reads selected files without modifying them or scanning an entire vault.

The result contains `coverage.json`, `source-map.json` and source-response JSON files. A local adapter must map the existing `/api/research` and `/api/source?path=<id>` reads to those files. With the bundled example profiles disabled for this reader-only probe, the demo's static adapter reads coverage from `demo-assets/coverage.json` and its source map from the copied UI root. The regular profile selector uses its own explicit source maps and catalogs; replacing only the root files would leave those profiles unchanged. This is the knowledge-reader boundary. Project, operator and calendar data need their separate existing contracts and consistent source references. Generating a catalog alone does not connect the whole interface or convert authored example reports into real activity.

For a reader-only local probe with the supplied synthetic catalog, make another independent copy from `rmc-method`:

```sh
python -c "import shutil; shutil.copytree('demo', '../my-knowledge-ui')"
cd ../my-knowledge-ui
python -c "import shutil; shutil.copyfile('../knowledge-preview/coverage.json', 'demo-assets/coverage.json'); shutil.copyfile('../knowledge-preview/source-map.json', 'source-map.json'); shutil.copytree('../knowledge-preview/sources', 'sources', dirs_exist_ok=True); from pathlib import Path; Path('demo-profiles.js').write_text('window.MISSION_CONTROL_DEMO_PROFILES = null;' + chr(10), encoding='utf-8')"
python -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000/research.html?lang=en#view=context&source=question&read=1`. Expand Full source text to inspect the actual selected note. The catalog and source map now supply this reader, with the authored layout selector disabled in this independent probe copy. The other project and operator views still describe the authored example; their original source links require deliberate remapping before this becomes a coherent personal deployment. Running the example-data rebuild again replaces these reader assets. This local probe changes copied files outside the package manifest. A distributable adaptation needs explicit file membership, updated hashes, rights review and fresh checks.

Keep personal inputs and their local output outside a public distribution. Explicit selection is not publication permission. The browser demo has no source upload or canonical write-back service.

## Initialize the method workspace separately

From `rmc-method`, inspect the local workspace plan. Its source reference uses the separate task copy created under [Derive a local requirements result](#derive-a-local-requirements-result):

```sh
python skills/research-mission-control/scripts/init_workspace.py --target ../my-research-workspace --project-name "Traceable project handovers" --objective "Derive source-linked requirements from fictional records" --research-harness other --operations-harness other --verification-harness other --canonical-input ../my-handover-study/records.md --dry-run
```

Inspect the proposed paths and then run the same command without `--dry-run` when that is the intended local setup. The initializer creates a new local Git repository and start contracts. It creates no commit or remote and launches no agent. Choose the actual supported harness values for your intended deployment. The optional `--canonical-input` records a reference; it does not import sources or connect them to the UI. Verify that reference from the created workspace before relying on it.

The [initializer skill](../../skills/research-mission-control/SKILL.md) explains the setup interview and role boundaries. Use the resulting start contracts only in the contexts you actually choose to run. Notification, tool permissions and any model calls require their own verified deployment.

## Give reproducible feedback

Record the task, expected behavior, observed behavior, release revision, selected layout and minimal synthetic context needed to reproduce the issue. Preserve the source relationship involved in the failure. Remove personal and private material. This is a feedback format, not an instruction to contact someone or transmit files.
