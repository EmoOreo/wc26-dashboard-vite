# WC26 Dashboard 0.2.4 Pages Fix

A Vite-based World Cup 2026 dashboard foundation with clickable views, computed group standings, match detail pages, favorites, and safe loading/error states.

## Important fixes in this package

- Uses Vite with a stable pinned dependency.
- Removes the broken lockfile that caused GitHub Actions `npm install` failures.
- Fetches built static data from `./data/*.json`, which is correct after Vite copies `public/data` into `dist/data`.
- Uses GitHub Actions for Pages deployment.
- Keeps data files in `public/data`.

## GitHub Pages setup

Use:

```txt
Settings → Pages → Source: GitHub Actions
```

Then push to `main` and check the Actions tab.

## Local commands

```bash
npm install --no-audit --no-fund
npm run check:data
npm run build
npm run dev
```

## Commit title

```txt
Fix Vite dashboard deployment on GitHub Pages
```
