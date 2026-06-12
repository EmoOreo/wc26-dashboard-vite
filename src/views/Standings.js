export function renderStandings(standings) {
  return Object.entries(standings).map(([group, rows]) => `
    <section class="panel">
      <h2>Group ${group}</h2>
      <table>
        <thead><tr><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr></thead>
        <tbody>${rows.map(r => `<tr><td>${r.team}</td><td>${r.played}</td><td>${r.won}</td><td>${r.drawn}</td><td>${r.lost}</td><td>${r.gf}</td><td>${r.ga}</td><td>${r.gd}</td><td><strong>${r.points}</strong></td></tr>`).join('')}</tbody>
      </table>
    </section>
  `).join('');
}
