import { useEffect, useState } from 'react';
import CalendarGrid from '../CalendarGrid';
import { formatMonthLabel } from '../../utils/format';
import { groupsApi, getErrorMessage } from '../../services/api';
import { useToast } from '../../hooks/useToast';

export default function CalendarView({ calDate, setCalDate, calendar, todayKey, groupId }) {
  const { toast } = useToast();
  const [selected, setSelected] = useState(todayKey || null);
  const [dayData, setDayData] = useState(null);

  const shift = (delta) => {
    setCalDate((d) => {
      let month = d.month + delta;
      let year = d.year;
      if (month < 1) {
        month = 12;
        year -= 1;
      } else if (month > 12) {
        month = 1;
        year += 1;
      }
      return { year, month };
    });
  };

  useEffect(() => {
    if (!groupId || !selected) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await groupsApi.history(groupId, { dateKey: selected });
        if (!cancelled) setDayData(res.data.data);
      } catch (err) {
        if (!cancelled) toast(getErrorMessage(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [groupId, selected, toast]);

  const info = calendar?.days?.[selected] || {};

  return (
    <div className="view active">
      <div className="page-intro">
        <div>
          <h2>Consistency calendar</h2>
          <p>Look back at the days you showed up. Completions are limited to today and yesterday.</p>
        </div>
        <div className="month-control">
          <button type="button" onClick={() => shift(-1)} aria-label="Previous month">
            ‹
          </button>
          <strong>{formatMonthLabel(calDate.year, calDate.month)}</strong>
          <button type="button" onClick={() => shift(1)} aria-label="Next month">
            ›
          </button>
        </div>
      </div>
      <section className="panel calendar-panel">
        <CalendarGrid
          year={calDate.year}
          month={calDate.month}
          days={calendar.days || {}}
          todayKey={todayKey}
          selectedKey={selected}
          onSelect={(key) => setSelected(key)}
        />
      </section>
      {selected ? (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>{selected}</h3>
              <p>Your completions and group totals for this date. Past days are view-only.</p>
            </div>
          </div>
          <p className="form-hint">
            You: {dayData?.yours?.reduce((s, r) => s + r.pointsAwarded, 0) || info.yourPoints || 0} pts · Group:{' '}
            {dayData?.groupPoints ?? info.groupPoints ?? 0} pts
          </p>
          {dayData?.yours?.length ? (
            dayData.yours.map((row) => (
              <div className="leader-row" key={row.id}>
                <span className="leader-name">{row.taskName}</span>
                <span className="leader-points">+{row.pointsAwarded}</span>
              </div>
            ))
          ) : (
            <div className="empty-state">No personal completions on this day.</div>
          )}
        </section>
      ) : null}
    </div>
  );
}
