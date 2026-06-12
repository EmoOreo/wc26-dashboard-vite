import './styles.css';
import { refreshFromLiveApi } from './data/liveProvider.js';

const STORAGE_KEY = 'wc26_favorites_v1';
const GROUP_STAGE_MATCHES = 72;
const TOTAL_TOURNAMENT_MATCHES = 104;

const state = {
  tab: location.hash.replace('#', '') || 'overview',
  data: { matches: [], teams: [], venues: [], meta: {} },
  query: '',
  group: 'all',
  matchId: null,
  team: null,
  venue: null,
  favorites: loadFavorites(),
  liveData: { source: 'static', status: 'static fallback', lastLoaded: null, error: null, updates: 0 }
};

const app = document.querySelector('#app');
const navTabs = ['overview', 'schedule', 'standings', 'groups', 'teams', 'venues', 'bracket'];

async function loadJson(path, cacheBust = false) {
  const response = await fetch(`./data/${path}${cacheBust ? `?v=${Date.now()}` : ''}`);
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

function tournamentToday() {
  const now = new Date();
  const tournamentStart = new Date('2026-06-11T00:00:00Z');
  const tournamentEnd = new Date('2026-07-20T00:00:00Z');
  if (now >= tournamentStart && now <= tournamentEnd) return now;
  return new Date('2026-06-11T12:00:00Z');
}
function startOfDay(date) { const d = new Date(date); d.setHours(0,0,0,0); return d; }
function sameDay(iso, date) { return startOfDay(new Date(iso)).getTime() === startOfDay(date).getTime(); }
function addDays(date, days) { const d = new Date(date); d.setDate(d.getDate() + days); return d; }
function percent(n, d) { return d ? Math.round((n / d) * 100) : 0; }

function formatDate(iso) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
}
function dayKey(iso) { return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(iso)); }
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
function groupLetters() { return [...new Set(state.data.teams.map(t => t.group))].sort(); }
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

function thirdPlaceTable(tables) {
  return Object.values(tables)
    .map(rows => rows[2])
    .filter(Boolean)
    .sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team))
    .map((row, index) => ({ ...row, thirdRank: index + 1, projectedAdvance: index < 8 }));
}

function qualificationStatus(teamName) {
  const tables = buildStandings(state.data.matches, state.data.teams);
  const team = getTeam(teamName);
  const rows = tables[team.group] || [];
  const row = rows.find(r => r.team === teamName);
  const rank = rows.findIndex(r => r.team === teamName) + 1;
  const played = row?.played ?? 0;
  const third = thirdPlaceTable(tables).find(r => r.team === teamName);
  if (played >= 3 && (rank <= 2 || third?.projectedAdvance)) return { key: 'qualified', label: 'Qualified', icon: '🟢' };
  if (played >= 3 && rank > 3 && !third?.projectedAdvance) return { key: 'eliminated', label: 'Eliminated', icon: '🔴' };
  if (rank <= 2) return { key: 'projected', label: 'Projected qualified', icon: '🟢' };
  if (rank === 3) return { key: 'third', label: third?.projectedAdvance ? 'Best-third watch' : 'Third-place bubble', icon: '🟡' };
  return { key: 'contention', label: 'In contention', icon: '🟡' };
}

function teamStanding(name) {
  const team = getTeam(name);
  const rows = buildStandings(state.data.matches, state.data.teams)[team.group] || [];
  const index = rows.findIndex(r => r.team === name);
  return { row: rows[index], rank: index + 1, rows };
}

function bracketSlots() {
  const tables = buildStandings(state.data.matches, state.data.teams);
  const thirds = thirdPlaceTable(tables).filter(r => r.projectedAdvance);
  const groupWinner = g => tables[g]?.[0]?.team || `Winner Group ${g}`;
  const groupRunner = g => tables[g]?.[1]?.team || `Runner-up Group ${g}`;
  const third = n => thirds[n - 1]?.team || `Best 3rd #${n}`;
  return [
    [groupWinner('A'), third(8)], [groupWinner('B'), groupRunner('C')], [groupWinner('C'), third(7)], [groupWinner('D'), groupRunner('E')],
    [groupWinner('E'), third(6)], [groupWinner('F'), groupRunner('G')], [groupWinner('G'), third(5)], [groupWinner('H'), groupRunner('I')],
    [groupWinner('I'), third(4)], [groupWinner('J'), groupRunner('K')], [groupWinner('K'), third(3)], [groupWinner('L'), groupRunner('A')],
    [groupRunner('B'), groupRunner('D')], [groupRunner('F'), third(2)], [groupRunner('H'), groupRunner('J')], [groupRunner('L'), third(1)]
  ];
}

function scenarioNotes(teamName) {
  const { row, rank } = teamStanding(teamName);
  const team = getTeam(teamName);
  const remaining = teamMatches(teamName).filter(m => m.status !== 'finished');
  const next = remaining[0];
  if (!next) return ['Group-stage schedule complete in loaded data.', 'Final status depends on full group and best-third table.'];
  const opponent = next.home === teamName ? next.away : next.home;
  const base = row?.points ?? 0;
  const lead = rank <= 2 ? 'currently in an automatic advancement position' : rank === 3 ? 'currently on the best-third watchlist' : 'currently needs points to climb the table';
  return [
    `Next: ${teamName} vs ${opponent} in Group ${team.group}.`,
    `Win: moves to ${base + 3} pts and likely strengthens qualification odds.`,
    `Draw: moves to ${base + 1} pts and keeps ${teamName} in contention.`,
    `Loss: remains on ${base} pts; advancement depends on the rest of Group ${team.group} and best-third ranking.`,
    `Current read: ${teamName} is ${lead}.`
  ];
}

function teamForm(teamName) {
  return teamMatches(teamName)
    .filter(m => m.status === 'finished')
    .slice(-5)
    .map(m => {
      const forScore = m.home === teamName ? Number(m.homeScore) : Number(m.awayScore);
      const againstScore = m.home === teamName ? Number(m.awayScore) : Number(m.homeScore);
      return forScore > againstScore ? 'W' : forScore < againstScore ? 'L' : 'D';
    });
}

function formChips(teamName) {
  const form = teamForm(teamName);
  if (!form.length) return '<div class="form-row empty"><span>No completed matches yet</span></div>';
  return `<div class="form-row">${form.map(letter => `<span class="form-chip ${letter.toLowerCase()}">${letter}</span>`).join('')}</div>`;
}

function qualificationOutlook(teamName) {
  const { row, rank } = teamStanding(teamName);
  const status = qualificationStatus(teamName);
  const points = row?.points ?? 0;
  const played = row?.played ?? 0;
  let value = 45;
  if (rank === 1) value = 86;
  else if (rank === 2) value = 72;
  else if (rank === 3) value = 52;
  else if (rank === 4) value = 28;
  value += Math.min(12, points * 4);
  value -= Math.max(0, played - 1) * 4;
  if (status.key === 'qualified') value = 100;
  if (status.key === 'eliminated') value = 0;
  if (status.key === 'third') value = Math.max(value, 55);
  return Math.max(0, Math.min(100, Math.round(value)));
}

function outlookMeter(teamName) {
  const value = qualificationOutlook(teamName);
  return `<div class="meter-card"><div class="section-row mini"><strong>Qualification outlook</strong><span>${value}%</span></div><div class="meter"><i style="width:${value}%"></i></div><p class="muted">Rule-based projection from current rank, points, played matches, and best-third position.</p></div>`;
}

function tournamentStories(tables) {
  const finished = state.data.matches.filter(m => m.status === 'finished');
  const biggest = finished.slice().sort((a,b) => Math.abs(Number(b.homeScore)-Number(b.awayScore)) - Math.abs(Number(a.homeScore)-Number(a.awayScore)))[0];
  const thirds = thirdPlaceTable(tables);
  const closest = Object.entries(tables).map(([group, rows]) => {
    const spread = (rows[0]?.points ?? 0) - (rows[3]?.points ?? 0);
    return { group, spread, leader: rows[0]?.team || 'TBD' };
  }).sort((a,b) => a.spread - b.spread || a.group.localeCompare(b.group))[0];
  const venueCounts = state.data.venues.map(v => ({ ...v, count: venueMatches(v.name).length })).sort((a,b)=>b.count-a.count)[0];
  const bestThirdRace = thirds.slice(7, 10).map(t => `${getTeam(t.team).flag} ${t.team}`).join(' / ') || 'Waiting for third-place results';
  return [
    { label: 'Biggest winner', value: biggest ? scoreline(biggest).replace('FT — ', '') : 'No final result yet', note: biggest ? `${Math.abs(Number(biggest.homeScore)-Number(biggest.awayScore))} goal margin` : 'Completed results will appear here.' },
    { label: 'Closest group', value: closest ? `Group ${closest.group}` : 'TBD', note: closest ? `${closest.spread} point spread across the table` : 'Waiting for standings.' },
    { label: 'Best-third race', value: bestThirdRace, note: 'Teams around the 8th best-third cutoff.' },
    { label: 'Most active venue', value: venueCounts ? venueCounts.name : 'TBD', note: venueCounts ? `${venueCounts.count} loaded matches • ${venueCounts.city}` : 'Venue data missing.' }
  ];
}

function storyCards(tables) {
  return `<section class="story-grid">${tournamentStories(tables).map(story => `<article class="story-card card"><div class="eyebrow">${story.label}</div><h3>${story.value}</h3><p class="muted">${story.note}</p></article>`).join('')}</section>`;
}

function groupScenarioCards(group) {
  const rows = buildStandings(state.data.matches, state.data.teams)[group] || [];
  const remaining = groupMatches(group).filter(m => m.status !== 'finished');
  const next = remaining[0];
  const leader = rows[0]?.team;
  const bubble = rows[2]?.team;
  return `<div class="scenario-grid">
    <article class="scenario-card"><h3>Leader path</h3><p>${leader ? `${getTeam(leader).flag} ${leader}` : 'TBD'} controls the group for now. A win in the next loaded fixture strengthens an automatic Round of 32 path.</p></article>
    <article class="scenario-card"><h3>Bubble watch</h3><p>${bubble ? `${getTeam(bubble).flag} ${bubble}` : 'TBD'} is the current third-place checkpoint. Their outlook depends on the best third-place table.</p></article>
    <article class="scenario-card"><h3>Next swing match</h3><p>${next ? `${getTeam(next.home).flag} ${next.home} vs ${getTeam(next.away).flag} ${next.away} can reshape Group ${group}.` : 'No remaining group fixtures in loaded data.'}</p></article>
  </div>`;
}

function route(tab, extra = {}) { state.tab = tab; Object.assign(state, extra); history.pushState(null, '', `#${tab}`); render(); }
window.addEventListener('popstate', () => { state.tab = location.hash.replace('#', '') || 'overview'; render(); });

function shell(content) {
  app.innerHTML = `
    <header class="topbar">
      <div><div class="eyebrow">World Cup 2026</div><h1>WC26 Dashboard</h1></div>
      <div class="topbar-actions">
        <div class="data-source-group">
          <button class="refresh-pill" data-refresh-live>${refreshButtonText()}</button>
          <span class="source-pill ${dataSourceClass()}">${dataSourceText()}</span>
          <span class="last-refresh">${lastRefreshText()}</span>
        </div>
        <nav>${navTabs.map(tab => `<button class="pill ${state.tab === tab ? 'active' : ''}" data-tab="${tab}">${label(tab)}</button>`).join('')}</nav>
      </div>
    </header>
    <main class="page">${content}</main>
  `;
  document.querySelectorAll('[data-tab]').forEach(btn => btn.addEventListener('click', () => route(btn.dataset.tab, { query: '', group: 'all' })));
}
function label(tab) { return tab[0].toUpperCase() + tab.slice(1); }

function dataSourceText() {
  if (state.liveData.status === 'refreshing') return 'Refreshing…';
  return state.liveData.source === 'live-api' ? 'Source: Live API' : 'Source: Static fallback';
}
function dataSourceClass() {
  if (state.liveData.status === 'refreshing') return 'refreshing';
  return state.liveData.source === 'live-api' ? 'live-source' : 'fallback-source';
}
function refreshButtonText() {
  if (state.liveData.status === 'refreshing') return 'Refreshing…';
  if (state.liveData.status === 'updated') return 'Updated ✓';
  return 'Refresh data';
}
function lastRefreshText() {
  return state.liveData.lastLoaded ? `Last refreshed: ${new Date(state.liveData.lastLoaded).toLocaleString()}` : 'Last refreshed: not yet';
}


function overview() {
  const { matches, teams, venues, meta } = state.data;
  const now = tournamentToday();
  const finished = matches.filter(m => m.status === 'finished').sort((a,b) => new Date(b.kickoff) - new Date(a.kickoff));
  const upcoming = matches.filter(m => m.status === 'scheduled').sort((a,b) => new Date(a.kickoff) - new Date(b.kickoff));
  const live = matches.filter(m => m.status === 'live');
  const today = matches.filter(m => sameDay(m.kickoff, now)).sort((a,b) => new Date(a.kickoff) - new Date(b.kickoff));
  const tomorrow = matches.filter(m => sameDay(m.kickoff, addDays(now, 1))).sort((a,b) => new Date(a.kickoff) - new Date(b.kickoff));
  const featured = live[0] || upcoming[0] || finished[0];
  const tables = buildStandings(matches, teams);
  const favMatches = favoriteMatches().slice(0, 4);
  const played = matches.filter(m => m.status === 'finished').length;

  return `
    <section class="progress-banner card">
      <div><strong>${played}/${TOTAL_TOURNAMENT_MATCHES}</strong><span>matches played</span></div>
      <div><strong>${percent(played, GROUP_STAGE_MATCHES)}%</strong><span>group stage progress</span></div>
      <div><strong>${thirdPlaceTable(tables).filter(t => t.projectedAdvance).length}/8</strong><span>best-third slots tracked</span></div>
      <button class="secondary small" data-action="bracket">Open bracket intelligence</button>
    </section>

    <section class="home-hero card">
      <div>
        <div class="eyebrow">Tournament Intelligence</div>
        <h2>Follow the tournament by day, group, team, venue, and qualification path.</h2>
        <p>Now adds live-feeling match windows, tournament story cards, team form, qualification outlook meters, and bracket polish.</p>
        <div class="hero-actions">
          <button class="primary" data-action="bracket">Open bracket</button>
          <button class="secondary" data-action="groups">Browse groups</button>
          <button class="secondary" data-action="standings">Qualification tracker</button>
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
      <button class="stat card clickable" data-action="schedule"><strong>${matches.length}</strong><span>Group fixtures</span></button>
      <button class="stat card clickable" data-action="groups"><strong>${Object.keys(tables).length}</strong><span>Groups</span></button>
      <button class="stat card clickable" data-action="bracket"><strong>32</strong><span>Round of 32 slots</span></button>
      <button class="stat card clickable" data-action="venues"><strong>${venues.length}</strong><span>Venues</span></button>
    </section>

    <section class="section-row story-heading"><div><h3>Tournament stories</h3><p class="muted">Auto-generated story cards from results, standings, venues, and best-third projections.</p></div></section>
    ${storyCards(tables)}

    ${state.favorites.length ? `
    <section class="card favorite-strip pinned">
      <div class="section-row"><div><h3>Pinned favorites</h3><p class="muted">Your saved teams stay near the top of the dashboard.</p></div><button class="secondary small" data-action="teams">Edit favorites</button></div>
      <div class="team-chip-row">${state.favorites.map(team => favoriteTeamChip(team)).join('')}</div>
      <div class="match-list compact">${favMatches.map(matchCard).join('') || '<p class="muted">No loaded fixtures for favorites yet.</p>'}</div>
    </section>` : `
    <section class="card empty-favorites"><h3>No favorite teams yet</h3><p class="muted">Star teams from the Teams page to create a personal match center.</p><button class="primary small" data-action="teams">Pick favorites</button></section>`}

    <section class="dashboard-grid">
      <article class="card"><div class="section-row"><h3>Live now</h3><button class="secondary small" data-action="schedule">All fixtures</button></div><div class="match-list">${live.map(matchCard).join('') || '<p class="muted">No live matches right now.</p>'}</div></article>
      <article class="card"><div class="section-row"><h3>Today</h3><button class="secondary small" data-action="schedule">Schedule</button></div><div class="match-list">${today.map(matchCard).join('') || '<p class="muted">No matches today.</p>'}</div></article>
      <article class="card"><div class="section-row"><h3>Tomorrow</h3><button class="secondary small" data-action="schedule">Schedule</button></div><div class="match-list">${tomorrow.slice(0, 5).map(matchCard).join('') || '<p class="muted">No matches tomorrow.</p>'}</div></article>
      <article class="card"><div class="section-row"><h3>Recently finished</h3><button class="secondary small" data-action="schedule">All fixtures</button></div><div class="match-list">${finished.slice(0, 4).map(matchCard).join('') || '<p class="muted">No completed matches yet.</p>'}</div></article>
      <article class="card wide"><div class="section-row"><h3>Best third-place table</h3><button class="secondary small" data-action="bracket">Full tracker</button></div>${thirdPlaceTableMini(tables)}</article>
      <article class="card"><h3>Data status</h3>${dataStatusPanel(meta)}</article>
    </section>
  `;
}


function dataStatusPanel(meta) {
  const live = state.liveData;
  const sourceLabel = live.source === 'live-api' ? 'World Cup 2026 API' : 'Committed static JSON';
  const loadedAt = live.lastLoaded ? new Date(live.lastLoaded).toLocaleString() : 'not refreshed this session';
  const apiLine = live.source === 'live-api'
    ? `${state.data.matches.length} matches loaded • ${live.updates} changed records from worldcup26.ir`
    : 'Using bundled data until the public API responds.';
  return `<p class="result-line">${sourceLabel}</p><p class="muted">${apiLine}</p><p class="muted">Last refreshed: ${loadedAt}</p>${live.error ? `<p class="api-warning">${live.error}</p>` : ''}<button class="primary small" data-refresh-live>${refreshButtonText()}</button>`;
}

async function refreshLiveData({ quiet = false } = {}) {
  state.liveData = { ...state.liveData, status: 'refreshing', error: null };
  if (!quiet) render();
  try {
    const localData = state.data;
    const refreshed = await refreshFromLiveApi(localData);
    state.data = refreshed.data;
    state.liveData = {
      source: refreshed.source,
      status: refreshed.source === 'live-api' ? 'updated' : 'static fallback',
      lastLoaded: new Date().toISOString(),
      error: refreshed.error || null,
      updates: refreshed.updates || 0
    };
  } catch (error) {
    state.liveData = {
      ...state.liveData,
      source: 'static',
      status: 'static fallback',
      lastLoaded: new Date().toISOString(),
      error: `Live refresh failed: ${error.message}`,
      updates: 0
    };
  }
  render();
  if (state.liveData.status === 'updated') {
    setTimeout(() => {
      if (state.liveData.status === 'updated') {
        state.liveData = { ...state.liveData, status: state.liveData.source === 'live-api' ? 'live api loaded' : 'static fallback' };
        render();
      }
    }, 2000);
  }
}

function favoriteMatches() {
  if (!state.favorites.length) return [];
  return state.data.matches.filter(m => state.favorites.includes(m.home) || state.favorites.includes(m.away)).sort((a,b) => {
    const rank = { live: 0, scheduled: 1, finished: 2 };
    return (rank[a.status] ?? 9) - (rank[b.status] ?? 9) || new Date(a.kickoff) - new Date(b.kickoff);
  });
}
function favoriteTeamChip(name) {
  const team = getTeam(name);
  const { row, rank } = teamStanding(name);
  const status = qualificationStatus(name);
  return `<button class="team-chip" data-team="${name}"><strong>${team.flag} ${name}</strong><span>Group ${team.group} • ${rank || '-'}${rank ? ordinal(rank) : ''} • ${row?.points ?? 0} pts</span><span>${status.icon} ${status.label}</span></button>`;
}
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

function standings() {
  const tables = buildStandings(state.data.matches, state.data.teams);
  return `<section class="section-head"><div><h2>Standings</h2><p>Tables are computed from finished results. Top two are automatic projected qualifiers; third place feeds the best-third table.</p></div><button class="primary small" data-action="bracket">Bracket tracker</button></section><section class="standings-grid">${Object.keys(tables).sort().map(group => `<article class="card"><div class="section-row"><h3>Group ${group}</h3><button class="secondary small" data-group="${group}">Open group</button></div>${standingsTable(group, tables[group])}</article>`).join('')}</section>`;
}
function standingsTable(group, rows) {
  return `<table class="standings-table"><thead><tr><th>Team</th><th>Status</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr></thead><tbody>${rows.map((r, i) => { const status = qualificationStatus(r.team); return `<tr class="${i < 2 ? 'qualify' : i === 2 ? 'third-watch' : ''}"><td><button class="table-team" data-team="${r.team}">${getTeam(r.team).flag} ${r.team}</button></td><td><span class="status-dot ${status.key}">${status.icon} ${status.label}</span></td><td>${r.played}</td><td>${r.won}</td><td>${r.drawn}</td><td>${r.lost}</td><td>${r.gd > 0 ? '+' : ''}${r.gd}</td><td><strong>${r.points}</strong></td></tr>`; }).join('')}</tbody></table>`;
}

function thirdPlaceTableMini(tables) {
  const rows = thirdPlaceTable(tables);
  return `<table class="standings-table compact-table"><thead><tr><th>#</th><th>Team</th><th>Group</th><th>GD</th><th>Pts</th></tr></thead><tbody>${rows.map((r, i) => `<tr class="${i < 8 ? 'qualify' : 'third-watch'}"><td>${i + 1}</td><td><button class="table-team" data-team="${r.team}">${getTeam(r.team).flag} ${r.team}</button></td><td>${r.group}</td><td>${r.gd > 0 ? '+' : ''}${r.gd}</td><td><strong>${r.points}</strong></td></tr>`).join('')}</tbody></table>`;
}

function groups() {
  const tables = buildStandings(state.data.matches, state.data.teams);
  return `<section class="section-head"><div><h2>Groups</h2><p>Open any group for its table, teams, fixtures, and qualification snapshot.</p></div></section><section class="group-grid">${Object.keys(tables).sort().map(group => {
    const matches = groupMatches(group); const completed = matches.filter(m => m.status === 'finished').length;
    return `<article class="group-card card clickable" data-group="${group}"><div class="group-badge">${group}</div><h3>Group ${group}</h3><p class="muted">${groupTeams(group).map(t => `${t.flag} ${t.name}`).join(' • ')}</p><div class="mini-meta"><span>${completed}/${matches.length} played</span><span>${matches.length} fixtures</span></div>${standingsTable(group, tables[group])}</article>`;
  }).join('')}</section>`;
}
function groupDetail(group) {
  const tables = buildStandings(state.data.matches, state.data.teams); const rows = tables[group] || []; const matches = groupMatches(group); const teams = groupTeams(group);
  return `<section class="detail-stack"><button class="secondary small" data-action="groups">← Back to groups</button><section class="card detail group-detail"><div class="eyebrow">Group page</div><h2>Group ${group}</h2><p>${teams.map(t => `${t.flag} ${t.name}`).join(' • ')}</p><div class="profile-stats"><div><strong>${teams.length}</strong><span>Teams</span></div><div><strong>${matches.length}</strong><span>Fixtures</span></div><div><strong>${matches.filter(m => m.status === 'finished').length}</strong><span>Played</span></div><div><strong>${matches.filter(m => m.status !== 'finished').length}</strong><span>Remaining</span></div></div></section><section class="card"><div class="section-row"><h3>Group ${group} scenarios</h3><span class="badge upcoming">rule-based</span></div>${groupScenarioCards(group)}</section><section class="team-detail-grid"><article class="card"><h3>Standings</h3>${standingsTable(group, rows)}</article><article class="card"><h3>Qualification read</h3><div class="team-chip-row">${rows.map(r => { const s = qualificationStatus(r.team); return `<button class="team-chip" data-team="${r.team}"><strong>${getTeam(r.team).flag} ${r.team}</strong><span>${s.icon} ${s.label}</span><span>${qualificationOutlook(r.team)}% outlook</span></button>`; }).join('')}</div></article><article class="card wide"><h3>Group ${group} fixtures</h3><div class="match-list">${matches.map(matchCard).join('')}</div></article></section></section>`;
}

function teams() {
  const tables = buildStandings(state.data.matches, state.data.teams); const q = state.query.toLowerCase();
  const teams = state.data.teams.filter(team => !q || [team.name, team.group, team.code].join(' ').toLowerCase().includes(q)).sort((a,b) => Number(isFavorite(b.name)) - Number(isFavorite(a.name)) || a.group.localeCompare(b.group) || a.name.localeCompare(b.name));
  return `<section class="section-head"><div><h2>Teams</h2><p>Star teams for your personal dashboard, then click a card for fixtures, group position, and scenario notes.</p></div></section><section class="filters card"><input id="search" placeholder="Search teams or groups..." value="${state.query}"></section><section class="team-grid">${teams.map(team => { const row = tables[team.group]?.find(r => r.team === team.name); const rank = (tables[team.group] || []).findIndex(r => r.team === team.name) + 1; const status = qualificationStatus(team.name); return `<article class="team-card card ${isFavorite(team.name) ? 'is-favorite' : ''}"><button class="favorite-btn" data-favorite="${team.name}" title="Toggle favorite">${isFavorite(team.name) ? '★' : '☆'}</button><button class="team-main" data-team="${team.name}"><strong>${team.flag} ${team.name}</strong><span>Group ${team.group} • ${rank || '-'}${rank ? ordinal(rank) : ''}</span><span>${row?.points ?? 0} pts • ${row?.played ?? 0} played • GD ${row?.gd > 0 ? '+' : ''}${row?.gd ?? 0}</span><span>${status.icon} ${status.label}</span></button></article>`; }).join('')}</section>`;
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

function bracket() {
  const tables = buildStandings(state.data.matches, state.data.teams);
  const slots = bracketSlots();
  const thirds = thirdPlaceTable(tables);
  const played = state.data.matches.filter(m => m.status === 'finished').length;
  return `<section class="section-head"><div><h2>Bracket</h2><p>Round of 32 placeholders, qualification tracker, and best third-place ranking. This is projected from current group tables until group stage finishes.</p></div></section>
    <section class="progress-banner card"><div><strong>${played}/${TOTAL_TOURNAMENT_MATCHES}</strong><span>matches played</span></div><div><strong>${percent(played, GROUP_STAGE_MATCHES)}%</strong><span>group stage</span></div><div><strong>${thirds.filter(t => t.projectedAdvance).length}/8</strong><span>best-third projected</span></div></section>
    <section class="bracket-layout">
      <article class="card wide"><div class="section-row"><h3>Projected Round of 32</h3><span class="badge upcoming">placeholder path</span></div><div class="bracket-grid">${slots.map((pair, i) => bracketMatch(pair, i + 1)).join('')}</div><div class="round-ladder"><span>Round of 32</span><i></i><span>Round of 16</span><i></i><span>Quarterfinals</span><i></i><span>Semifinals</span><i></i><span>Final</span></div></article>
      <article class="card"><h3>Best third-place table</h3>${thirdPlaceTableMini(tables)}</article>
      <article class="card"><h3>Qualification legend</h3><div class="legend-stack"><span class="status-dot projected">🟢 Projected qualified</span><span class="status-dot third">🟡 Best-third watch</span><span class="status-dot contention">🟡 In contention</span><span class="status-dot eliminated">🔴 Eliminated</span></div><p class="muted">Final qualification needs all group matches. Current statuses are projected from loaded results.</p></article>
    </section>`;
}
function bracketMatch(pair, index) { return `<div class="bracket-match"><div class="eyebrow">R32 Match ${index}</div><button data-team="${pair[0]}">${teamLabel(pair[0])}</button><button data-team="${pair[1]}">${teamLabel(pair[1])}</button></div>`; }
function teamLabel(name) { const team = getTeam(name); return team.group === '?' ? name : `${team.flag} ${name}`; }

function matchDetail(id) {
  const match = state.data.matches.find(m => m.id === id);
  if (!match) return '<section class="card"><h2>Match not found</h2></section>';
  return `<section class="card detail"><button class="secondary small" data-action="schedule">← Back to schedule</button><div class="eyebrow">Group ${match.group} • ${match.stage}</div><h2>${scoreline(match)}</h2><p>${formatDate(match.kickoff)}</p><p><button class="table-team" data-venue="${match.venue}">${match.venue}, ${match.city}</button></p><p>${match.broadcast || 'Broadcast TBD'}</p><p>${resultBadge(match)}</p><div class="detail-actions"><button class="secondary small" data-group="${match.group}">Open Group ${match.group}</button><button class="secondary small" data-team="${match.home}">Open ${match.home}</button><button class="secondary small" data-team="${match.away}">Open ${match.away}</button></div></section>`;
}
function teamDetail(name) {
  const team = getTeam(name); const matches = teamMatches(name); const { row, rank, rows } = teamStanding(name); const next = matches.find(m => m.status !== 'finished'); const last = [...matches].reverse().find(m => m.status === 'finished'); const status = qualificationStatus(name);
  return `<section class="team-detail-grid"><article class="card detail team-profile"><button class="secondary small" data-action="teams">← Back to teams</button><div class="eyebrow">Group ${team.group}</div><div class="team-title-row"><h2>${team.flag} ${team.name}</h2><button class="favorite-btn large" data-favorite="${team.name}">${isFavorite(team.name) ? '★ Favorite' : '☆ Add favorite'}</button></div><div class="profile-stats"><div><strong>${rank || '-'}</strong><span>Group rank</span></div><div><strong>${row?.points ?? 0}</strong><span>Points</span></div><div><strong>${row?.gd > 0 ? '+' : ''}${row?.gd ?? 0}</strong><span>Goal diff</span></div><div><strong>${row?.played ?? 0}</strong><span>Played</span></div></div><div class="intelligence-grid"><div class="scenario-card"><h3>${status.icon} ${status.label}</h3><ul>${scenarioNotes(name).map(note => `<li>${note}</li>`).join('')}</ul></div><div>${outlookMeter(name)}<div class="meter-card"><div class="section-row mini"><strong>Recent form</strong><span>last 5</span></div>${formChips(name)}</div></div></div><div class="split-cards"><div><h3>Next match</h3>${next ? matchCard(next) : '<p class="muted">No upcoming loaded fixture.</p>'}</div><div><h3>Latest result</h3>${last ? matchCard(last) : '<p class="muted">No completed loaded result.</p>'}</div></div></article><article class="card"><div class="section-row"><h3>Group ${team.group} table</h3><button class="secondary small" data-group="${team.group}">Open group</button></div>${standingsTable(team.group, rows)}</article><article class="card wide"><h3>${team.name} fixtures</h3><div class="match-list">${matches.map(matchCard).join('') || '<p class="muted">No fixtures loaded for this team yet.</p>'}</div></article></section>`;
}

function bind() {
  document.querySelectorAll('[data-action]').forEach(btn => btn.addEventListener('click', () => route(btn.dataset.action, { query: '', group: 'all' })));
  document.querySelectorAll('[data-match]').forEach(btn => btn.addEventListener('click', () => { state.matchId = btn.dataset.match; state.tab = 'match'; render(); }));
  document.querySelectorAll('[data-team]').forEach(btn => btn.addEventListener('click', () => { state.team = btn.dataset.team; state.tab = 'team'; render(); }));
  document.querySelectorAll('[data-group]').forEach(btn => btn.addEventListener('click', () => { state.group = btn.dataset.group; state.tab = 'group'; render(); }));
  document.querySelectorAll('[data-venue]').forEach(btn => btn.addEventListener('click', () => { state.venue = btn.dataset.venue; state.tab = 'venue'; render(); }));
  document.querySelectorAll('[data-favorite]').forEach(btn => btn.addEventListener('click', (event) => { event.stopPropagation(); toggleFavorite(btn.dataset.favorite); }));
  document.querySelectorAll('[data-refresh-live]').forEach(btn => btn.addEventListener('click', () => refreshLiveData()));
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
  else if (state.tab === 'bracket') content = bracket();
  else if (state.tab === 'match') content = matchDetail(state.matchId);
  else if (state.tab === 'team') content = teamDetail(state.team);
  else content = overview();
  shell(content); bind();
}

async function init() {
  try {
    const [matches, teams, venues, meta] = await Promise.all([loadJson('matches.json', true), loadJson('teams.json', true), loadJson('venues.json', true), loadJson('meta.json', true)]);
    state.data = { matches, teams, venues, meta };
    render();
    refreshLiveData({ quiet: true });
  } catch (error) { shell(`<section class="card"><h2>Dashboard data failed to load</h2><p>${error.message}</p></section>`); }
}
init();
