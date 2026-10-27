import TaskItem from './TaskItem';
import EmptyState from './EmptyState';

export default function TaskList({
  tasks = [],
  onToggle,
  onDelete,
  onEdit,
  canDelete = false,
  compact = true,
  emptyTitle,
  emptyMessage = 'No tasks yet.',
  limit,
  busyTaskId,
}) {
  const list = typeof limit === 'number' ? tasks.slice(0, limit) : tasks;

  if (!list.length) {
    return emptyTitle ? (
      <EmptyState title={emptyTitle}>{emptyMessage}</EmptyState>
    ) : (
      <EmptyState>{emptyMessage}</EmptyState>
    );
  }

  if (compact) {
    return (
      <div className="task-list">
        {list.map((t) => (
          <TaskItem key={t.id} task={t} onToggle={onToggle} compact busy={busyTaskId === t.id} />
        ))}
      </div>
    );
  }

  return (
    <div className="task-grid">
      {list.map((t) => (
        <TaskItem
          key={t.id}
          task={t}
          compact={false}
          onToggle={onToggle}
          busy={busyTaskId === t.id}
          canDelete={canDelete}
          onDelete={onDelete}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}
