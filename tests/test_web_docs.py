"""Boundary and reading-contract checks for generated public documentation."""

import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
from build_web_docs import build  # noqa: E402

ASSETS = Path(__file__).resolve().parents[1] / "web-docs"


class WebDocsTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / "release-metadata.json").write_text('{"version":"0.9.0rc3"}', encoding="utf-8")
        self.allowed = ["release-metadata.json"]

    def source(self, name: str, text: str) -> None:
        target = self.root / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(text, encoding="utf-8")
        self.allowed.append(name)

    def render(self, names: list[str]) -> str:
        build(self.root, self.allowed, [{"path": n, "title": n} for n in names], ASSETS)
        return (self.root / "docs" / Path(names[0]).with_suffix(".html")).read_text(encoding="utf-8")

    def test_tables_code_metadata_and_original(self) -> None:
        text = (
            "---\nversion: 0.9.0rc2\n---\n# Method\n\n"
            "| A | B |\n|---|---|\n| x | y |\n\n```html\n<script>x</script>\n```"
        )
        self.source("method.md", text)
        output = self.render(["method.md"])
        self.assertIn("<table>", output)
        self.assertIn("&lt;script&gt;x&lt;/script&gt;", output)
        self.assertIn("0.9.0rc2", output)
        self.assertIn("Package release 0.9.0rc3", output)
        self.assertIn('href="../method.md" download', output)
        self.assertEqual((self.root / "method.md").read_text(encoding="utf-8"), text)

    def test_generated_pages_report_and_styles_keep_lf_bytes_for_git_delivery(self) -> None:
        self.source("method.md", "# Method\n\nSource wording remains intact.\n")
        original = (self.root / "method.md").read_bytes()
        assets = self.root / "assets"
        assets.mkdir()
        (assets / "page.html.tmpl").write_bytes((ASSETS / "page.html.tmpl").read_bytes())
        css = (ASSETS / "docs.css").read_text(encoding="utf-8").replace("\n", "\r\n")
        (assets / "docs.css").write_bytes(css.encode("utf-8"))
        build(self.root, self.allowed, [{"path": "method.md", "title": "Method"}], assets)
        self.assertEqual((self.root / "method.md").read_bytes(), original)
        for name in ("docs/method.html", "docs/build-report.json", "docs/docs.css"):
            with self.subTest(path=name):
                self.assertNotIn(b"\r\n", (self.root / name).read_bytes())

    def test_relative_links_fragments_and_duplicate_headings(self) -> None:
        self.source("a.md", "# A\n\n[Read](notes/b.md#same_1)")
        self.source("notes/b.md", "# B\n\n## Same\n\n## Same")
        output = self.render(["a.md", "notes/b.md"])
        self.assertIn('href="notes/b.html#same_1"', output)
        self.assertIn('href="a.html#a"', output)

    def test_section_links_name_their_heading_without_changing_sources_or_targets(self) -> None:
        text = "# Method\n\n## Read *sources* & reuse\n\n[Return](#read-sources-reuse)\n"
        self.source("a.md", text)
        original = (self.root / "a.md").read_bytes()
        output = self.render(["a.md"])
        self.assertIn('aria-label="Link to section: Method"', output)
        self.assertIn('aria-label="Link to section: Read sources &amp; reuse"', output)
        self.assertIn('href="a.html#read-sources-reuse"', output)
        self.assertIn('<h2 id="read-sources-reuse">Read <em>sources</em> &amp; reuse', output)
        self.assertEqual((self.root / "a.md").read_bytes(), original)

    def test_missing_fragment_fails_before_outputs(self) -> None:
        self.source("a.md", "# A\n\n[Missing](#missing)")
        with self.assertRaisesRegex(ValueError, "missing section"):
            self.render(["a.md"])
        self.assertFalse((self.root / "docs").exists())

    def test_unpublished_reference_is_labelled_without_loading(self) -> None:
        self.source("a.md", "# A\n\n[Internal proposal](private.md)")
        output = self.render(["a.md"])
        self.assertIn("Internal proposal", output)
        self.assertIn("source outside this distribution", output)
        self.assertNotIn('href="private.md"', output)
        report = json.loads((self.root / "docs/build-report.json").read_text(encoding="utf-8"))
        self.assertEqual(report["source_only_references"][0]["target"], "private.md")

    def test_nonallowlisted_selection_fails(self) -> None:
        with self.assertRaisesRegex(ValueError, "contained"):
            self.render(["private.md"])

    def test_path_escape_and_schemes_fail(self) -> None:
        for href in ["../private.md", "%2e%2e/private.md", "javascript:alert(1)", "data:text/html,x", "//host/x"]:
            with self.subTest(href=href):
                self.source("a.md", f"# A\n\n[Bad]({href})")
                with self.assertRaises(ValueError):
                    self.render(["a.md"])

    def test_raw_html_is_inert_text(self) -> None:
        self.source("a.md", '# A\n\n<script>alert(1)</script>\n\n<img src="x" onerror="alert(1)">')
        output = self.render(["a.md"])
        self.assertNotIn("<script>", output)
        self.assertNotIn('<img src="x"', output)
        self.assertIn("&lt;script&gt;", output)

    def test_anchor_aliases_preserve_cross_document_links_without_extra_contents(self) -> None:
        self.source("a.md", "# A\n\n[Old section](b.md#old-section)")
        self.source("b.md", "# B\n\n## Current section\n\nExact context.")
        original = (self.root / "b.md").read_bytes()
        assets = self.root / "assets"
        assets.mkdir()
        (assets / "page.html.tmpl").write_text("$contents<article>$content</article>", encoding="utf-8")
        (assets / "docs.css").write_text("body {}", encoding="utf-8")
        build(
            self.root,
            self.allowed,
            [
                {"path": "a.md", "title": "A"},
                {"path": "b.md", "title": "B", "anchors": {"old-section": "current-section"}},
            ],
            assets,
        )
        first = (self.root / "docs/a.html").read_text(encoding="utf-8")
        second = (self.root / "docs/b.html").read_text(encoding="utf-8")
        self.assertIn('href="b.html#old-section"', first)
        self.assertIn('<span id="old-section"></span><h2 id="current-section">', second)
        contents = second.split("<article>")[0]
        self.assertIn('href="#current-section"', contents)
        self.assertNotIn("old-section", contents)
        self.assertNotIn(" open", contents)
        self.assertIn("Sections in this reference", contents)
        self.assertEqual((self.root / "b.md").read_bytes(), original)

    def test_invalid_anchor_aliases_fail_before_outputs(self) -> None:
        self.source("a.md", "# A\n\n## Current section")
        for anchors, message in [
            ({"old": "missing"}, "not a heading"),
            ({"current-section": "a"}, "collides"),
            ({'bad" onclick="x': "a"}, "Unsafe"),
            ({"old": "bad target"}, "Unsafe"),
            ({"old": 1}, "Unsafe"),
            ([], "must map"),
        ]:
            with self.subTest(anchors=anchors):
                with self.assertRaisesRegex(ValueError, message):
                    build(
                        self.root,
                        self.allowed,
                        [
                            {"path": "a.md", "title": "A", "anchors": anchors},
                        ],
                        ASSETS,
                    )
                self.assertFalse((self.root / "docs").exists())

    def test_contents_can_be_omitted_without_removing_compatible_toc_variable(self) -> None:
        self.source("a.md", "# A")
        assets = self.root / "assets"
        assets.mkdir()
        (assets / "page.html.tmpl").write_text(
            "<aside>$contents</aside><nav>$toc</nav><article>$content</article>", encoding="utf-8"
        )
        (assets / "docs.css").write_text("body {}", encoding="utf-8")
        build(self.root, self.allowed, [{"path": "a.md", "title": "A", "contents": False}], assets)
        output = (self.root / "docs/a.html").read_text(encoding="utf-8")
        self.assertIn("<aside></aside>", output)
        self.assertIn('<nav><div class="toc">', output)
        self.assertIn('<h1 id="a">', output)

    def test_images_and_external_links_preserved(self) -> None:
        self.source("notes/a.md", "# A\n\n![Image](../image.png)\n\n[Site](https://example.org/)")
        self.source("image.png", "fixture")
        output = self.render(["notes/a.md"])
        self.assertIn('src="../../image.png"', output)
        self.assertIn('href="https://example.org/"', output)


if __name__ == "__main__":
    unittest.main()
