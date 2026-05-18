# Directory Boundaries

## Purpose

This document defines repository placement rules for Toitoi.

The goal is to keep directory intent stable as the project grows.

---

## Core Rule

Place files by **responsibility**, not by temporary implementation state.

When in doubt, ask:

1. Is this deployed runtime logic?
2. Is this infrastructure operation material?
3. Is this reusable module code?
4. Is this explanatory or conceptual documentation?

---

## Directory Roles

### `apps/`

Runtime applications and user-facing services.

Examples:

- frontend app
- edge AI application
- API runtime (if code is in this repository)

Use `apps/` when the artifact is a deployable runtime unit.

---

### `infra/`

Operational assets for running infrastructure modules.

Examples:

- relay setup and operations docs
- indexer API deployment/setup docs
- future `docker-compose`, `Caddyfile`, `pm2` configs, monitoring assets

Use `infra/` when the artifact exists to operate infrastructure, even if it is currently documentation-first.

---

### `packages/`

Reusable code modules consumed by multiple apps/services.

Examples:

- transport adapters
- canonical conversion library
- shared protocol utilities

Use `packages/` only for reusable library-style modules, not for deployment guides.

---

### `docs/`

Cross-cutting documentation not owned by a single runtime/infra module.

Examples:

- architecture principles
- protocol specs
- concepts, essays, roadmap

Use `docs/` for project-level knowledge and specifications.

---

## Placement Decision Guide

- Deployable application logic: `apps/`
- Infrastructure operations and setup: `infra/`
- Reusable shared code: `packages/`
- Cross-module conceptual/spec docs: `docs/`

---

## Migration Policy

1. Prefer stable role naming over short-term convenience.
2. Move files only when ownership/responsibility changes.
3. Update all internal links in the same change.
4. Keep README and `REPOSITORY_STRUCTURE.md` aligned with actual layout.

