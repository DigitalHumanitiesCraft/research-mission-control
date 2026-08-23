#!/usr/bin/env python3
"""Validate the canonical role prompts against their scenario contract.

The test reads the canonical prompt and the representative eval set, then
checks activation safety, canonical prompt paths, operator authority, independent
verification routing, result maturity, skill routing, and eval-schema integrity.
Run it from the repository root with
``python orchestrators/test_research_orchestrator_prompt.py``.

The portable contract in ``knowledge/method-specification.md`` defines the
tested behavior.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
PROMPT_PATH = HERE / "research-orchestrator.md"
OPERATIONS_PROMPT_PATH = HERE / "operational-orchestrator.md"
VERIFICATION_PROMPT_PATH = HERE / "verification-context.md"
EVALS_PATH = HERE / "evals" / "research-orchestrator.json"
README_PATH = HERE / "README.md"
SPECIFICATION_PATH = HERE.parent / "knowledge" / "method-specification.md"
CANONICAL_PATHS = (
    "orchestrators/research-orchestrator.md",
    "orchestrators/operational-orchestrator.md",
    "orchestrators/verification-context.md",
)
EXPECTED_EVAL_IDS = set(range(1, 9))

PROMPT_REQUIREMENTS = {
    "activation guard": (
        "supplied for review, comparison, editing, or discussion",
        "do not activate its role rules",
    ),
    "contained work": (
        "answer a contained question directly",
        "without creating a project, lane, milestone, task schema, or persistent document",
    ),
    "operator authority": (
        "research objectives",
        "rights and attribution",
        "publication",
        "external effects",
    ),
    "persistent workstream": (
        "objective and responsible function",
        "material dependencies",
        "verification and completion criterion",
        "canonical write-back target",
    ),
    "result maturity": (
        "active installation",
        "formal validation",
        "observed operation",
        "domain validation",
        "operator acceptance",
    ),
    "specialized routing": (
        "`leitstelle-profile`",
        "`lane-report`",
        "`lane-handoff`",
        "`leitstelle-sync`",
    ),
    "outcome-first communication": (
        "begin with the current result and its practical meaning",
        "operator's selected language",
    ),
    "context stream": (
        "research-owned outbox",
        "research-owned recipient state",
        "stable thread identifier",
        "do not wake another session",
        "operator-mediated trigger",
    ),
    "independent verification route": (
        "complete finding",
        "first and only",
        "only the operator decides whether to route that finding",
        "only after the operator routes it to you",
    ),
}

OPERATIONS_REQUIREMENTS = (
    "supplied for review, comparison, editing, or discussion",
    "do not activate its role rules",
    "operations-owned outbox",
    "operations-owned recipient state",
    "implementation brief",
    "result with evidence",
    "shared files transport state but do not wake another session",
    "task notice or result notice",
    "remains read-only against production artifacts",
    "reports its complete finding directly to the operator",
    "only the operator decides whether to disclose or route that finding",
    "only after the operator delivers it",
)

VERIFICATION_REQUIREMENTS = (
    "supplied for review, comparison, editing, or discussion",
    "do not activate its role rules",
    "separate control perspective",
    "not a third postdoc orchestrator",
    "report directly to the operator",
    "only in explicitly configured shadow mode",
    "receive your identity",
    "none of these modes is a security or secrecy guarantee",
    "operate read-only against production artifacts",
    "verification-owned outbox",
    "sole initial recipient for the complete verification finding is the operator",
    "the operator decides whether and when a finding is delivered",
    "do not publish the finding to research or operations outboxes",
    "do not infer delivery, authority, independence",
    "from file access alone",
)

LEGACY_CONTRACTS = {
    HERE / "knowledge-orchestrator.md": tuple(phrase for group in PROMPT_REQUIREMENTS.values() for phrase in group),
    HERE.parent / "ORCHESTRATOR.md": OPERATIONS_REQUIREMENTS,
    HERE / "verification-orchestrator.md": VERIFICATION_REQUIREMENTS,
}


def _load_evals() -> dict[str, object]:
    """Load the eval boundary as UTF-8 JSON and fail on malformed input."""

    return json.loads(EVALS_PATH.read_text(encoding="utf-8"))


def _check_prompt(prompt: str) -> list[str]:
    """Return missing contract phrases grouped by the behavior they protect."""

    lowered = prompt.lower()
    failures = []
    for behavior, phrases in PROMPT_REQUIREMENTS.items():
        missing = [phrase for phrase in phrases if phrase.lower() not in lowered]
        if missing:
            failures.append(f"{behavior}: missing {', '.join(missing)}")
    return failures


def _check_evals(payload: dict[str, object]) -> list[str]:
    """Validate prompt binding, schema, and representative scenario coverage."""

    failures = []
    if payload.get("prompt_name") != "research-orchestrator":
        failures.append("prompt_name must be research-orchestrator")
    if "skill_name" in payload:
        failures.append("role-prompt evals must not bind to a skill_name")

    evals = payload.get("evals")
    if not isinstance(evals, list) or len(evals) != len(EXPECTED_EVAL_IDS):
        return [*failures, f"evals must contain exactly {len(EXPECTED_EVAL_IDS)} representative cases"]

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

    if len(ids) != len(set(ids)):
        failures.append("eval ids must be unique")
    if set(ids) != EXPECTED_EVAL_IDS:
        failures.append("eval ids must match the required Research Orchestrator scenarios")

    compound_case = next((case for case in evals if isinstance(case, dict) and case.get("id") == 8), None)
    compound_text = json.dumps(compound_case, ensure_ascii=False).lower()
    for invariant in ("without activating", "does not create or publish", "does not disclose or route"):
        if invariant not in compound_text:
            failures.append(f"compound negative invariants: missing {invariant}")
    return failures


def _check_canonical_paths(role_prompts: tuple[str, ...]) -> list[str]:
    """Bind active contracts to canonical files and legacy compatibility pointers."""

    failures = []
    specification = SPECIFICATION_PATH.read_text(encoding="utf-8")
    readme = README_PATH.read_text(encoding="utf-8")
    for canonical_path in CANONICAL_PATHS:
        if canonical_path not in specification:
            failures.append(f"specification: missing canonical path {canonical_path}")
        if Path(canonical_path).name not in readme:
            failures.append(f"orchestrators README: missing {canonical_path}")

    for legacy_path, requirements in LEGACY_CONTRACTS.items():
        if not legacy_path.is_file():
            failures.append(f"legacy contract: missing {legacy_path.name}")
            continue
        legacy_prompt = legacy_path.read_text(encoding="utf-8")
        missing = [phrase for phrase in requirements if phrase.lower() not in legacy_prompt.lower()]
        if missing:
            failures.append(f"legacy contract {legacy_path.name}: missing {', '.join(missing)}")

    historical_role_name = "Verification and Integration Orchestrator"
    for prompt_path, prompt in zip(
        (PROMPT_PATH, OPERATIONS_PROMPT_PATH, VERIFICATION_PROMPT_PATH),
        role_prompts,
        strict=True,
    ):
        if historical_role_name in prompt:
            failures.append(f"canonical role: historical name remains active in {prompt_path.name}")
    return failures


def main() -> int:
    """Run the contract checks and print an auditable one-line result per group."""

    prompt = PROMPT_PATH.read_text(encoding="utf-8")
    operations_prompt = OPERATIONS_PROMPT_PATH.read_text(encoding="utf-8")
    verification_prompt = VERIFICATION_PROMPT_PATH.read_text(encoding="utf-8")
    payload = _load_evals()
    failures = _check_prompt(prompt) + _check_evals(payload)
    for role, role_prompt, requirements in (
        ("Operational Orchestrator", operations_prompt, OPERATIONS_REQUIREMENTS),
        ("Verification Context", verification_prompt, VERIFICATION_REQUIREMENTS),
    ):
        missing = [phrase for phrase in requirements if phrase.lower() not in role_prompt.lower()]
        if missing:
            failures.append(f"{role}: missing {', '.join(missing)}")
    failures.extend(_check_canonical_paths((prompt, operations_prompt, verification_prompt)))

    if failures:
        for failure in failures:
            print(f"ERROR {failure}", file=sys.stderr)
        return 1

    print(f"OK   Research Orchestrator prompt: {len(PROMPT_REQUIREMENTS)} behavior groups")
    print("OK   Canonical role paths and compatibility pointers")
    print("OK   Operational Orchestrator and Independent Verification Context boundaries")
    print(f"OK   Research Orchestrator evals: {len(EXPECTED_EVAL_IDS)} representative cases")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
