# Codex Adapter

Apply this adapter after `orchestrators/bootstrap.md` when the selected harness is Codex. The bootstrap remains the source for shared behavior.

## Mapping

- Use the current Codex task for the operator-facing Research Orchestrator.
- Represent an additional persistent Postdoc Orchestrator as a separate project-bound Codex task when that context boundary is selected and the operator has authorized its creation.
- Represent the Independent Verification Context as a separate fresh task with read-only production access and a direct operator return route. Ordinary Independent Verification may be named in the Research and Operations contracts. Only the operator decides whether to disclose or route its finding. Treat context separation as an assumption-control boundary rather than a security guarantee.
- Use a Codex subagent for a bounded Predoc Specialist assignment. Give it a self-contained start contract and require a Result with Evidence back to the accountable orchestrator.
- Use a fresh task or fresh subagent context for Blind or Shadow Verification. Blind mode changes the permitted reading order and does not conceal the verifier's identity or route. Only explicitly configured Shadow mode omits the verifier's identity, task identifier, working notes, finding, and route from the Research and Operations contracts; it also requires verified technical isolation and a private operator route. Supply only the verification packet permitted by the selected mode until the initial Verification Finding is sealed, then return the complete finding directly to the operator.
- Store authorized durable project instructions in the nearest applicable `AGENTS.md`. Preserve existing instructions and add only the selected contract delta.

Use the harness's available task, agent, permission, and project-context mechanisms. Do not encode a model name in the shared contracts. If a mapped capability is unavailable, preserve the role boundary in the current task and report the limitation.

Observe each configured return route before relying on it. A successful notification in one direction does not establish the reverse direction. Record a polling, re-entry, or operator-mediated fallback when automatic wake behavior is absent or unverified.
