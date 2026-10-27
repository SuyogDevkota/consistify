import { useState } from 'react';
import Modal from './Modal';
import { authApi, getErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';

export default function ProfileModal({ open, onClose }) {
  const { user, setUser, logout } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState(user?.name || '');
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [deleteForm, setDeleteForm] = useState({ password: '', confirm: '' });

  const saveProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await authApi.updateProfile({ name });
      setUser(res.data.data.user);
      toast('Profile updated.');
    } catch (err) {
      toast(getErrorMessage(err));
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    try {
      await authApi.changePassword(passwords);
      toast('Password changed.');
      setPasswords({ currentPassword: '', newPassword: '' });
    } catch (err) {
      toast(getErrorMessage(err));
    }
  };

  const deleteAccount = async (e) => {
    e.preventDefault();
    try {
      await authApi.deleteAccount(deleteForm);
      toast('Account deleted.');
      await logout();
      onClose?.();
    } catch (err) {
      toast(getErrorMessage(err));
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div className="modal-heading">
        <span className="eyebrow">YOUR ACCOUNT</span>
        <h2>My profile</h2>
        <p>{user?.email}</p>
      </div>
      <form onSubmit={saveProfile}>
        <label htmlFor="profileName">Display name</label>
        <input id="profileName" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} />
        <button className="btn btn-primary full-width" type="submit">
          Save profile
        </button>
      </form>
      <form onSubmit={changePassword} style={{ marginTop: 18 }}>
        <label htmlFor="currentPassword">Current password</label>
        <input
          id="currentPassword"
          type="password"
          value={passwords.currentPassword}
          onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
          required
        />
        <label htmlFor="newPassword">New password</label>
        <input
          id="newPassword"
          type="password"
          minLength={8}
          value={passwords.newPassword}
          onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
          required
        />
        <button className="btn btn-outline full-width" type="submit">
          Change password
        </button>
      </form>
      <form onSubmit={deleteAccount} style={{ marginTop: 18 }}>
        <p className="form-hint">
          Data retention: profile is soft-deleted. Shared completion history in groups is kept anonymously for
          score integrity. Transfer ownership of any groups you solely own before deleting.
        </p>
        <label htmlFor="deletePassword">Password</label>
        <input
          id="deletePassword"
          type="password"
          value={deleteForm.password}
          onChange={(e) => setDeleteForm({ ...deleteForm, password: e.target.value })}
          required
        />
        <label htmlFor="deleteConfirm">Type DELETE to confirm</label>
        <input
          id="deleteConfirm"
          value={deleteForm.confirm}
          onChange={(e) => setDeleteForm({ ...deleteForm, confirm: e.target.value })}
          required
        />
        <button className="btn btn-outline full-width" type="submit">
          Delete account
        </button>
      </form>
    </Modal>
  );
}
