"""Render explicitly selected public Markdown into static reading pages.

Script-pipeline component, called after publication allowlist copying and before
bundle checksums. Python-Markdown owns Markdown parsing. Raw HTML is displayed
as text, while links are restricted to copied files and ordinary web schemes.
No source repository discovery or network access occurs in this builder.
"""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import posixpath
import re
from pathlib import Path, PurePosixPath
from string import Template
from urllib.parse import quote, unquote, urlsplit, urlunsplit
from xml.etree import ElementTree as ET

import markdown
from markdown.extensions import Extension
from markdown.treeprocessors import Treeprocessor


def _safe_file(root: Path, name: str) -> Path:
    path = PurePosixPath(name)
    if not name or path.is_absolute() or ".." in path.parts or "\\" in name or path.as_posix() != name:
        raise ValueError(f"Unsafe package path: {name}")
    target = root / name
    if not target.resolve().is_relative_to(root.resolve()) or target.is_symlink():
        raise ValueError(f"Package path escapes its root: {name}")
    if not target.is_file():
        raise ValueError(f"Copied package file missing: {name}")
    return target


def _relative(source: str, target: str) -> str:
    return quote(posixpath.relpath(target, posixpath.dirname(source)), safe="/.-_")


def _page(source: str) -> str:
    return "docs/" + str(PurePosixPath(source).with_suffix(".html"))


def _heading_ids(tokens: list[dict]) -> set[str]:
    return {token["id"] for token in tokens} | {
        heading for token in tokens for heading in _heading_ids(token["children"])
    }


class PublicLinks(Treeprocessor):
    """Resolve Markdown links against the copied package, never the source tree."""

    def run(self, root: ET.Element) -> ET.Element:
        aliases = self.md.anchor_aliases
        if not isinstance(aliases, dict):
            raise ValueError("Document anchors must map alias IDs to heading IDs")
        actual_ids = [node.get("id") for node in root.iter() if node.get("id") is not None]
        if len(actual_ids) != len(set(actual_ids)):
            raise ValueError("Duplicate document HTML ID")
        headings = _heading_ids(self.md.toc_tokens)
        for alias, target in aliases.items():
            if any(
                not isinstance(value, str) or not re.fullmatch(r"[A-Za-z][A-Za-z0-9_-]*", value)
                for value in (alias, target)
            ):
                raise ValueError("Unsafe document anchor ID")
            if alias in actual_ids:
                raise ValueError(f"Document anchor collides with an existing ID: {alias}")
            if target not in headings:
                raise ValueError(f"Document anchor target is not a heading: {target}")
        # Insert only after TOC generation, so aliases do not become extra entries.
        for parent in list(root.iter()):
            for child in list(parent):
                offset = list(parent).index(child)
                for alias, target in aliases.items():
                    if child.get("id") == target:
                        parent.insert(offset, ET.Element("span", {"id": alias}))
                        offset += 1
        for heading in root.iter():
            for link in heading.findall("a[@class='headerlink']"):
                label = "".join(heading.itertext()).removesuffix(link.text or "").strip()
                description = f"Link to section: {label}"
                link.set("aria-label", description)
                link.set("title", description)
        for node in root.iter():
            attribute = "href" if node.tag == "a" else "src" if node.tag == "img" else None
            if attribute is None:
                continue
            raw = node.get(attribute, "")
            if any(ord(char) < 32 for char in raw) or "\\" in raw:
                raise ValueError("Control character or backslash in document URL")
            parsed = urlsplit(raw)
            if parsed.scheme or parsed.netloc:
                if parsed.scheme not in {"https", "http", "mailto"} or parsed.netloc and not parsed.scheme:
                    raise ValueError(f"Unsupported URL scheme: {parsed.scheme or 'network path'}")
                if node.tag == "img":
                    raise ValueError("Remote document images require a separately approved local asset")
                continue
            decoded = unquote(parsed.path)
            if "\\" in decoded or decoded.startswith("/"):
                raise ValueError("Absolute or encoded backslash document path")
            target = posixpath.normpath(posixpath.join(posixpath.dirname(self.md.source), decoded))
            if not decoded:
                target = self.md.source
            if decoded.endswith("/") and target + "/index.html" in self.md.allowed:
                target += "/index.html"
            if target == ".." or target.startswith("../"):
                raise ValueError("Document link escapes the public package")
            if target not in self.md.allowed:
                if node.tag == "img":
                    raise ValueError(f"Image is not in public package: {target}")
                node.tag = "span"
                node.attrib.clear()
                node.set("class", "unpublished-reference")
                note = ET.SubElement(node, "span", {"class": "reference-note"})
                note.text = " (source outside this distribution)"
                self.md.unavailable.append({"source": self.md.source, "target": target})
                continue
            _safe_file(self.md.bundle, target)
            destination = _page(target) if target in self.md.documents else target
            node.set(
                attribute,
                urlunsplit(("", "", _relative(_page(self.md.source), destination), parsed.query, parsed.fragment)),
            )
            if parsed.fragment and target in self.md.documents:
                self.md.references.append((target, unquote(parsed.fragment)))
        return root


class PublicMarkdown(Extension):
    def extendMarkdown(self, md: markdown.Markdown) -> None:
        # Embedded HTML is readable source, never an executable escape hatch.
        md.preprocessors.deregister("html_block")
        md.inlinePatterns.deregister("html")
        md.treeprocessors.register(PublicLinks(md), "public_links", 4)


def build(bundle: Path, allowed: list[str], documents: list[dict], assets: Path) -> list[str]:
    """Generate pages only after validating every selected source and link."""
    names = [entry["path"] for entry in documents]
    if len(names) != len(set(names)) or not set(names).issubset(allowed):
        raise ValueError("Document selection must be unique and contained in publication includes")
    if any(not name.endswith(".md") for name in names):
        raise ValueError("Document selection must contain Markdown files")
    for name in allowed:
        _safe_file(bundle, name)
    for destination in [_page(name) for name in names] + ["docs/docs.css", "docs/build-report.json"]:
        if not (bundle / destination).resolve().is_relative_to(bundle.resolve()):
            raise ValueError("Documentation output escapes the copied package")
    release = json.loads(_safe_file(bundle, "release-metadata.json").read_text(encoding="utf-8"))
    template = Template((assets / "page.html.tmpl").read_text(encoding="utf-8"))
    rendered = {}
    errors = []
    unavailable = []
    for entry in documents:
        name = entry["path"]
        try:
            source = _safe_file(bundle, name).read_text(encoding="utf-8")
            md = markdown.Markdown(
                extensions=["meta", "tables", "fenced_code", "toc", PublicMarkdown()],
                extension_configs={"toc": {"permalink": True}},
            )
            md.bundle, md.source = bundle, name
            md.allowed, md.documents = set(allowed), set(names)
            md.references, md.unavailable = [], []
            md.anchor_aliases = entry.get("anchors", {})
            content = md.convert(source)
            ids = _heading_ids(md.toc_tokens) | set(md.anchor_aliases)
            rendered[name] = {
                "content": content,
                "toc": md.toc,
                "ids": ids,
                "references": md.references,
                "meta": md.Meta,
            }
            unavailable.extend(md.unavailable)
        except (ValueError, OSError) as error:
            errors.append(f"{name}: {error}")
    for name, record in rendered.items():
        for target, fragment in record["references"]:
            if target in rendered and fragment not in rendered[target]["ids"]:
                errors.append(f"{name}: missing section {target}#{fragment}")
    if errors:
        raise ValueError("Web documentation failed:\n" + "\n".join(errors))
    outputs = []
    for entry in documents:
        name = entry["path"]
        record = rendered[name]
        output = _page(name)
        navigation = "".join(
            f'<a href="{_relative(output, _page(item["path"]))}"'
            + (' aria-current="page"' if item["path"] == name else "")
            + f">{html.escape(item['title'])}</a>"
            for item in documents
            if item.get("nav", True)
        )
        metadata = "".join(
            f"<dt>{html.escape(key)}</dt><dd>{html.escape(' '.join(value))}</dd>"
            for key, value in record["meta"].items()
        )
        page = template.substitute(
            title=html.escape(entry["title"]),
            content=record["content"],
            toc=record["toc"],
            contents=(
                '<details class="contents"><summary>Sections in this reference</summary>' + record["toc"] + "</details>"
                if entry.get("contents") is not False
                else ""
            ),
            navigation=navigation,
            source=html.escape(name),
            raw=_relative(output, name),
            home=_relative(output, "index.html"),
            css=_relative(output, "docs/docs.css"),
            brand_css=_relative(output, "site.css"),
            metadata=metadata,
            release=html.escape(str(release["version"])),
            document_version=(
                ". Recorded document version " + html.escape(" ".join(record["meta"]["version"]))
                if "version" in record["meta"]
                else ""
            ),
        )
        target = bundle / output
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(page, encoding="utf-8", newline="\n")
        outputs.append(output)
    (bundle / "docs/docs.css").write_text(
        (assets / "docs.css").read_text(encoding="utf-8"), encoding="utf-8", newline="\n"
    )
    outputs.append("docs/docs.css")
    report = {
        "schema": "public-web-docs-1",
        "parser": "Markdown " + markdown.__version__,
        "source_only_references": unavailable,
        "sources": [
            {"path": name, "sha256": hashlib.sha256((bundle / name).read_bytes()).hexdigest()} for name in names
        ],
        "files": [
            {"path": name, "sha256": hashlib.sha256((bundle / name).read_bytes()).hexdigest()} for name in outputs
        ],
    }
    (bundle / "docs/build-report.json").write_text(json.dumps(report, indent=2), encoding="utf-8", newline="\n")
    outputs.append("docs/build-report.json")
    return outputs


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("bundle", type=Path)
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument("--assets", type=Path, required=True)
    args = parser.parse_args()
    manifest = json.loads((args.bundle / "publication-manifest.json").read_text(encoding="utf-8"))
    documents = json.loads(args.config.read_text(encoding="utf-8"))
    outputs = build(args.bundle, manifest["include"], documents, args.assets)
    print(f"OK: generated {len(outputs)} documentation artifacts")


if __name__ == "__main__":
    main()
