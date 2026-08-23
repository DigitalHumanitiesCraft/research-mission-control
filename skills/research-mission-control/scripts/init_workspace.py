#!/usr/bin/env python3
"""Create a fresh shared Research Mission Control repository.

The initializer renders the maintained Markdown templates in ``assets/templates``
and publishes the workspace only after the complete staged result and its Git
worktree have been verified. Remote creation remains a separate, explicitly
authorized harness action.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from datetime import date
from pathlib import Path

HARNESSES = ("codex", "claude-code", "other")
VERIFICATION_MODES = ("independent", "blind")
RMC_URL = "https://github.com/DigitalHumanitiesCraft/research-mission-control"
PROMPTOTYPING_URL = "https://github.com/DigitalHumanitiesCraft/Promptotyping"
GROUNDED_VAULT_URL = "https://github.com/DigitalHumanitiesCraft/grounded-vault"
SKILL_ROOT = Path(__file__).resolve().parents[1]
TEMPLATE_ROOT = SKILL_ROOT / "assets" / "templates"
PLACEHOLDER_PATTERN = re.compile(r"\{\{([A-Z][A-Z0-9_]*)\}\}")

WORKSPACE_PATHS = (
    Path(".gitattributes"),
    Path("AGENTS.md"),
    Path("CLAUDE.md"),
    Path("knowledge/INDEX.md"),
    Path("knowledge/project.md"),
    Path("knowledge/specification.md"),
    Path("knowledge/integration.md"),
    Path("knowledge/handoff.md"),
    Path("knowledge/journal.md"),
    Path("communication/PROTOCOL.md"),
    Path("communication/INDEX.md"),
    Path("communication/research/state.md"),
    Path("communication/research/outbox/README.md"),
    Path("communication/operations/state.md"),
    Path("communication/operations/outbox/README.md"),
    Path("communication/verification/state.md"),
    Path("communication/verification/outbox/README.md"),
    Path("communication/threads/README.md"),
    Path("communication/capsules/README.md"),
    Path("mission-control/roles/research-orchestrator.md"),
    Path("mission-control/roles/operational-orchestrator.md"),
    Path("mission-control/roles/verification-context.md"),
    Path("mission-control/start-research.md"),
    Path("mission-control/start-operations.md"),
    Path("mission-control/start-verification.md"),
)


@dataclass(frozen=True)
class WorkspaceConfig:
    """Hold the resolved values that every generated contract shares."""

    target: Path
    project_name: str
    objective: str
    canonical_inputs: tuple[str, ...]
    research_harness: str
    operations_harness: str
    verification_harness: str
    verification_mode: str
    grounded_vault: bool


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create a new local Research Mission Control workspace.",
    )
    parser.add_argument("--target", required=True, type=Path)
    parser.add_argument("--project-name", required=True)
    parser.add_argument("--objective", required=True)
    parser.add_argument("--canonical-input", action="append", default=[])
    parser.add_argument("--research-harness", choices=HARNESSES, required=True)
    parser.add_argument("--operations-harness", choices=HARNESSES, required=True)
    parser.add_argument("--verification-harness", choices=HARNESSES, required=True)
    parser.add_argument("--verification-mode", choices=VERIFICATION_MODES, default="independent")
    parser.add_argument("--grounded-vault", action="store_true")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate configuration and templates, then list outputs without writing anything.",
    )
    return parser.parse_args()


def _clean_text(value: str, label: str) -> str:
    cleaned = " ".join(value.split())
    if not cleaned:
        raise ValueError(f"{label} must contain visible text")
    return cleaned


def _resolve_config(args: argparse.Namespace) -> WorkspaceConfig:
    target = args.target.expanduser().resolve()
    if target.exists():
        raise FileExistsError(
            f"Target already exists: {target}. Choose a new folder; the initializer never overwrites a workspace."
        )
    if not target.parent.is_dir():
        raise FileNotFoundError(f"Target parent does not exist: {target.parent}")

    canonical_inputs = tuple(_clean_text(value, "canonical input") for value in args.canonical_input)
    return WorkspaceConfig(
        target=target,
        project_name=_clean_text(args.project_name, "project name"),
        objective=_clean_text(args.objective, "objective"),
        canonical_inputs=canonical_inputs,
        research_harness=args.research_harness,
        operations_harness=args.operations_harness,
        verification_harness=args.verification_harness,
        verification_mode=args.verification_mode,
        grounded_vault=args.grounded_vault,
    )


def _template_path(output_path: Path) -> Path:
    return TEMPLATE_ROOT / f"{output_path}.tmpl"


def _load_templates() -> dict[Path, str]:
    expected_files = {_template_path(path) for path in WORKSPACE_PATHS}
    actual_files = {path for path in TEMPLATE_ROOT.rglob("*") if path.is_file()}
    missing = sorted(str(path.relative_to(TEMPLATE_ROOT)) for path in expected_files - actual_files)
    unexpected = sorted(str(path.relative_to(TEMPLATE_ROOT)) for path in actual_files - expected_files)
    if missing or unexpected:
        details = []
        if missing:
            details.append(f"missing: {', '.join(missing)}")
        if unexpected:
            details.append(f"unexpected: {', '.join(unexpected)}")
        raise RuntimeError(f"Template inventory does not match the workspace contract ({'; '.join(details)})")
    return {path: _template_path(path).read_text(encoding="utf-8") for path in WORKSPACE_PATHS}


def _canonical_input_list(config: WorkspaceConfig) -> str:
    if not config.canonical_inputs:
        return "- No pre-existing canonical input was supplied."
    return "\n".join(f"- {value}" for value in config.canonical_inputs)


def _grounded_vault_status(config: WorkspaceConfig) -> str:
    if config.grounded_vault:
        return (
            "Required. Establish and verify the project-specific binding contract against "
            f"{GROUNDED_VAULT_URL} before treating claim grounding as active."
        )
    return (
        "Inactive. Activate only when substantive claims require machine-resolvable grounding "
        "and attributable human verification."
    )


def _template_context(config: WorkspaceConfig, output_path: Path) -> dict[str, str]:
    context = {
        "CANONICAL_INPUTS": _canonical_input_list(config),
        "CREATED_DATE": date.today().isoformat(),
        "GROUNDED_VAULT_STATUS": _grounded_vault_status(config),
        "OBJECTIVE": config.objective,
        "OPERATIONS_HARNESS": config.operations_harness,
        "PROJECT_NAME": config.project_name,
        "PROJECT_NAME_YAML": json.dumps(config.project_name, ensure_ascii=False),
        "RESEARCH_HARNESS": config.research_harness,
        "RMC_URL": RMC_URL,
        "TARGET_PATH": str(config.target),
        "VERIFICATION_HARNESS": config.verification_harness,
        "VERIFICATION_MODE": config.verification_mode,
    }
    if output_path == Path("mission-control/start-verification.md"):
        if config.verification_mode == "blind":
            context["VERIFICATION_READING_ORDER"] = (
                "Read `AGENTS.md`, `knowledge/INDEX.md`, `knowledge/project.md`, `knowledge/integration.md`, "
                "`communication/PROTOCOL.md`, `communication/INDEX.md`, and "
                "`communication/verification/state.md`. Do not read `knowledge/handoff.md`, producer reports, "
                "or producer reasoning before forming the initial Verification Finding."
            )
        else:
            context["VERIFICATION_READING_ORDER"] = (
                "Read `AGENTS.md`, `knowledge/INDEX.md`, `knowledge/project.md`, `knowledge/integration.md`, "
                "`knowledge/handoff.md`, `communication/PROTOCOL.md`, `communication/INDEX.md`, and "
                "`communication/verification/state.md`."
            )
    return context


def _render_template(template: str, context: dict[str, str], output_path: Path) -> str:
    placeholders = set(PLACEHOLDER_PATTERN.findall(template))
    unresolved = sorted(placeholders - context.keys())
    if unresolved:
        raise RuntimeError(f"Template {output_path} has unresolved placeholders: {', '.join(unresolved)}")

    rendered = template
    for name in sorted(placeholders):
        rendered = rendered.replace(f"{{{{{name}}}}}", context[name])
    return rendered.rstrip() + "\n"


def render_workspace(config: WorkspaceConfig) -> dict[Path, str]:
    """Render and validate every maintained workspace template in memory."""

    templates = _load_templates()
    return {
        path: _render_template(template, _template_context(config, path), path) for path, template in templates.items()
    }


def _write_workspace(root: Path, files: dict[Path, str]) -> None:
    for relative_path, content in files.items():
        destination = root / relative_path
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(content, encoding="utf-8", newline="\n")


def _verify_workspace(root: Path, config: WorkspaceConfig, files: dict[Path, str]) -> None:
    missing = [str(path) for path in files if not (root / path).is_file()]
    if missing:
        raise RuntimeError(f"Generated workspace is incomplete: {', '.join(missing)}")
    pointer_requirements = {
        Path("AGENTS.md"): ("knowledge/integration.md", "communication/PROTOCOL.md"),
        Path("knowledge/INDEX.md"): ("`integration.md`",),
        Path("knowledge/integration.md"): ("communication/PROTOCOL.md",),
        Path("communication/PROTOCOL.md"): ("knowledge/journal.md", "communication/INDEX.md"),
        Path("communication/INDEX.md"): (
            "research/state.md",
            "operations/state.md",
            "verification/state.md",
        ),
        Path("mission-control/start-research.md"): (
            str(config.target),
            "mission-control/roles/research-orchestrator.md",
            "knowledge/integration.md",
            "communication/research/state.md",
            "communication/research/outbox/",
        ),
        Path("mission-control/start-operations.md"): (
            str(config.target),
            "mission-control/roles/operational-orchestrator.md",
            "knowledge/integration.md",
            "communication/operations/state.md",
            "communication/operations/outbox/",
        ),
        Path("mission-control/start-verification.md"): (
            str(config.target),
            "mission-control/roles/verification-context.md",
            "knowledge/integration.md",
            "communication/verification/state.md",
            "communication/verification/outbox/",
        ),
    }
    for relative_path, required_texts in pointer_requirements.items():
        content = (root / relative_path).read_text(encoding="utf-8")
        for required_text in required_texts:
            if required_text not in content:
                raise RuntimeError(f"Generated pointer is missing from {relative_path}: {required_text}")

    role_bindings = {
        "research": Path("mission-control/roles/research-orchestrator.md"),
        "operations": Path("mission-control/roles/operational-orchestrator.md"),
        "verification": Path("mission-control/roles/verification-context.md"),
    }
    for role, role_path in role_bindings.items():
        start_path = Path(f"mission-control/start-{role}.md")
        start_contract = (root / start_path).read_text(encoding="utf-8")
        expected_reference = role_path.as_posix()
        role_references = [path.as_posix() for path in role_bindings.values() if path.as_posix() in start_contract]
        if role_references != [expected_reference]:
            raise RuntimeError(f"{start_path} must activate exactly {expected_reference}")

    review_boundary = "When this prompt is supplied for review, comparison, editing, or discussion"
    for role_path in role_bindings.values():
        role_contract = (root / role_path).read_text(encoding="utf-8")
        if review_boundary not in role_contract:
            raise RuntimeError(f"Generated role contract lacks its review boundary: {role_path}")

    research_role = (root / role_bindings["research"]).read_text(encoding="utf-8")
    if "Project-specific knowledge goes to the project's canonical knowledge location" not in research_role:
        raise RuntimeError("Research role lacks canonical project knowledge responsibility")
    for role in ("operations", "verification"):
        role_contract = (root / role_bindings[role]).read_text(encoding="utf-8")
        if "Do not write maintained `knowledge/` documents" not in role_contract:
            raise RuntimeError(f"{role} role lacks the canonical knowledge write boundary")

    verification_role = (root / role_bindings["verification"]).read_text(encoding="utf-8")
    if "report the complete independent finding to the operator" not in verification_role.lower():
        raise RuntimeError("Verification role does not report its complete finding directly to the Operator")
    if "not a security or secrecy guarantee" not in verification_role:
        raise RuntimeError("Verification role overstates blind-context secrecy")
    result = subprocess.run(
        ["git", "-C", str(root), "rev-parse", "--is-inside-work-tree"],
        check=True,
        capture_output=True,
        text=True,
    )
    if result.stdout.strip() != "true":
        raise RuntimeError("Generated workspace is not a Git worktree")


def build_workspace(config: WorkspaceConfig) -> Path:
    """Build and publish a new workspace without exposing a partial target."""

    files = render_workspace(config)
    staging = Path(tempfile.mkdtemp(prefix=f".{config.target.name}-rmc-", dir=config.target.parent)).resolve()
    try:
        _write_workspace(staging, files)
        subprocess.run(
            ["git", "init", "-b", "main", str(staging)],
            check=True,
            capture_output=True,
            text=True,
        )
        _verify_workspace(staging, config, files)
        staging.replace(config.target)
    except Exception:
        if staging.exists() and staging.parent == config.target.parent:
            shutil.rmtree(staging)
        raise
    return config.target


def _print_dry_run(config: WorkspaceConfig) -> None:
    files = render_workspace(config)
    print("OK   Dry run: templates and configuration are valid; no files were written")
    print(f"PLAN Target: {config.target}")
    for path in files:
        print(f"PLAN {path.as_posix()}")


def main() -> int:
    if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
        sys.stdout.reconfigure(encoding="utf-8")
    if sys.stderr.encoding and sys.stderr.encoding.lower() != "utf-8":
        sys.stderr.reconfigure(encoding="utf-8")

    try:
        args = _parse_args()
        config = _resolve_config(args)
        if args.dry_run:
            _print_dry_run(config)
            return 0
        target = build_workspace(config)
    except (FileExistsError, FileNotFoundError, OSError, RuntimeError, ValueError) as error:
        print(f"ERROR {error}", file=sys.stderr)
        return 1
    except subprocess.CalledProcessError as error:
        detail = error.stderr.strip() if error.stderr else str(error)
        print(f"ERROR Git initialization failed: {detail}", file=sys.stderr)
        return 1

    print(f"OK   Workspace: {target}")
    print("OK   Git: initialized on branch main; no commit or remote created")
    print("OK   Start contracts: Research, Operations, Verification")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
