# Role prompts

[`../SYSTEM-PROMPT.md`](../SYSTEM-PROMPT.md) is the single user-facing initialization contract. It selects the smallest sufficient configuration and, when three working contexts are useful, binds the following canonical role prompts to one verified workspace.

| Context | Canonical prompt | Function |
| --- | --- | --- |
| 1 | [`research-orchestrator.md`](research-orchestrator.md) | LLM-based Research Orchestrator; develops objectives, evidence, criteria, interpretations, and Implementation Briefs with the human user |
| 2 | [`operational-orchestrator.md`](operational-orchestrator.md) | LLM-based Operational Orchestrator; implements authorized briefs and integrates bounded specialist work |
| 3 | [`independent-verification-agent.md`](independent-verification-agent.md) | LLM-based Independent Verification Agent; examines artifacts in a separate read-only working context and reports to the human user |

The first two roles are the primary production orchestrators. Independent Verification is a cross-cutting control function. Blind Verification adds a declared reading-order restriction. Shadow Verification additionally requires verified technical isolation and a private human return route. None of these modes establishes secrecy or security.

Persistent exchange uses the Context Stream Protocol:

```text
PRIMARY ROUTE

User as Research Director ↔ Research Orchestrator
                                  │ Implementation Brief
                                  ▼
                          Operational Orchestrator
                                  │ Result with Evidence
                                  ▼
                      Independent Verification Agent
                                  │ Verification Finding
                                  ▼
                        User as Research Director

SUPPORTING ROUTES

Operational Orchestrator ↔ Specialist Agents
Operational Orchestrator ── Operations Result Notice ──→ Research Orchestrator
User as Research Director ── optional finding route ──→ Research or Operations
```

Harness-specific mappings remain in [`adapters/codex.md`](adapters/codex.md) and [`adapters/claude-code.md`](adapters/claude-code.md). They adapt tasks, conversations, subagents, instruction files, and notification behavior without redefining the shared role semantics.

Historical filenames are compatibility pointers:

- [`knowledge-orchestrator.md`](knowledge-orchestrator.md) points to `research-orchestrator.md`;
- [`verification-orchestrator.md`](verification-orchestrator.md) points to `independent-verification-agent.md`;
- root [`ORCHESTRATOR.md`](../ORCHESTRATOR.md) points to `operational-orchestrator.md`.

Run the prompt contracts from the repository root:

```bash
python orchestrators/test_research_orchestrator_prompt.py
python orchestrators/test_system_prompt.py
```

The representative scenarios are stored in [`evals/research-orchestrator.json`](evals/research-orchestrator.json) and [`evals/system-prompt.json`](evals/system-prompt.json).
