---
title: Contextual Choice of Orchestration and Verification
status: active
language: en
updated: 2026-10-17
related: [project, orchestration-architecture]
---

# Contextual Choice of Orchestration and Verification

## Purpose

This document helps choose direct work, delegation, hierarchy, and verification form. It provides judgement questions rather than a scoring rule. Project context determines the useful structure.

## Direct work

Use one working context when the next action is clear, the artifact space is contained, relevant knowledge fits reliably, and the result can be checked directly. One context can clarify the objective, implement an authorized change and perform production checks in a visible sequence. Independent Verification requires a separate review context.

Direct work remains appropriate for many substantial tasks when their reasoning and artifact state are tightly coupled. Agent count and general complexity do not establish a need for orchestration.

## Delegation

Delegate when at least one concrete benefit exceeds handoff and integration cost:

- independent workstreams can proceed in parallel;
- a question needs specialist expertise or a distinct source space;
- context separation protects focus or reveals hidden assumptions;
- another agent can produce an independently inspectable result.

Keep work together when every delegate would need the same evolving context or continuously change the assumptions of the others.

## Hierarchy

Add another orchestration layer only when it performs synthesis, conflict resolution, context reduction, responsibility management, or verification for a coherent subarea. Remove a layer that mainly forwards status.

## Verification choice

Choose the verification form by asking:

1. Can the result be judged from the artifact and explicit criteria?
2. How much implicit project context is necessary for a sound judgement?
3. Is the main risk a mechanical defect, a factual error, or a shared assumption?
4. What are the consequences of a missed error?
5. Would an outside perspective or another expertise add material information?

This produces four common choices:

- working-instance production checks for bounded, reversible, mechanically checkable, or strongly context-dependent work;
- fresh-context review for readability, usability, documentation, and architectural blind spots;
- independent specialist verification for consequential factual, scientific, security, and data-quality claims;
- two-stage verification for context-dependent work with significant consequences.

## Context required for independent verification

A separate verifier needs sufficient evaluation context:

- target and scope;
- criteria;
- artifacts and direct evidence;
- binding constraints and decisions;
- exclusions.

The full process history can weaken an outside perspective by reproducing the same assumptions. Supply it only where it is necessary for the criterion.

## Timing

- Implement internal and reversible work, then verify the result.
- Use a bounded experiment to resolve low-risk uncertainty.
- Verify public, destructive, identity-bearing, or difficult-to-reverse effects before they occur.
- Return consequential subject-matter uncertainty to Research and the human user.

## Coordination warning

Repeated planning is useful only when it resolves a named uncertainty, reduces material risk, or prepares a consequential decision. A clarification cycle should produce implementation, an experiment, evidence, a Verification Finding, or a Human Decision Point.

## Reduction principle

Use the smallest structure that preserves objective, authority, evidence, and responsibility. Expand it when another context creates material value and reduce it when coordination becomes the dominant output.

## References

1. Malone, T. W., and Crowston, K. (1990). *What Is Coordination Theory and How Can It Help Design Cooperative Work Systems?* https://doi.org/10.1145/99332.99367
2. Galbraith, J. R. (1974). *Organization Design: An Information Processing View.* https://doi.org/10.1287/inte.4.3.28
3. Kim, Y. et al. (2025). *Towards a Science of Scaling Agent Systems.* https://arxiv.org/abs/2512.08296
4. Anthropic (2025). *How We Built Our Multi-Agent Research System.* https://www.anthropic.com/engineering/multi-agent-research-system
