const API_BASE = 'https://worldcup26.ir';
const LIVE_GAMES_URL = `${API_BASE}/get/games`;
const REQUEST_TIMEOUT_MS = 9000;

const TEAM_ALIASES = new Map([
  ['USA', 'United States'],
  ['United States of America', 'United States'],
  ['Czech Republic', 'Czechia'],
  ['Korea Republic', 'South Korea'],
  ['Republic of Korea', 'South Korea'],
  ['South Korea', 'South Korea'],
  ['Côte d’Ivoire', 'Ivory Coast'],
  ["Côte d'Ivoire", 'Ivory Coast'],
  ['Congo DR', 'DR Congo'],
  ['Democratic Republic of the Congo', 'DR Congo'],
  ['Türkiye', 'Turkey'],
  ['Turkiye', 'Turkey']
]);

export async function refreshFromLiveApi(localData) {
  const apiGames = await fetchApiGames();
  const normalized = normalizeApiGames(apiGames, localData);
  if (!normalized.length) {
    return {
      data: localData,
      source: 'static',
      updates: 0,
      error: 'Public API responded, but no match records could be normalized.'
    };
  }

  const mergedMatches = mergeMatches(localData.matches, normalized);
  const updates = countChangedMatches(localData.matches, mergedMatches);
  return {
    data: {
      ...localData,
      matches: mergedMatches,
      meta: {
        ...localData.meta,
        lastUpdated: new Date().toISOString(),
        dataSource: 'worldcup26.ir live API with static fallback'
      }
    },
    source: 'live-api',
    updates
  };
}

async function fetchApiGames() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${LIVE_GAMES_URL}?v=${Date.now()}`, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) throw new Error(`Public API returned ${response.status}`);
    const payload = await response.json();
    return Array.isArray(payload) ? payload : (payload.games || payload.data || payload.matches || []);
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeApiGames(games, localData) {
  const localByApiId = new Map(localData.matches.map(match => [String(Number(match.id?.replace(/^m/, '') || 0)), match]));
  const localByTeams = new Map(localData.matches.map(match => [teamKey(match.home, match.away, match.group), match]));

  return games.map(game => {
    const apiId = String(game.id ?? game.match_id ?? game.game_id ?? '').trim();
    const home = normalizeTeamName(game.home_team_name_en || game.home_team_name || game.home || game.homeTeam || game.home_team_label || '');
    const away = normalizeTeamName(game.away_team_name_en || game.away_team_name || game.away || game.awayTeam || game.away_team_label || '');
    const group = normalizeGroup(game.group || game.group_name || game.type || '');
    const local = localByApiId.get(apiId) || localByTeams.get(teamKey(home, away, group));
    if (!local || !home || !away) return null;

    const status = normalizeStatus(game);
    const homeScore = toScore(game.home_score ?? game.homeScore ?? game.score_home ?? game.home_goals);
    const awayScore = toScore(game.away_score ?? game.awayScore ?? game.score_away ?? game.away_goals);

    return {
      ...local,
      home,
      away,
      group: local.group || group,
      status,
      ...(status !== 'scheduled' ? { homeScore, awayScore } : {}),
      liveMinute: normalizeMinute(game.time_elapsed ?? game.elapsed ?? game.minute),
      sourceId: apiId || local.id
    };
  }).filter(Boolean);
}

function mergeMatches(localMatches, liveMatches) {
  const byId = new Map(liveMatches.map(match => [match.id, match]));
  const byTeams = new Map(liveMatches.map(match => [teamKey(match.home, match.away, match.group), match]));
  return localMatches.map(local => {
    const live = byId.get(local.id) || byTeams.get(teamKey(local.home, local.away, local.group));
    return live ? { ...local, ...live } : local;
  });
}

function countChangedMatches(before, after) {
  let changed = 0;
  for (let i = 0; i < before.length; i += 1) {
    const a = before[i];
    const b = after[i];
    if (!b) continue;
    if (a.status !== b.status || a.homeScore !== b.homeScore || a.awayScore !== b.awayScore || a.liveMinute !== b.liveMinute) changed += 1;
  }
  return changed;
}

function normalizeStatus(game) {
  const finished = String(game.finished ?? game.is_finished ?? '').toLowerCase();
  const elapsed = String(game.time_elapsed ?? game.elapsed ?? game.status ?? '').toLowerCase();
  if (finished === 'true' || finished === '1' || elapsed === 'finished' || elapsed === 'ft' || elapsed === 'fulltime') return 'finished';
  if (elapsed && !['notstarted', 'not_started', 'scheduled', 'false', '0', 'null', 'undefined'].includes(elapsed)) return 'live';
  return 'scheduled';
}

function normalizeMinute(value) {
  const raw = String(value ?? '').toLowerCase();
  if (!raw || raw === 'notstarted' || raw === 'finished') return null;
  const minute = Number.parseInt(raw, 10);
  return Number.isFinite(minute) ? minute : raw;
}

function toScore(value) {
  const score = Number.parseInt(value, 10);
  return Number.isFinite(score) ? score : 0;
}

function normalizeTeamName(name) {
  const cleaned = String(name || '').trim();
  return TEAM_ALIASES.get(cleaned) || cleaned;
}

function normalizeGroup(group) {
  const raw = String(group || '').trim().toUpperCase();
  return raw.length === 1 ? raw : raw.replace(/^GROUP\s+/, '');
}

function teamKey(home, away, group) {
  return `${normalizeGroup(group)}::${normalizeTeamName(home).toLowerCase()}::${normalizeTeamName(away).toLowerCase()}`;
}
