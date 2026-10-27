import { userInitial } from '../utils/format';
import EmptyState from './EmptyState';

export default function MemberList({
  members = [],
  currentUserId,
  isOwner = false,
  canManage = false,
  onChangeRole,
  onRemove,
  onTransfer,
}) {
  if (!members.length) {
    return <EmptyState>No members in this group yet.</EmptyState>;
  }

  return (
    <div className="member-list">
      {members.map((m) => {
        const isYou = m.id === currentUserId;
        return (
          <div className="leader-row member-row" key={m.id}>
            <span
              className="activity-avatar"
              style={{ background: m.avatarColor || undefined }}
            >
              {userInitial(m.name)}
            </span>
            <div className="member-info">
              <span className="leader-name">
                {m.name}
                {isYou ? ' (you)' : ''}
              </span>
              <small className="member-meta">
                {m.role}
                {m.joinedAt ? ` · joined ${new Date(m.joinedAt).toLocaleDateString()}` : ''}
              </small>
            </div>
            <div className="member-actions">
              {canManage && !isYou && m.role !== 'owner' ? (
                <select
                  className="select-small"
                  value={m.role}
                  aria-label={`Role for ${m.name}`}
                  onChange={(e) => onChangeRole?.(m, e.target.value)}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              ) : (
                <span className="leader-points">{m.role}</span>
              )}
              {isOwner && !isYou && m.role !== 'owner' ? (
                <>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => onTransfer?.(m)}
                    title="Transfer ownership"
                  >
                    Make owner
                  </button>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => onRemove?.(m)}
                    title="Remove member"
                  >
                    Remove
                  </button>
                </>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
