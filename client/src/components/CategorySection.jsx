/**
 * Optional category filter chips for task lists.
 */
export default function CategorySection({
  categories = [],
  activeId,
  onSelect,
  showAll = true,
  canManage = false,
  onRename,
  onArchive,
  onMove,
}) {
  return (
    <div className="filter-row" role="tablist" aria-label="Categories">
      {showAll ? (
        <button
          type="button"
          className={`filter-chip ${!activeId ? 'active' : ''}`}
          onClick={() => onSelect?.(null)}
        >
          All
        </button>
      ) : null}
      {categories.map((c, index) => (
        <div className="category-filter" key={c.id}>
          <button
            type="button"
            className={`filter-chip ${activeId === c.id ? 'active' : ''}`}
            onClick={() => onSelect?.(c.id)}
            aria-pressed={activeId === c.id}
          >
            {c.name}
          </button>
          {canManage ? (
            <div className="category-actions">
              <button type="button" aria-label={`Rename ${c.name}`} onClick={() => onRename?.(c)}>
                Edit
              </button>
              <button
                type="button"
                aria-label={`Move ${c.name} up`}
                disabled={index === 0}
                onClick={() => onMove?.(c, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                aria-label={`Move ${c.name} down`}
                disabled={index === categories.length - 1}
                onClick={() => onMove?.(c, 1)}
              >
                ↓
              </button>
              <button type="button" aria-label={`Archive ${c.name}`} onClick={() => onArchive?.(c)}>
                ×
              </button>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
