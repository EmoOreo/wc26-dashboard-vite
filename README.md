# WC26 Dashboard

Version **0.4.0** — Match Center, computed standings, team pages, and local favorites.

## Current Features

- GitHub Pages deployment from the prebuilt `dist/` folder.
- Match Center home dashboard with recently finished and upcoming matches.
- Clickable schedule cards and match detail pages.
- Computed group standings from finished match results.
- Clickable teams with group rank, points, next match, latest result, and full fixture list.
- Local favorite teams saved in browser `localStorage`.
- Schedule filter for favorite teams.
- Seeded Mexico 2–0 South Africa result.

## Local Build

```bash
npm install
npm run build
```

The deployment workflow publishes `dist/` directly, so keep `dist/` committed.

## Deploy

Use GitHub Pages with **Source: GitHub Actions**.

## Release Notes

### 0.4.0

- Added favorites system.
- Added My Teams dashboard section.
- Added enhanced team detail pages.
- Added group-rank and points display on team cards.
- Added favorite-team schedule filtering.
- Improved home dashboard structure.
