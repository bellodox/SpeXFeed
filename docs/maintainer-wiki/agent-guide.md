# Agent Guide

Use this wiki as the durable, repository-committed documentation layer for SpeXFeed.

## Rules for maintainers and agents

- Follow repository policy in `AGENTS.md`.
- Use `index.md` to find the correct page before adding new durable knowledge.
- Keep architecture and workflow facts backed by source evidence.
- Record uncertain facts as `UNVERIFIED` instead of guessing.
- Treat `.kilocode/rules/memory-bank/` as local-only and noncanonical.

## Where to put information

- Architecture and subsystem descriptions: concept pages
- Repeatable procedures: `workflows.md`
- Decisions with rationale: `decisions.md`
- Outstanding questions or cleanup tasks: `open-work.md`
- Tooling and dependency inventory: `tech-stack.md`

## Update discipline

- Prefer small, evidence-backed updates.
- Keep wiki pages synchronized with code changes that alter behavior.
- Add newly created wiki pages to `index.md` immediately.
