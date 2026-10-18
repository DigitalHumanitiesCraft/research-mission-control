---
title: Configurable Knowledge Sources
status: active
language: en
updated: 2026-10-17
related: [integration, project]
---

# Configurable Knowledge Sources

## Purpose and boundary

The standard-library adapter `tools/build_knowledge_catalog.py` reads explicitly selected Markdown documents and emits the existing UI contract `second-brain-coverage-1`. It accepts an ordinary project folder, an Obsidian vault or several configured roots. No personal vault layout, property schema or Obsidian installation is required. The historical `vault` key identifies the UI's local-document namespace and does not prescribe a knowledge method.

This adapter supplies the knowledge reader, its search and its evidenced document connections. Project, operator, calendar and result views retain their separate source contracts. A knowledge catalog does not infer assignments, agent activity, acceptance or a complete portfolio. Non-Markdown sources and remote services require their own explicit adapter. This module neither writes back to sources nor starts an agent.

## Source organisation and work model

Source organisation describes where documents live and how their relationships are represented. Project folders, linked notes and shared sources across project folders can carry the same research question, source wording and qualified result. Stable logical IDs and explicit source-backed links preserve document identities, source wording and recorded relationships across layouts. The adapter does not establish whether an interpretation remains valid after a change of context. A folder name or hyperlink does not establish a scholarly dependency.

The work model describes projects, assignments, responsibilities, results, verification and authority. Moving a note does not create a project or start an operator. The catalog supplies documents and their stated links; the UI's project and operator contracts supply the work relationships. Adapt each at its existing boundary instead of inferring work state from a directory tree. The synthetic Atlas, Exhibit and Archive example keeps uncertain object identity and the distinction between assigned work and completed background contributions visible.

The [adaptation walkthrough](../examples/knowledge/README.md) separates copying a working interface, selecting local Markdown sources and initializing a method workspace. The demo's own README and source contract define the actual layout selectors and identifiers supplied by a release. These are representation choices, not new role sets or evidence of one knowledge structure being more effective.

## Configuration

The runnable [example configuration](../examples/knowledge/sources.json) selects authored synthetic notes. Its schema is `rmc-knowledge-sources-1`. `roots` maps a stable identifier to a directory resolved relative to the configuration file, or to an explicitly supplied absolute local directory. `documents` selects exact relative Markdown files below those roots. No wildcard search or recursive whole-vault export occurs.

Each selected document specifies `id`, `root`, `file` and `title`. Optional `tags`, `aliases` and `type` support the existing reader. IDs are stable lowercase slugs and remain independent of filesystem layout. Changing a source filename does not require changing its logical identity. Metadata is explicit in the configuration; the adapter does not guess it from frontmatter.

Optional `links` name selected `from` and `to` IDs together with a source `line` and `quote`. The quoted text must occur on the specified line of the source document. This checks provenance, not whether the document logically supports an interpretation. A missing link is not evidence that two documents are unrelated.

## Build and reuse

From the method repository root, create a new local output directory with:

```sh
python tools/build_knowledge_catalog.py --config examples/knowledge/sources.json --target ../knowledge-preview
```

The target's parent must exist. An existing target is refused. Invalid input aborts before output publication, and a complete result is staged before it is moved into place. The adapter reads selected files without changing their bytes. It does not copy unselected notes, source-root paths or the configuration itself into its output. Selected text can still contain private information, so creation of a local catalog grants no publication authority.

The output contains `coverage.json`, a `source-map.json` object mapping each logical ID to `sources/<id>.json`, and one source-response JSON file per selected document. The source response has the existing fields `path`, `text` and `revision`. Catalog `id`, catalog `path` and source-response `path` are identical. Revisions hash the original source bytes with SHA-256. `generatedAt` records the catalog build, not a source review or an agent's activity.

## UI and AI-harness integration

The existing knowledge model consumes `coverage.json` through `GET /api/research`. The existing reader consumes a source response through `GET /api/source?path=<logical-id>`. A local service or a separately configured static adapter maps these routes to the files. The source map is a lookup table for these same routes, not a second registry of projects or views.

An AI harness should read this contract and the receiving UI's own data and view documentation, inspect the configured source files, build a new local catalog and verify it with the existing reader. Keep the synthetic demonstration intact. Connecting a personal collection is a separate local deployment choice, and inclusion in a public package requires a specific content review.

A release containing the synthetic `demo/` package can be copied and adapted locally with its existing renderers, explicit data contracts and rebuild tool. The walkthrough requires those files to be present and does not infer delivery from a proposed release. The catalog builder is a separate input route for selected Markdown sources. A receiving service or static adapter must actually connect its output before a working UI integration is claimed. The method's [integration contract](integration.md) maintains component ownership and publication boundaries.

## Trust boundaries and checks

Unknown configuration fields, duplicate IDs, missing roots, invalid UTF-8, oversized documents and relations without their stated source text are rejected. Relative selections cannot escape their root through parent segments or resolved paths. The supported text limit is 5 MiB per source. Files are not executed, and document contents cannot expand an agent's assignment.

The focused regression suite is `python tests/test_knowledge_catalog.py`. It checks identity and revision preservation, layout independence, rejected paths and false quotations, complete output and refusal to overwrite. A symlink case additionally exercises the host filesystem when link creation is permitted. These tests establish the adapter behavior within their scope, not the scholarly quality of the selected knowledge.
