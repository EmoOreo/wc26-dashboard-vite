export function buildStandings(matches, teams) {
  const groups = groupTeams(teams);

  for (const match of matches.filter(m => m.status === 'finished')) {
    const home = groups[match.group]?.find(t => t.team === match.home);
    const away = groups[match.group]?.find(t => t.team === match.away);
    if (!home || !away) continue;

    applyResult(home, match.homeScore, match.awayScore);
    applyResult(away, match.awayScore, match.homeScore);
  }

  for (const group of Object.keys(groups)) {
    groups[group].sort((a, b) =>
      b.points - a.points ||
      b.gd - a.gd ||
      b.gf - a.gf ||
      a.team.localeCompare(b.team)
    );
  }

  return groups;
}

function groupTeams(teams) {
  return teams.reduce((acc, team) => {
    acc[team.group] ??= [];
    acc[team.group].push({
      team: team.name,
      code: team.code,
      group: team.group,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      points: 0
    });
    return acc;
  }, {});
}

function applyResult(row, gf, ga) {
  row.played += 1;
  row.gf += gf;
  row.ga += ga;
  row.gd = row.gf - row.ga;
  if (gf > ga) { row.won += 1; row.points += 3; }
  else if (gf < ga) { row.lost += 1; }
  else { row.drawn += 1; row.points += 1; }
}
