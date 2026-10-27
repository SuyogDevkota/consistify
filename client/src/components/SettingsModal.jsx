import { useEffect, useState } from 'react';
import Modal from './Modal';
import { groupsApi, getErrorMessage } from '../services/api';
import { useToast } from '../hooks/useToast';

export default function SettingsModal({ open, onClose, group, canManage, onSaved }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: '',
    description: '',
    timezone: 'UTC',
    color: '#6490ff',
    rules: '',
    requireJoinApproval: false,
  });
  const [invite, setInvite] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !group) return;
    setForm({
      name: group.name || '',
      description: group.description || '',
      timezone: group.timezone || 'UTC',
      color: group.color || '#6490ff',
      rules: group.rules || '',
      requireJoinApproval: Boolean(group.requireJoinApproval),
    });
    (async () => {
      if (!canManage) return;
      try {
        const list = await groupsApi.listInvites(group.id);
        if (list.data.data.invitations.length) {
          setInvite(list.data.data.invitations[0]);
        } else {
          const created = await groupsApi.createInvite(group.id, { expiresInHours: 168 });
          setInvite(created.data.data.invitation);
        }
      } catch {
        /* ignore if no permission */
      }
    })();
  }, [open, group, canManage]);

  const save = async (e) => {
    e.preventDefault();
    if (!canManage) return;
    setBusy(true);
    try {
      await groupsApi.update(group.id, form);
      toast('Group settings saved.');
      onSaved?.();
      onClose?.();
    } catch (err) {
      toast(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!invite?.code) return;
    try {
      await navigator.clipboard.writeText(invite.code);
      toast('Invite code copied.');
    } catch {
      toast(`Your invite code is ${invite.code}`);
    }
  };

  const copyLink = async () => {
    if (!invite?.token) return;
    const url = `${window.location.origin}/join/${invite.token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast('Invite link copied.');
    } catch {
      toast(url);
    }
  };

  const newInvite = async () => {
    setBusy(true);
    try {
      const created = await groupsApi.createInvite(group.id, { expiresInHours: 168, maxUses: 50 });
      setInvite(created.data.data.invitation);
      toast('New invitation created. Previous codes still work until they expire or are revoked.');
    } catch (err) {
      toast(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    if (!invite?.id) return;
    setBusy(true);
    try {
      await groupsApi.revokeInvite(group.id, invite.id);
      setInvite(null);
      toast('Invitation revoked.');
    } catch (err) {
      toast(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div className="modal-heading">
        <span className="eyebrow">YOUR COMMUNITY</span>
        <h2>Group settings</h2>
        <p>Manage name, timezone, privacy, and invitations.</p>
      </div>
      <form onSubmit={save}>
        <label htmlFor="groupNameInput">Group name</label>
        <input
          id="groupNameInput"
          maxLength={80}
          required
          value={form.name}
          disabled={!canManage}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <label htmlFor="groupDescInput">Description</label>
        <input
          id="groupDescInput"
          maxLength={500}
          value={form.description}
          disabled={!canManage}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <label htmlFor="groupTzInput">Timezone</label>
        <input
          id="groupTzInput"
          maxLength={64}
          value={form.timezone}
          disabled={!canManage}
          onChange={(e) => setForm({ ...form, timezone: e.target.value })}
        />
        <label htmlFor="groupColorInput">Accent color</label>
        <input
          id="groupColorInput"
          type="color"
          value={form.color}
          disabled={!canManage}
          onChange={(e) => setForm({ ...form, color: e.target.value })}
        />
        <label htmlFor="groupRulesInput">Group rules</label>
        <input
          id="groupRulesInput"
          maxLength={2000}
          value={form.rules}
          disabled={!canManage}
          onChange={(e) => setForm({ ...form, rules: e.target.value })}
        />
        {canManage ? (
          <label className="form-hint" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={form.requireJoinApproval}
              onChange={(e) => setForm({ ...form, requireJoinApproval: e.target.checked })}
            />
            Require owner/admin approval before new members join
          </label>
        ) : null}
        <label>Invite code</label>
        <div className="invite-code-row">
          <code>{invite?.code || '—'}</code>
          <button type="button" className="btn btn-outline" onClick={copy} disabled={!invite}>
            Copy code
          </button>
        </div>
        {invite?.token ? (
          <p className="form-hint">
            Share link: {window.location.origin}/join/{invite.token}{' '}
            <button type="button" className="text-button" onClick={copyLink}>
              Copy link
            </button>
          </p>
        ) : (
          <p className="form-hint">
            Anyone with a valid invite may request to join. Invites expire and can be revoked.
          </p>
        )}
        {invite?.expiresAt ? (
          <p className="form-hint">
            Expires {new Date(invite.expiresAt).toLocaleString()}
            {invite.maxUses ? ` · ${invite.useCount || 0}/${invite.maxUses} uses` : ''}
          </p>
        ) : null}
        {canManage ? (
          <>
            <div className="form-actions">
              <button type="button" className="btn btn-outline" onClick={newInvite} disabled={busy}>
                New invite
              </button>
              <button type="button" className="btn btn-outline" onClick={revoke} disabled={busy || !invite?.id}>
                Revoke
              </button>
            </div>
            <button className="btn btn-primary full-width" type="submit" disabled={busy}>
              Save settings
            </button>
          </>
        ) : (
          <p className="form-hint">Only owners and admins can change settings.</p>
        )}
      </form>
    </Modal>
  );
}
