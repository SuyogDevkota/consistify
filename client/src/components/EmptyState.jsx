export default function EmptyState({ title, children, className = 'empty-state' }) {
  if (title) {
    return (
      <div className={`empty-box ${className}`.trim()}>
        <strong>{title}</strong>
        {children}
      </div>
    );
  }
  return <div className={className}>{children}</div>;
}
