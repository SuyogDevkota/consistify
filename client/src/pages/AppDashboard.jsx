import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import OverviewView from '../components/views/OverviewView';
import TasksView from '../components/views/TasksView';
import MembersView from '../components/views/MembersView';
import ProgressView from '../components/views/ProgressView';
import CalendarView from '../components/views/CalendarView';
import LeaderboardView from '../components/views/LeaderboardView';
import TaskFormModal from '../components/TaskFormModal';
import InviteModal from '../components/InviteModal';
import ConfirmationModal from '../components/ConfirmationModal';
import EmptyState from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';
import { useGroup } from '../context/GroupContext';
import { groupsApi, getErrorMessage } from '../services/api';
import { useToast } from '../hooks/useToast';
import useDashboardData from '../hooks/useDashboardData';

export default function AppDashboard() {
  const { view, setView } = useOutletContext();
  const { user } = useAuth();
  const {
    activeGroupId,
    canManageTasks,
    canManageGroup,
    isOwner,
    loadGroups,
    selectGroup,
    loadGroupDetails,
  } = useGroup();
  const { toast } = useToast();

  const [chartMode, setChartMode] = useState('daily');
  const [chartRange, setChartRange] = useState(7);
  const [taskFilter, setTaskFilter] = useState('all');
  const [period, setPeriod] = useState('all');
  const [calDate, setCalDate] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });
  const [taskModal, setTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [inviteModal, setInviteModal] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [busyTask, setBusyTask] = useState(null);

  const data = useDashboardData({
    groupId: activeGroupId,
    view,
    chartMode,
    chartRange,
    period,
    calDate,
  });

  const toggleTask = async (task, action) => {
    if (!activeGroupId || busyTask) return;
    setBusyTask(task.id);
    try {
      const completedCount = task.completionCount ?? (task.completed ? 1 : 0);
      const limit = task.dailyLimit || 1;
      const shouldUndo = action === 'undo' || (!action && task.completed);
      if (shouldUndo) {
        await groupsApi.undo(activeGroupId, task.id, {
          ...(task.latestOccurrence ? { occurrence: task.latestOccurrence } : {}),
        });
      } else {
        if (completedCount >= limit) return;
        await groupsApi.complete(activeGroupId, task.id);
      }
      toast(shouldUndo ? 'Completion removed.' : 'Nice work! Task completed.');
      await data.refresh();
    } catch (err) {
      toast(getErrorMessage(err));
    } finally {
      setBusyTask(null);
    }
  };

  const archiveTask = (task) => {
    setConfirm({
      title: 'Archive task?',
      message: `"${task.name}" will be archived. Historical completions stay intact.`,
      onConfirm: async () => {
        try {
          await groupsApi.archiveTask(activeGroupId, task.id);
          toast('Task archived.');
          setConfirm(null);
          await data.refresh();
        } catch (err) {
          toast(getErrorMessage(err));
        }
      },
    });
  };

  const changeRole = async (member, role) => {
    try {
      await groupsApi.changeRole(activeGroupId, member.id, role);
      toast(`Updated ${member.name}'s role.`);
      await data.refresh();
      await loadGroupDetails(activeGroupId);
    } catch (err) {
      toast(getErrorMessage(err));
    }
  };

  const removeMember = (member) => {
    setConfirm({
      title: 'Remove member?',
      message: `Remove ${member.name} from this group?`,
      onConfirm: async () => {
        try {
          await groupsApi.removeMember(activeGroupId, member.id);
          toast('Member removed.');
          setConfirm(null);
          await data.refresh();
        } catch (err) {
          toast(getErrorMessage(err));
        }
      },
    });
  };

  const transferOwnership = (member) => {
    setConfirm({
      title: 'Transfer ownership?',
      message: `Make ${member.name} the new owner? You will become an admin.`,
      confirmLabel: 'Transfer',
      onConfirm: async () => {
        try {
          await groupsApi.transfer(activeGroupId, member.id);
          toast('Ownership transferred.');
          setConfirm(null);
          await data.refresh();
          await loadGroupDetails(activeGroupId);
        } catch (err) {
          toast(getErrorMessage(err));
        }
      },
    });
  };

  const leaveGroup = () => {
    setConfirm({
      title: 'Leave this group?',
      message: 'You will lose access until invited again. Last owners must transfer ownership first.',
      confirmLabel: 'Leave',
      onConfirm: async () => {
        try {
          await groupsApi.leave(activeGroupId);
          toast('You left the group.');
          setConfirm(null);
          const list = await loadGroups();
          selectGroup(list[0]?.id || null);
        } catch (err) {
          toast(getErrorMessage(err));
        }
      },
    });
  };

  if (!activeGroupId) {
    return <EmptyState title="Select a group">Create or join a community to continue.</EmptyState>;
  }

  return (
    <>
      {view === 'dashboard' && (
        <OverviewView
          user={user}
          summary={data.summary}
          checklist={data.checklist}
          activity={data.activity}
          leaderboard={data.leaderboard}
          chartData={data.chartData}
          chartMode={chartMode}
          setChartMode={setChartMode}
          chartRange={chartRange}
          setChartRange={setChartRange}
          canManageTasks={canManageTasks}
          onAddTask={() => {
            setEditingTask(null);
            setTaskModal(true);
          }}
          onToggleTask={toggleTask}
          onOpenTasks={() => setView('tasks')}
          onOpenLeaderboard={() => setView('leaderboard')}
          onInvite={() => setInviteModal(true)}
          loading={data.loading}
        />
      )}
      {view === 'tasks' && (
        <TasksView
          tasks={data.checklist?.tasks || []}
          filter={taskFilter}
          setFilter={setTaskFilter}
          canManageTasks={canManageTasks}
          onAddTask={() => {
            setEditingTask(null);
            setTaskModal(true);
          }}
          onEditTask={(task) => {
            setEditingTask(task);
            setTaskModal(true);
          }}
          onToggle={toggleTask}
          onDelete={archiveTask}
          categories={data.categories}
          groupId={activeGroupId}
          onCategoriesChanged={data.refresh}
        />
      )}
      {view === 'members' && (
        <MembersView
          members={data.members}
          pending={data.pending}
          currentUserId={user.id}
          isOwner={isOwner}
          canManage={canManageGroup}
          onChangeRole={changeRole}
          onRemove={removeMember}
          onTransfer={transferOwnership}
          onInvite={() => setInviteModal(true)}
          onLeave={leaveGroup}
          onApprove={async (member) => {
            try {
              await groupsApi.approveMember(activeGroupId, member.id);
              toast(`${member.name} is now a member.`);
              await data.refresh();
            } catch (err) {
              toast(getErrorMessage(err));
            }
          }}
          onReject={async (member) => {
            try {
              await groupsApi.rejectMember(activeGroupId, member.id);
              toast('Join request declined.');
              await data.refresh();
            } catch (err) {
              toast(getErrorMessage(err));
            }
          }}
        />
      )}
      {view === 'progress' && (
        <ProgressView
          summary={data.summary}
          dailyChart={data.dailyChart}
          cumChart={data.cumChart}
          categoryStats={data.categoryStats}
          chartRange={chartRange}
          setChartRange={setChartRange}
        />
      )}
      {view === 'calendar' && (
        <CalendarView
          calDate={calDate}
          setCalDate={setCalDate}
          calendar={data.calendar}
          todayKey={data.summary?.dateKey}
          groupId={activeGroupId}
        />
      )}
      {view === 'leaderboard' && (
        <LeaderboardView
          leaderboard={data.leaderboard}
          period={period}
          setPeriod={setPeriod}
          currentUserId={user.id}
        />
      )}

      <TaskFormModal
        open={taskModal}
        onClose={() => {
          setTaskModal(false);
          setEditingTask(null);
        }}
        groupId={activeGroupId}
        categories={data.categories}
        task={editingTask}
        onSaved={data.refresh}
      />
      <InviteModal open={inviteModal} onClose={() => setInviteModal(false)} groupId={activeGroupId} />
      <ConfirmationModal
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={confirm?.onConfirm}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
      />
    </>
  );
}
