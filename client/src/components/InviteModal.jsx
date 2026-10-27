import { useEffect, useState } from 'react';
import Modal from './Modal';
import { groupsApi, getErrorMessage } from '../services/api';
import { useToast } from '../hooks/useToast';

export default function InviteModal({ open, onClose, groupId }) {
  const { toast } = useToast();
  const [invite, setInvite] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !groupId) return;
    (async () => {
      try {
        const list = await groupsApi.listInvites(groupId);
        if (list.data.data.invitations.length) {
          setInvite(list.data.data.invitations[0]);
        } else {
          const created = await groupsApi.createInvite(groupId, { expiresInHours: 168 });
          setInvite(created.data.data.invitation);
        }
      } catch (err) {
        toast(getErrorMessage(err));
      }
    })();
  }, [open, groupId, toast]);

  const copy = async () => {
    if (!invite?.code) return;
    try {
      await navigator.clipboard.writeText(invite.code);
      toast('Invite code copied.');
    } catch {
      toast(`Invite code: ${invite.code}`);
    }
  };

  const regenerate = async () => {
    setBusy(true);
    try {
      const created = await groupsApi.createInvite(groupId, { expiresInHours: 168, maxUses: 50 });
      setInvite(created.data.data.invitation);
      toast('New invitation created.');
    } catch (err) {
      toast(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const link =
    invite?.token
      ? `${window.location.origin}/join/${invite.token}`
      : invite?.code
        ? `${window.location.origin}/app`
        : '';

  return (
    <Modal open={open} onClose={onClose}>
      <div className="modal-heading">
        <span className="eyebrow">INVITE MEMBERS</span>
        <h2>Share your community</h2>
        <p>Invites expire and can be revoked anytime by owners and admins.</p>
      </div>
      <label>Invite code</label>
      <div className="invite-code-row">
        <code>{invite?.code || '…'}</code>
        <button type="button" className="btn btn-outline" onClick={copy} disabled={!invite}>
          Copy
        </button>
      </div>
      {invite?.token ? (
        <p className="form-hint">
          Link: {link}
        </p>
      ) : (
        <p className="form-hint">Share the code with people you trust. Groups stay private.</p>
      )}
      {invite?.expiresAt ? (
        <p className="form-hint">Expires {new Date(invite.expiresAt).toLocaleString()}</p>
      ) : null}
      <button type="button" className="btn btn-primary full-width" onClick={regenerate} disabled={busy}>
        Generate new invite
      </button>
    </Modal>
  );
}
