import { formatMatchStatus, formatKickoff } from '../data/format.js';

export function renderMatchDetail(data, id, standings) {
  const match = data.matches.find(m => String(m.id) === String(id));
  if (!match) return `<section class="panel"><h2>Match not found</h2><button data-route="schedule">Back to schedule</button></section>`;
  const venue = data.venues.find(v => v.name === match.venue);
  return `
    <section class="panel match-detail">
      <button data-route="schedule">← Back to schedule</button>
      <p class="eyebrow">${match.group}</p>
      <h2>${match.home} vs ${match.away}</h2>
      <p class="status-line">${formatMatchStatus(match)}</p>
      <p>Kickoff: ${formatKickoff(match.kickoff)}</p>
      <p>Venue: ${match.venue || 'TBA'}${venue ? ` — ${venue.city}` : ''}</p>
    </section>
    <section class="panel"><h3>Group table</h3>${renderRows(standings[match.group] || [])}</section>
  `;
}

function renderRows(rows) {
  return `<table><thead><tr><th>Team</th><th>Pts</th><th>GD</th><th>P</th></tr></thead><tbody>${rows.map(r => `<tr><td>${r.team}</td><td>${r.points}</td><td>${r.gd}</td><td>${r.played}</td></tr>`).join('')}</tbody></table>`;
}
