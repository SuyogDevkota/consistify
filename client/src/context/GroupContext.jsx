import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { groupsApi, getErrorMessage } from '../services/api';
import { useAuth } from './AuthContext';

const GroupContext = createContext(null);
const STORAGE_KEY = 'consistify_active_group';

export function GroupProvider({ children }) {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [activeGroupId, setActiveGroupId] = useState(() => localStorage.getItem(STORAGE_KEY));
  const [groupDetails, setGroupDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadGroups = useCallback(async () => {
    if (!user) {
      setGroups([]);
      setGroupDetails(null);
      return [];
    }
    setLoading(true);
    try {
      const res = await groupsApi.list();
      const list = res.data.data.groups;
      setGroups(list);
      let nextId = activeGroupId;
      if (!list.find((g) => g.id === nextId)) {
        nextId = list[0]?.id || null;
        setActiveGroupId(nextId);
        if (nextId) localStorage.setItem(STORAGE_KEY, nextId);
        else localStorage.removeItem(STORAGE_KEY);
      }
      return list;
    } finally {
      setLoading(false);
    }
  }, [user, activeGroupId]);

  const loadGroupDetails = useCallback(async (id) => {
    if (!id) {
      setGroupDetails(null);
      return null;
    }
    const res = await groupsApi.get(id);
    setGroupDetails(res.data.data.group);
    return res.data.data.group;
  }, []);

  useEffect(() => {
    if (user) loadGroups().catch(() => {});
    else {
      setGroups([]);
      setGroupDetails(null);
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user && activeGroupId && groups.some((group) => group.id === activeGroupId)) {
      loadGroupDetails(activeGroupId).catch(() => setGroupDetails(null));
    }
  }, [user, groups, activeGroupId, loadGroupDetails]);

  const selectGroup = (id) => {
    setActiveGroupId(id);
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  };

  const value = useMemo(
    () => ({
      groups,
      activeGroupId,
      groupDetails,
      loading,
      loadGroups,
      loadGroupDetails,
      selectGroup,
      setGroupDetails,
      getErrorMessage,
      role: groupDetails?.role,
      canManageTasks: ['owner', 'admin'].includes(groupDetails?.role),
      canManageGroup: ['owner', 'admin'].includes(groupDetails?.role),
      isOwner: groupDetails?.role === 'owner',
    }),
    [groups, activeGroupId, groupDetails, loading, loadGroups, loadGroupDetails]
  );

  return <GroupContext.Provider value={value}>{children}</GroupContext.Provider>;
}

export function useGroup() {
  const ctx = useContext(GroupContext);
  if (!ctx) throw new Error('useGroup must be used within GroupProvider');
  return ctx;
}
