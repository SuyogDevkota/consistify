import { useState } from 'react';
import Modal from './Modal';
import { groupsApi, getErrorMessage } from '../services/api';
import { useToast } from '../hooks/useToast';

export default function CreateGroupModal({ open, onClose, onCreated }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    color: '#6490ff',
    rules: '',
    requireJoinApproval: false,
  });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await groupsApi.create(form);
      toast(`Group ready. Invite code: ${res.data.data.invitation.code}`);
      onCreated?.(res.data.data);
      onClose?.();
      setForm({
        name: '',
        description: '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        color: '#6490ff',
        rules: '',
        requireJoinApproval: false,
      });
    } catch (err) {
      toast(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} className="auth-modal">
      <div className="modal-heading">
        <span className="eyebrow">START YOUR COMMUNITY</span>
        <h2>Create a private group</h2>
        <p>You&apos;ll be the owner and can invite members with a secure code.</p>
      </div>
      <form onSubmit={submit}>
        <label htmlFor="cg-name">Community name</label>
        <input
          id="cg-name"
          required
          maxLength={80}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. The Consistency Club"
        />
        <label htmlFor="cg-desc">Description (optional)</label>
        <input
          id="cg-desc"
          maxLength={500}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <label htmlFor="cg-tz">Timezone</label>
        <input
          id="cg-tz"
          maxLength={64}
          value={form.timezone}
          onChange={(e) => setForm({ ...form, timezone: e.target.value })}
        />
        <label htmlFor="cg-color">Accent color</label>
        <input
          id="cg-color"
          type="color"
          value={form.color}
          onChange={(e) => setForm({ ...form, color: e.target.value })}
        />
        <label htmlFor="cg-rules">Group rules (optional)</label>
        <input
          id="cg-rules"
          maxLength={2000}
          value={form.rules}
          onChange={(e) => setForm({ ...form, rules: e.target.value })}
          placeholder="Show up daily, be kind..."
        />
        <label className="form-hint" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={form.requireJoinApproval}
            onChange={(e) => setForm({ ...form, requireJoinApproval: e.target.checked })}
          />
          Require approval before new members join
        </label>
        <div className="form-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" type="submit" disabled={busy}>
            Create group ↗
          </button>
        </div>
      </form>
    </Modal>
  );
}
