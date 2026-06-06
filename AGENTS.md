# SpeXFeed Agent Guide

SpeXFeed is an Angular-based Nostr client for public and personal notes, relay management, articles, badges, files, and profile-centric social workflows.

## Source of truth

- Durable project documentation lives in `docs/maintainer-wiki/`.
- Start with `docs/maintainer-wiki/index.md` for the wiki catalog.
- Volatile session context, when present, lives in `.kilocode/rules/memory-bank/` and is local-only and noncanonical.
- Code and configuration override assumptions when documentation is stale.

## Maintainer workflow

- Keep architecture, workflows, decisions, and open questions in the maintainer wiki.
- Use evidence-backed citations to repository files when recording technical facts.
- Mark uncertain facts as `UNVERIFIED` until confirmed from code or configuration.

## Security and documentation rules

- Do not store secrets, tokens, private keys, or credentials in documentation or memory files.
- Treat browser storage, relay metadata, and user-generated content as security-relevant areas.
- Validate documentation changes against current code paths before committing.

## Validation

- Run `npm run build` for integration-level validation after substantial application changes.
- Run `npm run test` for unit-test validation when modifying tested behavior.
- When documentation changes describe commands, keep them aligned with `package.json`.

## Memory updates

- If `.kilocode/rules/memory-bank/` exists, keep `context.md` and `active.md` current during multi-step work.
- Do not treat memory-bank content as canonical project truth.
