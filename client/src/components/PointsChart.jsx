import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

const LINE_STYLES = [
  { dash: undefined, legend: 'solid' },
  { dash: '7 4', legend: 'dashed' },
  { dash: '2 4', legend: 'dotted' },
  { dash: '9 3 2 3', legend: 'dashed' },
];

function buildChartData(dates = [], series = []) {
  return dates.map((date, i) => {
    const row = { date: date.slice(5), fullDate: date };
    series.forEach((s) => {
      row[s.userId] = s.values[i] ?? 0;
    });
    return row;
  });
}

export default function PointsChart({ dates, series, height = 210, emptyLabel = 'No chart data yet.' }) {
  if (!dates?.length || !series?.length) {
    return <div className="empty-state">{emptyLabel}</div>;
  }

  const data = buildChartData(dates, series);
  const many = series.length > 6;

  return (
    <div className="chart-wrap" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#27344a" strokeDasharray="3 4" />
          <XAxis dataKey="date" stroke="#7f90aa" tick={{ fontSize: 10 }} />
          <YAxis stroke="#7f90aa" tick={{ fontSize: 10 }} width={36} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              background: '#172238',
              border: '1px solid #354662',
              borderRadius: 8,
              fontSize: 12,
            }}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate || ''}
          />
          {!many ? <Legend wrapperStyle={{ fontSize: 11 }} /> : null}
          {series.map((s, index) => (
            <Line
              key={s.userId}
              type="monotone"
              dataKey={s.userId}
              name={s.name}
              stroke={s.color}
              strokeWidth={2.4}
              strokeDasharray={LINE_STYLES[index % LINE_STYLES.length].dash}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ChartLegend({ series }) {
  if (!series?.length) return null;
  return (
    <div className="chart-key">
      {series.map((s, index) => (
        <span key={s.userId}>
          <i
            style={{
              borderTop: `2px ${LINE_STYLES[index % LINE_STYLES.length].legend} ${s.color}`,
            }}
          />
          {s.name}
        </span>
      ))}
    </div>
  );
}
