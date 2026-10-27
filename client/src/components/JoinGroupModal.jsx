import { useState } from 'react';
import Modal from './Modal';
import { groupsApi, getErrorMessage } from '../services/api';
import { useToast } from '../hooks/useToast';

export default function JoinGroupModal({ open, onClose, onJoined }) {
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await groupsApi.join({ code: code.trim().toUpperCase() });
      toast(
        res.data.data.pending
          ? 'Join request pending approval'
          : `Welcome to ${res.data.data.group.name}!`
      );
      onJoined?.(res.data.data);
      onClose?.();
      setCode('');
    } catch (err) {
      toast(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} className="auth-modal">
      <div className="modal-heading">
        <span className="eyebrow">JOIN YOUR PEOPLE</span>
        <h2>Join a group</h2>
        <p>Enter the invite code shared by your group admin.</p>
      </div>
      <form onSubmit={submit}>
        <label htmlFor="join-code">Invite code</label>
        <input
          id="join-code"
          required
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. AB12CD"
          style={{ textTransform: 'uppercase', letterSpacing: 2 }}
        />
        <div className="form-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" type="submit" disabled={busy}>
            Join group ↗
          </button>
        </div>
      </form>
    </Modal>
  );
}
