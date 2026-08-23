#!/usr/bin/env python3
"""Validate the portable bootstrap prompt, adapters, and eval contract.

The test binds the canonical bootstrap to its required behavior, keeps harness
details in adapter files, and checks representative eval coverage. Run it from
the repository root with ``python orchestrators/test_bootstrap_prompt.py``.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
PROMPT_PATH = HERE / "bootstrap.md"
CODEX_ADAPTER_PATH = HERE / "adapters" / "codex.md"
CLAUDE_ADAPTER_PATH = HERE / "adapters" / "claude-code.md"
EVALS_PATH = HERE / "evals" / "bootstrap.json"
PROMPTOTYPING_TEMPLATE_ROOT = HERE.parent / "skills" / "research-mission-control" / "assets" / "templates" / "knowledge"

PROMPT_REQUIREMENTS = {
    "activation boundary": (
        "supplied for review, comparison, editing, or discussion",
        "do not activate its role rules",
    ),
    "question limit and recommendation": (
        "never ask more than three configuration questions in total",
        "use the operator's language",
        "language selection never consumes one of the three questions",
        "user may answer any numbered item",
        '"what do you recommend?"',
        '"was empfiehlst du?"',
        "least structural option",
        "do not ask the operator to confirm the recommended default",
        "first substantive response",
        "local-only or still requires remote authorization",
        "context stream transports messages through shared files and does not wake another working context",
        "up to five short conceptual questions",
    ),
    "clear configuration concepts": (
        "research mission control (https://github.com/digitalhumanitiescraft/research-mission-control)",
        "a **working context** is the currently open codex task, claude code conversation",
        "the **project workspace** is the shared local folder and git worktree",
        "**project inputs** are the data, documents, materials, code, repositories, or authorized knowledge sources",
        "which role should this working context assume",
        "what criteria will the operator use to accept that result",
        "inspect and inventory material already present there",
    ),
    "repositories": (
        "https://github.com/digitalhumanitiescraft/research-mission-control",
        "https://github.com/digitalhumanitiescraft/promptotyping",
        "https://github.com/digitalhumanitiescraft/promptotyping/tree/main/_content/promptotyping-document",
        "https://github.com/digitalhumanitiescraft/grounded-vault",
        "create only its mandatory core and the documents whose triggers hold",
    ),
    "standard shared workspace": (
        "first is the operator-facing research orchestrator",
        "second is the operational orchestrator",
        "third is an independent verification context",
        "same local workspace and canonical configuration",
        "omit its identity",
        "none of these modes is a security guarantee",
        "orchestrators/research-orchestrator.md",
        "orchestrators/operational-orchestrator.md",
        "orchestrators/verification-context.md",
    ),
    "safe initialization": (
        "invoke the installable research mission control skill or scaffolder",
        "inspect the target path before initialization",
        "refuses every existing target without modifying it",
        "adopting an existing repository is a separate migration",
        "never claim that a file, repository, or configuration exists without direct verification",
    ),
    "external authorization": (
        "does not authorize github remote creation",
        "publication",
        "rights or attribution decisions",
        "other external effects",
    ),
    "functional metaphor": (
        "research director",
        "exactly two primary postdoc roles",
        "research orchestrator",
        "operational orchestrator",
        "predoc specialists",
    ),
    "exchange functions": (
        "implementation brief",
        "result with evidence",
        "verification finding",
    ),
    "context stream": (
        "context stream protocol",
        "own immutable outbox",
        "recipient owns its state file",
        "stable thread identifier",
        "communication/index.md",
        "re-entry cost becomes material",
        "no universal numeric compaction threshold",
        "direct communication protocol",
        "file transport grants no authority and does not wake a session",
        "notification symmetry must not be inferred",
        "numerical capsule thresholds are project-profile settings",
        "immutable operations-owned result with evidence",
        "do not create an undeclared multi-writer handoff file",
    ),
    "grounded binding": (
        "required; project-specific binding pending",
        "active only after that binding has been established and verified",
    ),
    "blind shadow verification": (
        "technically isolated shadow lane",
        "withhold the named producer reasoning",
        "until the verifier seals the initial verification finding",
    ),
    "cross-cutting verification": (
        "verification is a cross-cutting control function rather than a third primary postdoc role",
        "working context",
        "fresh context",
        "independent specialist",
    ),
    "decision ladder": (
        "bounded predoc specialist resolves reversible routine details",
        "responsible postdoc orchestrator resolves more complex questions",
        "operator decides consequential objectives",
        "condensed results with evidence and verification findings",
    ),
    "authority": (
        "reversible local actions",
        "rights and attribution",
        "difficult-to-reverse consequences",
    ),
    "start contracts": (
        "contract 1: research orchestrator",
        "contract 2: operational orchestrator",
        "contract 3: independent verification context",
        "repeat the exact same `workspace` and `canonical config` paths",
        "context stream",
        "communication/protocol.md",
        "role prompt",
        "report the complete finding directly to the operator",
    ),
    "harness capability boundary": (
        "skills and tools supply procedures; the role contract supplies authority",
        "complete capability catalogue does not belong in the shared prompt",
        "notification and wake behavior",
        "polling, re-entry, or operator-mediated fallback",
    ),
}

ADAPTER_REQUIREMENTS = {
    "codex": (
        CODEX_ADAPTER_PATH,
        ("current codex task", "codex subagent", "`agents.md`"),
    ),
    "claude code": (
        CLAUDE_ADAPTER_PATH,
        ("current claude code session", "agent or team mechanism", "`claude.md`"),
    ),
}

EXPECTED_EVAL_IDS = {
    "contained-work",
    "three-context-initialization",
    "existing-non-empty-folder",
    "remote-authorization-boundary",
    "two-orchestrators",
    "optional-grounded-vault",
    "context-stream-integrity",
    "blind-verification",
    "operator-facing-verification-context",
    "operator-decision",
    "asymmetric-return-route",
    "review-without-activation",
    "compound-negative-invariants",
}
PROMPTOTYPING_CORE = {
    "INDEX.md.tmpl",
    "project.md.tmpl",
    "specification.md.tmpl",
    "journal.md.tmpl",
    "handoff.md.tmpl",
}


def _load_evals() -> dict[str, object]:
    """Load the UTF-8 eval boundary and fail fast on malformed JSON."""

    return json.loads(EVALS_PATH.read_text(encoding="utf-8"))


def _missing_phrases(text: str, phrases: tuple[str, ...]) -> list[str]:
    """Return contract phrases absent from a case-insensitive text boundary."""

    lowered = text.lower()
    return [phrase for phrase in phrases if phrase.lower() not in lowered]


def _check_prompt(prompt: str) -> list[str]:
    """Check shared behavior and prevent harness details from leaking inward."""

    failures = []
    for behavior, phrases in PROMPT_REQUIREMENTS.items():
        missing = _missing_phrases(prompt, phrases)
        if missing:
            failures.append(f"{behavior}: missing {', '.join(missing)}")

    question_block = prompt.split("## Configuration questions", maxsplit=1)[1].split(
        'The user may answer any numbered item with "What do you recommend?"', maxsplit=1
    )[0]
    question_lines = [
        line for line in question_block.splitlines() if line.startswith(tuple(f"{number}. " for number in range(1, 10)))
    ]
    if len(question_lines) != 3:
        failures.append(f"configuration questions: expected 3, found {len(question_lines)}")

    for leaked_detail in ("AGENTS.md", "CLAUDE.md", "Codex subagent", "Claude Code session"):
        if leaked_detail.lower() in prompt.lower():
            failures.append(f"shared prompt: harness detail leaked: {leaked_detail}")
    if "Verification and Integration Orchestrator" in prompt:
        failures.append("role model: verification must not be a third primary Postdoc role")
    return failures


def _check_adapters() -> list[str]:
    """Check that each thin adapter maps the shared contract to its harness."""

    failures = []
    for name, (path, phrases) in ADAPTER_REQUIREMENTS.items():
        adapter = path.read_text(encoding="utf-8")
        missing = _missing_phrases(adapter, phrases)
        if missing:
            failures.append(f"{name} adapter: missing {', '.join(missing)}")
        if "orchestrators/bootstrap.md" not in adapter:
            failures.append(f"{name} adapter: missing shared bootstrap reference")
        lowered = adapter.lower()
        if "ordinary independent verification may be named" not in lowered:
            failures.append(f"{name} adapter: ordinary Independent visibility is unclear")
        if "blind mode changes the permitted reading order" not in lowered:
            failures.append(f"{name} adapter: Blind reading-order boundary is unclear")
        if "only explicitly configured shadow mode omits" not in lowered:
            failures.append(f"{name} adapter: Shadow visibility boundary is unclear")
        if "do not include its identity" in lowered or "blind shadow verification" in lowered:
            failures.append(f"{name} adapter: obsolete Independent/Blind/Shadow semantics remain")
    return failures


def _check_evals(payload: dict[str, object]) -> list[str]:
    """Validate eval structure and exact representative scenario coverage."""

    failures = []
    if payload.get("prompt_name") != "research-mission-control-bootstrap":
        failures.append("prompt_name must be research-mission-control-bootstrap")

    evals = payload.get("evals")
    if not isinstance(evals, list):
        return [*failures, "evals must be a list"]

    ids = []
    for index, case in enumerate(evals, start=1):
        if not isinstance(case, dict):
            failures.append(f"eval {index}: case must be an object")
            continue
        ids.append(case.get("id"))
        for field in ("id", "prompt", "expected_output", "files", "expectations"):
            if field not in case:
                failures.append(f"eval {index}: missing {field}")
        expectations = case.get("expectations")
        if not isinstance(expectations, list) or not expectations:
            failures.append(f"eval {index}: expectations must be a non-empty list")

    if set(ids) != EXPECTED_EVAL_IDS:
        failures.append("eval ids must match the required bootstrap scenarios")
    if len(ids) != len(set(ids)):
        failures.append("eval ids must be unique")

    compound_case = next(
        (case for case in evals if isinstance(case, dict) and case.get("id") == "compound-negative-invariants"),
        None,
    )
    compound_text = json.dumps(compound_case, ensure_ascii=False).lower()
    for invariant in ("does not activate", "does not modify", "does not create or publish", "does not grant"):
        if invariant not in compound_text:
            failures.append(f"compound negative invariants: missing {invariant}")
    return failures


def _check_promptotyping_templates() -> list[str]:
    """Bind generated knowledge to the maintained Promptotyping profile."""
    failures = []
    actual_core = {path.name for path in PROMPTOTYPING_TEMPLATE_ROOT.glob("*.md.tmpl")} - {"integration.md.tmpl"}
    if actual_core != PROMPTOTYPING_CORE:
        failures.append("Promptotyping core templates must match the five maintained knowledge documents")

    method_binding = "name: Promptotyping\n  url: https://github.com/DigitalHumanitiesCraft/Promptotyping"
    for path in sorted(PROMPTOTYPING_TEMPLATE_ROOT.glob("*.md.tmpl")):
        if method_binding not in path.read_text(encoding="utf-8"):
            failures.append(f"Promptotyping template binding missing in {path.name}")

    integration = (PROMPTOTYPING_TEMPLATE_ROOT / "integration.md.tmpl").read_text(encoding="utf-8")
    if "version: 0.3" not in integration:
        failures.append("Promptotyping integration template must declare compatible version 0.3")
    if "https://dhcraft.org/Promptotyping/promptotyping-document/integration" not in integration:
        failures.append("Promptotyping integration template must retain its canonical template URL")
    return failures


def main() -> int:
    """Run contract checks and print one auditable result per boundary."""

    prompt = PROMPT_PATH.read_text(encoding="utf-8")
    payload = _load_evals()
    failures = _check_prompt(prompt) + _check_adapters() + _check_evals(payload) + _check_promptotyping_templates()

    if failures:
        for failure in failures:
            print(f"ERROR {failure}", file=sys.stderr)
        return 1

    print(f"OK   Bootstrap prompt: {len(PROMPT_REQUIREMENTS)} behavior groups, 3 questions")
    print("OK   Harness adapters: Codex and Claude Code")
    print("OK   Promptotyping core and integration-template compatibility")
    print(f"OK   Bootstrap evals: {len(EXPECTED_EVAL_IDS)} representative cases")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
