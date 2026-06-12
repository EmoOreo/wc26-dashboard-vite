# WC26 Dashboard

Version 0.3.0 foundation for a GitHub Pages-hosted World Cup 2026 dashboard.

## What's included

- Match Center homepage with completed and upcoming matches
- Clickable schedule cards
- Computed group standings from finished results
- Team cards with team-specific fixtures/results
- Seeded Mexico 2–0 South Africa result
- Static `dist/` deployment workflow for GitHub Pages

## Deploy

This repo deploys the prebuilt `dist/` folder through GitHub Actions. GitHub Pages should be set to **GitHub Actions**.

## Local development

```bash
npm install
npm run dev
```

To rebuild `dist/` locally:

```bash
npm run build
```

If npm has registry problems, reset the registry:

```bash
npm config set registry https://registry.npmjs.org/
```
