const state = {
  tab: location.hash.replace('#', '') || 'overview',
  data: { matches: [], teams: [], venues: [], meta: {} },
  query: '',
  group: 'all',
  matchId: null
};

const app = document.querySelector('#app');
const navTabs = ['overview', 'schedule', 'standings', 'teams'];

async function loadJson(path) {
  const response = await fetch(`./data/${path}`);
  if (!response.ok) throw new Error(`Could not load ${path}`);
  return response.json();
}

function formatDate(iso) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
}

function dayKey(iso) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(iso));
}

function scoreline(match) {
  if (match.status === 'finished') return `FT — ${match.home} ${match.homeScore}–${match.awayScore} ${match.away}`;
  if (match.status === 'live') return `LIVE — ${match.home} ${match.homeScore ?? 0}–${match.awayScore ?? 0} ${match.away}`;
  return `${match.home} vs ${match.away}`;
}

function resultBadge(match) {
  if (match.status === 'finished') return '<span class="badge done">FT</span>';
  if (match.status === 'live') return '<span class="badge live">LIVE</span>';
  return '<span class="badge upcoming">Scheduled</span>';
}

function getTeam(name) {
  return state.data.teams.find(t => t.name === name) || { name, flag: '🏳️', group: '?' };
}

function buildStandings(matches, teams) {
  const groups = {};
  for (const team of teams) {
    groups[team.group] ??= {};
    groups[team.group][team.name] = { team: team.name, group: team.group, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 };
  }

  for (const match of matches.filter(m => m.status === 'finished')) {
    const group = match.group;
    if (!groups[group]) continue;
    const home = groups[group][match.home];
    const away = groups[group][match.away];
    if (!home || !away) continue;

    const hs = Number(match.homeScore);
    const as = Number(match.awayScore);
    home.played++; away.played++;
    home.gf += hs; home.ga += as;
    away.gf += as; away.ga += hs;

    if (hs > as) { home.won++; home.points += 3; away.lost++; }
    else if (hs < as) { away.won++; away.points += 3; home.lost++; }
    else { home.drawn++; away.drawn++; home.points++; away.points++; }
  }

  const sorted = {};
  for (const [group, rows] of Object.entries(groups)) {
    sorted[group] = Object.values(rows).map(row => ({ ...row, gd: row.gf - row.ga })).sort((a, b) =>
      b.points - a.points || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team)
    );
  }
  return sorted;
}

function route(tab, extra = {}) {
  state.tab = tab;
  Object.assign(state, extra);
  history.pushState(null, '', `#${tab}`);
  render();
}

window.addEventListener('popstate', () => {
  state.tab = location.hash.replace('#', '') || 'overview';
  render();
});

function shell(content) {
  app.innerHTML = `
    <header class="topbar">
      <div>
        <div class="eyebrow">World Cup 2026</div>
        <h1>WC26 Dashboard</h1>
      </div>
      <nav>${navTabs.map(tab => `<button class="pill ${state.tab === tab ? 'active' : ''}" data-tab="${tab}">${label(tab)}</button>`).join('')}</nav>
    </header>
    <main class="page">${content}</main>
  `;
  document.querySelectorAll('[data-tab]').forEach(btn => btn.addEventListener('click', () => route(btn.dataset.tab)));
}

function label(tab) { return tab[0].toUpperCase() + tab.slice(1); }

function overview() {
  const { matches, teams, venues, meta } = state.data;
  const finished = matches.filter(m => m.status === 'finished');
  const upcoming = matches.filter(m => m.status === 'scheduled').sort((a,b) => new Date(a.kickoff) - new Date(b.kickoff));
  const featured = upcoming[0] || finished[0];
  const mexico = matches.find(m => m.home === 'Mexico' || m.away === 'Mexico');
  const standings = buildStandings(matches, teams);

  return `
    <section class="hero-grid">
      <div class="hero card">
        <div class="eyebrow">Tournament companion</div>
        <h2>Match center and live-style group tables.</h2>
        <p>Browse completed results, upcoming fixtures, computed standings, and team schedules without dead buttons or endless loading states.</p>
        <div class="hero-actions">
          <button class="primary" data-action="schedule">Open schedule</button>
          <button class="secondary" data-action="standings">View standings</button>
        </div>
      </div>
      <article class="card featured">
        <span class="badge live">Featured</span>
        <h3>${featured ? scoreline(featured) : 'No match loaded'}</h3>
        <p>${featured ? `${formatDate(featured.kickoff)} • ${featured.venue}` : 'Add fixture data to begin.'}</p>
        ${featured ? `<button class="primary small" data-match="${featured.id}">Open match</button>` : ''}
      </article>
    </section>

    <section class="stat-grid">
      <button class="stat card clickable" data-action="schedule"><strong>${matches.length}</strong><span>Seeded fixtures</span></button>
      <button class="stat card clickable" data-action="standings"><strong>${Object.keys(standings).length}</strong><span>Active groups</span></button>
      <button class="stat card clickable" data-action="teams"><strong>${teams.length}</strong><span>Teams loaded</span></button>
      <article class="stat card"><strong>${venues.length}</strong><span>Venues loaded</span></article>
    </section>

    <section class="dashboard-grid">
      <article class="card">
        <h3>Today / completed</h3>
        <div class="match-list">${finished.map(matchCard).join('') || '<p class="muted">No completed matches yet.</p>'}</div>
      </article>
      <article class="card">
        <h3>Upcoming matches</h3>
        <div class="match-list">${upcoming.slice(0, 5).map(matchCard).join('') || '<p class="muted">No upcoming matches loaded.</p>'}</div>
      </article>
      <article class="card wide">
        <h3>Group A snapshot</h3>
        ${standingsTable('A', standings.A || [])}
      </article>
      <article class="card">
        <h3>Mexico latest</h3>
        <p class="result-line">${mexico ? scoreline(mexico) : 'Mexico match not loaded.'}</p>
        <p class="muted">Last data update: ${meta.lastUpdated ? new Date(meta.lastUpdated).toLocaleString() : 'unknown'}</p>
      </article>
    </section>
  `;
}

function matchCard(match) {
  const home = getTeam(match.home);
  const away = getTeam(match.away);
  return `
    <button class="match-card" data-match="${match.id}">
      <div class="match-top"><span>${dayKey(match.kickoff)}</span>${resultBadge(match)}</div>
      <div class="teams-line"><span>${home.flag} ${match.home}</span><strong>${match.status === 'finished' ? `${match.homeScore}–${match.awayScore}` : 'vs'}</strong><span>${away.flag} ${match.away}</span></div>
      <div class="muted">Group ${match.group} • ${match.venue}, ${match.city}</div>
    </button>
  `;
}

function schedule() {
  const q = state.query.toLowerCase();
  const groups = ['all', ...new Set(state.data.matches.map(m => m.group).sort())];
  const matches = state.data.matches
    .filter(m => state.group === 'all' || m.group === state.group)
    .filter(m => !q || [m.home, m.away, m.venue, m.city, m.group].join(' ').toLowerCase().includes(q))
    .sort((a,b) => new Date(a.kickoff) - new Date(b.kickoff));

  return `
    <section class="section-head"><div><h2>Schedule</h2><p>Clickable fixture cards with finished, live, and scheduled states.</p></div></section>
    <section class="filters card">
      <input id="search" placeholder="Search team, venue, city..." value="${state.query}">
      <select id="groupFilter">${groups.map(g => `<option value="${g}" ${state.group === g ? 'selected' : ''}>${g === 'all' ? 'All groups' : `Group ${g}`}</option>`).join('')}</select>
    </section>
    <section class="match-grid">${matches.map(matchCard).join('')}</section>
  `;
}

function standings() {
  const tables = buildStandings(state.data.matches, state.data.teams);
  return `
    <section class="section-head"><div><h2>Standings</h2><p>Tables are computed automatically from finished match results.</p></div></section>
    <section class="standings-grid">${Object.keys(tables).sort().map(group => `<article class="card"><h3>Group ${group}</h3>${standingsTable(group, tables[group])}</article>`).join('')}</section>
  `;
}

function standingsTable(group, rows) {
  return `
    <table class="standings-table">
      <thead><tr><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr></thead>
      <tbody>${rows.map((r, i) => `<tr class="${i < 2 ? 'qualify' : ''}"><td>${getTeam(r.team).flag} ${r.team}</td><td>${r.played}</td><td>${r.won}</td><td>${r.drawn}</td><td>${r.lost}</td><td>${r.gd > 0 ? '+' : ''}${r.gd}</td><td><strong>${r.points}</strong></td></tr>`).join('')}</tbody>
    </table>
  `;
}

function teams() {
  const tables = buildStandings(state.data.matches, state.data.teams);
  return `
    <section class="section-head"><div><h2>Teams</h2><p>Click a team card to see its loaded fixtures and results.</p></div></section>
    <section class="team-grid">${state.data.teams.map(team => {
      const row = tables[team.group]?.find(r => r.team === team.name);
      return `<button class="team-card card" data-team="${team.name}"><strong>${team.flag} ${team.name}</strong><span>Group ${team.group}</span><span>${row?.points ?? 0} pts • ${row?.played ?? 0} played</span></button>`;
    }).join('')}</section>
  `;
}

function matchDetail(id) {
  const match = state.data.matches.find(m => m.id === id);
  if (!match) return '<section class="card"><h2>Match not found</h2></section>';
  return `
    <section class="card detail">
      <button class="secondary small" data-action="schedule">← Back to schedule</button>
      <div class="eyebrow">Group ${match.group} • ${match.stage}</div>
      <h2>${scoreline(match)}</h2>
      <p>${formatDate(match.kickoff)}</p>
      <p>${match.venue}, ${match.city}</p>
      <p>${match.broadcast || 'Broadcast TBD'}</p>
      <p>${resultBadge(match)}</p>
    </section>
  `;
}

function teamDetail(name) {
  const team = getTeam(name);
  const matches = state.data.matches.filter(m => m.home === name || m.away === name).sort((a,b)=>new Date(a.kickoff)-new Date(b.kickoff));
  return `
    <section class="card detail">
      <button class="secondary small" data-action="teams">← Back to teams</button>
      <div class="eyebrow">Group ${team.group}</div>
      <h2>${team.flag} ${team.name}</h2>
      <div class="match-list">${matches.map(matchCard).join('') || '<p class="muted">No fixtures loaded for this team yet.</p>'}</div>
    </section>
  `;
}

function bind() {
  document.querySelectorAll('[data-action]').forEach(btn => btn.addEventListener('click', () => route(btn.dataset.action)));
  document.querySelectorAll('[data-match]').forEach(btn => btn.addEventListener('click', () => { state.matchId = btn.dataset.match; state.tab = 'match'; render(); }));
  document.querySelectorAll('[data-team]').forEach(btn => btn.addEventListener('click', () => { state.team = btn.dataset.team; state.tab = 'team'; render(); }));
  const search = document.querySelector('#search');
  if (search) search.addEventListener('input', e => { state.query = e.target.value; render(); });
  const group = document.querySelector('#groupFilter');
  if (group) group.addEventListener('change', e => { state.group = e.target.value; render(); });
}

function render() {
  let content;
  if (state.tab === 'schedule') content = schedule();
  else if (state.tab === 'standings') content = standings();
  else if (state.tab === 'teams') content = teams();
  else if (state.tab === 'match') content = matchDetail(state.matchId);
  else if (state.tab === 'team') content = teamDetail(state.team);
  else content = overview();
  shell(content);
  bind();
}

async function init() {
  try {
    const [matches, teams, venues, meta] = await Promise.all([
      loadJson('matches.json'), loadJson('teams.json'), loadJson('venues.json'), loadJson('meta.json')
    ]);
    state.data = { matches, teams, venues, meta };
    render();
  } catch (error) {
    shell(`<section class="card"><h2>Dashboard data failed to load</h2><p>${error.message}</p></section>`);
  }
}

init();
