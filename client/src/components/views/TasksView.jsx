import { useMemo, useState } from 'react';
import TaskList from '../TaskList';
import CategorySection from '../CategorySection';
import { groupsApi, getErrorMessage } from '../../services/api';
import { useToast } from '../../hooks/useToast';

const FILTERS = [
  ['all', 'All tasks'],
  ['active', 'To do'],
  ['done', 'Completed today'],
];

export default function TasksView({
  tasks = [],
  categories = [],
  filter,
  setFilter,
  canManageTasks,
  onAddTask,
  onEditTask,
  onToggle,
  busyTaskId,
  onDelete,
  onCategoriesChanged,
  groupId,
}) {
  const { toast } = useToast();
  const [categoryId, setCategoryId] = useState(null);
  const [newCat, setNewCat] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryName, setCategoryName] = useState('');

  const filtered = useMemo(
    () =>
      tasks.filter((t) => {
        if (filter === 'active' && t.completed) return false;
        if (filter === 'done' && !t.completed) return false;
        if (categoryId && t.category?.id !== categoryId) return false;
        return true;
      }),
    [tasks, filter, categoryId]
  );

  const addCategory = async (e) => {
    e.preventDefault();
    if (!newCat.trim()) return;
    try {
      await groupsApi.createCategory(groupId, { name: newCat.trim() });
      setNewCat('');
      toast('Category added.');
      onCategoriesChanged?.();
    } catch (err) {
      toast(getErrorMessage(err));
    }
  };

  const renameCategory = async (e) => {
    e.preventDefault();
    if (!editingCategory || !categoryName.trim()) return;
    try {
      await groupsApi.updateCategory(groupId, editingCategory.id, { name: categoryName.trim() });
      setEditingCategory(null);
      setCategoryName('');
      toast('Category renamed.');
      onCategoriesChanged?.();
    } catch (err) {
      toast(getErrorMessage(err));
    }
  };

  const archiveCategory = async (category) => {
    if (!window.confirm(`Archive "${category.name}"? Existing tasks and completion history will be kept.`)) {
      return;
    }
    try {
      await groupsApi.archiveCategory(groupId, category.id);
      if (categoryId === category.id) setCategoryId(null);
      toast('Category archived.');
      onCategoriesChanged?.();
    } catch (err) {
      toast(getErrorMessage(err));
    }
  };

  const moveCategory = async (category, direction) => {
    const ordered = [...categories].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
    const index = ordered.findIndex((item) => item.id === category.id);
    const destination = index + direction;
    if (destination < 0 || destination >= ordered.length) return;
    [ordered[index], ordered[destination]] = [ordered[destination], ordered[index]];
    try {
      await Promise.all(
        ordered.map((item, order) => groupsApi.updateCategory(groupId, item.id, { order }))
      );
      onCategoriesChanged?.();
    } catch (err) {
      toast(getErrorMessage(err));
    }
  };

  return (
    <div className="view active">
      <div className="page-intro">
        <div>
          <h2>Tasks that move you forward.</h2>
          <p>Complete your work and build your record, one day at a time.</p>
        </div>
        {canManageTasks ? (
          <button type="button" className="btn btn-primary" onClick={onAddTask}>
            ＋ Add task
          </button>
        ) : null}
      </div>
      <div className="filter-row">
        {FILTERS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`filter-chip ${filter === id ? 'active' : ''}`}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <CategorySection
        categories={categories}
        activeId={categoryId}
        onSelect={setCategoryId}
        canManage={canManageTasks}
        onRename={(category) => {
          setEditingCategory(category);
          setCategoryName(category.name);
        }}
        onArchive={archiveCategory}
        onMove={moveCategory}
      />
      {editingCategory ? (
        <form onSubmit={renameCategory} className="invite-code-row" style={{ marginBottom: 16 }}>
          <input
            aria-label="Renamed category"
            maxLength={80}
            required
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
          />
          <button type="submit" className="btn btn-outline">Save category</button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setEditingCategory(null)}
          >
            Cancel
          </button>
        </form>
      ) : null}
      {canManageTasks ? (
        <form onSubmit={addCategory} className="invite-code-row" style={{ marginBottom: 16 }}>
          <input
            aria-label="New category name"
            maxLength={80}
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            placeholder="Add a category (e.g. School Studies)"
          />
          <button type="submit" className="btn btn-outline">
            Add category
          </button>
        </form>
      ) : null}
      <TaskList
        tasks={filtered}
        compact={false}
        onToggle={onToggle}
        busyTaskId={busyTaskId}
        canDelete={canManageTasks}
        onDelete={onDelete}
        onEdit={canManageTasks ? onEditTask : undefined}
        emptyTitle="Nothing here just yet."
        emptyMessage="Add a task or choose another filter."
      />
    </div>
  );
}
