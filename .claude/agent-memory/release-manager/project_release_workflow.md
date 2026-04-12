---
name: Release workflow configuration
description: How the gains release pipeline works — trigger mechanism, image naming, compose setup, and SSH workaround
type: project
---

The release workflow at `.github/workflows/release.yml` is triggered by tag pushes matching `v*`.

It builds multi-arch Docker images (amd64 + arm64) for both backend and frontend, pushes them to GHCR, creates multi-arch manifests, and then creates a GitHub Release with auto-generated notes.

**Why:** Automated release pipeline ensures consistent multi-arch images on every tagged release.

**How to apply:**
- Images are published as `ghcr.io/duelidave/gains-backend:<version>` and `ghcr.io/duelidave/gains-frontend:<version>` (plus `latest`).
- The version tag strips the `v` prefix for image tags (v0.4.0 -> 0.4.0).
- `docker-compose.yml` references `latest` tags (not version-pinned) — this is the production compose file.
- `docker-compose.dev.yml` and `docker-compose.override.yml` exist for local development.
- SSH push fails on this machine; use `gh auth setup-git` and switch to HTTPS, then restore SSH remote URL after push.
- The workflow creates a GitHub Release automatically, but with minimal notes — update it with a proper changelog via `gh release edit`.
- As of 2026-03-28, GitHub Actions warn about Node.js 20 deprecation (forced Node.js 24 from 2026-06-02).
