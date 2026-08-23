# Repository action layer

## Purpose

This repository is the canonical executable source for Research Mission Control. Work in this repository maintains the portable method, initializer, role contracts, knowledge core, tests, and internal reference implementation.

Reading or reviewing a role prompt does not activate that role. A Research, Operations, or Verification role becomes active only through an explicit instruction or generated start contract.

## Orientation

1. Read `knowledge/INDEX.md`.
2. Read `knowledge/project.md` and `knowledge/integration.md`.
3. Follow the canonical document named for the affected component.
4. Inspect actual artifacts and Git state before relying on reported status.

The private Vault may provide project-specific background when the current environment is authorized to read it. It does not override this repository's executable method. Do not copy private paths or current local portfolio state into public method documentation.

## Action rule

Move into implementation when the next useful action is sufficiently clear, authorized, proportionate in consequence, and verifiable. Use a bounded experiment when it can resolve a low-risk uncertainty. Ask the operator only when work requires a Decision, Authorization, Action, or missing Input.

Keep four state classes distinct.

- Epistemic state covers sources, claims, interpretations, and uncertainty.
- Operational state covers files, data, tools, and performed actions.
- Authority state covers permissions, reserved decisions, rights, and external effects.
- Verification state covers evidence, checks, deviations, and acceptance.

## Change boundaries

- Preserve unrelated worktree changes.
- Preserve historical journal entries. Remove legacy reports only after their durable knowledge and unique evidence have been verified in a canonical source or retained report; Git history remains the recovery path.
- Update the canonical knowledge document when a durable method or architecture decision changes.
- When the source repository contains `knowledge/handoff.md`, use it only for unresolved information required by another context. Publication bundles omit the source-repository handoff.
- Treat `dashboard/` and `lagebild/` as an internal reference implementation. Their live state is excluded from a publication-safe method release unless replaced with synthetic data.
- Do not create a commit, remote, release, publication, or external effect without the corresponding authorization.
- A skill, tool, filesystem permission, or writable path never expands authority.

## Verification and reporting

Select checks according to the changed claim and likely failure mode. Run targeted tests during implementation and the documented suite before a release claim. Use `git diff --check` for every documentation or code change.

Report the current result and its practical meaning first. Separate evidence, continuing autonomous work, required operator contribution, and known limits. A requested review item includes a substantive synthesis, the reason it matters, the assessment criterion, and its direct location.

Current code, documentation, prompts, examples, and interface text are English. Historical records retain their original language. Code comments are English and explain only constraints that the code does not express.
