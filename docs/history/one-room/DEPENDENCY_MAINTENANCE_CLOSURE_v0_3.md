# v0.3 Dependency Maintenance Closure

## A. Executive summary

The v0.3 maintenance cycle reduced the npm audit result from 17 vulnerable package entries (15 high, 2 low) to 3 entries (2 high, 1 low). The production-only audit remained at 0 throughout the cycle. All groups with safe compatible updates were addressed in isolated, validated passes. The remaining Babel and Vinext/image-size findings are constrained by current upstream package compatibility, not casually ignored.

No dependency, manifest, lockfile, workflow, application, simulation, UI, test, or architecture change is part of this closure branch. Stable v0.3 behavior remains intact under the complete safety net and local runtime checks.

## B. Maintenance timeline

| Stage | Vulnerable entries | High | Low | Production-only | Main work |
|---|---:|---:|---:|---:|---|
| Initial audit | 17 | 15 | 2 | 0 | Stable v0.3 baseline |
| Pass 1 | 15 | 13 | 2 | 0 | Actions v5; React 19.2.8 family; Fast URI 3.1.5 |
| Pass 2 | 12 | 10 | 2 | 0 | Vite 8.2.1; PostCSS 8.5.26; Nanoid 3.3.18 |
| Pass 3 | 10 | 8 | 2 | 0 | Brace Expansion 1.1.18/5.0.9; JS-YAML 4.3.1 |
| Pass 4 | 3 | 2 | 1 | 0 | Cloudflare Vite Plugin, Wrangler, Workers Types, and required transitive stack |
| Closure | 3 | 2 | 1 | 0 | Verify and defer the two upstream-blocked root-cause groups |

The counts above come from the committed Pass 1–4 reports and the closure audit. Across the cycle, 14 of 17 vulnerable package entries were removed without introducing a production-only finding.

## C. Remaining vulnerability table

The closure audit contains 3 vulnerable package entries representing 2 root-cause groups and 3 advisory records.

| Severity | Package | Version | Dependency path | Exposure | Why deferred | Safe recheck trigger |
|---|---|---|---|---|---|---|
| Low | `@babel/core` | 7.29.0 | root → `eslint-plugin-react-hooks@7.1.1` → `@babel/core` | Development-only lint/compiler tooling operating on trusted repository source; absent from production-only audit | The current and latest React Hooks plugin requires `@babel/core ^7.24.4`, while the fixed current Babel line is 8.x | `eslint-plugin-react-hooks` publishes a release compatible with fixed Babel 8+, or another verified parent change removes the Babel 7 constraint |
| High | `image-size` | 2.0.2 | root → `vinext@1.0.0-beta.2` → `image-size@2.0.2` | Development/build-time image inspection; absent from production-only audit. Current repository assets are one PNG and four SVG files, with no ICNS, JXL, HEIF, or HEIC assets | Current Vinext pins 2.0.2 exactly; the latest published Vinext 1.0.0-beta.5 still pins 2.0.2, which is also the latest published image-size version | Vinext publishes a compatible release using a fixed image-size version, or image-size publishes a fixed release accepted by Vinext |
| High | `vinext` | 1.0.0-beta.2 | direct development dependency; audit effect inherited from `image-size@2.0.2` | Framework/build tooling; absent from production-only audit | npm's suggested forced remediation is a breaking downgrade to Vinext 0.0.45 rather than a compatible forward fix | A compatible Vinext release removes the affected image-size pin and passes the complete regression/runtime suite |

### Advisory records

- `GHSA-4x5r-pxfx-6jf8`: Babel arbitrary file read through a `sourceMappingURL` comment; affects `@babel/core <=7.29.0`, low severity.
- `GHSA-w3rx-r6r6-pgpr`: Image Size ICNS parser denial of service through an infinite loop; affects `image-size <=2.0.2`, high severity.
- `GHSA-5p2g-fcmc-qvqq`: Image Size JXL and HEIF parser denial of service through infinite loops; affects `image-size <=2.0.2`, high severity.

## D. Babel deferment

The exact installed path is `eslint-plugin-react-hooks@7.1.1 → @babel/core@7.29.0`. On the closure date, 7.1.1 is also the latest React Hooks plugin and declares `@babel/core ^7.24.4`; the latest Babel Core is 8.0.1. A direct Babel 8 upgrade would violate the parent's declared dependency range. A forced audit fix is therefore not acceptable: it would trade a validated lint toolchain for an unsupported dependency combination and broaden a documentation-only pass into a compatibility migration.

Practical exposure is limited to development lint/compiler tooling processing trusted repository source, and `npm audit --omit=dev` reports zero vulnerabilities. Recheck when the React Hooks plugin supports a fixed Babel 8+ line, when a verified replacement removes the constraint, before the next public release/deployment, or at the next scheduled maintenance audit.

## E. Vinext/image-size deferment

The exact installed path is the direct development dependency `vinext@1.0.0-beta.2 → image-size@2.0.2`. Current package metadata confirms that latest Vinext 1.0.0-beta.5 still pins Image Size 2.0.2 exactly, and 2.0.2 remains the latest published Image Size version. npm proposes Vinext 0.0.45 as the forced remediation; that is a breaking framework downgrade, not a compatible security update. Replacing the framework would likewise exceed maintenance scope and threaten stable v0.3 behavior.

Practical exposure is build-time inspection of trusted local assets. The repository currently contains one PNG and four SVG assets and no files in the vulnerable ICNS, JXL, HEIF, or HEIC formats. The path is absent from the production-only audit. Recheck when Vinext adopts a fixed Image Size release, Image Size publishes a fixed version accepted by Vinext, before the next public release/deployment, or at the next scheduled maintenance audit.

## F. Final validation baseline

- `npm ls`: pass
- `npm ls --all`: pass; complete 1,157-line dependency tree resolved without errors
- TypeScript typecheck: pass
- Lint: pass
- Vitest: 192/192 pass
- Semantic closure: 25/25 pass
- Dynamic UI: 3/3 pass
- Production build: pass
- Rendered HTML smoke: 1/1 pass
- Local Cloudflare/Vinext development server: pass; `/` returned HTTP 200 with a 35,214-byte response
- Built Vinext production server: pass; `/` returned HTTP 200 with a 17,551-byte response
- Full npm audit: 3 entries (2 high, 1 low)
- Production-only npm audit: 0

No remote deployment or publication was performed. The repository has no standalone Wrangler configuration or non-mutating deployment-preview script, so no deployment command was invented.

## G. Known non-blocking tooling warnings

- The build and local development server reproduce Vite's future-native-config warning: the JSON hosting-config import lacks an import attribute and the local Sites plugin import lacks a file extension. Current Vite 8.2.1 loading and builds pass.
- The local Cloudflare/Vinext development check reproduced the environment-only inspector fallback from port 9229 to 9230. HTTP behavior remained correct.
- The Pass 4 exact-head Actions logs contain Node `punycode` and `url.parse()` deprecation warnings in setup-node/post-job tooling. Actions remain at v5, and these warnings do not fail CI.

These are tooling warnings, not additional npm vulnerability entries. No warning was repaired in this documentation-only closure.

## H. Merge recommendation

Maintenance implementation is complete. Remaining findings are documented upstream-blocked deferments. Next step: cumulative read-only review of Pass 4/closure against stable main.

This report does not authorize a merge. No pull request, merge, or stable-ref change is part of the closure pass.

## I. Recheck policy

Revisit the deferred advisories when any of the following occurs:

1. `eslint-plugin-react-hooks` publishes a release compatible with fixed Babel 8+.
2. Another verified parent/package change removes the Babel 7 constraint.
3. Vinext publishes a compatible release that no longer pins affected Image Size 2.0.2.
4. Image Size publishes a fixed version accepted by a compatible Vinext release.
5. The project begins processing untrusted source files or untrusted image assets.
6. Before the next public deployment or release.
7. At the next routine dependency-maintenance milestone.

Until one of these triggers produces a compatible upgrade path, forced audit remediation, framework downgrade, or framework replacement is not recommended.
