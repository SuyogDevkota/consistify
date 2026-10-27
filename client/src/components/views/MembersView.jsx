import MemberList from '../MemberList';
import EmptyState from '../EmptyState';
import { userInitial } from '../../utils/format';

export default function MembersView({
  members,
  pending = [],
  currentUserId,
  isOwner,
  canManage,
  onChangeRole,
  onRemove,
  onTransfer,
  onInvite,
  onLeave,
  onApprove,
  onReject,
}) {
  return (
    <div className="view active">
      <div className="page-intro">
        <div>
          <h2>Your people.</h2>
          <p>Private group membership — roles, invites, and ownership stay inside this community.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {canManage ? (
            <button type="button" className="btn btn-primary" onClick={onInvite}>
              Invite members
            </button>
          ) : null}
          <button type="button" className="btn btn-outline" onClick={onLeave}>
            Leave group
          </button>
        </div>
      </div>
      {canManage && pending.length ? (
        <section className="panel" style={{ marginBottom: 18 }}>
          <div className="panel-heading">
            <div>
              <h3>Pending requests ({pending.length})</h3>
              <p>Approve or decline people who used a valid invite.</p>
            </div>
          </div>
          {pending.map((m) => (
            <div className="leader-row member-row" key={m.id}>
              <span className="activity-avatar" style={{ background: m.avatarColor || undefined }}>
                {userInitial(m.name)}
              </span>
              <div className="member-info">
                <span className="leader-name">{m.name}</span>
                <small className="member-meta">Waiting for approval</small>
              </div>
              <div className="member-actions">
                <button type="button" className="btn btn-primary" onClick={() => onApprove?.(m)}>
                  Approve
                </button>
                <button type="button" className="btn btn-outline" onClick={() => onReject?.(m)}>
                  Decline
                </button>
              </div>
            </div>
          ))}
        </section>
      ) : null}
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>Members ({members?.length || 0})</h3>
            <p>Owner, admins, and members of this private group.</p>
          </div>
        </div>
        {members?.length ? (
          <MemberList
            members={members}
            currentUserId={currentUserId}
            isOwner={isOwner}
            canManage={canManage}
            onChangeRole={onChangeRole}
            onRemove={onRemove}
            onTransfer={onTransfer}
          />
        ) : (
          <EmptyState>No members loaded.</EmptyState>
        )}
      </section>
    </div>
  );
}
