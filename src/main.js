import { loadData } from './data/loadData.js';
import { buildStandings } from './data/standings.js';
import { renderOverview } from './views/Overview.js';
import { renderSchedule } from './views/Schedule.js';
import { renderStandings } from './views/Standings.js';
import { renderTeams } from './views/Teams.js';
import { renderMatchDetail } from './views/MatchDetail.js';
import './styles.css';

const app = document.querySelector('#app');
let state = {
  route: location.hash.replace('#', '') || 'overview',
  data: null,
  error: null,
  favorites: JSON.parse(localStorage.getItem('wc26:favorites') || '[]')
};

function setRoute(route) {
  state.route = route || 'overview';
  history.pushState(null, '', `#${state.route}`);
  render();
}

function toggleFavorite(team) {
  const next = new Set(state.favorites);
  next.has(team) ? next.delete(team) : next.add(team);
  state.favorites = [...next];
  localStorage.setItem('wc26:favorites', JSON.stringify(state.favorites));
  render();
}

function shell(content) {
  const updated = state.data?.meta?.lastUpdated || 'unknown';
  return `
    <header class="topbar">
      <div>
        <p class="eyebrow">World Cup 2026</p>
        <h1>WC26 Dashboard</h1>
      </div>
      <nav>
        ${navButton('overview', 'Overview')}
        ${navButton('schedule', 'Schedule')}
        ${navButton('standings', 'Standings')}
        ${navButton('teams', 'Teams')}
      </nav>
    </header>
    <main>${content}</main>
    <footer>Last updated: ${updated}</footer>
  `;
}

function navButton(route, label) {
  return `<button class="nav ${state.route === route ? 'active' : ''}" data-route="${route}">${label}</button>`;
}

function render() {
  if (state.error) {
    app.innerHTML = shell(`<section class="panel"><h2>Data unavailable</h2><p>${state.error}</p></section>`);
    bindNav();
    return;
  }

  if (!state.data) {
    app.innerHTML = shell(`<section class="panel"><h2>Loading dashboard data…</h2><p>Fetching static match, team, and venue files.</p></section>`);
    bindNav();
    return;
  }

  const standings = buildStandings(state.data.matches, state.data.teams);
  const route = state.route;
  let content = '';

  if (route.startsWith('match/')) {
    content = renderMatchDetail(state.data, route.split('/')[1], standings);
  } else if (route === 'schedule') {
    content = renderSchedule(state.data, state.favorites);
  } else if (route === 'standings') {
    content = renderStandings(standings);
  } else if (route === 'teams') {
    content = renderTeams(state.data, state.favorites);
  } else {
    content = renderOverview(state.data, standings, state.favorites);
  }

  app.innerHTML = shell(content);
  bindNav();
  bindActions();
}

function bindNav() {
  document.querySelectorAll('[data-route]').forEach(btn => {
    btn.addEventListener('click', () => setRoute(btn.dataset.route));
  });
}

function bindActions() {
  document.querySelectorAll('[data-favorite]').forEach(btn => {
    btn.addEventListener('click', () => toggleFavorite(btn.dataset.favorite));
  });
}

window.addEventListener('popstate', () => {
  state.route = location.hash.replace('#', '') || 'overview';
  render();
});

render();
loadData()
  .then(data => { state.data = data; render(); })
  .catch(error => { state.error = error.message; render(); });
