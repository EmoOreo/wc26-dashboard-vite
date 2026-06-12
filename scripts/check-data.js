import fs from 'node:fs/promises';

const matches = JSON.parse(await fs.readFile('public/data/matches.json', 'utf8'));
const teams = JSON.parse(await fs.readFile('public/data/teams.json', 'utf8'));
const names = new Set(teams.map(t => t.name));
const valid = new Set(['scheduled', 'live', 'finished', 'postponed', 'unknown']);
let errors = [];

for (const match of matches) {
  if (!match.id) errors.push('Match missing id');
  if (!names.has(match.home)) errors.push(`Unknown home team: ${match.home}`);
  if (!names.has(match.away)) errors.push(`Unknown away team: ${match.away}`);
  if (!valid.has(match.status)) errors.push(`Invalid status for ${match.id}: ${match.status}`);
  if (match.status === 'finished' && (!Number.isFinite(match.homeScore) || !Number.isFinite(match.awayScore))) {
    errors.push(`Finished match ${match.id} needs numeric scores`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Data check passed: ${matches.length} matches, ${teams.length} teams.`);
