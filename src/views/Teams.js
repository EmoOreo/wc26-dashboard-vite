export function renderTeams(data, favorites) {
  return `<section class="grid cards">${data.teams.map(team => `
    <article class="team-card">
      <p class="eyebrow">Group ${team.group}</p>
      <h3>${team.name}</h3>
      <p>${team.code}</p>
      <button data-favorite="${team.name}">${favorites.includes(team.name) ? '★ Favorite' : '☆ Add favorite'}</button>
    </article>
  `).join('')}</section>`;
}
