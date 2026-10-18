---
title: Deterministic Checks by Project Type
status: active
language: en
created: 2026-08-25
updated: 2026-10-17
related: [method-specification, research-to-operations-handoff, integration]
---

# Deterministic Checks by Project Type

## Scope

This catalog names, per project type, the completion criteria that a command can decide, together with the concrete command form. A criterion is deterministic when the command's exit code or exact output settles it without discretion. The method formalizes only such criteria. Everything beyond that boundary remains an assessment matter for the human user or the Verification role and is delimited per type below.

For a deterministic criterion, the executed command together with its captured output is the check-command evidence element of a Result with Evidence as defined in [`research-to-operations-handoff.md`](research-to-operations-handoff.md). The output carries the claim. A verdict restated without command and output remains a producer declaration in the sense of [`method-specification.md`](method-specification.md). Judgment criteria are unaffected by this element and keep their evidence forms.

## Command semantics

- Commands run from the root of the examined project unless the form names another location. Placeholders in angle brackets are project-supplied.
- Interpret each command by its declared success condition. Suite and validation commands use their exit code. Queries such as `Test-Path` and `git rev-list --count` require the specified Boolean or numeric output as well as successful execution. Empty output indicates success only for a command whose stated criterion is an empty findings list. Capture each command's output and exit status separately.
- Suite runners, schemas, linters, and build commands come from the examined project's action layer or configuration. They are never guessed, and running a generic default against a project that configures something else decides nothing about that project.
- A passing check establishes the mechanical fact it names. Whether that fact satisfies the assignment's objective remains a judgment, and so does the choice of checks for a claimed result.

## Checks for every project type

| Criterion | Command form | Decided fact |
| --- | --- | --- |
| file exists at the named location | `test -f <path>` (POSIX) or `Test-Path -LiteralPath <path> -PathType Leaf` (PowerShell, FileSystem provider) | POSIX exit `0` or PowerShell output `True` establishes a file at that path. Content remains unexamined |
| pathspec matches a tracked Git entry | `git ls-files --error-unmatch -- <pathspec>` | the index contains a matching entry. Working-tree file existence remains a separate check |
| Git reports no pending changes | `git status --porcelain=v1 --untracked-files=all --ignore-submodules=none` | successful execution with empty output reports no staged, unstaged, or non-ignored untracked changes visible to this Git status query |
| changes pass Git whitespace checks | `git diff --check` and `git diff --cached --check`, run separately | both commands must exit `0`. Unstaged and staged tracked changes pass the configured whitespace and conflict-marker checks |
| local HEAD has no commits absent from the recorded upstream | `git rev-list --count '@{upstream}..HEAD'` | with a configured upstream and successful execution, output `0` means every commit reachable from HEAD is reachable from the local upstream reference |
| data parses with the Python JSON decoder | `python -m json.tool <file.json>` | the installed decoder accepts the input, including its default extensions such as `NaN`. Strict JSON conformance and schema validity require their own checks |
| bundle satisfies its tested publication allowlist contract | the manifest-driven build plus its bundle contract test, in this repository `python -m pytest tests/test_public_release.py` | the examined bundle satisfies the file-selection assertions actually exercised by the tests |

`--untracked-files=all` overrides a configuration that hides untracked paths. Ignored files remain outside this status result. A directory-wide non-change claim requires a complete pre-action baseline and comparison of its declared scope, as described in [`method-specification.md`](method-specification.md). See the [Git status documentation](https://git-scm.com/docs/git-status).

The upstream count compares local references. To interpret this count as remote evidence, first verify a successful, time-stamped fetch that refreshes the configured upstream reference. Record the relevant ref names and object IDs. The comparison describes the state observed at that fetch. See [upstream revision syntax](https://git-scm.com/docs/gitrevisions) and [configured remote-tracking branches](https://git-scm.com/docs/git-fetch#_configured_remote_tracking_branches).

The two whitespace checks examine their respective diffs under `core.whitespace`. Untracked content needs a separately selected check. See [Git diff](https://git-scm.com/docs/git-diff). The [Python JSON documentation](https://docs.python.org/3/library/json.html#standard-compliance-and-interoperability) describes decoder extensions and duplicate-name handling. The [PowerShell Test-Path documentation](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/test-path#-pathtype) defines the file-type and Boolean conditions.

## Code

| Criterion | Command form | Decided fact |
| --- | --- | --- |
| configured test run succeeds | the configured suite runner, typically `python -m pytest -q` or the test script of the package manifest | the selected run satisfies the runner's success conditions. Inspect collection, skips, and expected failures before claiming which cases passed |
| linter green | the configured linter, in this repository `python -m ruff check .` | the sources violate no enabled rule |
| formatting stable | `python -m ruff format --check .` where Ruff formatting is configured | reformatting would change nothing |
| build runs | the project's build command with its documented target | the build exits successfully and the expected artifact exists |

The following remain assessment matters for this type.

- Whether the tests cover the changed claim, and whether green tests establish correctness beyond the tested cases.
- Whether a fix addresses the root cause.
- Design quality, appropriateness of an abstraction, and performance adequacy.

## Edition and XML (TEI)

Well-formedness is decidable with the Python standard library:

```
python -c "import sys, xml.etree.ElementTree as ET; ET.parse(sys.argv[1])" <file.xml>
```

Schema validity is decidable against the project-supplied RelaxNG schema:

```
python -c "
import sys
from lxml import etree
schema = etree.RelaxNG(etree.parse(sys.argv[1]))
ok = schema.validate(etree.parse(sys.argv[2]))
for error in schema.error_log:
    print(error)
sys.exit(0 if ok else 1)
" <schema.rng> <file.xml>
```

Where `xmllint` or `jing` is installed, `xmllint --relaxng <schema.rng> --noout <file.xml>` and `jing <schema.rng> <file.xml>` decide the same criterion. The schema is part of the project's source of truth. Validation against a generic schema such as `tei_all` decides conformance to that schema alone; an edition that maintains a customized schema names it, and that schema is the binding check. Schematron rules decide deterministically once the project names the pipeline command that runs them.

The following remain assessment matters for this type.

- Whether the markup interprets the source correctly, including transcription accuracy against the witness.
- Editorial decisions such as normalization, apparatus construction, and the modeling of uncertain readings.
- Whether a schema-valid file encodes the intended text. Validity is a statement about structure, and what the structure means stays an editorial judgment.

## Prose and knowledge documents

Where PyYAML is available, this snippet attempts to parse the first delimiter-separated fragment in top-level Markdown files beginning with `---`:

```
python -c "
import sys, pathlib, yaml
bad = []
for p in sorted(pathlib.Path(sys.argv[1]).glob('*.md')):
    text = p.read_text(encoding='utf-8')
    if not text.startswith('---'):
        continue
    try:
        yaml.safe_load(text.split('---', 2)[1])
    except yaml.YAMLError as error:
        bad.append(p.name + ': ' + str(error).splitlines()[0])
print('\n'.join(bad))
sys.exit(1 if bad else 0)
" <folder>
```

This preliminary probe checks extracted, undecoded path strings in simple inline Markdown links:

```
python -c "
import re, sys, pathlib
bad = []
for p in pathlib.Path(sys.argv[1]).rglob('*.md'):
    for target in re.findall(r'\]\(([^)]+)\)', p.read_text(encoding='utf-8')):
        target = target.split('#')[0].strip()
        if target and not target.startswith(('http://', 'https://', 'mailto:')) and not (p.parent / target).exists():
            bad.append(str(p) + ': ' + target)
print('\n'.join(bad))
sys.exit(1 if bad else 0)
" <folder>
```

The YAML snippet skips subdirectories and files without the opening marker. It does not require a closing delimiter, a YAML mapping, or required metadata fields. A project frontmatter validator supplies those checks when they are part of the criterion.

The link probe tests filesystem existence for the strings its regular expression extracts. Link titles, URL-encoded paths, balanced parentheses, reference-style links, code blocks, and fragment anchors are outside its supported parsing scope and can produce false findings or omissions. A complete project link criterion requires the configured parser and checks for that Markdown dialect. An HTTP check records the response status, requested URL, final URL after redirects, and observed timestamp. That observation alone establishes neither source identity nor support for a cited claim.

Where a repository pins required document content in a test suite, that suite is the concrete form. In this repository `python -m pytest tests/test_method_consistency.py` decides that packaged role templates match the canonical prompts and that pinned core sentences are still present.

The following remain assessment matters for this type.

- Correctness and justification of substantive claims, and whether cited sources support them.
- Argument quality, granularity, placement, and document structure beyond mechanically checkable patterns.
- Style conformance beyond patterns a linter can match.

## Static site

| Criterion | Command form | Decided fact |
| --- | --- | --- |
| build runs | the site's generator command | the generator exits successfully and the named output artifact exists |
| script syntax valid | `node --check <file.js>` | the file parses |
| scripted checks pass | the project's configured verification script. For the public synthetic example, follow [`demo/README.md`](../demo/README.md) | the assertions executed by that script hold in its declared environment |
| internal links and assets resolve within the declared scope | the project's HTML-aware link and asset checker, configured for its deployment base path | the references actually parsed and checked satisfy the configured target and fragment rules |

`node dashboard/verify.js` belongs to the source repository's internal dashboard and is excluded from the public bundle. It uses a DOM stub, so its checks do not establish real browser rendering. The public example documents a separate browser check with Playwright and an explicitly served URL.

A scripted browser check can establish an asserted state in its observed rendered output. A DOM-stub check establishes only the corresponding assertions in that stub environment. Visual quality, layout acceptance, and readability remain assessment matters, and a screenshot alone is insufficient evidence for page behavior, as the browser rule in [`research-to-operations-handoff.md`](research-to-operations-handoff.md) records.

## Judgment boundary

Deterministic checks establish mechanical facts. The following classes remain with the human user or the Verification role in every project type.

- Whether the result satisfies the objective and acceptance criteria of the assignment.
- Whether the executed checks are the right checks for the claimed result.
- Domain validation and human acceptance, which [`method-specification.md`](method-specification.md) keeps distinct from formal validation.
- Interpretation, meaning, and quality wherever deciding the criterion requires understanding the content.

A criterion that would need discretion to decide is a judgment criterion in this catalog's sense. It enters an assignment as an assessment task, and the check-command evidence element stays reserved for criteria a command decides.
