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
import shutil
import subprocess
import sys
import tempfile
import tomllib
import zipfile
from pathlib import Path
from urllib.parse import unquote, urlsplit

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
TEXT_SUFFIXES = {".cff", ".css", ".html", ".js", ".json", ".md", ".py", ".tmpl", ".toml", ".txt", ".yaml", ".yml"}
SKILL_ROOT = Path("skills/research-mission-control")
SKILL_PACKAGE = Path("downloads/research-mission-control.skill")
CHECKSUMS_PATH = Path("SHA256SUMS")
RELEASE_METADATA_PATH = Path("release-metadata.json")
ZIP_TIMESTAMP = (1980, 1, 1, 0, 0, 0)
SUPPORTED_LICENSES = frozenset({"MIT", "CC-BY-4.0"})
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


def _resolve_sources(manifest: dict[str, object]) -> list[Path]:
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
    return resolved


def _check_license_assignments(manifest: dict[str, object], paths: list[Path]) -> None:
    """Require one unambiguous SPDX licence assignment per bundle path."""
    rules = manifest.get("license_rules")
    if not isinstance(rules, dict) or set(rules) != SUPPORTED_LICENSES:
        raise RuntimeError("Publication manifest needs MIT and CC-BY-4.0 license rules")

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
    if generated != expected_generated:
        findings.append("generated_licenses must assign the skill to MIT and SHA256SUMS to CC-BY-4.0")

    if findings:
        details = "\n".join(f"- {finding}" for finding in findings)
        raise RuntimeError(f"Publication licence assignment failed:\n{details}")


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
    marker = "data-release-package-link hidden"
    inactive_count = source.count(marker)
    total_count = source.count("data-release-package-link")
    if inactive_count == 2 and total_count == 2:
        index_path.write_text(
            source.replace(marker, "data-release-package-link"),
            encoding="utf-8",
            newline="\n",
        )
        return
    if inactive_count == 0 and total_count == 2 and (bundle_root / SKILL_PACKAGE).is_file():
        return
    raise RuntimeError("Publication interface needs exactly two coherent skill package links")


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

    sources = _resolve_sources(_load_manifest(MANIFEST_PATH))
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
    except RuntimeError as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1

    print(f"OK: copied {len(copied)} files to {args.target}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
