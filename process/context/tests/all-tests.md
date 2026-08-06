# Pipa - All Tests

Last updated: 2026-08-06

## Test Runners

| Scope | Runner | Command |
|---|---|---|
| Domain, application, generator, adapters | Vitest | `pnpm test` |
| Worker runtime and bindings | Workers Vitest pool | `pnpm test:integration` |
| Whole repository typecheck | TypeScript via Turbo | `pnpm typecheck` |
| Formatting and linting | Biome | `pnpm check` |

## Verification Order

1. Run the narrowest package test while developing.
2. Run `pnpm check` and `pnpm typecheck` after package changes.
3. Run `pnpm test` and `pnpm test:integration` before handoff.
4. Run `pnpm build`, `pnpm openapi:validate`, and Wrangler dry validation before deployment.

## Worker Test Notes

Integration tests use `@cloudflare/vitest-pool-workers` and `apps/api/wrangler.jsonc`. D1 is local during tests. Kimi, R2 remote storage, and deployed Queues are not required for unit tests; external services use injected fakes.

## Known Gaps

- Cloudflare remote resource provisioning and production deployment require account-specific IDs and credentials.
- Kimi semantic quality requires an API key and is covered by deterministic test adapters in local tests.
