import { useState } from 'react';
import Modal from './Modal';
import { useAuth } from '../context/AuthContext';
import { groupsApi, getErrorMessage } from '../services/api';
import { useToast } from '../hooks/useToast';

export default function AuthModal({
  open,
  onClose,
  initialMode = 'signup',
  onAuthenticated,
  forceStep = null,
}) {
  const { login, register } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState(initialMode);
  const [step, setStep] = useState(forceStep || 'account');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [groupForm, setGroupForm] = useState({ name: '', description: '', code: '' });

  const reset = () => {
    setStep(forceStep || 'account');
    setMode(initialMode);
    setForm({ name: '', email: '', password: '' });
    setGroupForm({ name: '', description: '', code: '' });
  };

  const handleClose = () => {
    reset();
    onClose?.();
  };

  const onAccount = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === 'signup') {
        await register(form);
        setStep('create');
        toast('Account created — set up your community.');
      } else {
        await login({ email: form.email, password: form.password });
        toast('Welcome back!');
        onAuthenticated?.({ needsGroup: false });
        handleClose();
      }
    } catch (err) {
      toast(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const onCreateGroup = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await groupsApi.create({
        name: groupForm.name,
        description: groupForm.description,
      });
      toast(`Group ready. Invite code: ${res.data.data.invitation.code}`);
      onAuthenticated?.({
        needsGroup: false,
        groupId: res.data.data.group.id,
        invitation: res.data.data.invitation,
      });
      handleClose();
    } catch (err) {
      toast(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const onJoinGroup = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await groupsApi.join({ code: groupForm.code.trim().toUpperCase() });
      toast(res.data.data.pending ? 'Join request pending approval' : `Welcome to ${res.data.data.group.name}!`);
      onAuthenticated?.({
        needsGroup: false,
        groupId: res.data.data.pending ? null : res.data.data.group.id,
      });
      handleClose();
    } catch (err) {
      toast(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} className="auth-modal">
      <div className="modal-brand">
        <span className="brand-mark">↗</span>
      </div>
      {step === 'account' && (
        <>
          <div className="auth-heading">
            <div className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</div>
            <h2>{mode === 'signup' ? 'Create your account' : 'Welcome back.'}</h2>
            <p>
              {mode === 'signup'
                ? 'Set up your profile, then create or join a private community.'
                : 'Log in to return to your communities.'}
            </p>
          </div>
          <div className="auth-tabs">
            <button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>
              Sign up
            </button>
            <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
              Log in
            </button>
          </div>
          <form onSubmit={onAccount}>
            {mode === 'signup' ? (
              <>
                <label htmlFor="authName">Your name</label>
                <input
                  id="authName"
                  maxLength={80}
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="What should we call you?"
                  autoComplete="name"
                />
              </>
            ) : null}
            <label htmlFor="authEmail">Email address</label>
            <input
              id="authEmail"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
              autoComplete="email"
            />
            <label htmlFor="authPassword">Password</label>
            <input
              id="authPassword"
              type="password"
              minLength={8}
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="At least 8 characters"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
            <button className="btn btn-primary full-width" type="submit" disabled={busy}>
              {mode === 'signup' ? 'Create account' : 'Log in'} ↗
            </button>
          </form>
        </>
      )}

      {(step === 'create' || step === 'join') && (
        <>
          <div className="auth-heading">
            <div className="eyebrow">{step === 'create' ? 'START YOUR COMMUNITY' : 'JOIN YOUR PEOPLE'}</div>
            <h2>{step === 'create' ? 'Create a private group' : 'Join a group'}</h2>
            <p>
              {step === 'create'
                ? "You'll be the group owner and can invite your members."
                : 'Enter the invite code shared by your group admin.'}
            </p>
          </div>
          <form onSubmit={step === 'create' ? onCreateGroup : onJoinGroup}>
            {step === 'create' ? (
              <>
                <label htmlFor="newGroupName">Community name</label>
                <input
                  id="newGroupName"
                  maxLength={80}
                  required
                  value={groupForm.name}
                  onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                  placeholder="e.g. The Consistency Club"
                />
                <label htmlFor="groupDescription">What are you working on? (optional)</label>
                <input
                  id="groupDescription"
                  maxLength={500}
                  value={groupForm.description}
                  onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                  placeholder="Study, fitness, coding..."
                />
              </>
            ) : (
              <>
                <label htmlFor="joinCode">Invite code</label>
                <input
                  id="joinCode"
                  maxLength={6}
                  required
                  value={groupForm.code}
                  onChange={(e) => setGroupForm({ ...groupForm, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. AB12CD"
                  style={{ textTransform: 'uppercase', letterSpacing: 2 }}
                />
              </>
            )}
            <div className="form-actions">
              {!forceStep && (
                <button type="button" className="btn btn-outline" onClick={() => setStep(step === 'create' ? 'join' : 'create')}>
                  {step === 'create' ? 'Join instead' : 'Create instead'}
                </button>
              )}
              <button className="btn btn-primary" type="submit" disabled={busy}>
                {step === 'create' ? 'Create group' : 'Join group'} ↗
              </button>
            </div>
          </form>
        </>
      )}
    </Modal>
  );
}
