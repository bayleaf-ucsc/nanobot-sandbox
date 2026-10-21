# BayLeaf Nanobot sandbox package

Repository: **bayleaf-ucsc/nanobot-sandbox**. The BayLeaf parent consumes this
independent package as a pinned submodule. No npm publication is required.

This package owns its stdio MCP adapter, validation, bounded fixed-origin
transport, short Nanobot environment skill and tests. It has no OpenCode imports,
runtime dependencies or skill-generation coupling to another harness.

## Runtime contract

Node 22+. Thirteen tools: search, fetch, usage, private expose, unexpose, plus
BayLeaf Inboxes (`inboxes`, `inbox_create`, `inbox_messages`, `inbox_read`,
`inbox_save`, `inbox_archive`, `inbox_lifetime`, `inbox_events`). There are no public-exposure, header-injection,
lifecycle/destruction or credential-display tools. Mutations are not protected by
a native approval UI; scope is narrower than the ordinary owner key's authority.
Same-user programs can read that key.

The adapter lists all thirteen tools, but the parent installer's `enabledTools`
filter must include all eight inbox tools and installs their skill only when
`assets['_inboxes'] is True`. Disabled installations advertise neither the inbox
skill nor a pointer to it in the always-loaded sandbox skill. The adapter's tool
list test covers its full inventory, not the installer's enabled subset.

The parent installer must add `inbox_lifetime` and `inbox_events` to its
`INBOX_TOOLS` allowlist before delivering this revision. Creation accepts an
optional endpoint lifetime; shortening one can destroy stored content on expiry
and requires explicit user agreement, still without a native approval UI. Arrival
reads are finite bounded pages, not a persistent subscription. Live SSE and bulk
export remain explicitly requested direct API/script workflows.

Inboxes are narrowed further. Their content is written by outside senders, so it
is the most likely prompt-injection channel, and destructive verbs are what an
injected instruction would reach for. This adapter therefore omits message
deletion, inbox destruction and every credential route (mint, list, revoke);
the user performs those with their own key elsewhere. Message metadata and text
are returned inside `<untrusted_inbox_content>` markers, with `<` escaped so content
cannot close them, and text is paged at 20,000 characters per call. `inbox_save`
writes the exact body or one attachment (at most 26 MiB) to a new file under
`~/workspace/inbox-downloads/`, a conventional quarantine directory: paths are
relative to that directory, with no `.`/`..` segments or symlinked directories.
Case-insensitive `.agents`, `.opencode`, `.git`, `.claude`, `.nanobot` components
and `AGENTS.md`, `CLAUDE.md`, `SKILL.md` filenames are forbidden. The user can
inspect and move downloads later. This is not OS isolation: same-user programs
can still access downloads. Saves never enter the managed root or overwrite,
mode 0600, returning only path, size and type. Reception never wakes the agent;
the tools describe check-on-request use, not polling. Inbox errors map bare HTTP
statuses to fixed adapter text (not found, limit, unavailable), never upstream bodies.

The BayLeaf Worker embeds source from a clean, published Git revision and the
installer places it in a service-owned layout:

```text
<managed-root>/adapter/nanobot-mcp.mjs
<managed-root>/credentials/owner-key          # protected, never in this repo
<managed-root>/workspace/skills/bayleaf-sandboxes/SKILL.md
<managed-root>/workspace/skills/bayleaf-inboxes/SKILL.md
```

Run the adapter with `node <managed-root>/adapter/nanobot-mcp.mjs`. It reads the
adjacent protected credential itself because MCP does not inherit arbitrary
environment variables. No credential goes into MCP arguments or configuration.
Only `https://api.bayleaf.dev` receives it; redirects are rejected, responses are
bounded to 2 MiB (26 MiB for inbox saves) and requests time out after 30 seconds
(120 for saves). Tool outputs omit unknown
metadata and reject a reflected owner key. Errors never expose upstream bodies.

The main repo owns application installation, inference configuration, app auth,
preview registration, supervision and deployment. This package is **not** a
Nanobot fork, native Agent Plugin or independent inference credential issuer.
The shared boundary with other BayLeaf harnesses is the public API contract.

## Tests and releases

```sh
npm test
```

Tests use synthetic credentials and mocked fetch; no BayLeaf account is needed.
They run from this directory alone without files from the parent repository.
Keep platform facts aligned with the contract links in the short skill; do not
copy or parse another harness's guide to maintain this one.

After explicit approval to publish: commit tested package source to the intended
repository and push a version tag (for example `v0.1.0`). The parent submodule
gitlink pins the full commit. Its production builder verifies the package root,
clean tree, expected origin and that this exact SHA is advertised by a remote
branch/tag (including peeled annotated tags), then reads assets with `git show`.
Keeping release tags allows old pinned versions to rebuild after main advances.
Remote reachability proves publication to that repository, not signed attestation.

The parent has a separate explicit `--fixture` asset build for unpublished local
tests. It labels the bundle as a fixture. Production deployment runs the strict
builder and fails closed if publication or cleanliness cannot be verified.
