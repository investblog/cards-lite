# Releasing cards-lite

No npm token ever enters this repository's code, its CI secrets beyond one day, or any agent's
hands. Releases publish via **OIDC Trusted Publishing** with provenance
(`.github/workflows/release.yml`). Every outward step below is taken on the maintainer's explicit
go — creating the repository, the token, the publish.

## One-time bootstrap (v0.1.0)

npm cannot attach a trusted publisher to a package that does not exist yet (hexagons,
2026-08-09), so the first version goes out over a token and every later one over OIDC.

**Before any of it, the account must be publish-ready** (roulette-lite, 2026-09-18): npm freezes an
account for 72 hours after a recovery-code sign-in — publishing, token creation and account
settings all stop, and no new credential shortens it. So the second factor must be a working
passkey or security key *before* a release, and a recovery code must never be spent on the way to
one.

1. **The repository goes public the same day as the publish.** The name is free on npm and GitHub
   until the first publish (checked 2026-09-20); a public repo announces it.
   `git branch -M main` first — `git init` left this repo on `master`, and `ci.yml` watches `main`,
   so a push before the rename runs no CI at all. Then `gh repo create investblog/cards-lite
   --public`, push `main`, enable Pages
   (`investblog.github.io/cards-lite/` must answer 200 — it serves `index.html`, the playground),
   and wait for CI to be green.
2. npmjs.com → Access Tokens → **Granular** (classic Automation tokens are gone, 2026-09-20),
   shortest expiry, and exactly these three settings:
   **All packages** — an unpublished unscoped package cannot be picked by name;
   **Read and write (publish and stage)** — *stage only* is refused by `npm publish`;
   **Bypass 2FA** — without it CI gets `EOTP`. Direct publishing with a bypass-2FA token is
   itself due to end around January 2027, which is another reason the token path is one-time.
3. GitHub → Settings → Secrets and variables → Actions → `NPM_TOKEN`. The maintainer pastes it
   directly; it passes through no chat, file, or agent.
4. **`npm version minor`** — `package.json` is born at `0.0.0` and the bootstrap publishes
   whatever the ref carries, so skipping this puts **cards-lite@0.0.0** on the registry for good.
   Commit it and push **the branch only, not the tag**: a tag fires `release.yml` before the
   trusted publisher exists, which is the masked-403 `404 Not Found - PUT` below. The workflow
   refuses to run at `0.0.0` as a backstop, but the version is the maintainer's to set.
5. Actions → **Bootstrap publish (one-time)** → Run workflow. It checks the token's shape, re-runs
   the gates, verifies the tarball, and publishes with `--provenance`.
6. **The same day:** configure the Trusted Publisher (below), then push the `v0.1.0` tag (its
   run exits green on the duplicate check), delete the `NPM_TOKEN` secret,
   revoke the token on npmjs.com, delete `bootstrap-publish.yml`. Octagons' token sat in its repo
   three releases after it should have gone — that is the incident this step pins.

## Trusted Publisher (right after the first publish)

npmjs.com → package **cards-lite** → **Settings** → **Trusted Publisher** → GitHub Actions:

| Field | Value |
|---|---|
| Organization or user | `investblog` |
| Repository | `cards-lite` |
| Workflow filename | `release.yml` |
| Environment | *(leave empty)* |

While there, set **Publishing access** so tokens cannot publish at all.

## Every release after that

```sh
npm version minor          # any change to the output bytes is a minor (ADR 010)
# update CHANGELOG.md — say what changed in the output
git push && git push --tags
```

`release.yml` on the tag re-runs lint, build, tests and the size gate, checks the tag matches
`package.json`, checks the tarball carries `cards.js`, `cards.min.js` and `cards.d.ts`, and
publishes with provenance. A version already on the registry exits green.

## The four npm failure modes, in the order they appear

Each one reports something other than its cause. Inherited from octagons and roulette-lite; none
of them was diagnosable from its own message.

| What the log says | What it actually is |
|---|---|
| `npm_*** is not a legal HTTP header value` | whitespace or a line break inside the token secret — npm sends the token as an HTTP header |
| `EOTP` / one-time password required | a token *setting*, not a type: classic Automation tokens are gone, and a granular token without **Bypass 2FA** stops here against an account with 2FA |
| `404 Not Found - PUT` | not a missing package: npm masks 403 as 404. The credential has no publish rights, or there is no trusted publisher for the OIDC path |
| `403 Forbidden - PUT … account has been temporarily suspended due to a recent security-sensitive action` | npm's 72-hour account hold, started by a recovery-code sign-in (roulette-lite, 2026-09-18; npm extended the hold to all accounts on 2026-09-09). It clears itself — no support ticket, and no new credential helps, because nothing about the credential is wrong |

The first two cannot occur on the OIDC path. The last two both print
`Signed provenance statement … published` immediately before failing, so a log that looks like a
success up to its final line is the normal shape of both.
