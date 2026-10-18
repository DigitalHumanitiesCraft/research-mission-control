"""Contract tests for the allowlisted public release bundle."""

from __future__ import annotations

import hashlib
import importlib.util
import json
import sys
import tempfile
import tomllib
import unittest
import zipfile
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
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
        assert "SYSTEM-PROMPT.md" in public_index
        assert "skills/research-mission-control/SKILL.md" in public_index
        assert "downloads/research-mission-control.skill" in public_index
        assert "research-mission-control-operating-model.png" in public_index
        assert "Reference and reuse" in public_index
        assert "docs/knowledge/method-specification.html" in public_index
        assert "LICENSES/DHCraft-Brand.txt" in public_index
        assert "Initialize the shared workspace" not in public_index
        assert "data-release-package-link hidden" not in public_index
        assert "data-source-package-link hidden" in public_index
        assert public_index.count("data-release-package-link") == 1
        assert public_index.count("data-source-package-link") == 1

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
            assert f"{role_template_root}/independent-verification-agent.md.tmpl" in members
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
        assert source_index.count("data-release-package-link") == 1
    else:
        assert source_index.count("data-release-package-link hidden") == 1
        assert source_index.count("data-source-package-link hidden") == 0
        assert source_index.count("data-source-package-link") == 1
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
    unassigned["license_rules"]["CC-BY-4.0"]["files"].remove("site.css")
    with ASSERTIONS.assertRaisesRegex(RuntimeError, "site.css: expected one licence, found none"):
        MODULE._resolve_sources(unassigned)

    overlapping = json.loads(json.dumps(manifest))
    overlapping["license_rules"]["MIT"]["files"].append("site.css")
    with ASSERTIONS.assertRaisesRegex(RuntimeError, "site.css: expected one licence"):
        MODULE._resolve_sources(overlapping)


def test_official_license_texts_and_citation_identity_are_fixed() -> None:
    cc_text = (ROOT / "LICENSES" / "CC-BY-4.0.txt").read_text(encoding="utf-8").rstrip("\r\n") + "\n"
    mit_bytes = (ROOT / "LICENSES" / "MIT.txt").read_bytes()
    citation = (ROOT / "CITATION.cff").read_text(encoding="utf-8")

    assert hashlib.sha256(cc_text.encode()).hexdigest() == CC_BY_4_0_SHA256
    assert hashlib.sha256(mit_bytes).hexdigest() == MIT_SHA256
    assert "Dr. Christopher Pollin" in (ROOT / "LICENSE").read_text(encoding="utf-8")
    assert "version: 0.9.0rc3" in citation
    assert "orcid: https://orcid.org/0000-0002-4879-129X" in citation
    assert "repository-code: https://github.com/DigitalHumanitiesCraft/research-mission-control" in citation
    assert "license:\n  - MIT\n  - CC-BY-4.0" in citation


def test_release_version_and_generated_sha_evidence_are_coherent() -> None:
    project = tomllib.loads((ROOT / "pyproject.toml").read_text(encoding="utf-8"))
    declared = json.loads((ROOT / "release-metadata.json").read_text(encoding="utf-8"))
    assert project["project"]["version"] == "0.9.0rc3"
    assert declared["version"] == project["project"]["version"]
    assert declared["status"] == "release-candidate"
    assert declared["repository"] == "https://github.com/DigitalHumanitiesCraft/research-mission-control"

    with _temporary_release_target() as target:
        MODULE.build(target, draft=True)
        built = json.loads((target / "release-metadata.json").read_text(encoding="utf-8"))
        assert built["version"] == "0.9.0rc3"
        assert built["source_commit"] is None or len(built["source_commit"]) == 40
        assert built["source_dirty"] is None or isinstance(built["source_dirty"], bool)
        assert len(built["publication_manifest_sha256"]) == 64

        for relative in ("index.html", "release-metadata.json", "SHA256SUMS"):
            assert b"\r\n" not in (target / relative).read_bytes(), f"generated file is not LF-normalized: {relative}"

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
        commonjs = temporary_target / "leak.cjs"
        template.write_text("path = /" + "home/example/private\n", encoding="utf-8")
        toml.write_text('path = "C:/Use' + 'rs/example/private"\n', encoding="utf-8")
        commonjs.write_text("path = /" + "home/example/private\n", encoding="utf-8")
        with ASSERTIONS.assertRaisesRegex(RuntimeError, "leak.cjs"):
            MODULE._check_content([commonjs])
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


def test_draft_bundle_delivers_both_license_texts() -> None:
    # Licence delivery is shared by draft and release builds; source cleanliness has separate tests.
    with _temporary_release_target() as target:
        MODULE.build(target, draft=True)
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


def test_existing_git_state_is_preserved_before_replacing_a_generated_target() -> None:
    with _temporary_release_target() as target:
        target.mkdir()
        git_state = target / ".git"
        git_state.mkdir()
        sentinel = git_state / "HEAD"
        sentinel.write_text("ref: refs/heads/example\n", encoding="utf-8")
        original = target / "keep.txt"
        original.write_text("Existing checkout content\n", encoding="utf-8")
        with ASSERTIONS.assertRaisesRegex(RuntimeError, "contains Git state"):
            MODULE.build(target, draft=True)
        assert sentinel.read_text(encoding="utf-8") == "ref: refs/heads/example\n"
        assert original.read_text(encoding="utf-8") == "Existing checkout content\n"


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


def _pin_demo_fixture(root: Path) -> None:
    """Pin only the two deliberately synthetic transport fixture members."""
    files = []
    for name, license_id in (("index.html", "MIT"), ("demo-release.json", "CC-BY-4.0")):
        data = (root / "demo" / name).read_bytes()
        files.append(
            {"file": name, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(), "license": license_id}
        )
    payload = {"schema": "mission-control-demo-export-1", "coverage": "synthetic-all-view-candidate", "files": files}
    _write_demo_pin(root, payload)


def _write_demo_pin(root: Path, payload: dict[str, object]) -> None:
    data = json.dumps(payload).encode()
    (root / "demo-export-manifest.json").write_bytes(data)
    (root / "demo" / "export-manifest.json").write_bytes(data)
    metadata = {
        "demo_source_commit": "a" * 40,
        "demo_export_manifest_sha256": hashlib.sha256(data).hexdigest(),
    }
    (root / "release-metadata.json").write_text(json.dumps(metadata), encoding="utf-8")


@contextmanager
def _demo_fixture() -> Iterator[tuple[Path, dict[str, object]]]:
    """Provide a minimal staged package; no private UI source or data is copied."""
    with tempfile.TemporaryDirectory() as temporary_directory:
        root = Path(temporary_directory)
        (root / "demo").mkdir()
        (root / "demo" / "index.html").write_text("<main>Example</main>", encoding="utf-8")
        release = {
            "schema": "mission-control-demo-release-1",
            "version": "0.9.0rc3",
            "status": "release-candidate",
            "sourceCommit": "a" * 40,
            "sourceDirty": False,
        }
        (root / "demo" / "demo-release.json").write_text(json.dumps(release), encoding="utf-8")
        (root / "pyproject.toml").write_text('[project]\nversion = "0.9.0rc3"\n', encoding="utf-8")
        _pin_demo_fixture(root)
        manifest = {
            "include": [
                "demo-export-manifest.json",
                "demo/index.html",
                "demo/demo-release.json",
                "demo/export-manifest.json",
            ],
            "license_rules": {
                "MIT": {"files": ["demo/index.html"], "directories": []},
                "CC-BY-4.0": {
                    "files": ["demo-export-manifest.json", "demo/demo-release.json", "demo/export-manifest.json"],
                    "directories": [],
                },
            },
            "generated_licenses": {"downloads/research-mission-control.skill": "MIT", "SHA256SUMS": "CC-BY-4.0"},
        }
        with mock.patch.object(MODULE, "ROOT", root):
            yield root, manifest


def test_demo_exact_package_and_clean_source_are_accepted() -> None:
    with _demo_fixture() as (root, manifest):
        sources = MODULE._resolve_sources(manifest, draft=False)
        assert {path.relative_to(root).as_posix() for path in sources} == set(manifest["include"])


def test_demo_rejects_noncanonical_publication_paths() -> None:
    with _demo_fixture() as (_, manifest):
        manifest["include"][1] = "Demo/index.html"
        manifest["license_rules"]["MIT"]["files"] = ["Demo/index.html"]
        with ASSERTIONS.assertRaisesRegex(RuntimeError, "canonical demo/ paths"):
            MODULE._check_demo_export(manifest, draft=True)


def test_demo_rejects_changed_bytes_and_manifest() -> None:
    with _demo_fixture() as (root, manifest):
        (root / "demo" / "index.html").write_text("<main>Changed</main>", encoding="utf-8")
        with ASSERTIONS.assertRaisesRegex(RuntimeError, "bytes do not match"):
            MODULE._resolve_sources(manifest)
    with _demo_fixture() as (root, manifest):
        path = root / "demo" / "export-manifest.json"
        path.write_bytes(path.read_bytes() + b"\n")
        with ASSERTIONS.assertRaisesRegex(RuntimeError, "differs from the committed pin"):
            MODULE._resolve_sources(manifest)


def test_demo_rejects_extra_missing_and_unlisted_members() -> None:
    with _demo_fixture() as (root, manifest):
        (root / "demo" / "extra.txt").write_text("Undeclared", encoding="utf-8")
        with ASSERTIONS.assertRaisesRegex(RuntimeError, "extra or missing"):
            MODULE._resolve_sources(manifest)
    with _demo_fixture() as (root, manifest):
        (root / "demo" / "index.html").unlink()
        with ASSERTIONS.assertRaisesRegex(RuntimeError, "not a source file"):
            MODULE._resolve_sources(manifest)
    with _demo_fixture() as (_, manifest):
        manifest["include"].remove("demo/index.html")
        with ASSERTIONS.assertRaisesRegex(RuntimeError, "exactly match"):
            MODULE._resolve_sources(manifest)
    with _demo_fixture() as (_, manifest):
        manifest["include"].remove("demo-export-manifest.json")
        with ASSERTIONS.assertRaisesRegex(RuntimeError, "include the demo export manifest pin"):
            MODULE._resolve_sources(manifest)


def test_demo_rejects_unsafe_names_duplicates_and_invalid_schema() -> None:
    for name in ("../escape.js", "/escape.js", "C:/escape.js", "a\\escape.js", "./index.html", "."):
        with _demo_fixture() as (root, manifest):
            payload = json.loads((root / "demo-export-manifest.json").read_bytes())
            payload["files"][0]["file"] = name
            _write_demo_pin(root, payload)
            with ASSERTIONS.assertRaisesRegex(RuntimeError, "safe relative path"):
                MODULE._resolve_sources(manifest)
    with _demo_fixture() as (root, manifest):
        payload = json.loads((root / "demo-export-manifest.json").read_bytes())
        payload["files"].append(payload["files"][0])
        _write_demo_pin(root, payload)
        with ASSERTIONS.assertRaisesRegex(RuntimeError, "Duplicate demo"):
            MODULE._resolve_sources(manifest)
    with _demo_fixture() as (root, manifest):
        payload = json.loads((root / "demo-export-manifest.json").read_bytes())
        payload["schema"] = "unknown"
        _write_demo_pin(root, payload)
        with ASSERTIONS.assertRaisesRegex(RuntimeError, "manifest schema"):
            MODULE._resolve_sources(manifest)
    with _demo_fixture() as (root, manifest):
        payload = json.loads((root / "demo-export-manifest.json").read_bytes())
        payload["files"][0]["bytes"] = True
        _write_demo_pin(root, payload)
        with ASSERTIONS.assertRaisesRegex(RuntimeError, "Invalid demo export evidence"):
            MODULE._resolve_sources(manifest)


def test_demo_rejects_different_publication_license() -> None:
    with _demo_fixture() as (_, manifest):
        manifest["license_rules"]["MIT"]["files"].remove("demo/index.html")
        manifest["license_rules"]["CC-BY-4.0"]["files"].append("demo/index.html")
        with ASSERTIONS.assertRaisesRegex(RuntimeError, "licence differs from the pin"):
            MODULE._resolve_sources(manifest)


def test_demo_rejects_symlink_even_to_another_pinned_file() -> None:
    with _demo_fixture() as (root, manifest):
        path = root / "demo" / "index.html"
        path.unlink()
        try:
            path.symlink_to(root / "demo" / "demo-release.json")
        except OSError as error:
            raise unittest.SkipTest(f"Symlink creation unavailable: {error}") from error
        with ASSERTIONS.assertRaisesRegex(RuntimeError, "symlinks or junctions"):
            MODULE._resolve_sources(manifest)


def test_demo_dirty_source_is_draft_only_without_rewriting_provenance() -> None:
    with _demo_fixture() as (root, manifest):
        path = root / "demo" / "demo-release.json"
        release = json.loads(path.read_bytes())
        release["sourceDirty"] = True
        path.write_text(json.dumps(release), encoding="utf-8")
        _pin_demo_fixture(root)
        before = path.read_bytes()
        MODULE._resolve_sources(manifest, draft=True)
        assert path.read_bytes() == before
        with ASSERTIONS.assertRaisesRegex(RuntimeError, "demo source worktree is dirty"):
            MODULE._resolve_sources(manifest, draft=False)


def test_demo_requires_matching_source_commit_manifest_digest_and_version() -> None:
    for field, value in (("sourceCommit", "unknown"), ("sourceCommit", "b" * 40), ("version", "0.9.0rc2")):
        with _demo_fixture() as (root, manifest):
            path = root / "demo" / "demo-release.json"
            payload = json.loads(path.read_bytes())
            payload[field] = value
            path.write_text(json.dumps(payload), encoding="utf-8")
            _pin_demo_fixture(root)
            with ASSERTIONS.assertRaisesRegex(RuntimeError, "provenance or version|metadata must match"):
                MODULE._resolve_sources(manifest)
    with _demo_fixture() as (root, manifest):
        path = root / "release-metadata.json"
        metadata = json.loads(path.read_bytes())
        metadata["demo_export_manifest_sha256"] = "0" * 64
        path.write_text(json.dumps(metadata), encoding="utf-8")
        with ASSERTIONS.assertRaisesRegex(RuntimeError, "metadata must match"):
            MODULE._resolve_sources(manifest)


def test_font_and_brand_assets_keep_their_own_exact_license_assignments() -> None:
    manifest = json.loads((ROOT / "publication-manifest.json").read_text(encoding="utf-8"))
    sources = MODULE._resolve_sources(manifest, draft=True)
    selected = {source.relative_to(ROOT).as_posix() for source in sources}
    font_rule = manifest["license_rules"]["OFL-1.1"]
    expected_fonts = {
        "assets/fonts/sora-latin-700-normal.woff2",
        "assets/fonts/instrument-sans-latin-400-normal.woff2",
        "assets/fonts/instrument-sans-latin-600-normal.woff2",
        "assets/fonts/Sora-LICENSE.txt",
        "assets/fonts/Instrument-Sans-LICENSE.txt",
    }
    assert set(font_rule["files"]) == expected_fonts
    assert expected_fonts <= selected
    for name in ("Sora-LICENSE.txt", "Instrument-Sans-LICENSE.txt"):
        notice = (ROOT / "assets" / "fonts" / name).read_text(encoding="utf-8")
        assert "SIL OPEN FONT LICENSE Version 1.1" in notice
        assert "Copyright" in notice
    assert set(manifest["license_rules"]["LicenseRef-DHCraft-Brand"]["files"]) == {
        "assets/dhcraft-mark-192.png",
        "assets/favicon.ico",
        "assets/dhcraft-watercolor-192.png",
        "LICENSES/DHCraft-Brand.txt",
    }
    assert "All rights reserved" in (ROOT / "LICENSES" / "DHCraft-Brand.txt").read_text(encoding="utf-8")
    assert "assets/" not in manifest["license_rules"]["CC-BY-4.0"]["directories"]


def test_unsupported_asset_license_cannot_bypass_the_exact_assignment_gate() -> None:
    manifest = json.loads((ROOT / "publication-manifest.json").read_text(encoding="utf-8"))
    manifest["license_rules"]["unsupported"] = {"files": ["site.css"], "directories": []}
    with ASSERTIONS.assertRaisesRegex(RuntimeError, "only supported asset licenses"):
        MODULE._check_license_assignments(manifest, [Path("site.css")])


if __name__ == "__main__":
    tests = [
        unittest.FunctionTestCase(function) for name, function in sorted(globals().items()) if name.startswith("test_")
    ]
    raise SystemExit(not unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite(tests)).wasSuccessful())
