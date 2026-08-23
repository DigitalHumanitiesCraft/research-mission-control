# Claude Code instructions

Read and follow [`AGENTS.md`](AGENTS.md) before changing this repository. It is the canonical repository action layer. The rules below restate the minimum contract for environments that do not load `AGENTS.md` automatically.

## Repository purpose

This repository is the canonical source for Research Mission Control. The complete system prompt, role prompts, initializer skill, and scaffolder are its executable artifacts. The dashboard and situation view are an internal reference implementation and may carry local operational state.

## Work rule

Inspect the relevant canonical knowledge and actual artifacts before acting. Implement clear, authorized, reversible work directly. Ask the human user only for a Decision, Authorization, Action, or Input that is required to continue safely. A skill or writable path never expands authority.

Keep epistemic state, operational state, authority, and verification state distinct. Verify claims against files, source material, tests, data, or rendered output as appropriate. Report the current result and its practical meaning before technical detail.

## Canonical entry points

1. Read `knowledge/INDEX.md` to locate the relevant source.
2. Read `knowledge/project.md` for the repository purpose, system boundary, and accepted role model.
3. Read `knowledge/integration.md` for component, transport, and publication boundaries.
4. Read the directly affected specification or implementation document.
5. Inspect the actual files and Git state before relying on a recorded result.

When the source repository contains `knowledge/handoff.md`, use it only for open information needed by another context. Publication bundles omit this source-repository transition record. Accepted future work belongs in a plan where one exists. Integrated, rejected, or corrected transitions belong in `knowledge/journal.md`.

## Editing

- Preserve historical journal entries. Remove legacy reports only after their durable knowledge and unique evidence have been verified in a canonical source or retained report; Git history remains the recovery path.
- Keep public method documentation independent of private Vault paths, current local projects, and model-specific allocations.
- Treat dashboard source data as internal operational material until a publication-safe synthetic dataset exists.
- Keep code comments in English and use them only for constraints that the code does not express.
- Run proportionate tests and `git diff --check` after changes.
- Create no commit, remote, publication, or external effect without the required authorization.

Role activation is explicit. Reading or reviewing a prompt does not activate its role. The portable role contracts are under `orchestrators/`, and the executable initializer is under `skills/research-mission-control/`.
