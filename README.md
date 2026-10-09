# BayLeaf Nanobot sandbox package

Repository: **bayleaf-ucsc/nanobot-sandbox**. The BayLeaf parent consumes this
independent package as a pinned submodule. No npm publication is required.

This package owns its stdio MCP adapter, validation, bounded fixed-origin
transport, short Nanobot environment skill and tests. It has no OpenCode imports,
runtime dependencies or skill-generation coupling to another harness.

## Runtime contract

Node 22+. Five tools: search, fetch, usage, private expose, unexpose. There are no
public-exposure, header-injection, lifecycle/destruction or credential-display
tools. Mutations are not protected by a native approval UI; scope is narrower
than the ordinary owner key's authority. Same-user programs can read that key.

The BayLeaf Worker embeds source from a clean, published Git revision and the
installer places it in a service-owned layout:

```text
<managed-root>/adapter/nanobot-mcp.mjs
<managed-root>/credentials/owner-key          # protected, never in this repo
<managed-root>/workspace/skills/bayleaf-sandboxes/SKILL.md
```

Run the adapter with `node <managed-root>/adapter/nanobot-mcp.mjs`. It reads the
adjacent protected credential itself because MCP does not inherit arbitrary
environment variables. No credential goes into MCP arguments or configuration.
Only `https://api.bayleaf.dev` receives it; redirects are rejected, responses are
bounded to 2 MiB and requests time out after 30 seconds. Tool outputs omit unknown
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
