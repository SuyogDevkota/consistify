import { useEffect, useState } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import Brand from '../components/Brand';
import CreateGroupModal from '../components/CreateGroupModal';
import JoinGroupModal from '../components/JoinGroupModal';
import SettingsModal from '../components/SettingsModal';
import ProfileModal from '../components/ProfileModal';
import NotificationCenter from '../components/NotificationCenter';
import { useAuth } from '../context/AuthContext';
import { useGroup } from '../context/GroupContext';
import { useToast } from '../hooks/useToast';
import { NAV_ITEMS, VIEW_TITLES } from '../utils/constants';
import { formatLongDate, userInitial } from '../utils/format';

export default function DashboardLayout() {
  const { user, loading, logout } = useAuth();
  const { groups, activeGroupId, groupDetails, selectGroup, loadGroups, loadGroupDetails, canManageGroup } = useGroup();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [view, setView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [groupMenuOpen, setGroupMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  useEffect(() => {
    const close = () => {
      setGroupMenuOpen(false);
      setUserMenuOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  if (loading) {
    return (
      <div className="app-page active" style={{ placeItems: 'center', minHeight: '100vh' }}>
        <p style={{ color: '#94a3bd' }}>Loading your workspace…</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;

  if (!groups.length && !activeGroupId) {
    return (
      <>
        <div className="app-page active" style={{ placeItems: 'center', padding: 40 }}>
          <div className="empty-box" style={{ maxWidth: 420 }}>
            <strong>No community yet</strong>
            Create a private group or join with an invite code to continue.
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
              <button type="button" className="btn btn-primary" onClick={() => setCreateOpen(true)}>
                Create group
              </button>
              <button type="button" className="btn btn-outline" onClick={() => setJoinOpen(true)}>
                Join group
              </button>
            </div>
          </div>
        </div>
        <CreateGroupModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={async ({ group }) => {
            await loadGroups();
            selectGroup(group.id);
          }}
        />
        <JoinGroupModal
          open={joinOpen}
          onClose={() => setJoinOpen(false)}
          onJoined={async (result) => {
            if (result.pending) return;
            await loadGroups();
            selectGroup(result.group.id);
          }}
        />
      </>
    );
  }

  return (
    <section className="app-page active">
      <aside className={`sidebar ${sidebarOpen ? 'mobile-open' : ''}`}>
        <Brand className="side-brand" to="/app" />
        <div className="group-switcher">
          <small>YOUR COMMUNITY</small>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setGroupMenuOpen((v) => !v);
            }}
          >
            {groupDetails?.name || 'Choose a group'} <span>⌄</span>
          </button>
          {groupMenuOpen ? (
            <div className="group-menu" onClick={(e) => e.stopPropagation()}>
              {groups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    selectGroup(g.id);
                    setGroupMenuOpen(false);
                  }}
                >
                  {g.name} {g.id === activeGroupId ? '✓' : ''}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setGroupMenuOpen(false);
                  setCreateOpen(true);
                }}
              >
                ＋ Create another group
              </button>
              <button
                type="button"
                onClick={() => {
                  setGroupMenuOpen(false);
                  setJoinOpen(true);
                }}
              >
                ↗ Join with invite code
              </button>
            </div>
          ) : null}
        </div>
        <div className="side-label">WORKSPACE</div>
        <nav className="side-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`side-link ${view === item.id ? 'active' : ''}`}
              onClick={() => {
                setView(item.id);
                setSidebarOpen(false);
              }}
            >
              <span>{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <span>✦ A little reminder</span>
            <p>Consistency beats intensity when you keep showing up.</p>
          </div>
          <button type="button" className="side-link" onClick={() => setSettingsOpen(true)}>
            <span>⚙</span> Group settings
          </button>
          <button
            type="button"
            className="side-link"
            onClick={async () => {
              await logout();
              toast('You have logged out.');
              navigate('/');
            }}
          >
            <span>↪</span> Log out
          </button>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-header">
          <div>
            <button type="button" className="mobile-menu" onClick={() => setSidebarOpen((v) => !v)}>
              ☰
            </button>
            <small>{formatLongDate()}</small>
            <h1>{VIEW_TITLES[view] || 'Overview'}</h1>
          </div>
          <div className="header-right">
            <span className="group-pill">
              <i />
              <span>{groupDetails?.name || 'My Community'}</span>
            </span>
            {activeGroupId ? <NotificationCenter groupId={activeGroupId} /> : null}
            <button
              type="button"
              className="user-chip"
              onClick={(e) => {
                e.stopPropagation();
                setUserMenuOpen((v) => !v);
              }}
            >
              <span className="user-avatar">{userInitial(user.name)}</span>
              <span>{user.name}</span>⌄
            </button>
            {userMenuOpen ? (
              <div className="user-menu" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(true);
                    setUserMenuOpen(false);
                  }}
                >
                  My profile
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await logout();
                    navigate('/');
                  }}
                >
                  Log out
                </button>
              </div>
            ) : null}
          </div>
        </header>
        <div className="app-content">
          <Outlet context={{ view, setView }} />
        </div>
      </div>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        group={groupDetails}
        canManage={canManageGroup}
        onSaved={async () => {
          await loadGroups();
          if (activeGroupId) await loadGroupDetails(activeGroupId);
        }}
      />
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
      <CreateGroupModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={async ({ group }) => {
          await loadGroups();
          selectGroup(group.id);
        }}
      />
      <JoinGroupModal
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        onJoined={async (result) => {
          if (result.pending) return;
          await loadGroups();
          selectGroup(result.group.id);
        }}
      />
    </section>
  );
}
