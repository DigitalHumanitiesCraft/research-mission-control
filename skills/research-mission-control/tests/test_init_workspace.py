#!/usr/bin/env python3
"""Verify deterministic and fail-closed workspace initialization."""

from __future__ import annotations

import argparse
import importlib.util
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

SCRIPT_PATH = Path(__file__).resolve().parents[1] / "scripts" / "init_workspace.py"
SPEC = importlib.util.spec_from_file_location("rmc_init_workspace", SCRIPT_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError(f"Cannot load initializer: {SCRIPT_PATH}")
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


class WorkspaceInitializationTest(unittest.TestCase):
    """Exercise the public build boundary in disposable parent directories."""

    def _config(
        self,
        target: Path,
        grounded_vault: bool = False,
        verification_mode: str = "independent",
    ) -> MODULE.WorkspaceConfig:
        args = argparse.Namespace(
            target=target,
            project_name="Example Project",
            objective="Produce a verified corpus description.",
            canonical_input=["sources/catalogue.csv"],
            research_harness="codex",
            operations_harness="claude-code",
            verification_harness="codex",
            verification_mode=verification_mode,
            grounded_vault=grounded_vault,
        )
        return MODULE._resolve_config(args)

    def test_builds_shared_git_workspace_and_three_contracts(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            target = Path(temporary_directory) / "example-project"
            MODULE.build_workspace(self._config(target))

            required = {
                ".gitattributes",
                "AGENTS.md",
                "CLAUDE.md",
                "knowledge/INDEX.md",
                "knowledge/project.md",
                "knowledge/specification.md",
                "knowledge/handoff.md",
                "knowledge/integration.md",
                "knowledge/journal.md",
                "communication/PROTOCOL.md",
                "communication/INDEX.md",
                "communication/research/state.md",
                "communication/research/outbox/README.md",
                "communication/operations/state.md",
                "communication/operations/outbox/README.md",
                "communication/verification/state.md",
                "communication/verification/outbox/README.md",
                "communication/threads/README.md",
                "communication/capsules/README.md",
                "mission-control/roles/research-orchestrator.md",
                "mission-control/roles/operational-orchestrator.md",
                "mission-control/roles/verification-context.md",
                "mission-control/start-research.md",
                "mission-control/start-operations.md",
                "mission-control/start-verification.md",
            }
            actual = {
                str(path.relative_to(target)).replace("\\", "/")
                for path in target.rglob("*")
                if path.is_file() and ".git" not in path.parts
            }
            self.assertEqual(required, actual)

            result = subprocess.run(
                ["git", "-C", str(target), "branch", "--show-current"],
                check=True,
                capture_output=True,
                text=True,
            )
            self.assertEqual("main", result.stdout.strip())
            self.assertEqual(
                "* text=auto eol=lf\n\n*.ico binary\n*.png binary\n*.skill binary\n",
                (target / ".gitattributes").read_text(encoding="utf-8"),
            )
            for name in ("research", "operations", "verification"):
                contract = (target / f"mission-control/start-{name}.md").read_text(encoding="utf-8")
                self.assertIn(str(target.resolve()), contract)
                self.assertIn("human user remains the Operator", contract)
                self.assertIn(f"communication/{name}/state.md", contract)
                self.assertIn(f"communication/{name}/outbox/", contract)

            role_bindings = {
                "research": "mission-control/roles/research-orchestrator.md",
                "operations": "mission-control/roles/operational-orchestrator.md",
                "verification": "mission-control/roles/verification-context.md",
            }
            for role, role_path in role_bindings.items():
                contract = (target / f"mission-control/start-{role}.md").read_text(encoding="utf-8")
                self.assertIn(f"Research Mission Control ({MODULE.RMC_URL})", contract)
                self.assertIn(role_path, contract)
                self.assertIn("`knowledge/integration.md`", contract)
                self.assertNotIn("## Role", contract)
                self.assertNotIn("## Objective", contract)
                for other_path in set(role_bindings.values()) - {role_path}:
                    self.assertNotIn(other_path, contract)

            integration = (target / "knowledge/integration.md").read_text(encoding="utf-8")
            self.assertIn("Research is the single writer", integration)
            self.assertIn("Complete Verification Finding--> Operator", integration)
            self.assertIn("Operator controls disclosure and routing", integration)
            self.assertIn("read-only against evaluated project artifacts", integration)
            self.assertIn("write only its own outbox and recipient state", integration)
            operations = (target / "mission-control/start-operations.md").read_text(encoding="utf-8")
            verification = (target / "mission-control/start-verification.md").read_text(encoding="utf-8")
            self.assertIn("Do not write maintained `knowledge/` documents", operations)
            self.assertIn(
                "read-only against evaluated project artifacts and maintained `knowledge/` documents", verification
            )
            self.assertIn("Verification-owned outbox and state record reporting and receipt", verification)
            self.assertIn("complete Verification Finding directly to the Operator", verification)
            self.assertIn("does not create a security or secrecy guarantee", verification)

            protocol = (target / "communication/PROTOCOL.md").read_text(encoding="utf-8").lower()
            for phrase in (
                "published messages are immutable",
                "recipient's `state.md`",
                "stable `thread` value",
                "canonical artifact",
                "thread closes or re-entry cost becomes material",
                "does not wake a session",
                "no numeric compaction threshold applies",
                "verification finding is addressed first and only to the operator",
                "operator controls disclosure and routing",
            ):
                self.assertIn(phrase, protocol)

            communication_index = (target / "communication/INDEX.md").read_text(encoding="utf-8")
            for role in ("research", "operations", "verification"):
                self.assertIn(f"`{role}/outbox/`", communication_index)
                self.assertIn(f"`{role}/state.md`", communication_index)

    def test_refuses_existing_target_without_modifying_it(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            target = Path(temporary_directory) / "existing"
            target.mkdir()
            marker = target / "keep.txt"
            marker.write_text("keep", encoding="utf-8")

            with self.assertRaises(FileExistsError):
                self._config(target)

            self.assertEqual("keep", marker.read_text(encoding="utf-8"))
            self.assertEqual([marker], list(target.iterdir()))

    def test_grounded_vault_is_conditional(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            parent = Path(temporary_directory)
            inactive = parent / "inactive"
            required = parent / "required"
            MODULE.build_workspace(self._config(inactive, grounded_vault=False))
            MODULE.build_workspace(self._config(required, grounded_vault=True))

            inactive_profile = (inactive / "knowledge/integration.md").read_text(encoding="utf-8")
            required_profile = (required / "knowledge/integration.md").read_text(encoding="utf-8")
            self.assertIn("Grounded Vault: Inactive", inactive_profile)
            self.assertNotIn(MODULE.GROUNDED_VAULT_URL, inactive_profile)
            self.assertIn("Grounded Vault: Required", required_profile)
            self.assertNotIn("Grounded Vault: Active", required_profile)
            self.assertIn("project-specific binding contract", required_profile)
            self.assertIn("before treating claim grounding as active", required_profile)
            self.assertIn(MODULE.GROUNDED_VAULT_URL, required_profile)

    def test_verification_modes_change_reading_order_without_promising_secrecy(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            parent = Path(temporary_directory)
            independent = parent / "independent"
            blind = parent / "blind"
            MODULE.build_workspace(self._config(independent, verification_mode="independent"))
            MODULE.build_workspace(self._config(blind, verification_mode="blind"))

            independent_contract = (independent / "mission-control/start-verification.md").read_text(encoding="utf-8")
            blind_contract = (blind / "mission-control/start-verification.md").read_text(encoding="utf-8")
            self.assertIn("`knowledge/handoff.md`", independent_contract)
            self.assertNotIn("Do not read `knowledge/handoff.md`", independent_contract)
            self.assertIn("Do not read `knowledge/handoff.md`", blind_contract)
            for contract in (independent_contract, blind_contract):
                self.assertIn("complete Verification Finding directly to the Operator", contract)
                self.assertIn("does not create a security or secrecy guarantee", contract)

    def test_generated_pointers_resolve_to_files(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            target = Path(temporary_directory) / "pointers"
            MODULE.build_workspace(self._config(target))

            for role in ("research", "operations", "verification"):
                contract = (target / f"mission-control/start-{role}.md").read_text(encoding="utf-8")
                for relative_path in (
                    "knowledge/INDEX.md",
                    "knowledge/project.md",
                    "knowledge/integration.md",
                    "communication/PROTOCOL.md",
                    "communication/INDEX.md",
                    f"communication/{role}/state.md",
                    f"communication/{role}/outbox/README.md",
                ):
                    self.assertIn(relative_path.removesuffix("README.md"), contract)
                    self.assertTrue((target / relative_path).is_file())

    def test_generated_full_roles_are_executable_and_keep_knowledge_ownership_distinct(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            target = Path(temporary_directory) / "full-roles"
            MODULE.build_workspace(self._config(target))

            role_paths = {
                "research": target / "mission-control/roles/research-orchestrator.md",
                "operations": target / "mission-control/roles/operational-orchestrator.md",
                "verification": target / "mission-control/roles/verification-context.md",
            }
            review_boundary = "When this prompt is supplied for review, comparison, editing, or discussion"
            for path in role_paths.values():
                content = path.read_text(encoding="utf-8")
                self.assertIn("# System Prompt:", content)
                self.assertIn(review_boundary, content)
                self.assertGreater(len(content.splitlines()), 70)

            research = role_paths["research"].read_text(encoding="utf-8")
            operations = role_paths["operations"].read_text(encoding="utf-8")
            verification = role_paths["verification"].read_text(encoding="utf-8")
            self.assertIn("Project-specific knowledge goes to the project's canonical knowledge location", research)
            self.assertIn("Do not write maintained `knowledge/` documents", operations)
            self.assertIn("Do not write maintained `knowledge/` documents", verification)
            self.assertIn("report the complete independent finding to the operator", verification.lower())
            self.assertIn("Only the operator decides whether to disclose", verification)
            self.assertIn("not a security or secrecy guarantee", verification)

    def test_all_start_bindings_share_workspace_and_integration_contract(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            target = Path(temporary_directory) / "shared-binding"
            MODULE.build_workspace(self._config(target))

            contracts = [
                (target / f"mission-control/start-{role}.md").read_text(encoding="utf-8")
                for role in ("research", "operations", "verification")
            ]
            for contract in contracts:
                self.assertEqual(1, contract.count(str(target.resolve())))
                self.assertIn("`knowledge/integration.md`", contract)
                self.assertIn("project-specific authority, ownership, and exchange contract", contract)
                self.assertIn("does not replace or abbreviate that contract", contract)

    def test_templates_cover_the_complete_output_contract(self) -> None:
        expected = {MODULE._template_path(path) for path in MODULE.WORKSPACE_PATHS}
        actual = {path for path in MODULE.TEMPLATE_ROOT.rglob("*") if path.is_file()}
        self.assertEqual(expected, actual)
        for template_path in actual:
            self.assertTrue(template_path.read_text(encoding="utf-8").strip())

        script = SCRIPT_PATH.read_text(encoding="utf-8")
        self.assertNotIn("# Context Stream Protocol", script)
        self.assertNotIn("# Start contract: Research Orchestrator", script)
        self.assertNotIn("# System Prompt: Research Orchestrator", script)

    def test_rendering_is_deterministic_and_resolves_every_placeholder(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            target = Path(temporary_directory) / "rendered"
            config = self._config(target)
            first = MODULE.render_workspace(config)
            second = MODULE.render_workspace(config)

            self.assertEqual(first, second)
            self.assertEqual(set(MODULE.WORKSPACE_PATHS), set(first))
            for content in first.values():
                self.assertIsNone(MODULE.PLACEHOLDER_PATTERN.search(content))
                self.assertTrue(content.endswith("\n"))
            self.assertIn("Example Project", first[Path("knowledge/project.md")])
            self.assertIn("sources/catalogue.csv", first[Path("knowledge/project.md")])

    def test_rendering_fails_on_an_unknown_placeholder(self) -> None:
        with self.assertRaisesRegex(RuntimeError, "UNKNOWN_VALUE"):
            MODULE._render_template("{{UNKNOWN_VALUE}}", {}, Path("broken.md"))

    def test_dry_run_validates_and_writes_nothing(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            target = Path(temporary_directory) / "dry-run"
            command = [
                sys.executable,
                str(SCRIPT_PATH),
                "--target",
                str(target),
                "--project-name",
                "Dry Run",
                "--objective",
                "Inspect the complete plan.",
                "--research-harness",
                "codex",
                "--operations-harness",
                "claude-code",
                "--verification-harness",
                "codex",
                "--dry-run",
            ]
            result = subprocess.run(command, check=True, capture_output=True, text=True)

            self.assertFalse(target.exists())
            self.assertIn("no files were written", result.stdout)
            for output_path in MODULE.WORKSPACE_PATHS:
                self.assertIn(output_path.as_posix(), result.stdout)

    def test_removes_staging_after_failed_verification(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            parent = Path(temporary_directory)
            target = parent / "failed"
            with mock.patch.object(MODULE, "_verify_workspace", side_effect=RuntimeError("injected")):
                with self.assertRaisesRegex(RuntimeError, "injected"):
                    MODULE.build_workspace(self._config(target))

            self.assertFalse(target.exists())
            self.assertEqual([], list(parent.iterdir()))

    def test_removes_staging_after_mid_write_failure(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            parent = Path(temporary_directory)
            target = parent / "write-failed"
            real_write_text = Path.write_text
            writes = 0

            def fail_during_write(path: Path, *args: object, **kwargs: object) -> int:
                nonlocal writes
                writes += 1
                if writes == 8:
                    raise OSError("injected write failure")
                return real_write_text(path, *args, **kwargs)

            with mock.patch.object(Path, "write_text", new=fail_during_write):
                with self.assertRaisesRegex(OSError, "injected write failure"):
                    MODULE.build_workspace(self._config(target))

            self.assertFalse(target.exists())
            self.assertEqual([], list(parent.iterdir()))


if __name__ == "__main__":
    unittest.main()
