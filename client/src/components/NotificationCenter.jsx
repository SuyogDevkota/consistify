import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { getErrorMessage, notificationsApi } from '../services/api';

function decodeApplicationServerKey(value) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

export default function NotificationCenter({ groupId }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [groupActivityEnabled, setGroupActivityEnabled] = useState(false);
  const [browserPushEnabled, setBrowserPushEnabled] = useState(false);
  const [pushConfigured, setPushConfigured] = useState(false);
  const [pushPublicKey, setPushPublicKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [busyNotification, setBusyNotification] = useState(null);
  const rootRef = useRef(null);

  const loadNotifications = useCallback(async () => {
    if (!groupId) return;
    try {
      const res = await notificationsApi.list(groupId);
      setError('');
      setNotifications(res.data.data.notifications);
      setUnreadCount(res.data.data.unreadCount);
      setGroupActivityEnabled(res.data.data.groupActivityEnabled);
      setBrowserPushEnabled(res.data.data.browserPushEnabled);
      setPushConfigured(res.data.data.pushConfigured);
      setPushPublicKey(res.data.data.pushPublicKey);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  const pushSupported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (!open) return undefined;
    const poll = () => {
      if (document.visibilityState === 'visible') loadNotifications();
    };
    const timer = window.setInterval(poll, 60000);
    document.addEventListener('visibilitychange', poll);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', poll);
    };
  }, [open, loadNotifications]);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('click', closeOnOutsideClick);
    return () => document.removeEventListener('click', closeOnOutsideClick);
  }, []);

  const updatePreference = async (event) => {
    const enabled = event.target.checked;
    setSaving(true);
    setError('');
    try {
      const res = await notificationsApi.updatePreferences(groupId, {
        groupActivityEnabled: enabled,
      });
      setGroupActivityEnabled(res.data.data.groupActivityEnabled);
      setBrowserPushEnabled(res.data.data.browserPushEnabled);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const updatePushPreference = async (event) => {
    const enabled = event.target.checked;
    setSaving(true);
    setError('');
    try {
      if (enabled) {
        if (!pushConfigured || !pushPublicKey) {
          throw new Error('Browser push has not been configured by the site owner yet.');
        }
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          throw new Error('Allow notifications in your browser to enable push alerts.');
        }
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        const subscription =
          (await registration.pushManager.getSubscription()) ||
          (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: decodeApplicationServerKey(pushPublicKey),
          }));
        await notificationsApi.subscribe(groupId, {
          ...subscription.toJSON(),
          expirationTime: subscription.expirationTime,
        });
        setBrowserPushEnabled(true);
      } else {
        const registration = await navigator.serviceWorker.getRegistration('/service-worker.js');
        const subscription = await registration?.pushManager.getSubscription();
        if (subscription) {
          const res = await notificationsApi.unsubscribe(groupId, subscription.endpoint);
          if (res.data.data.shouldUnsubscribe) await subscription.unsubscribe();
        } else {
          const res = await notificationsApi.updatePreferences(groupId, {
            browserPushEnabled: false,
          });
          setBrowserPushEnabled(res.data.data.browserPushEnabled);
        }
        setBrowserPushEnabled(false);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const markRead = async (notificationId) => {
    setBusyNotification(notificationId);
    setError('');
    try {
      await notificationsApi.markRead(groupId, notificationId);
      await loadNotifications();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyNotification(null);
    }
  };

  const markAllRead = async () => {
    setSaving(true);
    setError('');
    try {
      await notificationsApi.markAllRead(groupId);
      await loadNotifications();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="notification-center" ref={rootRef}>
      <button
        type="button"
        className="notification-trigger"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
        onClick={() => {
          setOpen((value) => !value);
          if (!open) loadNotifications();
        }}
      >
        <Bell size={19} aria-hidden="true" />
        {unreadCount > 0 ? (
          <span className="notification-count">{unreadCount > 99 ? '99+' : unreadCount}</span>
        ) : null}
      </button>
      {open ? (
        <section
          className="notification-panel"
          aria-label="Community notifications"
          onClick={(event) => event.stopPropagation()}
        >
          <header className="notification-panel-heading">
            <div>
              <strong>Notifications</strong>
              <small>{unreadCount ? `${unreadCount} unread` : 'You’re all caught up'}</small>
            </div>
            {unreadCount ? (
              <button type="button" className="notification-mark-all" onClick={markAllRead} disabled={saving}>
                <CheckCheck size={15} /> Mark all read
              </button>
            ) : null}
          </header>
          <label className="notification-preference">
            <input
              type="checkbox"
              checked={groupActivityEnabled}
              onChange={updatePreference}
              disabled={saving}
            />
            <span>Notify me about community activity</span>
          </label>
          <label className="notification-preference">
            <input
              type="checkbox"
              checked={browserPushEnabled}
              onChange={updatePushPreference}
              disabled={saving || !groupActivityEnabled || !pushConfigured || !pushSupported}
            />
            <span>
              Browser alerts when Consistify is closed
              {!pushSupported ? ' (not supported by this browser)' : ''}
              {!pushConfigured ? ' (not configured by the site owner)' : ''}
            </span>
          </label>
          {error ? <p className="notification-error" role="alert">{error}</p> : null}
          <div className="notification-list" aria-live="polite">
            {loading && !notifications.length ? (
              <p className="notification-empty">Loading notifications…</p>
            ) : notifications.length ? (
              notifications.map((notification) => (
                <article
                  key={notification.id}
                  className={`notification-item ${notification.read ? '' : 'unread'}`}
                >
                  <div className="notification-message">
                    <strong>{notification.title}</strong>
                    <span>{notification.message}</span>
                    <small>
                      {new Date(notification.createdAt).toLocaleString()}
                    </small>
                  </div>
                  {!notification.read ? (
                    <button
                      type="button"
                      className="notification-read"
                      onClick={() => markRead(notification.id)}
                      disabled={busyNotification === notification.id}
                      aria-label="Mark notification as read"
                    >
                      ✓
                    </button>
                  ) : null}
                </article>
              ))
            ) : !loading && !error ? (
              <p className="notification-empty">No community notifications yet.</p>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
