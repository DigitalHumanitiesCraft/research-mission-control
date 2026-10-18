"""Check arbitrary Markdown layouts against the portable catalog trust boundary."""

from __future__ import annotations

import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("knowledge_catalog", ROOT / "tools" / "build_knowledge_catalog.py")
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class KnowledgeCatalogTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.notes = self.root / "notes"
        self.notes.mkdir()
        self.source = self.notes / "question.md"
        self.source.write_text("# Question\n\nSee [Terms](terms.md).\n", encoding="utf-8")
        (self.notes / "terms.md").write_text("# Terms\n\nSynthetic definitions.\n", encoding="utf-8")
        self.config = {
            "schema": "rmc-knowledge-sources-1",
            "roots": {"selected": "notes"},
            "documents": [
                {"id": "question", "root": "selected", "file": "question.md", "title": "Question"},
                {"id": "terms", "root": "selected", "file": "terms.md", "title": "Terms"},
            ],
            "links": [{"from": "question", "to": "terms", "line": 3, "quote": "See [Terms](terms.md)."}],
        }
        self.config_path = self.root / "sources.json"

    def render(self) -> dict[str, bytes]:
        self.config_path.write_text(json.dumps(self.config), encoding="utf-8")
        return MODULE.render_catalog(self.config_path)

    def test_preserves_source_bytes_and_existing_ui_identity_contract(self) -> None:
        original = self.source.read_bytes()
        files = self.render()
        coverage = json.loads(files["coverage.json"])
        source = json.loads(files["sources/question.json"])
        self.assertEqual(coverage["schema"], "second-brain-coverage-1")
        self.assertEqual(source["path"], coverage["vault"]["documents"][0]["id"])
        self.assertEqual(source["revision"], hashlib.sha256(original).hexdigest())
        self.assertEqual(source["text"], original.decode("utf-8"))
        self.assertEqual(self.source.read_bytes(), original)
        self.assertEqual(json.loads(files["source-map.json"])["question"], "sources/question.json")
        self.assertNotIn(str(self.root), "".join(value.decode("utf-8") for value in files.values()))

    def test_flat_and_nested_vault_layouts_produce_the_same_catalog(self) -> None:
        first = self.render()
        nested = self.notes / "Projects" / "Example"
        nested.mkdir(parents=True)
        for item in self.config["documents"]:
            (self.notes / item["file"]).rename(nested / item["file"])
            item["file"] = "Projects/Example/" + item["file"]
        second = self.render()
        for files in [first, second]:
            coverage = json.loads(files["coverage.json"])
            del coverage["generatedAt"]
            files["coverage.json"] = json.dumps(coverage).encode()
        self.assertEqual(first, second)

    def test_unknown_fields_id_collisions_and_roots_fail(self) -> None:
        for key, value in [("id", "terms"), ("root", "missing"), ("id", "../secret")]:
            original = self.config["documents"][0][key]
            self.config["documents"][0][key] = value
            with self.assertRaises(ValueError):
                self.render()
            self.config["documents"][0][key] = original
        self.config["publish"] = True
        with self.assertRaises(ValueError):
            self.render()

    def test_path_escape_and_unselected_files_are_not_read(self) -> None:
        (self.root / "secret.md").write_text("Excluded content", encoding="utf-8")
        for filename in ["../secret.md", "/secret.md", "C:/secret.md", ".git/config.md", "*.md"]:
            self.config["documents"][0]["file"] = filename
            with self.assertRaises(ValueError):
                self.render()

    def test_symlink_escape_is_rejected(self) -> None:
        outside = self.root / "outside.md"
        outside.write_text("Excluded content", encoding="utf-8")
        link = self.notes / "escape.md"
        try:
            link.symlink_to(outside)
        except OSError as error:
            self.skipTest(f"Host cannot create test symlink: {error}")
        self.config["documents"][0]["file"] = "escape.md"
        with self.assertRaises(ValueError):
            self.render()

    def test_resolved_path_outside_root_is_rejected_without_reading(self) -> None:
        outside = self.root / "outside.md"
        outside.write_text("Excluded content", encoding="utf-8")
        self.config_path.write_text(json.dumps(self.config), encoding="utf-8")
        original_resolve = Path.resolve

        def resolve(path: Path, strict: bool = False) -> Path:
            if path == self.source:
                return outside
            return original_resolve(path, strict=strict)

        with mock.patch.object(Path, "resolve", resolve), self.assertRaises(ValueError):
            MODULE.render_catalog(self.config_path)

    def test_false_relation_evidence_is_rejected(self) -> None:
        self.config["links"][0]["quote"] = "This quotation does not exist."
        with self.assertRaises(ValueError):
            self.render()

    def test_binary_and_oversize_sources_are_rejected(self) -> None:
        for content in [b"\xff", b"text\x00text", b"x" * (MODULE.MAX_SOURCE_BYTES + 1)]:
            self.source.write_bytes(content)
            with self.assertRaises(ValueError):
                self.render()

    def test_failed_build_leaves_no_partial_output(self) -> None:
        self.render()
        self.source.unlink()
        target = self.root / "output"
        with self.assertRaises(FileNotFoundError):
            MODULE.build(self.config_path, target)
        self.assertFalse(target.exists())

    def test_complete_build_never_overwrites_existing_catalog(self) -> None:
        self.render()
        target = self.root / "output"
        MODULE.build(self.config_path, target)
        original = (target / "coverage.json").read_bytes()
        with self.assertRaises(FileExistsError):
            MODULE.build(self.config_path, target)
        self.assertEqual((target / "coverage.json").read_bytes(), original)


if __name__ == "__main__":
    unittest.main()
