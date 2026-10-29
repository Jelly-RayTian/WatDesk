# Developing WatDesk

TypeScript, React and Vite, built as an Edge Manifest V3 extension (Edge/Chrome 120 or newer). Node 22.13+ and pnpm.

```sh
git clone https://github.com/Jelly-RayTian/WatDesk.git
cd WatDesk
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build      # app + service worker + assets into dist/
pnpm package    # copies dist/ to ../../outputs/WatDesk/extension
```

To build exactly what a release contains, clone the tag: `git clone --branch v1.9.0 --depth 1 …`.

## Layout

- `src/background/` service worker, sync scheduling, offscreen HTML parser
- `src/adapters/` one reader per source (LEARN, Crowdmark, Odyssey, CS 135, course websites)
- `src/core/` state, patches, validation, reminders, workload and zone helpers
- `src/ui/` React UI; `styles.css` is the base look and `glass.css` the Liquid Glass style
- `tests/` Vitest suites; `tests/preview.ts` powers the dev preview (`pnpm vite`, then open `/preview.html?showcase&palette=glass`)
- `stats-worker/` the optional anonymous usage counter server

## Notes

- Production builds exclude `preview.html` and `tests/preview.ts`, which use fixtures and never real logins.
- Course-website parsers (`src/adapters/course-sites.ts`) target each site's current markup and throw when it changes instead of guessing. Add a fixture-based test with every new parser.
- Changes to data handling must update `PRIVACY.md` and `docs/store-permissions.md`.
- `main` is protected: open a pull request and wait for the `verify` check.
