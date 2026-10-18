# Claude Code Adapter

Apply this adapter after `SYSTEM-PROMPT.md` when the selected harness is Claude Code. The complete system prompt remains the source for shared behavior.

## Mapping

- For a new standard setup, use the current Claude Code session for the human-facing Research Orchestrator. An existing Operations or Verification context follows its verified start contract without silent role conversion or a second initialization.
- Represent an additional persistent Postdoc Orchestrator with a separate session or team agent when that context boundary is selected and the human user has authorized its creation.
- Represent the Independent Verification Agent as a separate fresh session with read-only production access and a direct human user return route. Ordinary Independent Verification may be named in the Research and Operations contracts. Only the human user decides whether to disclose or route its finding. Treat context separation as an assumption-control boundary rather than a security guarantee.
- Use the Agent or team mechanism for a bounded Predoc Specialist assignment. Give it a self-contained start contract and require a Result with Evidence back to the responsible orchestrator.
- Use a fresh session or agent context for Blind or Shadow Verification. Blind mode changes the permitted reading order and does not conceal the verifier's identity or route. Only explicitly configured Shadow mode omits the verifier's identity, session identifier, working notes, finding, and route from the Research and Operations contracts; it also requires verified technical isolation and a private human user route. Supply only the verification packet permitted by the selected mode until the initial Verification Finding is sealed, then return the complete finding directly to the human user.
- Store authorized durable project instructions in the applicable `CLAUDE.md`. Preserve existing instructions and add only the selected contract delta.

Use the harness's available session, agent, permission, and project-context mechanisms. Do not encode a model name in the shared contracts. If a mapped capability is unavailable, retain the existing authorized assignment and report the missing capability. A same-session production check cannot substitute for Independent or Shadow Verification. Both require a separate review context and the portable human-only initial return route. An automatic child callback to the producer does not meet that route. Private pilot callbacks follow a separate deployment contract and do not establish portable conformance.

Observe each configured return route before relying on it. A successful notification in one direction does not establish the reverse direction. Record a polling, re-entry, or human-mediated fallback when automatic wake behavior is absent or unverified.
