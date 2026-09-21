---
type: decision
status: accepted
date: 2026-09-21
tags: [naming]
project: cards-lite
---

# 002 — package name `cards-lite`, global `Cards`

## Context

The family names by subject with a `-lite` suffix. The name must be free on npm before the first
publish, because npm cannot attach a trusted publisher to a package that does not exist.

## Decision

Package `cards-lite`, global `Cards`, repo `investblog/cards-lite`, source `cards.js`, generated
`cards.min.js`, types `cards.d.ts`. Checked 2026-09-20: free on npm (E404) and free as a GitHub
repo under `investblog`. Alternates if either is taken before the first publish: `deck-lite`,
`playing-cards-lite`.

## Consequences

- `deck()` is a function inside `cards-lite`, not a separate package.
- The name is checked again on the day of the bootstrap publish, as roulette-lite's ADR 003 did.
