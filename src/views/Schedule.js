import { formatMatchStatus } from '../data/format.js';

export function renderSchedule(data, favorites) {
  const groups = data.matches.reduce((acc, match) => {
    const key = (match.kickoff || 'TBA').slice(0, 10);
    (acc[key] ??= []).push(match);
    return acc;
  }, {});
  return `
    <section class="panel"><h2>Schedule</h2><p>Tap any match to open details. Star teams from the Teams page to highlight them here.</p></section>
    ${Object.entries(groups).map(([date, matches]) => `
      <section class="panel">
        <h3>${date}</h3>
        <div class="match-list">
          ${matches.map(match => matchCard(match, favorites)).join('')}
        </div>
      </section>
    `).join('')}
  `;
}

function matchCard(match, favorites) {
  const fav = favorites.includes(match.home) || favorites.includes(match.away);
  return `<button class="match-card ${fav ? 'favorite' : ''}" data-route="match/${match.id}">
    <span class="pill">${match.group}</span>
    <strong>${match.home} vs ${match.away}</strong>
    <span>${formatMatchStatus(match)}</span>
    <small>${match.venue || 'Venue TBA'}</small>
  </button>`;
}
