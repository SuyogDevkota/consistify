export default function Skeleton({ rows = 3, height = 18 }) {
  return (
    <div className="skeleton-stack" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height, marginBottom: 8 }} />
      ))}
    </div>
  );
}
