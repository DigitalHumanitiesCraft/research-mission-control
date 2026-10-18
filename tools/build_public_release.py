"""Build the publication-safe Research Mission Control source bundle.

The working repository also carries an internal portfolio dashboard. Public
artifacts therefore come from an explicit allowlist, receive one checked SPDX
licence assignment, and pass a content scan. The bundle records the source
commit when available and SHA-256 hashes for every distributed file.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
import tempfile
import tomllib
import zipfile
from pathlib import Path, PurePosixPath
from urllib.parse import unquote, urlsplit

if __package__:
    from .build_web_docs import build as build_web_docs
else:
    from build_web_docs import build as build_web_docs

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_TARGET = ROOT / "dist" / "public"
MANIFEST_PATH = ROOT / "publication-manifest.json"
FORBIDDEN_TEXT = (
    "C:" + "/Use" + "rs/",
    "C:" + "\\Users\\",
    "Downloads/" + "wiorking",
    "/Use" + "rs/",
    "/ho" + "me/",
)
TEXT_SUFFIXES = {
    ".cjs",
    ".cff",
    ".css",
    ".html",
    ".js",
    ".json",
    ".lock",
    ".md",
    ".py",
    ".tmpl",
    ".toml",
    ".txt",
    ".yaml",
    ".yml",
}
SKILL_ROOT = Path("skills/research-mission-control")
SKILL_PACKAGE = Path("downloads/research-mission-control.skill")
CHECKSUMS_PATH = Path("SHA256SUMS")
RELEASE_METADATA_PATH = Path("release-metadata.json")
ZIP_TIMESTAMP = (1980, 1, 1, 0, 0, 0)
REQUIRED_LICENSES = frozenset({"MIT", "CC-BY-4.0"})
SUPPORTED_LICENSES = REQUIRED_LICENSES | {"OFL-1.1", "LicenseRef-DHCraft-Brand"}
SOURCE_ONLY_FILES = {
    Path("knowledge/handoff.md"),
    Path("knowledge/journal.md"),
    Path("knowledge/specification.md"),
}


def _load_manifest(path: Path) -> dict[str, object]:
    try:
        manifest = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as error:
        raise RuntimeError(f"Publication manifest missing: {path}") from error
    except json.JSONDecodeError as error:
        raise RuntimeError(f"Publication manifest is invalid JSON: {error}") from error

    if not isinstance(manifest.get("include"), list):
        raise RuntimeError("Publication manifest needs an 'include' list")
    return manifest


def _resolve_sources(manifest: dict[str, object], *, draft: bool = True) -> list[Path]:
    sources: set[Path] = set()
    excluded_roots = manifest.get("excluded_runtime_state", [])
    if not isinstance(excluded_roots, list) or not all(isinstance(root, str) for root in excluded_roots):
        raise RuntimeError("Publication manifest needs an 'excluded_runtime_state' string list")
    excluded_root_names = {root.rstrip("/") for root in excluded_roots}
    raw_includes = manifest["include"]
    if not all(isinstance(entry, str) and entry.strip() for entry in raw_includes):
        raise RuntimeError("Every publication include entry must be a non-empty string")
    if len(raw_includes) != len(set(raw_includes)):
        raise RuntimeError("Publication includes must not contain duplicates")
    for raw_entry in raw_includes:
        if any(character in raw_entry for character in "*?["):
            raise RuntimeError(f"Publication includes must name exact files: {raw_entry}")
        relative = Path(raw_entry)
        if relative.is_absolute() or ".." in relative.parts:
            raise RuntimeError(f"Publication includes must remain relative to the repository: {raw_entry}")
        if relative in SOURCE_ONLY_FILES or (relative.parts and relative.parts[0] in excluded_root_names):
            raise RuntimeError(f"Publication include crosses the source-only boundary: {raw_entry}")
        match = ROOT / raw_entry
        if not match.is_file():
            raise RuntimeError(f"Publication include is not a source file: {raw_entry}")
        try:
            match.resolve().relative_to(ROOT.resolve())
        except ValueError as error:
            raise RuntimeError(f"Publication include resolves outside the repository: {raw_entry}") from error
        if ".git" not in match.parts and "__pycache__" not in match.parts:
            sources.add(match)
    resolved = sorted(sources)
    _check_license_assignments(manifest, [source.relative_to(ROOT) for source in resolved])
    _check_demo_export(manifest, draft=draft)
    return resolved


def _check_license_assignments(manifest: dict[str, object], paths: list[Path]) -> None:
    """Require one unambiguous SPDX licence assignment per bundle path."""
    rules = manifest.get("license_rules")
    if (
        not isinstance(rules, dict)
        or not REQUIRED_LICENSES.issubset(rules)
        or not set(rules).issubset(SUPPORTED_LICENSES)
    ):
        raise RuntimeError("Publication manifest needs MIT and CC-BY-4.0 rules and only supported asset licenses")

    parsed_rules: dict[str, tuple[set[str], tuple[str, ...]]] = {}
    for license_id, raw_rule in rules.items():
        if not isinstance(raw_rule, dict):
            raise RuntimeError(f"License rule {license_id} must be an object")
        files = raw_rule.get("files")
        directories = raw_rule.get("directories")
        if not isinstance(files, list) or not all(isinstance(path, str) for path in files):
            raise RuntimeError(f"License rule {license_id} needs a string file list")
        if not isinstance(directories, list) or not all(isinstance(path, str) for path in directories):
            raise RuntimeError(f"License rule {license_id} needs a string directory list")
        if any(not directory.endswith("/") for directory in directories):
            raise RuntimeError(f"License rule {license_id} directories must end with '/'")
        parsed_rules[license_id] = (set(files), tuple(directories))

    findings = []
    for path in paths:
        portable = path.as_posix()
        matches = [
            license_id
            for license_id, (files, directories) in parsed_rules.items()
            if portable in files or portable.startswith(directories)
        ]
        if len(matches) != 1:
            findings.append(f"{portable}: expected one licence, found {matches or 'none'}")

    generated = manifest.get("generated_licenses")
    expected_generated = {
        SKILL_PACKAGE.as_posix(): "MIT",
        CHECKSUMS_PATH.as_posix(): "CC-BY-4.0",
    }
    if "web-docs/documents.json" in manifest["include"]:
        docs = json.loads((ROOT / "web-docs/documents.json").read_text(encoding="utf-8"))
        if not isinstance(docs, list) or not docs:
            raise RuntimeError("Web document selection must be a nonempty list")
        for document in docs:
            if not isinstance(document, dict) or not isinstance(document.get("path"), str):
                raise RuntimeError("Web document selection needs explicit source paths")
            source = document["path"]
            matches = [
                license_id
                for license_id, (files, directories) in parsed_rules.items()
                if source in files or source.startswith(directories)
            ]
            if len(matches) != 1 or source not in manifest["include"]:
                raise RuntimeError("Web document source must be licensed and publication-approved")
            expected_generated["docs/" + str(PurePosixPath(source).with_suffix(".html"))] = matches[0]
        expected_generated.update({"docs/docs.css": "CC-BY-4.0", "docs/build-report.json": "CC-BY-4.0"})
    if generated != expected_generated:
        findings.append("generated_licenses must assign the skill to MIT and SHA256SUMS to CC-BY-4.0")

    if findings:
        details = "\n".join(f"- {finding}" for finding in findings)
        raise RuntimeError(f"Publication licence assignment failed:\n{details}")


def _read_demo_json(path: Path) -> dict[str, object]:
    try:
        payload = json.loads(path.read_bytes())
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as error:
        raise RuntimeError(f"Cannot read demo JSON {path.name}: {error}") from error
    if not isinstance(payload, dict):
        raise RuntimeError(f"Demo JSON must be an object: {path.name}")
    return payload


def _check_demo_export(manifest: dict[str, object], *, draft: bool) -> None:
    """Validate staged demo bytes without expanding the publication allowlist."""
    includes = manifest["include"]
    demo_includes = [entry for entry in includes if Path(entry).parts[0].casefold() == "demo"]
    if any(not entry.startswith("demo/") or Path(entry).as_posix() != entry for entry in demo_includes):
        raise RuntimeError("Demo publication includes must use canonical demo/ paths")
    declared = {entry.removeprefix("demo/") for entry in demo_includes}
    if not declared:
        return
    pin_path = ROOT / "demo-export-manifest.json"
    demo_root = ROOT / "demo"
    # A directory junction can escape the tree even when its children are regular files.
    for path in (pin_path, demo_root, demo_root / "export-manifest.json"):
        if path.is_symlink() or getattr(path, "is_junction", lambda: False)():
            raise RuntimeError("Demo package must not contain symlinks or junctions")
    try:
        pin_bytes = pin_path.read_bytes()
        if (demo_root / "export-manifest.json").read_bytes() != pin_bytes:
            raise RuntimeError("Demo export manifest differs from the committed pin")
    except OSError as error:
        raise RuntimeError(f"Demo export manifest or pin missing: {error}") from error
    if "demo-export-manifest.json" not in includes:
        raise RuntimeError("Publication must include the demo export manifest pin")
    pin = _read_demo_json(pin_path)
    if (
        set(pin) != {"schema", "coverage", "files"}
        or pin["schema"] != "mission-control-demo-export-1"
        or pin["coverage"] != "synthetic-all-view-candidate"
        or not isinstance(pin["files"], list)
        or not pin["files"]
    ):
        raise RuntimeError("Invalid demo export manifest schema")
    members = {}
    folded_names = set()
    for entry in pin["files"]:
        if not isinstance(entry, dict) or set(entry) != {"file", "sha256", "bytes", "license"}:
            raise RuntimeError("Invalid demo export file schema")
        name = entry["file"]
        if (
            not isinstance(name, str)
            or not re.fullmatch(r"[\w./-]+", name, flags=re.ASCII)
            or PurePosixPath(name).is_absolute()
            or PurePosixPath(name).as_posix() != name
            or any(part in {"..", ".git", "__pycache__"} for part in PurePosixPath(name).parts)
            or name in {".", "export-manifest.json"}
        ):
            raise RuntimeError("Demo export file must be a safe relative path")
        if name.casefold() in folded_names:
            raise RuntimeError("Duplicate demo export file")
        folded_names.add(name.casefold())
        if (
            not isinstance(entry["sha256"], str)
            or not re.fullmatch(r"[0-9a-f]{64}", entry["sha256"])
            or type(entry["bytes"]) is not int
            or entry["bytes"] < 0
            or not isinstance(entry["license"], str)
            or entry["license"] not in SUPPORTED_LICENSES
        ):
            raise RuntimeError(f"Invalid demo export evidence: {name}")
        members[name] = entry
    expected = set(members) | {"export-manifest.json"}
    if declared != expected:
        raise RuntimeError("Demo publication includes must exactly match the pinned files and export manifest")
    physical = set()
    for path in demo_root.rglob("*"):
        if path.is_symlink() or getattr(path, "is_junction", lambda: False)():
            raise RuntimeError("Demo package must not contain symlinks or junctions")
        try:
            path.resolve().relative_to(demo_root.resolve())
        except ValueError as error:
            raise RuntimeError("Demo file resolves outside the package") from error
        if path.is_file():
            physical.add(path.relative_to(demo_root).as_posix())
    if physical != expected:
        raise RuntimeError("Demo package has extra or missing files")
    for name, entry in members.items():
        data = (demo_root / name).read_bytes()
        if len(data) != entry["bytes"] or hashlib.sha256(data).hexdigest() != entry["sha256"]:
            raise RuntimeError(f"Demo file bytes do not match the pin: {name}")
        portable = f"demo/{name}"
        rules = manifest["license_rules"]
        matches = [
            license_id
            for license_id, rule in rules.items()
            if portable in rule["files"] or portable.startswith(tuple(rule["directories"]))
        ]
        if matches != [entry["license"]]:
            raise RuntimeError(f"Demo licence differs from the pin: {name}")
    release = _read_demo_json(demo_root / "demo-release.json")
    metadata = _read_demo_json(ROOT / RELEASE_METADATA_PATH)
    commit = release.get("sourceCommit")
    if (
        release.get("schema") != "mission-control-demo-release-1"
        or release.get("version") != _project_version()
        or release.get("status") != "release-candidate"
        or not isinstance(commit, str)
        or not re.fullmatch(r"[0-9a-f]{40}", commit)
        or type(release.get("sourceDirty")) is not bool
    ):
        raise RuntimeError("Invalid demo release source provenance or version")
    if (
        metadata.get("demo_source_commit") != commit
        or metadata.get("demo_export_manifest_sha256") != hashlib.sha256(pin_bytes).hexdigest()
    ):
        raise RuntimeError("Release metadata must match the pinned demo source and export manifest")
    if not draft and release["sourceDirty"]:
        raise RuntimeError("Public release blocked: demo source worktree is dirty")


def _check_content(sources: list[Path]) -> None:
    findings: list[str] = []
    for source in sources:
        if source.suffix.lower() not in TEXT_SUFFIXES:
            continue
        text = source.read_text(encoding="utf-8")
        for line_number, line in enumerate(text.splitlines(), start=1):
            for forbidden in FORBIDDEN_TEXT:
                if forbidden.casefold() in line.casefold():
                    findings.append(f"{source.relative_to(ROOT)}:{line_number} contains {forbidden!r}")
    if findings:
        details = "\n".join(f"- {finding}" for finding in findings)
        raise RuntimeError(f"Publication boundary failed:\n{details}")


def _check_target(target: Path) -> Path:
    release_root = (ROOT / "dist").resolve()
    resolved_target = target.resolve()
    if resolved_target == release_root or release_root not in resolved_target.parents:
        raise RuntimeError("Publication target must remain inside the reserved dist directory")
    if (resolved_target / ".git").exists():
        raise RuntimeError("Publication target contains Git state; use a fresh generated directory")
    return resolved_target


def _project_version() -> str:
    payload = tomllib.loads((ROOT / "pyproject.toml").read_text(encoding="utf-8"))
    try:
        version = payload["project"]["version"]
    except (KeyError, TypeError) as error:
        raise RuntimeError("pyproject.toml needs project.version") from error
    if not isinstance(version, str) or not version:
        raise RuntimeError("pyproject.toml project.version must be a non-empty string")
    return version


def _citation_version() -> str:
    for line in (ROOT / "CITATION.cff").read_text(encoding="utf-8").splitlines():
        if line.startswith("version:"):
            version = line.partition(":")[2].strip()
            if version:
                return version
    raise RuntimeError("CITATION.cff needs a top-level version")


def _git_state() -> tuple[str | None, bool | None]:
    """Return source provenance when the builder runs inside a Git worktree."""
    if not (ROOT / ".git").exists():
        return None, None
    try:
        commit = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=ROOT,
            check=True,
            capture_output=True,
            text=True,
        ).stdout.strip()
        status = subprocess.run(
            ["git", "status", "--porcelain", "--untracked-files=all"],
            cwd=ROOT,
            check=True,
            capture_output=True,
            text=True,
        ).stdout
    except (OSError, subprocess.CalledProcessError) as error:
        raise RuntimeError(f"Cannot inspect Git source state: {error}") from error
    return commit, bool(status.strip())


def _write_release_metadata(
    bundle_root: Path,
    source_commit: str | None,
    source_dirty: bool | None,
) -> None:
    """Bind the declared release candidate to local source provenance."""
    path = bundle_root / RELEASE_METADATA_PATH
    payload = json.loads(path.read_text(encoding="utf-8"))
    version = _project_version()
    if payload.get("version") != version:
        raise RuntimeError("release-metadata.json version must match pyproject.toml")
    if _citation_version() != version:
        raise RuntimeError("CITATION.cff version must match pyproject.toml")
    if payload.get("status") != "release-candidate":
        raise RuntimeError("Release status must be release-candidate")

    payload["source_commit"] = source_commit
    payload["source_dirty"] = source_dirty
    payload["publication_manifest_sha256"] = hashlib.sha256(MANIFEST_PATH.read_bytes()).hexdigest()
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")


def _write_checksums(bundle_root: Path) -> None:
    """Write deterministic SHA-256 evidence for every other bundle file."""
    lines = []
    for path in sorted(bundle_root.rglob("*")):
        if not path.is_file() or path.relative_to(bundle_root) == CHECKSUMS_PATH:
            continue
        relative = path.relative_to(bundle_root).as_posix()
        lines.append(f"{hashlib.sha256(path.read_bytes()).hexdigest()}  {relative}")
    (bundle_root / CHECKSUMS_PATH).write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")


def _package_skill(bundle_root: Path, copied: list[Path]) -> Path:
    """Create a deterministic skill archive from the copied source directory."""
    skill_sources = sorted(path for path in copied if path == SKILL_ROOT / "SKILL.md" or SKILL_ROOT in path.parents)
    if SKILL_ROOT / "SKILL.md" not in skill_sources:
        raise RuntimeError("Skill package source is incomplete: SKILL.md is missing")
    license_source = bundle_root / "LICENSES" / "MIT.txt"
    if not license_source.is_file():
        raise RuntimeError("Skill package source is incomplete: MIT licence text is missing")

    package_path = bundle_root / SKILL_PACKAGE
    package_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(package_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for relative in skill_sources:
            source = bundle_root / relative
            archive_name = Path("research-mission-control") / relative.relative_to(SKILL_ROOT)
            info = zipfile.ZipInfo(archive_name.as_posix(), date_time=ZIP_TIMESTAMP)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = (0o100644 & 0xFFFF) << 16
            archive.writestr(info, source.read_bytes())
        license_info = zipfile.ZipInfo("research-mission-control/LICENSE.txt", date_time=ZIP_TIMESTAMP)
        license_info.compress_type = zipfile.ZIP_DEFLATED
        license_info.external_attr = (0o100644 & 0xFFFF) << 16
        archive.writestr(license_info, license_source.read_bytes())
    return SKILL_PACKAGE


def _activate_release_links(bundle_root: Path) -> None:
    """Expose links whose generated targets exist only inside a built bundle."""
    index_path = bundle_root / "index.html"
    source = index_path.read_text(encoding="utf-8")
    release_marker = "data-release-package-link hidden"
    source_marker = "data-source-package-link"
    hidden_source_marker = "data-source-package-link hidden"
    inactive_release_count = source.count(release_marker)
    total_release_count = source.count("data-release-package-link")
    total_source_count = source.count(source_marker)
    hidden_source_count = source.count(hidden_source_marker)
    if (
        inactive_release_count == 1
        and total_release_count == 1
        and total_source_count == 1
        and hidden_source_count == 0
    ):
        index_path.write_text(
            source.replace(release_marker, "data-release-package-link").replace(source_marker, hidden_source_marker),
            encoding="utf-8",
            newline="\n",
        )
        return
    if (
        inactive_release_count == 0
        and total_release_count == 1
        and total_source_count == 1
        and hidden_source_count == 1
        and (bundle_root / SKILL_PACKAGE).is_file()
    ):
        return
    raise RuntimeError("Publication interface needs one coherent source and bundle skill package link")


def _check_bundle_links(bundle_root: Path) -> None:
    """Reject local HTML and Markdown links that leave or miss the bundle."""
    import re

    html_pattern = re.compile(r"(?:href|src)=[\"']([^\"']+)[\"']", re.IGNORECASE)
    markdown_pattern = re.compile(r"!?\[[^\]]*\]\(([^)]+)\)")
    findings: list[str] = []

    for source in sorted(bundle_root.rglob("*")):
        if not source.is_file() or source.suffix.lower() not in {".html", ".md"}:
            continue
        text = source.read_text(encoding="utf-8")
        raw_links = html_pattern.findall(text) if source.suffix.lower() == ".html" else markdown_pattern.findall(text)
        for raw_link in raw_links:
            link = raw_link.strip().strip("<>").split(maxsplit=1)[0]
            parsed = urlsplit(link)
            if parsed.scheme or parsed.netloc or not parsed.path:
                continue
            relative_path = unquote(parsed.path)
            candidate = (source.parent / relative_path).resolve()
            try:
                candidate.relative_to(bundle_root.resolve())
            except ValueError:
                findings.append(f"{source.relative_to(bundle_root)} escapes bundle: {link}")
                continue
            if not candidate.exists():
                findings.append(f"{source.relative_to(bundle_root)} misses target: {link}")

    if findings:
        details = "\n".join(f"- {finding}" for finding in findings)
        raise RuntimeError(f"Publication link check failed:\n{details}")


def build(target: Path, *, draft: bool = False) -> list[Path]:
    """Create an atomically replaced public bundle and return copied paths."""
    resolved_target = _check_target(target)
    if not draft and not (ROOT / "LICENSE").is_file():
        raise RuntimeError("Public release blocked: a human-approved LICENSE is missing")
    source_commit, source_dirty = _git_state()
    if not draft and source_commit is None:
        raise RuntimeError("Public release blocked: source commit is unavailable")
    if not draft and source_dirty:
        raise RuntimeError("Public release blocked: source worktree is dirty")

    sources = _resolve_sources(_load_manifest(MANIFEST_PATH), draft=draft)
    _check_content(sources)
    resolved_target.parent.mkdir(parents=True, exist_ok=True)

    temp_dir = Path(tempfile.mkdtemp(prefix="public-release-", dir=resolved_target.parent))
    try:
        copied: list[Path] = []
        for source in sources:
            relative = source.relative_to(ROOT)
            destination = temp_dir / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, destination)
            copied.append(relative)

        copied.append(_package_skill(temp_dir, copied))
        _activate_release_links(temp_dir)
        _write_release_metadata(temp_dir, source_commit, source_dirty)
        if Path("web-docs/documents.json") in copied:
            documents = json.loads((temp_dir / "web-docs/documents.json").read_text(encoding="utf-8"))
            generated_docs = build_web_docs(
                temp_dir,
                [path.as_posix() for path in copied if path != SKILL_PACKAGE],
                documents,
                temp_dir / "web-docs",
            )
            copied.extend(Path(name) for name in generated_docs)
            _check_content([temp_dir / name for name in generated_docs])
        _check_bundle_links(temp_dir)
        _write_checksums(temp_dir)
        copied.append(CHECKSUMS_PATH)

        if resolved_target.exists():
            shutil.rmtree(resolved_target)
        temp_dir.replace(resolved_target)
        return copied
    except Exception:
        if temp_dir.exists():
            shutil.rmtree(temp_dir)
        raise


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--target", type=Path, default=DEFAULT_TARGET)
    parser.add_argument(
        "--draft",
        action="store_true",
        help="build a local review bundle without asserting publication authorization",
    )
    args = parser.parse_args()

    try:
        copied = build(args.target, draft=args.draft)
    except (RuntimeError, ValueError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1

    print(f"OK: copied {len(copied)} files to {args.target}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
