import { userInitial } from '../utils/format';
import EmptyState from './EmptyState';

export default function ActivityFeed({ items = [], currentUserId }) {
  if (!items.length) {
    return <EmptyState>Activity will appear here as your group gets started.</EmptyState>;
  }

  return (
    <div className="activity-list">
      {items.map((a) => (
        <div className="activity-item" key={a.id}>
          <div
            className={`activity-avatar ${a.actor?.id === currentUserId ? '' : 'purple'}`}
            style={{ background: a.actor?.avatarColor }}
          >
            {userInitial(a.actor?.name)}
          </div>
          <div className="activity-copy">
            <span>{a.message}</span>
            <small>{new Date(a.createdAt).toLocaleString()}</small>
          </div>
          {a.meta?.points ? <span className="activity-points">+{a.meta.points} pts</span> : null}
        </div>
      ))}
    </div>
  );
}
