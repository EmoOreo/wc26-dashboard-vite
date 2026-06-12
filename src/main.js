import './styles.css';

const STORAGE_KEY = 'wc26_favorites_v1';

const state = {
  tab: location.hash.replace('#', '') || 'overview',
  data: { matches: [], teams: [], venues: [], meta: {} },
  query: '',
  group: 'all',
  matchId: null,
  team: null,
  venue: null,
  favorites: loadFavorites()
};

const app = document.querySelector('#app');
const navTabs = ['overview', 'schedule', 'standings', 'groups', 'teams', 'venues'];

async function loadJson(path) {
  const response = await fetch(`./data/${path}`);
  if (!response.ok) throw new Error(`Could not load ${path}`);
  return response.json();
}

function loadFavorites() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}
function saveFavorites() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.favorites)); }
function isFavorite(team) { return state.favorites.includes(team); }
function toggleFavorite(team) {
  state.favorites = isFavorite(team) ? state.favorites.filter(t => t !== team) : [...state.favorites, team].sort();
  saveFavorites();
  render();
}

function tournamentToday() { return new Date('2026-06-11T12:00:00Z'); }
function startOfDay(date) { const d = new Date(date); d.setHours(0,0,0,0); return d; }
function sameDay(iso, date) { return startOfDay(new Date(iso)).getTime() === startOfDay(date).getTime(); }
function addDays(date, days) { const d = new Date(date); d.setDate(d.getDate() + days); return d; }

function formatDate(iso) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
}
function dayKey(iso) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(iso));
}
function countdownLabel(iso) {
  const diff = new Date(iso) - tournamentToday();
  if (diff <= 0) return 'Started';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h away`;
  return `${Math.max(1, hours)}h away`;
}
function scoreline(match) {
  if (match.status === 'finished') return `FT — ${match.home} ${match.homeScore}–${match.awayScore} ${match.away}`;
  if (match.status === 'live') return `LIVE — ${match.home} ${match.homeScore ?? 0}–${match.awayScore ?? 0} ${match.away}`;
  return `${match.home} vs ${match.away}`;
}
function resultBadge(match) {
  if (match.status === 'finished') return '<span class="badge done">FT</span>';
  if (match.status === 'live') return '<span class="badge live">LIVE</span>';
  return `<span class="badge upcoming">${countdownLabel(match.kickoff)}</span>`;
}
function getTeam(name) { return state.data.teams.find(t => t.name === name) || { name, flag: '🏳️', group: '?' }; }
function teamStanding(name) {
  const team = getTeam(name);
  const rows = buildStandings(state.data.matches, state.data.teams)[team.group] || [];
  const index = rows.findIndex(r => r.team === name);
  return { row: rows[index], rank: index + 1, rows };
}
function teamMatches(name) { return state.data.matches.filter(m => m.home === name || m.away === name).sort((a,b)=>new Date(a.kickoff)-new Date(b.kickoff)); }
function groupTeams(group) { return state.data.teams.filter(t => t.group === group).sort((a,b)=>a.name.localeCompare(b.name)); }
function groupMatches(group) { return state.data.matches.filter(m => m.group === group).sort((a,b)=>new Date(a.kickoff)-new Date(b.kickoff)); }
function venueMatches(venue) { return state.data.matches.filter(m => m.venue === venue).sort((a,b)=>new Date(a.kickoff)-new Date(b.kickoff)); }

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

function route(tab, extra = {}) { state.tab = tab; Object.assign(state, extra); history.pushState(null, '', `#${tab}`); render(); }
window.addEventListener('popstate', () => { state.tab = location.hash.replace('#', '') || 'overview'; render(); });

function shell(content) {
  app.innerHTML = `
    <header class="topbar">
      <div><div class="eyebrow">World Cup 2026</div><h1>WC26 Dashboard</h1></div>
      <nav>${navTabs.map(tab => `<button class="pill ${state.tab === tab ? 'active' : ''}" data-tab="${tab}">${label(tab)}</button>`).join('')}</nav>
    </header>
    <main class="page">${content}</main>
  `;
  document.querySelectorAll('[data-tab]').forEach(btn => btn.addEventListener('click', () => route(btn.dataset.tab, { query: '', group: 'all' })));
}
function label(tab) { return tab[0].toUpperCase() + tab.slice(1); }

function overview() {
  const { matches, teams, venues, meta } = state.data;
  const now = tournamentToday();
  const finished = matches.filter(m => m.status === 'finished').sort((a,b) => new Date(b.kickoff) - new Date(a.kickoff));
  const upcoming = matches.filter(m => m.status === 'scheduled').sort((a,b) => new Date(a.kickoff) - new Date(b.kickoff));
  const live = matches.filter(m => m.status === 'live');
  const today = matches.filter(m => sameDay(m.kickoff, now)).sort((a,b) => new Date(a.kickoff) - new Date(b.kickoff));
  const tomorrow = matches.filter(m => sameDay(m.kickoff, addDays(now, 1))).sort((a,b) => new Date(a.kickoff) - new Date(b.kickoff));
  const featured = live[0] || upcoming[0] || finished[0];
  const standings = buildStandings(matches, teams);
  const favMatches = favoriteMatches().slice(0, 4);

  return `
    <section class="home-hero card">
      <div>
        <div class="eyebrow">Match Center</div>
        <h2>Follow the tournament by day, group, team, and venue.</h2>
        <p>A cleaner dashboard hub with pinned favorites, today/tomorrow match windows, dedicated group pages, venue pages, computed standings, and match countdown labels.</p>
        <div class="hero-actions">
          <button class="primary" data-action="schedule">Open schedule</button>
          <button class="secondary" data-action="groups">Browse groups</button>
          <button class="secondary" data-action="venues">Venue guide</button>
        </div>
      </div>
      <article class="spotlight">
        <span class="badge live">Featured</span>
        <h3>${featured ? scoreline(featured) : 'No match loaded'}</h3>
        <p>${featured ? `${formatDate(featured.kickoff)} • ${featured.venue}` : 'Add fixture data to begin.'}</p>
        ${featured ? `<button class="primary small" data-match="${featured.id}">Open match</button>` : ''}
      </article>
    </section>

    <section class="stat-grid">
      <button class="stat card clickable" data-action="schedule"><strong>${matches.length}</strong><span>Fixtures</span></button>
      <button class="stat card clickable" data-action="groups"><strong>${Object.keys(standings).length}</strong><span>Groups</span></button>
      <button class="stat card clickable" data-action="teams"><strong>${state.favorites.length}</strong><span>Favorite teams</span></button>
      <button class="stat card clickable" data-action="venues"><strong>${venues.length}</strong><span>Venues</span></button>
    </section>

    ${state.favorites.length ? `
    <section class="card favorite-strip pinned">
      <div class="section-row"><div><h3>Pinned favorites</h3><p class="muted">Your saved teams stay near the top of the dashboard.</p></div><button class="secondary small" data-action="teams">Edit favorites</button></div>
      <div class="team-chip-row">${state.favorites.map(team => favoriteTeamChip(team)).join('')}</div>
      <div class="match-list compact">${favMatches.map(matchCard).join('') || '<p class="muted">No loaded fixtures for favorites yet.</p>'}</div>
    </section>` : `
    <section class="card empty-favorites"><h3>No favorite teams yet</h3><p class="muted">Star teams from the Teams page to create a personal match center.</p><button class="primary small" data-action="teams">Pick favorites</button></section>`}

    <section class="dashboard-grid">
      <article class="card"><div class="section-row"><h3>Live now</h3><button class="secondary small" data-action="schedule">All fixtures</button></div><div class="match-list">${live.map(matchCard).join('') || '<p class="muted">No live matches in the static feed.</p>'}</div></article>
      <article class="card"><div class="section-row"><h3>Today</h3><button class="secondary small" data-action="schedule">Schedule</button></div><div class="match-list">${today.map(matchCard).join('') || '<p class="muted">No matches today.</p>'}</div></article>
      <article class="card"><div class="section-row"><h3>Tomorrow</h3><button class="secondary small" data-action="schedule">Schedule</button></div><div class="match-list">${tomorrow.slice(0, 5).map(matchCard).join('') || '<p class="muted">No matches tomorrow.</p>'}</div></article>
      <article class="card"><div class="section-row"><h3>Recently finished</h3><button class="secondary small" data-action="schedule">All fixtures</button></div><div class="match-list">${finished.slice(0, 4).map(matchCard).join('') || '<p class="muted">No completed matches yet.</p>'}</div></article>
      <article class="card wide"><div class="section-row"><h3>Group A snapshot</h3><button class="secondary small" data-group="A">Open Group A</button></div>${standingsTable('A', standings.A || [])}</article>
      <article class="card"><h3>Data status</h3><p class="result-line">Static data loaded successfully</p><p class="muted">Last data update: ${meta.lastUpdated ? new Date(meta.lastUpdated).toLocaleString() : 'unknown'}</p></article>
    </section>
  `;
}

function favoriteMatches() {
  if (!state.favorites.length) return [];
  return state.data.matches.filter(m => state.favorites.includes(m.home) || state.favorites.includes(m.away)).sort((a,b) => {
    const rank = { live: 0, scheduled: 1, finished: 2 };
    return (rank[a.status] ?? 9) - (rank[b.status] ?? 9) || new Date(a.kickoff) - new Date(b.kickoff);
  });
}
function favoriteTeamChip(name) { const team = getTeam(name); const { row, rank } = teamStanding(name); return `<button class="team-chip" data-team="${name}"><strong>${team.flag} ${name}</strong><span>Group ${team.group} • ${rank || '-'}${rank ? ordinal(rank) : ''} • ${row?.points ?? 0} pts</span></button>`; }
function ordinal(n) { return n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'; }
function matchCard(match) {
  const home = getTeam(match.home); const away = getTeam(match.away);
  return `<button class="match-card" data-match="${match.id}"><div class="match-top"><span>${dayKey(match.kickoff)}</span>${resultBadge(match)}</div><div class="teams-line"><span>${home.flag} ${match.home}</span><strong>${match.status === 'finished' ? `${match.homeScore}–${match.awayScore}` : 'vs'}</strong><span>${away.flag} ${match.away}</span></div><div class="muted">Group ${match.group} • ${match.venue}, ${match.city}</div></button>`;
}

function schedule() {
  const q = state.query.toLowerCase();
  const groups = ['all', ...new Set(state.data.matches.map(m => m.group).sort())];
  const favOnly = state.group === 'favorites';
  const matches = state.data.matches
    .filter(m => favOnly ? (state.favorites.includes(m.home) || state.favorites.includes(m.away)) : (state.group === 'all' || m.group === state.group))
    .filter(m => !q || [m.home, m.away, m.venue, m.city, m.group].join(' ').toLowerCase().includes(q))
    .sort((a,b) => new Date(a.kickoff) - new Date(b.kickoff));
  return `<section class="section-head"><div><h2>Schedule</h2><p>Clickable fixture cards with countdown labels, finished/live/scheduled states, and favorite-team filtering.</p></div></section><section class="filters card"><input id="search" placeholder="Search team, venue, city..." value="${state.query}"><select id="groupFilter"><option value="all" ${state.group === 'all' ? 'selected' : ''}>All groups</option><option value="favorites" ${state.group === 'favorites' ? 'selected' : ''}>My favorites</option>${groups.filter(g => g !== 'all').map(g => `<option value="${g}" ${state.group === g ? 'selected' : ''}>Group ${g}</option>`).join('')}</select></section><section class="match-grid">${matches.map(matchCard).join('') || '<article class="card"><p class="muted">No matches match this filter.</p></article>'}</section>`;
}

function standings() { const tables = buildStandings(state.data.matches, state.data.teams); return `<section class="section-head"><div><h2>Standings</h2><p>Tables are computed automatically from finished match results. Top two highlighted; third-place slots marked as watchlist.</p></div></section><section class="standings-grid">${Object.keys(tables).sort().map(group => `<article class="card"><div class="section-row"><h3>Group ${group}</h3><button class="secondary small" data-group="${group}">Open group</button></div>${standingsTable(group, tables[group])}</article>`).join('')}</section>`; }
function standingsTable(group, rows) { return `<table class="standings-table"><thead><tr><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr></thead><tbody>${rows.map((r, i) => `<tr class="${i < 2 ? 'qualify' : i === 2 ? 'third-watch' : ''}"><td><button class="table-team" data-team="${r.team}">${getTeam(r.team).flag} ${r.team}</button></td><td>${r.played}</td><td>${r.won}</td><td>${r.drawn}</td><td>${r.lost}</td><td>${r.gd > 0 ? '+' : ''}${r.gd}</td><td><strong>${r.points}</strong></td></tr>`).join('')}</tbody></table>`; }

function groups() {
  const tables = buildStandings(state.data.matches, state.data.teams);
  return `<section class="section-head"><div><h2>Groups</h2><p>Open any group for its table, teams, and loaded fixtures.</p></div></section><section class="group-grid">${Object.keys(tables).sort().map(group => {
    const matches = groupMatches(group); const completed = matches.filter(m => m.status === 'finished').length;
    return `<article class="group-card card clickable" data-group="${group}"><div class="group-badge">${group}</div><h3>Group ${group}</h3><p class="muted">${groupTeams(group).map(t => `${t.flag} ${t.name}`).join(' • ')}</p><div class="mini-meta"><span>${completed}/${matches.length} played</span><span>${matches.length} fixtures</span></div>${standingsTable(group, tables[group])}</article>`;
  }).join('')}</section>`;
}
function groupDetail(group) {
  const tables = buildStandings(state.data.matches, state.data.teams); const rows = tables[group] || []; const matches = groupMatches(group); const teams = groupTeams(group);
  return `<section class="detail-stack"><button class="secondary small" data-action="groups">← Back to groups</button><section class="card detail group-detail"><div class="eyebrow">Group page</div><h2>Group ${group}</h2><p>${teams.map(t => `${t.flag} ${t.name}`).join(' • ')}</p><div class="profile-stats"><div><strong>${teams.length}</strong><span>Teams</span></div><div><strong>${matches.length}</strong><span>Fixtures</span></div><div><strong>${matches.filter(m => m.status === 'finished').length}</strong><span>Played</span></div><div><strong>${matches.filter(m => m.status !== 'finished').length}</strong><span>Remaining</span></div></div></section><section class="team-detail-grid"><article class="card"><h3>Standings</h3>${standingsTable(group, rows)}</article><article class="card"><h3>Teams</h3><div class="team-chip-row">${teams.map(t => `<button class="team-chip" data-team="${t.name}"><strong>${t.flag} ${t.name}</strong><span>${t.code}</span></button>`).join('')}</div></article><article class="card wide"><h3>Group ${group} fixtures</h3><div class="match-list">${matches.map(matchCard).join('')}</div></article></section></section>`;
}

function teams() {
  const tables = buildStandings(state.data.matches, state.data.teams); const q = state.query.toLowerCase();
  const teams = state.data.teams.filter(team => !q || [team.name, team.group, team.code].join(' ').toLowerCase().includes(q)).sort((a,b) => Number(isFavorite(b.name)) - Number(isFavorite(a.name)) || a.group.localeCompare(b.group) || a.name.localeCompare(b.name));
  return `<section class="section-head"><div><h2>Teams</h2><p>Star teams for your personal dashboard, then click a card for fixtures and group position.</p></div></section><section class="filters card"><input id="search" placeholder="Search teams or groups..." value="${state.query}"></section><section class="team-grid">${teams.map(team => { const row = tables[team.group]?.find(r => r.team === team.name); const rank = (tables[team.group] || []).findIndex(r => r.team === team.name) + 1; return `<article class="team-card card ${isFavorite(team.name) ? 'is-favorite' : ''}"><button class="favorite-btn" data-favorite="${team.name}" title="Toggle favorite">${isFavorite(team.name) ? '★' : '☆'}</button><button class="team-main" data-team="${team.name}"><strong>${team.flag} ${team.name}</strong><span>Group ${team.group} • ${rank || '-'}${rank ? ordinal(rank) : ''}</span><span>${row?.points ?? 0} pts • ${row?.played ?? 0} played • GD ${row?.gd > 0 ? '+' : ''}${row?.gd ?? 0}</span></button></article>`; }).join('')}</section>`;
}

function venues() {
  const q = state.query.toLowerCase();
  const venues = state.data.venues.filter(v => !q || [v.name, v.city, v.country].join(' ').toLowerCase().includes(q)).sort((a,b)=>a.city.localeCompare(b.city));
  return `<section class="section-head"><div><h2>Venues</h2><p>Browse host venues and open a venue page to see its loaded match list.</p></div></section><section class="filters card"><input id="search" placeholder="Search venue, city, country..." value="${state.query}"></section><section class="venue-grid">${venues.map(v => { const count = venueMatches(v.name).length; return `<article class="venue-card card clickable" data-venue="${v.name}"><div class="eyebrow">${v.country || 'Host venue'}</div><h3>${v.name}</h3><p>${v.city}</p><div class="mini-meta"><span>${count} matches</span><span>${v.capacity ? `${v.capacity.toLocaleString()} capacity` : 'Capacity TBD'}</span></div></article>`; }).join('')}</section>`;
}
function venueDetail(name) {
  const venue = state.data.venues.find(v => v.name === name) || { name, city: 'Unknown', country: '' }; const matches = venueMatches(name);
  return `<section class="detail-stack"><button class="secondary small" data-action="venues">← Back to venues</button><section class="card detail"><div class="eyebrow">Venue page</div><h2>${venue.name}</h2><p>${venue.city}${venue.country ? ` • ${venue.country}` : ''}</p><div class="profile-stats"><div><strong>${matches.length}</strong><span>Matches</span></div><div><strong>${new Set(matches.map(m => m.group)).size}</strong><span>Groups</span></div><div><strong>${matches.filter(m => m.status === 'finished').length}</strong><span>Finished</span></div><div><strong>${matches.filter(m => m.status !== 'finished').length}</strong><span>Upcoming</span></div></div></section><section class="card"><h3>Matches at ${venue.name}</h3><div class="match-list">${matches.map(matchCard).join('') || '<p class="muted">No loaded matches for this venue.</p>'}</div></section></section>`;
}

function matchDetail(id) { const match = state.data.matches.find(m => m.id === id); if (!match) return '<section class="card"><h2>Match not found</h2></section>'; return `<section class="card detail"><button class="secondary small" data-action="schedule">← Back to schedule</button><div class="eyebrow">Group ${match.group} • ${match.stage}</div><h2>${scoreline(match)}</h2><p>${formatDate(match.kickoff)}</p><p><button class="table-team" data-venue="${match.venue}">${match.venue}, ${match.city}</button></p><p>${match.broadcast || 'Broadcast TBD'}</p><p>${resultBadge(match)}</p><div class="detail-actions"><button class="secondary small" data-group="${match.group}">Open Group ${match.group}</button><button class="secondary small" data-team="${match.home}">Open ${match.home}</button><button class="secondary small" data-team="${match.away}">Open ${match.away}</button></div></section>`; }
function teamDetail(name) { const team = getTeam(name); const matches = teamMatches(name); const { row, rank, rows } = teamStanding(name); const next = matches.find(m => m.status !== 'finished'); const last = [...matches].reverse().find(m => m.status === 'finished'); return `<section class="team-detail-grid"><article class="card detail team-profile"><button class="secondary small" data-action="teams">← Back to teams</button><div class="eyebrow">Group ${team.group}</div><div class="team-title-row"><h2>${team.flag} ${team.name}</h2><button class="favorite-btn large" data-favorite="${team.name}">${isFavorite(team.name) ? '★ Favorite' : '☆ Add favorite'}</button></div><div class="profile-stats"><div><strong>${rank || '-'}</strong><span>Group rank</span></div><div><strong>${row?.points ?? 0}</strong><span>Points</span></div><div><strong>${row?.gd > 0 ? '+' : ''}${row?.gd ?? 0}</strong><span>Goal diff</span></div><div><strong>${row?.played ?? 0}</strong><span>Played</span></div></div><div class="split-cards"><div><h3>Next match</h3>${next ? matchCard(next) : '<p class="muted">No upcoming loaded fixture.</p>'}</div><div><h3>Latest result</h3>${last ? matchCard(last) : '<p class="muted">No completed loaded result.</p>'}</div></div></article><article class="card"><div class="section-row"><h3>Group ${team.group} table</h3><button class="secondary small" data-group="${team.group}">Open group</button></div>${standingsTable(team.group, rows)}</article><article class="card wide"><h3>${team.name} fixtures</h3><div class="match-list">${matches.map(matchCard).join('') || '<p class="muted">No fixtures loaded for this team yet.</p>'}</div></article></section>`; }

function bind() {
  document.querySelectorAll('[data-action]').forEach(btn => btn.addEventListener('click', () => route(btn.dataset.action, { query: '', group: 'all' })));
  document.querySelectorAll('[data-match]').forEach(btn => btn.addEventListener('click', () => { state.matchId = btn.dataset.match; state.tab = 'match'; render(); }));
  document.querySelectorAll('[data-team]').forEach(btn => btn.addEventListener('click', () => { state.team = btn.dataset.team; state.tab = 'team'; render(); }));
  document.querySelectorAll('[data-group]').forEach(btn => btn.addEventListener('click', () => { state.group = btn.dataset.group; state.tab = 'group'; render(); }));
  document.querySelectorAll('[data-venue]').forEach(btn => btn.addEventListener('click', () => { state.venue = btn.dataset.venue; state.tab = 'venue'; render(); }));
  document.querySelectorAll('[data-favorite]').forEach(btn => btn.addEventListener('click', (event) => { event.stopPropagation(); toggleFavorite(btn.dataset.favorite); }));
  const search = document.querySelector('#search'); if (search) search.addEventListener('input', e => { state.query = e.target.value; render(); });
  const group = document.querySelector('#groupFilter'); if (group) group.addEventListener('change', e => { state.group = e.target.value; render(); });
}

function render() {
  let content;
  if (state.tab === 'schedule') content = schedule();
  else if (state.tab === 'standings') content = standings();
  else if (state.tab === 'groups') content = groups();
  else if (state.tab === 'group') content = groupDetail(state.group);
  else if (state.tab === 'teams') content = teams();
  else if (state.tab === 'venues') content = venues();
  else if (state.tab === 'venue') content = venueDetail(state.venue);
  else if (state.tab === 'match') content = matchDetail(state.matchId);
  else if (state.tab === 'team') content = teamDetail(state.team);
  else content = overview();
  shell(content); bind();
}

async function init() {
  try {
    const [matches, teams, venues, meta] = await Promise.all([loadJson('matches.json'), loadJson('teams.json'), loadJson('venues.json'), loadJson('meta.json')]);
    state.data = { matches, teams, venues, meta }; render();
  } catch (error) { shell(`<section class="card"><h2>Dashboard data failed to load</h2><p>${error.message}</p></section>`); }
}
init();
