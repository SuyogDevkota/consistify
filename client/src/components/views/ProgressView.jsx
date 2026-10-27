import StatCard from '../StatCard';
import PointsChart, { ChartLegend } from '../PointsChart';
import { CHART_RANGES } from '../../utils/constants';

export default function ProgressView({
  summary,
  dailyChart,
  cumChart,
  categoryStats = [],
  chartRange,
  setChartRange,
}) {
  return (
    <div className="view active">
      <div className="page-intro">
        <div>
          <h2>Your consistency, made visible.</h2>
          <p>Understand your daily effort and long-term momentum.</p>
        </div>
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
      </div>
      <div className="stat-grid progress-stats">
        <StatCard
          label="Total group points"
          value={summary?.allTimeGroupPoints ?? 0}
          sub="Across all recorded days"
        />
        <StatCard
          label="Group tasks done"
          value={summary?.allTimeCompletions ?? 0}
          sub="Completions recorded"
        />
        <StatCard
          label="Active members"
          value={summary?.memberCount ?? 0}
          sub="In this community"
        />
      </div>
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))' }}>
        <StatCard label="Your total points" value={summary?.yourTotalPoints ?? 0} sub="All-time in this group" />
        <StatCard label="This week" value={summary?.yourWeekPoints ?? 0} sub="Your points" />
        <StatCard label="This month" value={summary?.yourMonthPoints ?? 0} sub="Your points" />
      </div>
      <section className="panel big-chart-panel">
        <div className="panel-heading">
          <div>
            <h3>Daily points</h3>
            <p>Points earned by each member each day.</p>
          </div>
        </div>
        <PointsChart dates={dailyChart.dates} series={dailyChart.series} height={280} />
        <ChartLegend series={dailyChart.series} />
      </section>
      <section className="panel big-chart-panel">
        <div className="panel-heading">
          <div>
            <h3>Cumulative points</h3>
            <p>Running total across recorded days (historically accurate).</p>
          </div>
        </div>
        <PointsChart dates={cumChart.dates} series={cumChart.series} height={280} />
        <ChartLegend series={cumChart.series} />
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>Category progress</h3>
            <p>Points by category for the selected range.</p>
          </div>
        </div>
        {categoryStats.length ? (
          categoryStats.map((c) => (
            <div className="leader-row" key={c.category}>
              <span className="leader-name">{c.category}</span>
              <span className="leader-points">
                {c.points} pts · {c.completions} completions
              </span>
            </div>
          ))
        ) : (
          <div className="empty-state">No category data for this range yet.</div>
        )}
      </section>
    </div>
  );
}
