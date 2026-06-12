export async function loadData() {
  const [matches, teams, venues, meta] = await Promise.all([
    fetchJson('./data/matches.json'),
    fetchJson('./data/teams.json'),
    fetchJson('./data/venues.json'),
    fetchJson('./data/meta.json')
  ]);
  return { matches, teams, venues, meta };
}

async function fetchJson(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}
