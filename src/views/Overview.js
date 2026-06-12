import { formatMatchStatus } from '../data/format.js';

export function renderOverview(data, standings, favorites) {
  const today = new Date().toISOString().slice(0, 10);
  const todaysMatches = data.matches.filter(m => (m.kickoff || '').startsWith(today));
  const featured = todaysMatches[0] || data.matches[0];
  const mexico = data.matches.find(m => m.home === 'Mexico' || m.away === 'Mexico');

  return `
    <section class="hero">
      <div>
        <p class="eyebrow">Tournament companion</p>
        <h2>Clickable schedule, computed standings, and reliable match states.</h2>
        <p>No more dead overview buttons or endless loading placeholders.</p>
      </div>
      <div class="score-card">
        <span class="pill">Featured</span>
        <h3>${featured.home} vs ${featured.away}</h3>
        <p>${formatMatchStatus(featured)}</p>
        <button data-route="match/${featured.id}">Open match</button>
      </div>
    </section>

    <section class="grid cards">
      ${card('schedule', 'Schedule', 'Browse fixtures by date, group, venue, and favorites.')}
      ${card('standings', 'Standings', 'Live group tables computed from finished match results.')}
      ${card('teams', 'Teams', `${favorites.length} favorite team${favorites.length === 1 ? '' : 's'} saved locally.`)}
      ${card(`match/${mexico?.id || featured.id}`, 'Mexico latest', mexico ? formatMatchStatus(mexico) : 'Open featured match')}
    </section>

    <section class="panel">
      <h2>Group A snapshot</h2>
      ${renderMiniTable(standings.A || [])}
    </section>
  `;
}

function card(route, title, text) {
  return `<button class="overview-card" data-route="${route}"><h3>${title}</h3><p>${text}</p><span>Open →</span></button>`;
}

function renderMiniTable(rows) {
  return `<table><thead><tr><th>Team</th><th>Pts</th><th>GD</th><th>P</th></tr></thead><tbody>${rows.map(r => `<tr><td>${r.team}</td><td>${r.points}</td><td>${r.gd}</td><td>${r.played}</td></tr>`).join('')}</tbody></table>`;
}
