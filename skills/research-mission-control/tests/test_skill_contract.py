#!/usr/bin/env python3
"""Bind the initializer skill, its executable resources, and eval boundary."""

from __future__ import annotations

import json
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
            "research orchestrator",
            "operational orchestrator",
            "independent verification agent",
            "predoc specialists",
            "github remote",
            "grounded vault",
            "promptotyping",
            "context stream protocol",
        ):
            self.assertIn(phrase, skill)

    def test_interview_has_exactly_three_questions(self) -> None:
        skill = SKILL_PATH.read_text(encoding="utf-8")
        question_block = skill.split("## Configuration interview", maxsplit=1)[1].split(
            "Supply these defaults", maxsplit=1
        )[0]
        questions = [
            line for line in question_block.splitlines() if line.startswith(("1. ", "2. ", "3. ", "4. ", "5. "))
        ]
        self.assertEqual(3, len(questions))
        self.assertIn("Ask no more than three initial configuration questions", skill)
        self.assertIn("Ask in the human user's language", skill)
        self.assertIn("Language selection never consumes one of the three questions", skill)
        self.assertIn(
            "Research Mission Control (https://github.com/DigitalHumanitiesCraft/research-mission-control)", skill
        )
        self.assertIn("Which role should this working context assume", skill)
        self.assertIn("what criteria will the human user use to accept that result", skill)
        self.assertIn("data, documents, materials, code, repositories, or knowledge sources", skill)
        self.assertIn("Inspect and inventory material already present there", skill)
        self.assertIn('answer any numbered item with "Was empfiehlst du?"', skill)
        self.assertIn("Do not ask the human user to confirm that default", skill)
        self.assertIn("Context Stream transports messages but does not wake", skill)
        self.assertIn("After configuration", skill)
        self.assertIn("up to five short conceptual questions", skill)

    def test_status_and_grounding_semantics_are_explicit(self) -> None:
        skill = SKILL_PATH.read_text(encoding="utf-8")
        self.assertIn("first substantive response", skill)
        self.assertIn("local-only or still requires remote authorization", skill)
        self.assertIn("required with project-specific binding pending", skill)
        self.assertIn("does not activate an integration", skill)

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
        self.assertEqual({1, 2, 3, 4}, {case["id"] for case in payload["evals"]})
        for case in payload["evals"]:
            self.assertTrue(case["prompt"])
            self.assertTrue(case["expected_output"])
            self.assertGreaterEqual(len(case["expectations"]), 4)

    def test_openai_starter_preserves_method_identity_and_language(self) -> None:
        metadata = OPENAI_METADATA_PATH.read_text(encoding="utf-8")
        self.assertIn("https://github.com/DigitalHumanitiesCraft/research-mission-control", metadata)
        self.assertIn("Ask the three configuration questions in my language", metadata)

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
