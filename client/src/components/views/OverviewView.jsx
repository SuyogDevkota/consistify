import StatCard from '../StatCard';
import TaskList from '../TaskList';
import Leaderboard from '../Leaderboard';
import ActivityFeed from '../ActivityFeed';
import PointsChart, { ChartLegend } from '../PointsChart';
import Skeleton from '../Skeleton';
import { firstName } from '../../utils/format';
import { CHART_RANGES } from '../../utils/constants';

export default function OverviewView({
  user,
  summary,
  checklist,
  activity,
  leaderboard,
  chartData,
  chartMode,
  setChartMode,
  chartRange,
  setChartRange,
  canManageTasks,
  onAddTask,
  onToggleTask,
  busyTaskId,
  onOpenTasks,
  onOpenLeaderboard,
  onInvite,
  loading,
}) {
  if (loading && !summary) return <Skeleton rows={6} height={28} />;

  return (
    <div className="view active">
      <div className="welcome-row">
        <div>
          <h2>Good to see you, {firstName(user?.name)} 👋</h2>
          <p>Every small step adds up. Here&apos;s your community today.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {canManageTasks ? (
            <button type="button" className="btn btn-primary" onClick={onAddTask}>
              ＋ Add task
            </button>
          ) : null}
          {onInvite ? (
            <button type="button" className="btn btn-outline" onClick={onInvite}>
              Invite
            </button>
          ) : null}
        </div>
      </div>
      <div className="stat-grid">
        <StatCard
          label="Your points today"
          value={summary?.yourPointsToday ?? 0}
          sub={`${summary?.yourCompletedToday ?? 0} activities completed`}
          symbol="✦"
          symbolClass="blue-symbol"
        />
        <StatCard
          label="Community points"
          value={summary?.groupPointsToday ?? 0}
          sub="Points earned today by everyone"
          symbol="♧"
          symbolClass="purple-symbol"
        />
        <StatCard
          label="Your streak"
          value={
            <>
              {summary?.currentStreak ?? 0} <em>days</em>
            </>
          }
          sub="Consecutive days with activity"
          symbol="♨"
          symbolClass="orange-symbol"
        />
        <StatCard
          label="Tasks completed"
          value={`${summary?.yourCompletedTasks ?? summary?.yourCompletedToday ?? 0}/${summary?.activeTasks ?? 0}`}
          sub="Today's checklist"
          symbol="✓"
          symbolClass="green-symbol"
        />
      </div>
      <div className="stat-grid" style={{ marginTop: 0 }}>
        <StatCard label="Your total" value={summary?.yourTotalPoints ?? 0} sub="Cumulative in this group" />
        <StatCard label="This week" value={summary?.yourWeekPoints ?? 0} sub="Points this week" />
        <StatCard label="This month" value={summary?.yourMonthPoints ?? 0} sub="Points this month" />
        <StatCard
          label="Longest streak"
          value={`${summary?.longestStreak ?? 0}d`}
          sub={`${summary?.completionPctToday ?? 0}% of tasks today · ${summary?.memberCount ?? 0} members`}
        />
      </div>
      <div className="dashboard-grid">
        <section className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <h3>Progress over time</h3>
              <p>Compare daily effort and your running total.</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <select
                className="select-small"
                value={chartRange}
                onChange={(e) => setChartRange(Number(e.target.value))}
              >
                {CHART_RANGES.map((r) => (
                  <option key={r} value={r}>
                    {r} days
                  </option>
                ))}
              </select>
              <select
                className="select-small"
                value={chartMode}
                onChange={(e) => setChartMode(e.target.value)}
              >
                <option value="daily">Daily points</option>
                <option value="cumulative">Cumulative</option>
              </select>
            </div>
          </div>
          <PointsChart dates={chartData.dates} series={chartData.series} />
          <ChartLegend series={chartData.series} />
        </section>
        <section className="panel tasks-panel">
          <div className="panel-heading">
            <div>
              <h3>Today&apos;s tasks</h3>
              <p>Show up as often as you planned.</p>
            </div>
            <button type="button" className="text-button" onClick={onOpenTasks}>
              View all ↗
            </button>
          </div>
          <TaskList
            tasks={checklist?.tasks || []}
            limit={5}
            onToggle={onToggleTask}
            busyTaskId={busyTaskId}
            emptyMessage="No tasks yet. Add your first one."
          />
          {canManageTasks ? (
            <button type="button" className="add-task-inline" onClick={onAddTask}>
              ＋ Add a task
            </button>
          ) : null}
        </section>
        <section className="panel activity-panel">
          <div className="panel-heading">
            <div>
              <h3>Community activity</h3>
              <p>Latest updates from your group.</p>
            </div>
          </div>
          <ActivityFeed items={activity} currentUserId={user.id} />
        </section>
        <section className="panel leaderboard-panel">
          <div className="panel-heading">
            <div>
              <h3>Community leaderboard</h3>
              <p>All-time points, friendly competition.</p>
            </div>
            <button type="button" className="text-button" onClick={onOpenLeaderboard}>
              Full board ↗
            </button>
          </div>
          <Leaderboard rows={leaderboard.slice(0, 5)} currentUserId={user.id} />
        </section>
      </div>
    </div>
  );
}
