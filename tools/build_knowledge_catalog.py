"""Build a read-only UI catalog from explicitly selected local Markdown files.

Run this standard-library script pipeline with --config and a new --target.
The existing second-brain-coverage-1 UI contract is preserved. Source roots
and file selection are configuration, not an Obsidian directory convention.
No scanning, source writes, network calls or publication occur. See
knowledge/knowledge-adapters.md for the integration and authority boundary.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath

SCHEMA = "rmc-knowledge-sources-1"
ID = re.compile(r"[a-z][a-z0-9-]{0,95}\Z")
MAX_SOURCE_BYTES = 5 * 1024 * 1024


def _object(value: object, required: set[str], optional: set[str], label: str) -> dict:
    if not isinstance(value, dict) or not required <= value.keys() or value.keys() - required - optional:
        raise ValueError(f"{label}: expected required keys {sorted(required)} and optional keys {sorted(optional)}")
    return value


def _text(value: object, label: str) -> str:
    if not isinstance(value, str) or not value.strip() or "\x00" in value:
        raise ValueError(f"{label}: expected non-empty text without NUL")
    return value


def _identifier(value: object, label: str) -> str:
    result = _text(value, label)
    if not ID.fullmatch(result):
        raise ValueError(f"{label}: use a lowercase letter followed by lowercase letters, digits or hyphens")
    return result


def _strings(value: object, label: str) -> list[str]:
    if not isinstance(value, list) or not all(isinstance(item, str) and item.strip() for item in value):
        raise ValueError(f"{label}: expected a list of non-empty strings")
    return value


def _source(root: Path, filename: object) -> tuple[bytes, str]:
    relative = _text(filename, "document.file")
    path = PurePosixPath(relative)
    if (
        path.is_absolute()
        or any(character in relative for character in "\\:*?\x00")
        or any(not part or part.startswith(".") or part.endswith((".", " ")) for part in relative.split("/"))
        or path.suffix.lower() != ".md"
    ):
        raise ValueError("document.file: expected an explicit relative Markdown path inside its source root")
    resolved = (root / relative).resolve(strict=True)
    if not resolved.is_relative_to(root) or not resolved.is_file():
        raise ValueError("document.file: resolved path leaves the configured root or is not a file")
    # Bound the read itself; a stat-only limit would miss growth between checking and opening.
    with resolved.open("rb") as stream:
        raw = stream.read(MAX_SOURCE_BYTES + 1)
    if len(raw) > MAX_SOURCE_BYTES:
        raise ValueError("document.file: source exceeds the supported 5 MiB text limit")
    text = raw.decode("utf-8-sig")
    if "\x00" in text:
        raise ValueError("document.file: source contains NUL bytes")
    return raw, text


def _json_bytes(value: object) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode("utf-8")


def render_catalog(config_path: Path) -> dict[str, bytes]:
    """Validate the complete selection before producing any output files."""
    config_path = config_path.resolve(strict=True)
    config = _object(
        json.loads(config_path.read_text(encoding="utf-8-sig")),
        {"schema", "roots", "documents"},
        {"links"},
        "configuration",
    )
    if config["schema"] != SCHEMA or not isinstance(config["roots"], dict) or not config["roots"]:
        raise ValueError(f"configuration: expected schema {SCHEMA} and named source roots")
    roots = {}
    for key, value in config["roots"].items():
        name = _identifier(key, "root key")
        location = Path(_text(value, "root location")).expanduser()
        location = (config_path.parent / location).resolve(strict=True)
        if not location.is_dir():
            raise ValueError(f"root {name}: expected an existing directory")
        roots[name] = location
    if not isinstance(config["documents"], list) or not config["documents"]:
        raise ValueError("configuration.documents: select at least one document explicitly")

    documents, sources, source_map = [], {}, {}
    for item in config["documents"]:
        item = _object(item, {"id", "root", "file", "title"}, {"tags", "aliases", "type"}, "document")
        identifier = _identifier(item["id"], "document.id")
        root_id = _identifier(item["root"], "document.root")
        if identifier in sources or root_id not in roots:
            raise ValueError(f"document {identifier}: duplicate identity or unknown source root")
        raw, text = _source(roots[root_id], item["file"])
        revision = hashlib.sha256(raw).hexdigest()
        document = {
            "id": identifier,
            "path": identifier,
            "title": _text(item["title"], "document.title"),
            "revision": revision,
            "tags": _strings(item.get("tags", []), "document.tags"),
            "aliases": _strings(item.get("aliases", []), "document.aliases"),
        }
        if "type" in item:
            document["type"] = _text(item["type"], "document.type")
        documents.append(document)
        sources[identifier] = {"path": identifier, "text": text, "revision": revision}
        source_map[identifier] = f"sources/{identifier}.json"

    links = config.get("links", [])
    if not isinstance(links, list):
        raise ValueError("configuration.links: expected a list")
    for link in links:
        link = _object(link, {"from", "to", "line", "quote"}, set(), "link")
        origin, target = _identifier(link["from"], "link.from"), _identifier(link["to"], "link.to")
        if origin not in sources or target not in sources:
            raise ValueError("link: endpoints must identify selected documents")
        line, quote = link["line"], _text(link["quote"], "link.quote")
        lines = sources[origin]["text"].splitlines()
        if type(line) is not int or line < 1 or line > len(lines) or quote not in lines[line - 1]:
            raise ValueError("link: quote must occur on the stated source line")

    coverage = {
        "schema": "second-brain-coverage-1",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "errors": [],
        "vault": {"documents": documents, "links": links, "coverage": {"missingPaths": []}},
        "repositories": {"documents": [], "mappings": [], "links": []},
    }
    files = {"coverage.json": _json_bytes(coverage), "source-map.json": _json_bytes(source_map)}
    files.update({source_map[key]: _json_bytes(value) for key, value in sources.items()})
    return files


def build(config_path: Path, target: Path) -> None:
    """Publish a complete local catalog atomically into a new directory."""
    target = target.absolute()
    if target.exists() or target.is_symlink():
        raise FileExistsError("Target exists; choose a new directory. Existing catalogs are never overwritten.")
    if not target.parent.is_dir():
        raise FileNotFoundError("Target parent does not exist; create the intended output parent first.")
    files = render_catalog(config_path)
    with tempfile.TemporaryDirectory(prefix=".rmc-catalog-", dir=target.parent) as temporary:
        staged = Path(temporary) / "catalog"
        staged.mkdir()
        for relative, content in files.items():
            destination = staged / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(content)
        # Refuse a concurrently created destination. No existing publication is replaced.
        if target.exists() or target.is_symlink():
            raise FileExistsError("Target appeared during the build; no existing catalog was changed.")
        staged.rename(target)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", required=True, type=Path)
    parser.add_argument("--target", required=True, type=Path)
    args = parser.parse_args()
    try:
        build(args.config, args.target)
    except (OSError, ValueError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1
    print("OK: Local read-only catalog created. Publication and source write-back remain separate actions.")
    return 0


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    raise SystemExit(main())
