# Agent Guide

## Project basics

- This is a Bun-managed TypeScript library and CLI. Use Bun for installs, scripts, tests, and dependency updates. Do not introduce another package manager or lockfile.
- The public library entry point is `src/index.ts`; the CLI is `src/cli.ts`. The build produces ESM, CommonJS, and declaration outputs in `dist/`.
- Tests use Node's built-in test API and run with Bun. Keep focused regression coverage in `src/index.test.ts` when changing expansion behavior.

## Common workflow

```sh
bun install --frozen-lockfile
bun run typecheck
bun run lint
bun run build
bun run test
```

Run all of these before committing changes that affect source code, dependencies, build configuration, or generated declarations. `bun run check` runs lint, typecheck, and tests but does not build.

## Dependencies

- `bunfig.toml` enforces a seven-day minimum package release age. Keep this policy in place.
- Use `bun update --latest` or `bun run deps:update` for dependency upgrades so Bun applies the configured release-age policy and updates `bun.lock` consistently.
- Commit dependency manifest and lockfile changes together.

## TypeScript 7

- Prefer documented, stable TypeScript APIs and features whenever they meet the requirement. Treat every `typescript/unstable/*` import as version-sensitive: consult the installed package documentation and migration notes before changing or retaining one during an upgrade.
- TypeScript 7 no longer exposes the historical compiler API from the `typescript` package root. The root resolves to version metadata, not APIs such as `createProgram`.
- Use the supported TypeScript 7 unstable modules instead: `typescript/unstable/async`, `typescript/unstable/ast`, and `typescript/unstable/fs`.
- The async API owns external resources. Dispose snapshots and close API instances reliably, including on errors.
- The snapshot API does not take compiler options directly. When callers supply options, preserve them by creating an in-memory project configuration rather than silently dropping them.
- Virtual filesystem callbacks may return `undefined` to delegate to the real filesystem, `null` for a missing file, or a string for file contents. Preserve this distinction when working with source text or test fixtures.

## Keeping this guide current

- Keep this guide concise and operational. Record durable workflows and constraints, not a chronological journal or line-by-line implementation details.
- Update this file whenever tooling, supported runtimes, build/test workflows, dependency policies, or integration assumptions change. Replace version-specific workarounds with stable documented approaches when they become available.

## Style and release hygiene

- Biome is the formatter and linter. Run `bun run fix` only when intentional formatting changes are acceptable.
- Write commit messages as plain imperative summaries without conventional-commit prefixes.
- Version releases are driven by `package.json`; use Bun to update the version and commit that change separately from feature work when practical.
- The CI workflow runs frozen install, typecheck, lint, build, and tests. Match those commands locally before considering work complete.
