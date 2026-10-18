"""Cross-layer contracts for the portable Research Mission Control method."""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ROLE_BINDINGS = {
    "research": "research-orchestrator.md",
    "operations": "operational-orchestrator.md",
    "verification": "independent-verification-agent.md",
}


def test_system_prompt_role_paths_resolve_in_the_generated_workspace(tmp_path: Path) -> None:
    prompt = (ROOT / "SYSTEM-PROMPT.md").read_text(encoding="utf-8")
    contracts = prompt.split("### Ready-to-paste contracts", 1)[1].split("```text", 1)[1].split("```", 1)[0]
    roles = re.findall(r"(?m)^ROLE PROMPT\n(\S+)$", contracts)
    assert len(roles) == len(ROLE_BINDINGS)
    target = tmp_path / "role-path-check"
    subprocess.run(
        [
            sys.executable,
            str(ROOT / "skills/research-mission-control/scripts/init_workspace.py"),
            "--target",
            str(target),
            "--project-name",
            "Fictional handover study",
            "--objective",
            "Derive source-linked handover requirements.",
            "--research-harness",
            "other",
            "--operations-harness",
            "other",
            "--verification-harness",
            "other",
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    for role in roles:
        assert (target / role).is_file(), role


def test_packaged_role_templates_match_canonical_prompts() -> None:
    for role_file in ROLE_BINDINGS.values():
        canonical = ROOT / "orchestrators" / role_file
        template = (
            ROOT
            / "skills"
            / "research-mission-control"
            / "assets"
            / "templates"
            / "mission-control"
            / "roles"
            / f"{role_file}.tmpl"
        )
        assert template.read_bytes() == canonical.read_bytes(), f"Packaged role drifted: {role_file}"


def test_start_bindings_activate_one_complete_local_role() -> None:
    template_root = ROOT / "skills" / "research-mission-control" / "assets" / "templates" / "mission-control"
    all_role_paths = {f"mission-control/roles/{role_file}" for role_file in ROLE_BINDINGS.values()}

    for start_name, role_file in ROLE_BINDINGS.items():
        start = (template_root / f"start-{start_name}.md.tmpl").read_text(encoding="utf-8")
        expected = f"mission-control/roles/{role_file}"
        referenced = {role_path for role_path in all_role_paths if role_path in start}
        assert referenced == {expected}
        assert "knowledge/integration.md" in start
        assert "does not replace or abbreviate that contract" in start

    verification_start = (template_root / "start-verification.md.tmpl").read_text(encoding="utf-8")
    assert "read-only against evaluated project artifacts" in verification_start
    assert "Verification-owned outbox and state record reporting and receipt" in verification_start


def test_public_manifest_contains_every_packaged_role_template() -> None:
    manifest = json.loads((ROOT / "publication-manifest.json").read_text(encoding="utf-8"))
    included = set(manifest["include"])
    for role_file in ROLE_BINDINGS.values():
        expected = f"skills/research-mission-control/assets/templates/mission-control/roles/{role_file}.tmpl"
        assert expected in included


def test_active_role_semantics_use_human_controlled_verification() -> None:
    active_files = [
        ROOT / "orchestrators" / "research-orchestrator.md",
        ROOT / "orchestrators" / "operational-orchestrator.md",
        ROOT / "orchestrators" / "independent-verification-agent.md",
        ROOT / "knowledge" / "orchestration-architecture.md",
        ROOT / "knowledge" / "project-governance.md",
        ROOT / "knowledge" / "method-specification.md",
    ]
    combined = "\n".join(path.read_text(encoding="utf-8") for path in active_files)
    assert "reports its complete finding directly to the human user" in combined
    assert "Only the human user decides" in combined
    assert "Verification and Integration Orchestrator selects" not in combined


def test_reference_context_stream_has_one_responsible_route() -> None:
    skill = (ROOT / "skills" / "research-mission-control" / "SKILL.md").read_text(encoding="utf-8")
    operational = (ROOT / "orchestrators" / "operational-orchestrator.md").read_text(encoding="utf-8")
    protocol = (
        ROOT / "skills" / "research-mission-control" / "assets" / "templates" / "communication" / "PROTOCOL.md.tmpl"
    ).read_text(encoding="utf-8")

    assert "Operations addresses the complete Result with Evidence to Verification" in skill
    assert "In the reference three-context profile that recipient is Verification" in operational
    assert "Operations addresses the complete Result with Evidence to Verification" in protocol
    assert "Blind adds a declared reading-order restriction" in skill
    assert "Shadow adds verified technical isolation" in skill
    assert "No mode provides a security or secrecy guarantee" in skill
    assert "Never invent a time or UTC offset" in protocol
    assert "does not duplicate the authoritative latest-message cursors" in protocol
    assert "A directory-wide claim requires a baseline manifest" in protocol
    assert "when a running recipient polls or reads the file" in protocol

    verification = (ROOT / "orchestrators" / "independent-verification-agent.md").read_text(encoding="utf-8")
    assert "historical non-change claim" in verification
    assert "Check message dates and times against an observed clock" in verification

    operational = (ROOT / "orchestrators" / "operational-orchestrator.md").read_text(encoding="utf-8")
    assert "Git diff commands may omit untracked files" in operational
    assert "Never imply that the human user will route it" in operational

    integration_template = (
        ROOT / "skills" / "research-mission-control" / "assets" / "templates" / "knowledge" / "integration.md.tmpl"
    ).read_text(encoding="utf-8")
    assert "does not determine when a running session polls or reads a message" in integration_template


def test_public_entry_surfaces_show_the_reference_route() -> None:
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    index = (ROOT / "index.html").read_text(encoding="utf-8")

    assert "User as Research Director" in readme
    method = (ROOT / "knowledge/system-description.md").read_text(encoding="utf-8")
    assert 'href="./docs/knowledge/system-description.html"' in index
    assert "Independent Verification examines a bounded result in a separate read-only context" in method
    assert "returns its complete finding first to the human user, who controls subsequent routing" in method
    assert "A proposed extension needs its corresponding authority." in method
    assert "Human acceptance remains its own judgement" in method
    assert "roles, assignments or running sessions" in (ROOT / "examples/knowledge/README.md").read_text(
        encoding="utf-8"
    )
    assert "[handoff contract](research-to-operations-handoff.md)" in method
    assert "Research verifies and integrates into canonical project knowledge" not in index


def test_public_entry_surfaces_bind_the_evaluated_live_demo() -> None:
    video_url = "https://www.youtube.com/watch?v=B7TCJjcVA2k"
    manifest = json.loads((ROOT / "publication-manifest.json").read_text(encoding="utf-8"))
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    index = (ROOT / "index.html").read_text(encoding="utf-8")
    observation = (ROOT / "knowledge" / "observed-live-demo-operation.md").read_text(encoding="utf-8")

    assert video_url in readme
    assert video_url in index
    assert video_url in observation
    assert "earlier operating state" in readme
    assert "does not define the current method contract" in observation
    assert "knowledge/observed-live-demo-operation.md" in manifest["include"]


def test_artifact_relationship_and_bounded_verification_are_portable() -> None:
    paths = [
        ROOT / "SYSTEM-PROMPT.md",
        ROOT / "knowledge" / "research-to-operations-handoff.md",
        ROOT / "knowledge" / "method-specification.md",
        ROOT / "orchestrators" / "research-orchestrator.md",
        ROOT / "orchestrators" / "operational-orchestrator.md",
        ROOT / "skills" / "research-mission-control" / "SKILL.md",
    ]
    combined = "\n".join(path.read_text(encoding="utf-8") for path in paths).lower()

    assert "preserved, reused, adapted, or may be replaced" in combined
    assert "before generating a substitute" in combined

    verification_paths = [
        ROOT / "SYSTEM-PROMPT.md",
        ROOT / "knowledge" / "research-to-operations-handoff.md",
        ROOT / "knowledge" / "method-specification.md",
        ROOT / "orchestrators" / "independent-verification-agent.md",
        ROOT / "skills" / "research-mission-control" / "SKILL.md",
    ]
    verification = "\n".join(path.read_text(encoding="utf-8") for path in verification_paths).lower()
    assert "bounded target, criterion, evidence packet, and completion condition" in verification
    assert "operational monitoring" in verification
