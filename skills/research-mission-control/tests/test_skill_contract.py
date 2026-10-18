#!/usr/bin/env python3
"""Bind the initializer skill, its executable resources, and eval boundary."""

from __future__ import annotations

import json
import re
import unittest
from pathlib import Path

SKILL_ROOT = Path(__file__).resolve().parents[1]
SKILL_PATH = SKILL_ROOT / "SKILL.md"
SCRIPT_PATH = SKILL_ROOT / "scripts" / "init_workspace.py"
OPENAI_METADATA_PATH = SKILL_ROOT / "agents" / "openai.yaml"
EVALS_PATH = SKILL_ROOT / "evals" / "evals.json"
TEMPLATE_ROOT = SKILL_ROOT / "assets" / "templates"


class SkillContractTest(unittest.TestCase):
    """Check the portable skill boundary without invoking an AI model."""

    def test_skill_names_required_roles_and_authority(self) -> None:
        skill = SKILL_PATH.read_text(encoding="utf-8").lower()
        for phrase in (
            "human user directs the work",
            "research-orchestrator.md",
            "operational-orchestrator.md",
            "independent verification agent",
            "predoc specialists",
            "github remote",
            "grounded vault",
            "promptotyping",
            "context stream protocol",
        ):
            self.assertIn(phrase, skill)

    def test_contract_routes_resolve_inside_the_installed_skill(self) -> None:
        skill = SKILL_PATH.read_text(encoding="utf-8")
        links = re.findall(r"\]\((?!https?://)([^)]+)\)", skill)
        expected = {
            "assets/templates/mission-control/roles/research-orchestrator.md.tmpl",
            "assets/templates/mission-control/roles/operational-orchestrator.md.tmpl",
            "assets/templates/mission-control/roles/independent-verification-agent.md.tmpl",
            "assets/templates/knowledge/integration.md.tmpl",
            "assets/templates/communication/PROTOCOL.md.tmpl",
        }
        self.assertTrue(expected.issubset(links))
        for link in links:
            with self.subTest(link=link):
                target = (SKILL_ROOT / link).resolve()
                self.assertTrue(target.is_relative_to(SKILL_ROOT.resolve()))
                self.assertTrue(target.is_file())

    def test_progressive_setup_has_a_selective_entry_and_resume_record(self) -> None:
        skill = SKILL_PATH.read_text(encoding="utf-8")
        self.assertIn("## Selective reading", skill)
        self.assertIn("## Progressive initialization", skill)
        for phase in (
            "Introduction",
            "Minimum project framing",
            "Configuration proposal",
            "Local initialization",
            "Operational check",
            "First assignment and review",
        ):
            self.assertIn(phase, skill)
        self.assertIn("knowledge/integration.md", skill)
        self.assertIn("knowledge/journal.md", skill)
        self.assertNotIn("Ask only unanswered questions in one batch", skill)
        self.assertNotIn("Ask no more than three initial configuration questions", skill)

    def test_status_and_grounding_semantics_are_explicit(self) -> None:
        skill = SKILL_PATH.read_text(encoding="utf-8")
        self.assertIn("local-only or still requires remote authorization", skill)
        self.assertIn("required with project-specific binding pending", skill)
        self.assertIn("does not activate an integration", skill)

    def test_existing_artifacts_and_verification_are_bounded(self) -> None:
        skill = SKILL_PATH.read_text(encoding="utf-8")
        self.assertIn("preserved, reused, adapted, or may be replaced", skill)
        self.assertIn("before generating a substitute", skill)
        self.assertIn("bounded target, criterion, evidence packet, and completion condition", skill)
        self.assertIn("operational monitoring", skill)

    def test_verification_reports_to_operator_without_claiming_secrecy(self) -> None:
        skill = SKILL_PATH.read_text(encoding="utf-8")
        self.assertIn("complete finding directly to the human user", skill)
        self.assertIn("human user controls disclosure and routing", skill)
        self.assertIn("does not imply secrecy", skill)
        self.assertIn("Operations addresses the complete Result with Evidence to Verification", skill)
        self.assertIn("Excluding producer reasoning before the initial finding belongs only to Blind mode", skill)

    def test_resources_and_eval_schema_are_complete(self) -> None:
        self.assertTrue(SCRIPT_PATH.is_file())
        self.assertTrue(OPENAI_METADATA_PATH.is_file())
        self.assertTrue(TEMPLATE_ROOT.is_dir())
        self.assertEqual(25, len(list(TEMPLATE_ROOT.rglob("*.tmpl"))))
        payload = json.loads(EVALS_PATH.read_text(encoding="utf-8"))
        self.assertEqual("research-mission-control", payload["skill_name"])
        identifiers = [case["id"] for case in payload["evals"]]
        self.assertEqual(len(identifiers), len(set(identifiers)))
        self.assertEqual("unexecuted", payload["execution_status"])
        for case in payload["evals"]:
            self.assertTrue(case["prompt"])
            self.assertTrue(case["expected_output"])
            self.assertGreaterEqual(len(case["expectations"]), 4)

    def test_openai_starter_preserves_method_identity_and_language(self) -> None:
        metadata = OPENAI_METADATA_PATH.read_text(encoding="utf-8")
        self.assertIn("https://github.com/DigitalHumanitiesCraft/research-mission-control", metadata)
        self.assertIn("$research-mission-control", metadata)
        self.assertIn("in my language", metadata)
        self.assertIn("one question at a time", metadata)
        self.assertNotIn("three configuration questions", metadata)

    def test_skill_exposes_preview_and_single_writer_contract(self) -> None:
        skill = SKILL_PATH.read_text(encoding="utf-8")
        self.assertIn("--dry-run", skill)
        self.assertIn("assets/templates/", skill)
        self.assertIn("Research is the single writer", skill)

    def test_skill_requires_full_local_roles_instead_of_start_summaries(self) -> None:
        skill = SKILL_PATH.read_text(encoding="utf-8")
        for role_path in (
            "mission-control/roles/research-orchestrator.md",
            "mission-control/roles/operational-orchestrator.md",
            "mission-control/roles/independent-verification-agent.md",
        ):
            self.assertIn(role_path, skill)
        self.assertIn("complete, local role contracts", skill)
        self.assertIn("Never replace the full local role contract with a shortened role summary", skill)


if __name__ == "__main__":
    unittest.main()
