"""Contract tests for the allowlisted public release bundle."""

from __future__ import annotations

import hashlib
import importlib.util
import json
import tempfile
import tomllib
import unittest
import zipfile
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "tools" / "build_public_release.py"
SPEC = importlib.util.spec_from_file_location("build_public_release", MODULE_PATH)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)
ASSERTIONS = unittest.TestCase()
CC_BY_4_0_SHA256 = "9e5f1b3c610b9c2da5c313bf81d577a7d1acec686bdb0384edefa6df0f90cd94"
MIT_SHA256 = "cde167b7f69fa78c4cebc3cf65478526ee5cc37761b2e10f0a98bf10f45c0848"


@contextmanager
def _temporary_release_target() -> Iterator[Path]:
    """Yield a disposable target inside the builder's reserved release area."""
    release_root = ROOT / "dist"
    release_root.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="release-test-", dir=release_root) as temporary_directory:
        yield Path(temporary_directory) / "bundle"


def test_draft_bundle_excludes_internal_runtime_state() -> None:
    with _temporary_release_target() as target:
        copied = MODULE.build(target, draft=True)

        assert Path("index.html") in copied
        assert Path("skills/research-mission-control/SKILL.md") in copied
        assert Path("downloads/research-mission-control.skill") in copied
        assert Path("knowledge/method-specification.md") in copied
        assert Path("knowledge/handoff.md") not in copied
        assert Path("knowledge/specification.md") not in copied
        assert not any(path.parts[0] in {"dashboard", "lagebild", "reports", "shared", "work"} for path in copied)
        assert not (target / "dashboard").exists()

        public_index = (target / "index.html").read_text(encoding="utf-8")
        assert 'href="./dashboard/' not in public_index
        assert "orchestrators/bootstrap.md" in public_index
        assert "skills/research-mission-control/SKILL.md" in public_index
        assert "downloads/research-mission-control.skill" in public_index
        assert "The three configuration questions" in public_index
        assert "currently open Codex task or Claude Code conversation" in public_index
        assert "data, documents, materials, code, repositories, or knowledge sources" in public_index
        assert "data-release-package-link hidden" not in public_index
        assert public_index.count("data-release-package-link") == 2

        with zipfile.ZipFile(target / "downloads" / "research-mission-control.skill") as archive:
            members = set(archive.namelist())
            role_template_root = "research-mission-control/assets/templates/mission-control/roles"
            assert "research-mission-control/SKILL.md" in members
            assert "research-mission-control/LICENSE.txt" in members
            assert "research-mission-control/assets/templates/.gitattributes.tmpl" in members
            assert "research-mission-control/scripts/init_workspace.py" in members
            assert "research-mission-control/assets/templates/knowledge/project.md.tmpl" in members
            assert f"{role_template_root}/research-orchestrator.md.tmpl" in members
            assert f"{role_template_root}/operational-orchestrator.md.tmpl" in members
            assert f"{role_template_root}/verification-context.md.tmpl" in members
            assert "research-mission-control/tests/test_init_workspace.py" in members


def test_skill_package_is_deterministic() -> None:
    with _temporary_release_target() as temporary_target:
        first = temporary_target / "first"
        second = temporary_target / "second"
        MODULE.build(first, draft=True)
        MODULE.build(second, draft=True)

        first_bytes = (first / "downloads" / "research-mission-control.skill").read_bytes()
        second_bytes = (second / "downloads" / "research-mission-control.skill").read_bytes()
        assert hashlib.sha256(first_bytes).digest() == hashlib.sha256(second_bytes).digest()


def test_interface_exposes_package_only_when_the_package_exists() -> None:
    source_index = (ROOT / "index.html").read_text(encoding="utf-8")
    source_readme = (ROOT / "README.md").read_text(encoding="utf-8")
    package_exists = (ROOT / "downloads" / "research-mission-control.skill").is_file()

    if package_exists:
        assert source_index.count("data-release-package-link hidden") == 0
        assert source_index.count("data-release-package-link") == 2
    else:
        assert source_index.count("data-release-package-link hidden") == 2
        assert "](downloads/research-mission-control.skill)" not in source_readme


def test_manifest_is_an_exact_positive_list() -> None:
    manifest = json.loads((ROOT / "publication-manifest.json").read_text(encoding="utf-8"))
    assert manifest["include"]
    assert all(not any(character in entry for character in "*?[") for entry in manifest["include"])
    assert "knowledge/method-specification.md" in manifest["include"]
    assert "tests/test_method_consistency.py" in manifest["include"]
    assert "knowledge/handoff.md" not in manifest["include"]
    assert "knowledge/specification.md" not in manifest["include"]


def test_every_public_file_has_one_exact_license_assignment() -> None:
    manifest = json.loads((ROOT / "publication-manifest.json").read_text(encoding="utf-8"))
    MODULE._resolve_sources(manifest)

    unassigned = json.loads(json.dumps(manifest))
    unassigned["license_rules"]["CC-BY-4.0"]["files"].remove("site.js")
    with ASSERTIONS.assertRaisesRegex(RuntimeError, "site.js: expected one licence, found none"):
        MODULE._resolve_sources(unassigned)

    overlapping = json.loads(json.dumps(manifest))
    overlapping["license_rules"]["MIT"]["files"].append("site.js")
    with ASSERTIONS.assertRaisesRegex(RuntimeError, "site.js: expected one licence"):
        MODULE._resolve_sources(overlapping)


def test_official_license_texts_and_citation_identity_are_fixed() -> None:
    cc_text = (ROOT / "LICENSES" / "CC-BY-4.0.txt").read_text(encoding="utf-8").rstrip("\r\n") + "\n"
    mit_bytes = (ROOT / "LICENSES" / "MIT.txt").read_bytes()
    citation = (ROOT / "CITATION.cff").read_text(encoding="utf-8")

    assert hashlib.sha256(cc_text.encode()).hexdigest() == CC_BY_4_0_SHA256
    assert hashlib.sha256(mit_bytes).hexdigest() == MIT_SHA256
    assert "Dr. Christopher Pollin" in (ROOT / "LICENSE").read_text(encoding="utf-8")
    assert "version: 0.9.0rc1" in citation
    assert "orcid: https://orcid.org/0000-0002-4879-129X" in citation
    assert "repository-code: https://github.com/DigitalHumanitiesCraft/research-mission-control" in citation
    assert "license:\n  - MIT\n  - CC-BY-4.0" in citation


def test_release_version_and_generated_sha_evidence_are_coherent() -> None:
    project = tomllib.loads((ROOT / "pyproject.toml").read_text(encoding="utf-8"))
    declared = json.loads((ROOT / "release-metadata.json").read_text(encoding="utf-8"))
    assert project["project"]["version"] == "0.9.0rc1"
    assert declared["version"] == project["project"]["version"]
    assert declared["status"] == "release-candidate"
    assert declared["repository"] == "https://github.com/DigitalHumanitiesCraft/research-mission-control"

    with _temporary_release_target() as target:
        MODULE.build(target, draft=True)
        built = json.loads((target / "release-metadata.json").read_text(encoding="utf-8"))
        assert built["version"] == "0.9.0rc1"
        assert built["source_commit"] is None or len(built["source_commit"]) == 40
        assert built["source_dirty"] is None or isinstance(built["source_dirty"], bool)
        assert len(built["publication_manifest_sha256"]) == 64

        checksum_lines = (target / "SHA256SUMS").read_text(encoding="utf-8").splitlines()
        expected_paths = {path.relative_to(target).as_posix() for path in target.rglob("*") if path.is_file()}
        checked_paths = set()
        for line in checksum_lines:
            digest, relative = line.split("  ", maxsplit=1)
            assert hashlib.sha256((target / relative).read_bytes()).hexdigest() == digest
            checked_paths.add(relative)
        assert checked_paths == expected_paths - {"SHA256SUMS"}


def test_content_scan_covers_templates_and_toml_without_exempting_builder() -> None:
    MODULE._check_content([MODULE_PATH])
    with _temporary_release_target() as temporary_target:
        temporary_target.mkdir(parents=True)
        template = temporary_target / "leak.tmpl"
        toml = temporary_target / "leak.toml"
        template.write_text("path = /" + "home/example/private\n", encoding="utf-8")
        toml.write_text('path = "C:/Use' + 'rs/example/private"\n', encoding="utf-8")
        with ASSERTIONS.assertRaisesRegex(RuntimeError, "leak.tmpl"):
            MODULE._check_content([template])
        with ASSERTIONS.assertRaisesRegex(RuntimeError, "leak.toml"):
            MODULE._check_content([toml])


def test_link_check_is_offline_and_limits_itself_to_local_bundle_targets() -> None:
    with _temporary_release_target() as temporary_target:
        temporary_target.mkdir(parents=True)
        (temporary_target / "index.html").write_text(
            '<a href="https://invalid.example.test/unreachable">External reference</a>\n',
            encoding="utf-8",
        )
        MODULE._check_bundle_links(temporary_target)


def test_builder_rejects_source_only_documents_even_if_allowlisted() -> None:
    manifest = json.loads((ROOT / "publication-manifest.json").read_text(encoding="utf-8"))
    manifest["include"] = [*manifest["include"], "knowledge/handoff.md"]

    with ASSERTIONS.assertRaisesRegex(RuntimeError, "source-only boundary"):
        MODULE._resolve_sources(manifest)


def test_manifest_rejects_duplicate_and_out_of_repository_paths() -> None:
    manifest = json.loads((ROOT / "publication-manifest.json").read_text(encoding="utf-8"))
    manifest["include"] = [*manifest["include"], "README.md"]
    with ASSERTIONS.assertRaisesRegex(RuntimeError, "duplicates"):
        MODULE._resolve_sources(manifest)

    manifest["include"] = [str(ROOT / "README.md")]
    with ASSERTIONS.assertRaisesRegex(RuntimeError, "relative to the repository"):
        MODULE._resolve_sources(manifest)

    manifest["include"] = ["../forschungsleitstelle/README.md"]
    with ASSERTIONS.assertRaisesRegex(RuntimeError, "relative to the repository"):
        MODULE._resolve_sources(manifest)

    manifest["include"] = ["dashboard/index.html"]
    with ASSERTIONS.assertRaisesRegex(RuntimeError, "source-only boundary"):
        MODULE._resolve_sources(manifest)


def test_non_draft_release_delivers_both_license_texts() -> None:
    with _temporary_release_target() as target:
        with mock.patch.object(MODULE, "_git_state", return_value=("a" * 40, False)):
            MODULE.build(target, draft=False)
        assert (target / "LICENSE").is_file()
        assert (target / "LICENSES" / "MIT.txt").is_file()
        assert (target / "LICENSES" / "CC-BY-4.0.txt").is_file()


def test_non_draft_release_requires_clean_commit_provenance() -> None:
    with _temporary_release_target() as target:
        with (
            mock.patch.object(MODULE, "_git_state", return_value=(None, None)),
            ASSERTIONS.assertRaisesRegex(RuntimeError, "source commit is unavailable"),
        ):
            MODULE.build(target, draft=False)

        with (
            mock.patch.object(MODULE, "_git_state", return_value=("a" * 40, True)),
            ASSERTIONS.assertRaisesRegex(RuntimeError, "worktree is dirty"),
        ):
            MODULE.build(target, draft=False)


def test_target_must_remain_inside_reserved_release_area() -> None:
    with (
        tempfile.TemporaryDirectory() as temporary_directory,
        ASSERTIONS.assertRaisesRegex(RuntimeError, "reserved dist directory"),
    ):
        MODULE.build(Path(temporary_directory) / "outside", draft=True)

    with ASSERTIONS.assertRaisesRegex(RuntimeError, "reserved dist directory"):
        MODULE.build(ROOT / "knowledge", draft=True)

    with ASSERTIONS.assertRaisesRegex(RuntimeError, "reserved dist directory"):
        MODULE.build(ROOT / "dist", draft=True)


if __name__ == "__main__":
    tests = [
        unittest.FunctionTestCase(function) for name, function in sorted(globals().items()) if name.startswith("test_")
    ]
    raise SystemExit(not unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite(tests)).wasSuccessful())
