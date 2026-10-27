export default function TaskItem({
  task,
  onToggle,
  compact = true,
  onDelete,
  canDelete,
  onEdit,
  busy = false,
}) {
  const count = task.completionCount ?? (task.completed ? 1 : 0);
  const limit = task.dailyLimit || 1;
  const done = task.completed || count >= limit;
  const canRepeat = limit > 1;
  if (compact) {
    return (
      <div className={`task-row ${done ? 'is-done' : ''}`}>
        {canRepeat ? (
          <div className="task-occurrence-actions">
            <button
              type="button"
              className="task-check"
              onClick={() => onToggle?.(task, 'complete')}
              disabled={busy || count >= limit}
              aria-label={`Add completion (${count} of ${limit})`}
            >
              +
            </button>
            {count > 0 ? (
              <button
                type="button"
                className="task-undo"
                onClick={() => onToggle?.(task, 'undo')}
                disabled={busy}
                aria-label="Undo latest completion"
              >
                −
              </button>
            ) : null}
          </div>
        ) : (
          <button
            type="button"
            className={`task-check ${done ? 'checked' : ''}`}
            onClick={() => onToggle?.(task)}
            disabled={busy}
            aria-label={done ? 'Mark incomplete' : 'Mark complete'}
          >
            {done ? '✓' : ''}
          </button>
        )}
        <div className="task-details">
          <strong>{task.name}</strong>
          <small>
            {task.category?.name || 'General'} · {task.points} points
            {canRepeat ? ` · ${count}/${limit} today` : ''}
          </small>
        </div>
        <span className="task-points">+{task.pointsAwarded ?? task.points * count}</span>
      </div>
    );
  }

  return (
    <article className="task-card">
      {canRepeat ? (
        <div className="task-occurrence-actions">
          <button
            type="button"
            className="task-check"
            onClick={() => onToggle?.(task, 'complete')}
            disabled={busy || count >= limit}
            aria-label={`Add completion (${count} of ${limit})`}
          >
            +
          </button>
          {count > 0 ? (
            <button
              type="button"
              className="task-undo"
              onClick={() => onToggle?.(task, 'undo')}
              disabled={busy}
              aria-label="Undo latest completion"
            >
              −
            </button>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          className={`task-check ${done ? 'checked' : ''}`}
          onClick={() => onToggle?.(task)}
          disabled={busy}
          aria-label={done ? 'Mark incomplete' : 'Mark complete'}
        >
          {done ? '✓' : ''}
        </button>
      )}
      <div className="task-card-main">
        <h3>{task.name}</h3>
        <p>
          {task.category?.name || 'General'} · {task.points} points per completion
          {canRepeat ? ` · ${count}/${limit} today` : ''}
        </p>
        <div className="task-card-foot">
          <span className="task-tag">{task.category?.name || 'General'}</span>
          <span>{canRepeat ? `${count} of ${limit} completed today` : done ? 'Completed today' : 'Not completed yet'}</span>
        </div>
      </div>
      <div className="member-actions">
        {onEdit ? (
          <button type="button" className="text-button" onClick={() => onEdit(task)}>
            Edit
          </button>
        ) : null}
        {canDelete ? (
          <button type="button" className="delete-task" title="Archive task" onClick={() => onDelete?.(task)}>
            ×
          </button>
        ) : null}
      </div>
    </article>
  );
}
