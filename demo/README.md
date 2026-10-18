# Mission Control UI with synthetic examples

This package contains the actual HTML/CSS/JavaScript renderers, shared model and navigation, authored example data, source reader, static adapter and a runnable browser check. Open `index.html` through a static HTTP server. No personal Second Brain, Obsidian installation, account, live agent, API key or local application service is needed.

For AI-assisted changes, start with `AGENTS.md`, `docs/source-contract.md` and `docs/views.md`. The normal start page is `mission-control/index.html`; the demo root opens that same project Overview. The public method site's landing page remains outside this `demo/` directory.

Edit code in place. `example-data.json` and `sources/demo-guide.md` are the authored synthetic inputs. After editing data, run `node tools/rebuild-example.cjs`; it uses the same deterministic data builder as the private export. It refuses inconsistent source hashes. When changing source text, update its explicit revision bindings together; historical source records retain their original revisions. The tool refreshes only the existing explicit manifest members. Adding a source/code file requires an explicit manifest entry and review.

Run `node --test tools/check-adapter.cjs check-profiles.cjs` for the dependency-free adapter countercases. For browser verification, install/provide Playwright in the development environment, serve this package, set `DEMO_URL` to its actual HTTP address including its trailing slash, and run `node check-package.cjs`. `DEMO_SCREENSHOTS` optionally selects an evidence directory. There is no npm dependency at runtime. Generated code and static data work on an ordinary subpath.

The demo offers Overview with Projects and Calendar, Strategies, Projects, Operators, Knowledge, Monitor and shared Settings. Complete questions, responsibilities and source comparisons are contextual Overview views. Operators shows project bindings in its existing profiles and project details. Legacy assignment and connection addresses lead to those retained contexts. English is the default; German is selectable. Source reading, project/result return paths, individual conversations and the coordination briefing for all operators or the filtered selection, full prompt copying, appearance and browser preferences are actual browser behavior. All projects, roles, findings, assessments, configuration metadata and dates are fictional. The positive demo-model configuration is an authored illustration and no session observation. Technical execution deliberately has no telemetry. Delivery, canonical adoption, calendar connections, agent execution and local service control are unavailable. No successful write is simulated.

The prior qualitative sample assessment is retained as dated source wording. The productive special-role historical scale is not generalized for this example role. Missing and empty states remain inspectable. Technical checks do not establish scholarly usefulness or human acceptance.

The package release and exact UI source revision are recorded in demo-release.json. It remains a release candidate; technical verification does not establish empirical benefit or human acceptance.

Code is MIT; authored synthetic data and prose are CC BY 4.0. See `LICENSES/`. `export-manifest.json` records the explicit files, hashes, sizes and licensing. Public legal attribution is preserved. Never add private source roots, customer material, account data, chat identities or generated private fixtures to this public package.

## Compare source organization

Use Source organization on any demo page to select Project folders (`project-folder`), Linked notes (`linked-notes`) or Shared sources (`shared-sources`). Inspect source layout and stable identities opens the actual source tree and reader links. The research question, claims, results, limits, document IDs, source bytes and evidenced relationships remain identical. The example changes source organization, not the work model or its research effectiveness.

The address retains `profile`. Personal notes and preferences use separate demo-only storage for each profile. Returning to a profile restores its own notes; changing language keeps the current profile and work context. With blocked browser storage, explicit profile and language addresses still work, while unsaved text cannot survive a page reload. Reset demo clears the current profile's demo preferences only.

`profiles/index.json` and `demo-profiles.js` are generated from the same explicit profile builder. Each profile has its own source map, source files and knowledge catalog. Logical IDs remain independent of physical paths. Never rename those identities recursively through work records to simulate a layout change.

## Run a local copy

With Python available, start `python -m http.server 8000 --bind 127.0.0.1` from this demo directory and open the local HTTP address printed by that server. The local HTTP server is required for source reads. Node.js is needed only when rebuilding authored data or running the dependency-free checks.

The Atlas result opens its source-bound comparison table. The complete original source and the exact project return remain available. The table is authored example content and provides no execution or acceptance evidence.
