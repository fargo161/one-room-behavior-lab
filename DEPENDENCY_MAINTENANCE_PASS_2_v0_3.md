# Dependency Maintenance Pass 2 — Vite/CSS Tooling

## A. Source state

- Repository: `fargo161/one-room-behavior-lab`
- Source branch: `v0.3-dependency-maintenance-pass-1`
- Source head: `665c1ff1f17731ddd9e051aa8cc245ff1b1d1509`
- Pass 2 branch: `v0.3-dependency-maintenance-pass-2`
- Implementation commit: `ff2a7d488033c064cc3c13857d3449d24cc2f64f`
- Starting audit: 15 vulnerable package entries (13 high, 2 low)
- Starting production-only audit: 0

## B. Exact dependency changes

```text
vite       8.0.13 -> 8.2.1
postcss    8.5.14 -> 8.5.26
nanoid     3.3.12 -> 3.3.18
```

Vite remains a direct development dependency. PostCSS and Nanoid remain transitive: PostCSS is resolved through Vite and `@tailwindcss/postcss`, and Nanoid is resolved through PostCSS. No new direct dependency was added.

The targeted Vite update necessarily refreshed Vite's own compatible dependency graph, including Rolldown, Lightning CSS, Picomatch, Tinyglobby, OXC types, and platform-specific bindings. No deferred root-cause group moved.

## C. Scope verification

This pass intentionally left unchanged:

- lint/schema tooling, including ESLint, TypeScript ESLint, React Hooks linting, Babel, Brace Expansion, and JS-YAML;
- Cloudflare/Wrangler tooling, including the Cloudflare Vite Plugin, Workers Types, Wrangler, Miniflare, Esbuild, Sharp, Undici, and WS;
- Vinext and Image Size;
- the Pass 1 React 19.2.8 family and transitive Fast URI 3.1.5;
- `actions/checkout@v5` and `actions/setup-node@v5`;
- all simulation, gameplay, UI, scenario, trace, and provenance code.

No broad npm update, forced audit fix, automatic PR, or merge was performed.

## D. Validation

- TypeScript typecheck: pass
- Lint: pass
- Vitest: 192/192 pass
- Semantic closure: 25/25 pass
- Dynamic UI: 3/3 pass
- Production build: pass
- Rendered smoke: 1/1 pass

The Vinext production build completed with Vite 8.2.1 and the same route classification output as the source state. Vite 8.2.1 additionally reports a future-major compatibility warning: native config loading will eventually require a JSON import attribute for `.openai/hosting.json` and a file extension on the local `build/sites-vite-plugin` import. Current config loading, build output, and rendered validation remain successful, so no compatibility shim was added in this maintenance pass.

## E. Audit result

- Before: 15 vulnerable package entries (13 high, 2 low)
- After: 12 vulnerable package entries (10 high, 2 low)
- Production-only after: 0

Resolved package entries:

- `vite`
- `postcss`
- `nanoid`

The complete Vite/CSS root-cause group identified for Pass 2 is removed. No new unrelated audit entry appeared.

Remaining root-cause groups:

1. Lint/schema: `@babel/core`, `brace-expansion`, and `js-yaml`.
2. Cloudflare/Wrangler: `@cloudflare/vite-plugin`, `wrangler`, `miniflare`, `esbuild`, `sharp`, `undici`, and `ws`.
3. Vinext image inspection: `vinext` and `image-size`.

## F. Recommended next batch

The next isolated maintenance pass should address the compatible lint/schema transitive refresh—Brace Expansion and JS-YAML—while continuing to defer Babel until its parent dependency supports a fixed compatible release. Run the full safety net again before considering the larger Cloudflare tooling batch.

GitHub Actions validation on the exact pushed Pass 2 head remains required for review handoff and is reported with the branch handoff.
