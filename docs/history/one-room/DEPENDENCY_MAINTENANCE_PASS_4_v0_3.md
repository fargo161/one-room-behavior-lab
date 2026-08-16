# Dependency Maintenance Pass 4 — Cloudflare/Wrangler Tooling

## A. Source

- Repository: `fargo161/one-room-behavior-lab`
- Source branch: `v0.3-dependency-maintenance-pass-3`
- Source head: `fcd6fbd2fbaa1acd482006b0dd611052ddf734c7`
- Pass 4 branch: `v0.3-dependency-maintenance-pass-4`
- Implementation commit: `0ce75b3cb5a2b6ec63c6ace1ce89a3e27496ec41`
- Starting audit: 10 vulnerable package entries (8 high, 2 low)
- Starting production-only audit: 0

## B. Direct Cloudflare changes

```text
@cloudflare/vite-plugin    1.37.1       -> 1.52.0
wrangler                   4.92.0       -> 4.122.0
@cloudflare/workers-types  4.20260702.1 -> 5.20260811.1
```

The three approved targets are exact development-dependency resolutions. Cloudflare Vite Plugin and Wrangler remain on their existing majors. Workers Types moves to the compatible 5.x peer required by Wrangler 4.122.0. Vite remains 8.2.1, within the plugin's declared Vite 8 peer range.

## C. Transitive Cloudflare movement

```text
miniflare  4.20260515.0 -> 5.20260811.0-alpha
esbuild    0.27.3       -> 0.28.1
sharp      0.34.5       -> 0.35.2
undici     7.24.8       -> 7.29.0
ws         8.18.0       -> 8.21.0
workerd    1.20260515.1 -> 1.20260811.1
```

Esbuild and its platform packages move from Wrangler's nested 0.27.3 path to a shared 0.28.1 path used by Wrangler and Vite. Workerd's platform packages move with Workerd. Sharp's platform and libvips packages move with Sharp; its nested Semver moves from 7.8.0 to 7.8.5, and `@emnapi/runtime` moves from 1.10.0 to 1.11.3. Miniflare's presentation helper `@speed-highlight/core` moves from 1.2.15 to 1.2.24. These are all explained by the coordinated Cloudflare parent graph.

The package-lock textual diff is large because the Esbuild package family relocates from a nested Wrangler path to the shared root-sorted package map. A semantic comparison found no unrelated package version movement.

## D. Scope audit

The following remain unchanged:

- Pass 1: Actions v5, React 19.2.8 family, and Fast URI 3.1.5;
- Pass 2: Vite 8.2.1, PostCSS 8.5.26, and Nanoid 3.3.18;
- Pass 3: Brace Expansion 1.1.18 and 5.0.9, and JS-YAML 4.3.1;
- deferred Babel: `@babel/core` 7.29.0 and `eslint-plugin-react-hooks` 7.1.1;
- deferred Vinext/image-size: Vinext 1.0.0-beta.2 and Image Size 2.0.2;
- all application, simulation, message, planning, object-state, room-event, UI, test-expectation, and game-rule code.

## E. Cloudflare validation

- Wrangler CLI: 4.122.0 loads successfully.
- Cloudflare/Vinext production build: pass.
- Local Vinext/Cloudflare Vite Plugin/Miniflare dev server: pass; `/` returned HTTP 200 with a 35,205-byte response.
- Built Vinext production server: pass; `/` returned HTTP 200 with a 17,551-byte response.
- No standalone Wrangler configuration or repository deploy-preview/dry-run script exists, so no invented deployment command was run.
- No remote deployment or publication was attempted; remote deployment validation remains outside this non-mutating pass.

## F. Full regression validation

- TypeScript typecheck: pass
- Lint: pass
- Vitest: 192/192 pass
- Semantic closure: 25/25 pass
- Dynamic UI: 3/3 pass
- Production build: pass
- Rendered smoke: 1/1 pass

## G. Security audit

- Before: 10 vulnerable package entries (8 high, 2 low)
- After: 3 vulnerable package entries (2 high, 1 low)
- Production-only after: 0

The complete Cloudflare/Wrangler root-cause group is removed from the audit: `@cloudflare/vite-plugin`, Wrangler, Miniflare, Esbuild, Sharp, Undici, and WS no longer appear. No new advisory appeared.

Remaining root-cause groups:

1. Babel lint/compiler tooling: `@babel/core` through `eslint-plugin-react-hooks`.
2. Vinext image inspection: `vinext` and `image-size`.

## H. Warnings

- The inherited Vite future-native-config warning remains: the JSON import lacks an import attribute and the local Sites plugin import lacks an extension. It remains non-blocking and was not changed.
- The local emulator reported that inspector port 9229 was occupied and automatically used 9230. This environment-only fallback did not affect the HTTP validation.
- The known Actions/setup-node `url.parse()` deprecation is outside this dependency scope; workflow actions remain at v5 and no workflow change was made.
- No new Cloudflare configuration, Miniflare, Workers Types, build, or runtime warning was observed.

## I. Recommendation

The remaining Babel and Vinext/image-size advisories still lack clean compatible parent fixes. Document and defer them rather than forcing Babel 8 or a breaking Vinext downgrade. Reassess when compatible upstream releases become available.

No automatic pull request, merge, or remote deployment was performed. GitHub Actions validation on the exact final pushed head remains required for review handoff.
