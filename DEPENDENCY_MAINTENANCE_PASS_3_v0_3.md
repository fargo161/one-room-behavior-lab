# Dependency Maintenance Pass 3 — Lint/Schema Transitives

## A. Source state

- Repository: `fargo161/one-room-behavior-lab`
- Source branch: `v0.3-dependency-maintenance-pass-2`
- Source head: `a2ba2089a62f71190accf61976a724e4b9e93234`
- Pass 3 branch: `v0.3-dependency-maintenance-pass-3`
- Implementation commit: `07baee60736786fb8db896cb4cba757569a4a7b6`
- Starting audit: 12 vulnerable package entries (10 high, 2 low)
- Starting production-only audit: 0

## B. Exact resolutions

```text
brace-expansion  1.1.14 -> 1.1.18
brace-expansion   5.0.6 -> 5.0.9
js-yaml            4.1.1 -> 4.3.1
```

Brace Expansion 1.x remains a shared transitive of Minimatch 3.1.5 in the ESLint toolchain, including paths from ESLint, `@eslint/config-array`, `@eslint/eslintrc`, `eslint-plugin-jsx-a11y`, and `eslint-plugin-react`. Brace Expansion 5.x remains nested under `typescript-eslint` through `@typescript-eslint/typescript-estree` and Minimatch 10.2.5. JS-YAML remains under ESLint through `@eslint/eslintrc`.

## C. Resolution method

The pass used a targeted npm lockfile refresh for only `brace-expansion` and `js-yaml`, with lifecycle scripts disabled. All three updates were already admitted by their parent dependency ranges. No direct dependency, npm override, manifest entry, lint configuration, or parent-package update was required. The only non-version metadata movement is the current JS-YAML funding declaration recorded by npm.

## D. Validation

- TypeScript typecheck: pass
- Lint and ESLint config loading: pass
- Vitest: 192/192 pass
- Semantic closure: 25/25 pass
- Dynamic UI: 3/3 pass
- Production build: pass
- Rendered smoke: 1/1 pass

The Vinext production build retains the non-failing Vite 8.2.1 future-native-config warning already documented in Pass 2. The warning and route-classification output are inherited and unrelated to these transitive resolutions.

## E. Audit result

- Before: 12 vulnerable package entries (10 high, 2 low)
- After: 10 vulnerable package entries (8 high, 2 low)
- Production-only after: 0

Both vulnerable `brace-expansion` paths and the vulnerable `js-yaml` path are resolved. No new unrelated vulnerability was introduced.

Remaining root-cause groups:

1. Babel lint/compiler tooling: `@babel/core` through `eslint-plugin-react-hooks`.
2. Cloudflare/Wrangler tooling: `@cloudflare/vite-plugin`, `wrangler`, `miniflare`, `esbuild`, `sharp`, `undici`, and `ws`.
3. Vinext image inspection: `vinext` and `image-size`.

## F. Explicit Babel deferral

`@babel/core` advisory remains intentionally deferred because no current compatible parent fix exists. Babel 8, React Hooks plugin replacement, forced peer overrides, and unrelated downgrades were not attempted. The existing Babel 7.29.0 resolution is unchanged.

## G. Recommended next maintenance batch

The next candidate should be an isolated Cloudflare/Wrangler tooling batch, with the full validation stack and audit rerun. Vinext/image-size should remain separate because its reported fix is a breaking downgrade. No further maintenance group is implemented here.

## Scope confirmation

The Pass 1 Actions, React 19.2.8, and Fast URI 3.1.5 group remains untouched. The Pass 2 Vite 8.2.1, PostCSS 8.5.26, and Nanoid 3.3.18 group remains untouched. Cloudflare/Wrangler, Vinext/image-size, Babel, application code, simulation behavior, UI semantics, tests, and lint rules remain untouched.

No automatic pull request or merge was performed. GitHub Actions validation on the exact final pushed head is required before review handoff.
