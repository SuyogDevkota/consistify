export default function StatCard({ label, value, sub, symbol, symbolClass }) {
  return (
    <article className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        {symbol ? <span className={`stat-symbol ${symbolClass || ''}`}>{symbol}</span> : null}
      </div>
      <strong>{value}</strong>
      {sub ? <small>{sub}</small> : null}
    </article>
  );
}
