import { toDateKey } from '../utils/format';

export default function CalendarGrid({ year, month, days = {}, todayKey, selectedKey, onSelect }) {
  const first = new Date(year, month - 1, 1).getDay();
  const count = new Date(year, month, 0).getDate();
  const prevCount = new Date(year, month - 1, 0).getDate();
  const cells = [];

  for (let i = 0; i < 42; i++) {
    let day;
    let other = false;
    let date;
    if (i < first) {
      day = prevCount - first + i + 1;
      other = true;
      date = new Date(year, month - 2, day);
    } else if (i >= first + count) {
      day = i - first - count + 1;
      other = true;
      date = new Date(year, month, day);
    } else {
      day = i - first + 1;
      date = new Date(year, month - 1, day);
    }
    const key = toDateKey(date);
    const info = days[key];
    cells.push(
      <button
        type="button"
        key={`${key}-${i}`}
        className={`calendar-day ${other ? 'muted' : ''} ${info?.hasActivity ? 'has-activity' : ''} ${
          key === todayKey ? 'today' : ''
        } ${key === selectedKey ? 'selected-day' : ''}`}
        onClick={() => onSelect?.(key, info)}
        aria-label={`View ${key}`}
      >
        <span>{day}</span>
        {info?.hasActivity ? <small>{info.groupPoints} pts</small> : null}
      </button>
    );
  }

  return (
    <>
      <div className="calendar-weekdays">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="calendar-grid">{cells}</div>
      <p className="calendar-note">
        <i /> Day with completed tasks — tap a day to see your record
      </p>
    </>
  );
}
