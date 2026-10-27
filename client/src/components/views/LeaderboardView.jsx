import Leaderboard from '../Leaderboard';
import { LEADERBOARD_PERIODS } from '../../utils/constants';

export default function LeaderboardView({ leaderboard, period, setPeriod, currentUserId }) {
  return (
    <div className="view active">
      <div className="page-intro">
        <div>
          <h2>A little friendly competition.</h2>
          <p>Celebrate effort, not just the final score. Rankings stay inside this group.</p>
        </div>
        <select className="select-small" value={period} onChange={(e) => setPeriod(e.target.value)}>
          {LEADERBOARD_PERIODS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <section className="panel leaderboard-full">
        <div className="panel-heading">
          <div>
            <h3>Leaderboard</h3>
            <p>Members ranked by points for the selected period.</p>
          </div>
        </div>
        <Leaderboard rows={leaderboard} full currentUserId={currentUserId} />
      </section>
    </div>
  );
}
