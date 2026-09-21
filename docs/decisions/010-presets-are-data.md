---
type: decision
status: accepted
date: 2026-09-21
tags: [scope]
project: cards-lite
---

# 010 — poker and blackjack as named presets: data, never a game

## Context

The library ships the ten poker hands and the blackjack motifs. The pressure to add "just a
total", or "which hand wins", will arrive.

## Decision

A preset is **which cards and which layout**. The arrow runs one way only: name \u2192 cards. There is
**no evaluator, no comparison, no ranking, no scoring, no game state, no shoe**.

Every category is correct **by construction**, so there is no predicate a reader could mistake for
a scorer: a straight is a five-long slice of `A23456789TJQKA` (`s = 9` is the royal, `s = 0` the
wheel); a flush is that slice with an interior rank dropped and one added outside it, which can
neither fill nor extend the hole; paired hands come from `pick()`, a partial Fisher\u2013Yates over
distinct ranks. A paired hand cannot also be a flush (a pair is two suits) or a straight (five
distinct ranks are required), so those checks do not exist either.

Display order is high\u2192low with grouped ranks first. A comparator is not an evaluator: it is ~20 B
and it is called `order`, not `rank`.

## Consequences

- The seed never changes what the 7\u2665 looks like; it may change whether the 7\u2665 is in the hand.
- `cards` pins exact cards for anyone who needs a specific picture.
- The tests carry **their own hand evaluator, written longhand**, so a test cannot share the
  code's mistake \u2014 the library has none to share.
- The precedent is `table()`, which draws the betting layout and resolves no bet. An evaluator
  would be ~400 B and would turn a picture library into something a reader could mistake for a
  gambling engine.
