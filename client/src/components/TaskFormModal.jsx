import { useEffect, useState } from 'react';
import Modal from './Modal';
import { groupsApi, getErrorMessage } from '../services/api';
import { useToast } from '../hooks/useToast';

const DAYS = [
  { v: 0, l: 'Sun' },
  { v: 1, l: 'Mon' },
  { v: 2, l: 'Tue' },
  { v: 3, l: 'Wed' },
  { v: 4, l: 'Thu' },
  { v: 5, l: 'Fri' },
  { v: 6, l: 'Sat' },
];

const EMPTY = {
  name: '',
  categoryId: '',
  points: 10,
  description: '',
  notes: '',
  icon: '✦',
  active: true,
  dailyLimit: 1,
  scheduleDays: [0, 1, 2, 3, 4, 5, 6],
  startDate: '',
  endDate: '',
};

export default function TaskFormModal({ open, onClose, groupId, categories = [], task, onSaved }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const editing = Boolean(task?.id);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      if (!editing) {
        setForm({ ...EMPTY, categoryId: categories[0]?.id || '' });
        return;
      }
      try {
        const res = await groupsApi.tasks(groupId);
        const full = res.data.data.tasks.find((t) => t.id === task.id) || task;
        if (cancelled) return;
        setForm({
          name: full.name || '',
          categoryId: full.category?.id || '',
          points: full.points ?? 10,
          description: full.description || '',
          notes: full.notes || '',
          icon: full.icon || '✦',
          active: full.active !== false,
          dailyLimit: full.dailyLimit || 1,
          scheduleDays: full.scheduleDays?.length ? full.scheduleDays : [0, 1, 2, 3, 4, 5, 6],
          startDate: full.startDate || '',
          endDate: full.endDate || '',
        });
      } catch {
        setForm({
          ...EMPTY,
          name: task.name || '',
          categoryId: task.category?.id || '',
          points: task.points ?? 10,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, editing, groupId, task, categories]);

  const toggleDay = (day) => {
    setForm((f) => {
      const has = f.scheduleDays.includes(day);
      const next = has ? f.scheduleDays.filter((d) => d !== day) : [...f.scheduleDays, day];
      return { ...f, scheduleDays: next.length ? next : f.scheduleDays };
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        name: form.name,
        points: Number(form.points),
        description: form.description,
        notes: form.notes,
        icon: form.icon,
        categoryId: form.categoryId || null,
        active: form.active,
        dailyLimit: Number(form.dailyLimit) || 1,
        scheduleDays: form.scheduleDays,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      };
      if (editing) {
        await groupsApi.updateTask(groupId, task.id, payload);
        toast('Task updated. Future completions use the new points; history stays as recorded.');
      } else {
        await groupsApi.createTask(groupId, payload);
        toast('Task added to the whole group.');
      }
      onSaved?.();
      onClose?.();
    } catch (err) {
      toast(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div className="modal-heading">
        <span className="eyebrow">MAKE IT HAPPEN</span>
        <h2>{editing ? 'Edit task' : 'Add a task'}</h2>
        <p>
          {editing
            ? 'Point changes apply to future completions only.'
            : 'Choose something the whole group can show up for.'}
        </p>
      </div>
      <form onSubmit={submit}>
        <label htmlFor="taskName">Task name</label>
        <input
          id="taskName"
          maxLength={120}
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Revise Physics chapter 3"
        />
        <label htmlFor="taskCategory">Category</label>
        <select
          id="taskCategory"
          value={form.categoryId}
          onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
        >
          <option value="">General</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <label htmlFor="taskPoints">Points for completion</label>
        <input
          id="taskPoints"
          type="number"
          min={1}
          max={1000}
          required
          value={form.points}
          onChange={(e) => setForm({ ...form, points: e.target.value })}
        />
        <label htmlFor="taskDailyLimit">Daily completion limit per member</label>
        <input
          id="taskDailyLimit"
          type="number"
          min={1}
          max={50}
          required
          value={form.dailyLimit}
          onChange={(e) => setForm({ ...form, dailyLimit: e.target.value })}
        />
        <label htmlFor="taskIcon">Icon (optional)</label>
        <input
          id="taskIcon"
          maxLength={8}
          value={form.icon}
          onChange={(e) => setForm({ ...form, icon: e.target.value })}
        />
        <label htmlFor="taskDescription">Description (optional)</label>
        <input
          id="taskDescription"
          maxLength={1000}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Notes or instructions"
        />
        <label htmlFor="taskNotes">Extra notes (optional)</label>
        <input
          id="taskNotes"
          maxLength={2000}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
        <label>Scheduled days</label>
        <div className="filter-row" style={{ marginBottom: 12 }}>
          {DAYS.map((d) => (
            <button
              key={d.v}
              type="button"
              className={`filter-chip ${form.scheduleDays.includes(d.v) ? 'active' : ''}`}
              onClick={() => toggleDay(d.v)}
            >
              {d.l}
            </button>
          ))}
        </div>
        <label htmlFor="taskStart">Start date (optional)</label>
        <input
          id="taskStart"
          type="date"
          value={form.startDate}
          onChange={(e) => setForm({ ...form, startDate: e.target.value })}
        />
        <label htmlFor="taskEnd">End date (optional)</label>
        <input
          id="taskEnd"
          type="date"
          value={form.endDate}
          onChange={(e) => setForm({ ...form, endDate: e.target.value })}
        />
        {editing ? (
          <label className="form-hint" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            Active on checklists
          </label>
        ) : null}
        <p className="form-hint">
          Each member can complete this task up to {Number(form.dailyLimit) || 1} time(s) per scheduled day.
          Historical scores are never rewritten.
        </p>
        <div className="form-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {editing ? 'Save changes' : 'Save task'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
