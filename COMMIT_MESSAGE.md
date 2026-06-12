# Commit title

Fix Vite dashboard deployment on GitHub Pages

# Commit description

Repairs the generated Vite/GitHub Actions foundation so it builds and loads correctly on GitHub Pages.

- Removes broken package-lock generated from an internal registry
- Removes unnecessary React and TypeScript dependencies
- Pins the app to Vite 5 for a stable GitHub Actions build
- Uses Node 20 in workflows instead of Node 22
- Fixes static data fetch paths from ./public/data to ./data after Vite build
- Replaces Object.groupBy with browser-safe reduce logic
- Adds a .nojekyll marker for GitHub Pages
- Adds data validation before deployment
