# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] - 2026-04-19

### Added
- Server-side persistence for in-progress workouts (`GET/PUT/DELETE /api/workouts/draft`). Drafts survive logout, browser restart, and private mode; previously stored in browser storage only.
- Structured chat entries: confirmed sets are editable first-class objects with an explicit confirmation flag, instead of formatted strings that had to be pattern-matched. Individual sets and notes can be deleted.
- `AUTH_PROVIDER=dev` — skips authentication entirely for local development; no login, fixed `dev-user`. Not for production.
- `backend/scripts/dev-seed.ts` — populates the dev user with training plans and ~80 historic workouts over the last 90 days.
- Nginx `/api` reverse-proxy in the frontend container, so the local stack works without an external edge proxy.

### Changed
- Finishing a workout builds the save payload directly from structured entries, bypassing the Anthropic parser for the common case. The parser is only called when the workout consists of free-text notes with no confirmed sets.
- Upgraded both Docker images from Node 20 to Node 22 (current LTS).
- New-set defaults now prefer the values of the previously entered set in the current session, falling back to the matching set of the historic workout.
- Rate limiters (global + `/parse`) are skipped when `AUTH_PROVIDER=dev` to avoid 429s during local iteration.

### Removed
- `frontend/src/lib/chatSession.ts` — superseded by the server-side draft API.

## [0.4.0] - 2026-04

Complete UI redesign, AI plan generator, accordion workout tracking.

## [0.3.1] - 2026

- Accept null from LLM output, server-side workout date.

## [0.3.0] - 2026

- Separate local dev builds from ghcr.io images; `release` and `dev-deploy` commands.
