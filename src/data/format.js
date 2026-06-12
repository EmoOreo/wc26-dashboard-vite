export function formatMatchStatus(match) {
  if (match.status === 'finished') return `FT — ${match.home} ${match.homeScore}–${match.awayScore} ${match.away}`;
  if (match.status === 'live') return `LIVE ${match.minute || ''}' — ${match.home} ${match.homeScore ?? 0}–${match.awayScore ?? 0} ${match.away}`;
  if (match.status === 'scheduled') return formatKickoff(match.kickoff);
  if (match.status === 'postponed') return 'Postponed';
  return 'Status unavailable';
}

export function formatKickoff(iso) {
  if (!iso) return 'Kickoff TBA';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Kickoff TBA';
  return date.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
