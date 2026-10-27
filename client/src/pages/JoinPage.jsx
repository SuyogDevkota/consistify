import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Brand from '../components/Brand';
import AuthModal from '../components/AuthModal';
import { useAuth } from '../context/AuthContext';
import { useGroup } from '../context/GroupContext';
import { groupsApi, getErrorMessage } from '../services/api';
import { useToast } from '../hooks/useToast';

export default function JoinPage() {
  const { token } = useParams();
  const { user, loading } = useAuth();
  const { selectGroup, loadGroups } = useGroup();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [info, setInfo] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await groupsApi.validateInvite({ token });
        setInfo(res.data.data);
      } catch (err) {
        setError(getErrorMessage(err));
      }
    })();
  }, [token]);

  const join = async () => {
    try {
      const res = await groupsApi.join({ token });
      if (res.data.data.pending) {
        toast('Join request sent. An admin will review it.');
        navigate('/');
        return;
      }
      await loadGroups();
      if (!res.data.data.alreadyMember) {
        selectGroup(res.data.data.group.id);
      }
      toast(`Welcome to ${res.data.data.group.name}!`);
      navigate('/app');
    } catch (err) {
      toast(getErrorMessage(err));
    }
  };

  return (
    <div className="wrap" style={{ paddingTop: 80, maxWidth: 520 }}>
      <Brand />
      <div className="panel" style={{ marginTop: 30 }}>
        {error ? (
          <div className="empty-box">
            <strong>Invitation unavailable</strong>
            {error}
          </div>
        ) : !info ? (
          <div className="empty-state">Validating invitation…</div>
        ) : (
          <>
            <div className="eyebrow">YOU&apos;RE INVITED</div>
            <h2 style={{ fontFamily: 'Space Grotesk', marginTop: 8 }}>Join {info.groupName}</h2>
            <p style={{ color: '#94a3bd', fontSize: 13 }}>
              This invitation expires {new Date(info.expiresAt).toLocaleString()}.
            </p>
            {user ? (
              <button type="button" className="btn btn-primary" onClick={join}>
                Join community ↗
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={() => setAuthOpen(true)}>
                Sign in to join ↗
              </button>
            )}
          </>
        )}
      </div>
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        initialMode="signup"
        onAuthenticated={join}
      />
    </div>
  );
}
