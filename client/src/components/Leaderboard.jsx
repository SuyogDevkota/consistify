export default function Leaderboard({ rows = [], full = false, currentUserId }) {
  if (!rows.length) {
    return <div className="empty-state">No members yet.</div>;
  }
  const max = Math.max(1, ...rows.map((r) => r.periodPoints || r.cumulativePoints || 0));

  return (
    <div>
      {rows.map((m) => (
        <div className="leader-row" key={m.userId}>
          <span className="leader-rank">{m.rank}</span>
          <span
            className={`activity-avatar ${m.rank % 2 === 0 ? 'purple' : ''}`}
            style={{ background: m.avatarColor || undefined }}
          >
            {(m.name || '?').charAt(0).toUpperCase()}
          </span>
          <span className="leader-name">
            {m.name}
            {m.role === 'owner' || m.role === 'admin' ? ` · ${m.role}` : ''}
            {m.userId === currentUserId ? ' (you)' : ''}
          </span>
          {full ? (
            <div className="leader-bar">
              <i style={{ width: `${((m.periodPoints || m.cumulativePoints || 0) / max) * 100}%` }} />
            </div>
          ) : null}
          <span className="leader-points">
            {m.periodPoints ?? m.cumulativePoints} pts
            {full && m.cumulativePoints != null ? ` · ${m.cumulativePoints} all-time` : ''}
            {full && m.currentStreak != null ? ` · ${m.currentStreak}d streak` : ''}
          </span>
        </div>
      ))}
    </div>
  );
}
