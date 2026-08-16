# Dependency Maintenance Pass 1 — v0.3

## A. Baseline

- Repository: `fargo161/one-room-behavior-lab`
- Stable starting `main`: `e3272e8045d1691e67f7bbd0a04264b807b59f7f`
- Stable `v0.3.0` tag target: `e3272e8045d1691e67f7bbd0a04264b807b59f7f`
- Starting audit: 17 vulnerable package entries (15 high, 2 low)
- Starting production-only audit: 0 vulnerable package entries
- Maintenance branch: `v0.3-dependency-maintenance-pass-1`

## B. Batch A — Actions v5

Commit: `f9d7c11d41ee37eedc66e6f5387835dde519d736`

The merge-readiness workflow changed only these Action references:

```text
actions/checkout@v4   -> actions/checkout@v5
actions/setup-node@v4 -> actions/setup-node@v5
```

Workflow triggers, permissions, Node 22, `cache: npm`, job structure, timeout, branch pattern, and validation commands were preserved. The updated YAML parsed successfully.

Local validation after Batch A:

- TypeScript typecheck: pass
- Lint: pass
- Vitest: 192/192 pass
- Dynamic UI: 3/3 pass
- Production build: pass
- Rendered smoke: 1/1 pass

Audit after Batch A: 17 vulnerable package entries (15 high, 2 low). This was expected because GitHub Action implementations are not part of the local npm dependency tree.

## C. Batch B — React patch

Commit: `54c2ef574890896521033cde0cc7e9b5f40ea1be`

Exact dependency changes:

```text
react                       19.2.6 -> 19.2.8
react-dom                   19.2.6 -> 19.2.8
react-server-dom-webpack    19.2.6 -> 19.2.8
fast-uri                     3.1.2 -> 3.1.5
```

`fast-uri` remains transitive through `react-server-dom-webpack -> webpack -> schema-utils -> ajv`; no direct dependency was added. Targeted npm operations used lifecycle scripts disabled and changed no deferred package versions.

Local validation after Batch B:

- TypeScript typecheck: pass
- Lint: pass
- Vitest: 192/192 pass
- Semantic closure: 25/25 pass
- Dynamic UI: 3/3 pass
- Production build: pass
- Rendered smoke: 1/1 pass

Audit after Batch B: 15 vulnerable package entries (13 high, 2 low). The `react-server-dom-webpack` and `fast-uri` entries were removed.

## D. Remaining vulnerabilities

The remaining 15 package entries stay grouped under the previously audited deferred root causes:

1. Vite/CSS tooling: `vite`, `postcss`, `nanoid`.
2. Lint transitives: `@babel/core`, `brace-expansion`, `js-yaml`.
3. Cloudflare tooling: `@cloudflare/vite-plugin`, `wrangler`, `miniflare`, `esbuild`, `sharp`, `undici`, `ws`.
4. Vinext image inspection: `vinext`, `image-size`.

The production-only npm audit baseline remains zero. Remaining warnings are not failures for this narrowly scoped pass.

## E. Deferred maintenance

This pass intentionally did not change:

- Vite, PostCSS, or Nanoid;
- Brace Expansion, JS-YAML, Babel, or the React Hooks lint plugin;
- Cloudflare Vite Plugin, Wrangler, Workers Types, Miniflare, Esbuild, Sharp, Undici, or WS;
- Vinext, Image Size, or framework selection;
- gameplay, simulation, UI, scenario, provenance, or architecture code.

No force audit fix, broad npm update, automatic PR, or merge was performed.

## F. Recommendation

The next maintenance batch should address the compatible Vite/CSS group in isolation: Vite 8.2.1 with compatible PostCSS and Nanoid refreshes. Run the complete stable validation stack before considering the separate lint or Cloudflare groups.

GitHub Actions validation on the pushed maintenance branch is required before review handoff; its final run is reported with the branch handoff rather than written into either implementation commit.
