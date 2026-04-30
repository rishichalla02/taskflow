import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectsAPI, tasksAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  Plus, X, Users, Trash2, UserPlus,
  Crown, User, Calendar, ChevronLeft
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import './ProjectDetailPage.css';

const COLUMNS = [
  { key: 'todo', label: 'To Do', cls: 'status-todo' },
  { key: 'in-progress', label: 'In Progress', cls: 'status-in-progress' },
  { key: 'review', label: 'Review', cls: 'status-review' },
  { key: 'done', label: 'Done', cls: 'status-done' }
];

const priorityColors = { low: '#4ade80', medium: '#60a5fa', high: '#fbbf24', critical: '#f87171' };

function TaskCard({ task, onUpdate, onDelete, members, isAdmin }) {
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState(task.status);

  const handleStatusChange = async (newStatus) => {
    setStatus(newStatus);
    try {
      await tasksAPI.update(task._id, { status: newStatus });
      onUpdate({ ...task, status: newStatus });
    } catch { setStatus(task.status); toast.error('Failed to update'); }
  };

  const handleAssign = async (assigneeId) => {
    try {
      const { data } = await tasksAPI.update(task._id, { assignee: assigneeId || null });
      onUpdate(data.task);
      setEditing(false);
    } catch { toast.error('Failed to assign'); }
  };

  const overdue = task.dueDate && task.status !== 'done' && new Date() > new Date(task.dueDate);
  const initials = task.assignee?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || null;

  return (
    <div className={`task-card ${overdue ? 'task-card-overdue' : ''}`}>
      <div className="task-card-priority" style={{ background: priorityColors[task.priority] }} />

      <div className="task-card-header">
        <p className="task-card-title">{task.title}</p>
        {(isAdmin || task.reporter?._id) && (
          <button className="btn btn-ghost btn-sm" onClick={() => onDelete(task._id)} style={{ color: 'var(--text-3)', padding: '2px' }}>
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {task.description && <p className="task-card-desc">{task.description}</p>}

      <div className="task-card-footer">
        <select
          className="task-status-select"
          value={status}
          onChange={e => handleStatusChange(e.target.value)}
          onClick={e => e.stopPropagation()}
        >
          {COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {task.dueDate && (
            <span className={`task-card-due ${overdue ? 'overdue' : ''}`}>
              <Calendar size={11} /> {format(new Date(task.dueDate), 'MMM d')}
            </span>
          )}
          <div
            className="avatar avatar-sm"
            title={task.assignee?.name || 'Unassigned'}
            onClick={() => setEditing(!editing)}
            style={{ cursor: 'pointer', background: task.assignee ? 'var(--accent)' : 'var(--bg-4)', border: '1px solid var(--border)' }}
          >
            {initials || <User size={12} />}
          </div>
        </div>
      </div>

      {editing && (
        <div className="assignee-dropdown">
          <div className="assignee-option" onClick={() => handleAssign(null)}>
            Unassigned
          </div>
          {members.map(m => (
            <div key={m.user._id} className="assignee-option" onClick={() => handleAssign(m.user._id)}>
              <div className="avatar avatar-sm">{m.user.name?.slice(0,2).toUpperCase()}</div>
              {m.user.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateTaskModal({ project, members, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '', description: '', priority: 'medium',
    assignee: '', dueDate: '', status: 'todo'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Task title required'); return; }
    setLoading(true);
    try {
      const payload = { ...form, project: project._id };
      if (!payload.assignee) delete payload.assignee;
      if (!payload.dueDate) delete payload.dueDate;
      const { data } = await tasksAPI.create(payload);
      onCreated(data.task);
      toast.success('Task created!');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">New Task</h2>
          <button className="btn btn-ghost" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="What needs to be done?" autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional details..." style={{ resize: 'vertical' }} />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Assign To</label>
              <select value={form.assignee} onChange={e => setForm(f => ({ ...f, assignee: e.target.value }))}>
                <option value="">Unassigned</option>
                {members.map(m => <option key={m.user._id} value={m.user._id}>{m.user.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : <><Plus size={15} /> Create Task</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MembersModal({ project, onClose, onUpdate, isAdmin }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [loading, setLoading] = useState(false);

  const handleAdd = async e => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const { data } = await projectsAPI.addMember(project._id, { email, role });
      onUpdate(data.project);
      setEmail('');
      toast.success('Member added!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (userId) => {
    if (!window.confirm('Remove this member?')) return;
    try {
      await projectsAPI.removeMember(project._id, userId);
      onUpdate({ ...project, members: project.members.filter(m => m.user._id !== userId) });
      toast.success('Member removed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove member');
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title"><Users size={16} style={{ display: 'inline', marginRight: 6 }} />Team Members</h2>
          <button className="btn btn-ghost" onClick={onClose}><X size={18} /></button>
        </div>

        {isAdmin && (
          <form onSubmit={handleAdd} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="member@email.com"
              style={{ flex: 1 }}
            />
            <select value={role} onChange={e => setRole(e.target.value)} style={{ width: 'auto', flex: '0 0 auto' }}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
              {loading ? <span className="spinner" /> : <UserPlus size={14} />}
            </button>
          </form>
        )}

        <div className="members-list">
          {project.members?.map(m => (
            <div key={m.user._id} className="member-row">
              <div className="avatar">{m.user.name?.slice(0,2).toUpperCase()}</div>
              <div className="member-info">
                <p className="member-name">{m.user.name}</p>
                <p className="member-email">{m.user.email}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {m.user._id === project.owner._id
                  ? <span className="badge" style={{ background: 'rgba(124,106,247,0.15)', color: 'var(--accent-2)' }}><Crown size={11} /> Owner</span>
                  : <span className={`badge ${m.role === 'admin' ? 'status-review' : 'status-todo'}`}>{m.role}</span>
                }
                {isAdmin && m.user._id !== project.owner._id && (
                  <button className="btn btn-ghost btn-sm" onClick={() => handleRemove(m.user._id)} style={{ color: 'var(--text-3)' }}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

  const load = useCallback(async () => {
    try {
      const [projRes, tasksRes] = await Promise.all([
        projectsAPI.getById(id),
        tasksAPI.getByProject(id)
      ]);
      setProject(projRes.data.project);
      setTasks(tasksRes.data.tasks);
    } catch {
      toast.error('Failed to load project');
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  const isAdmin = project?.owner?._id === user._id ||
    project?.members?.find(m => m.user?._id === user._id)?.role === 'admin';

  const handleUpdateTask = (updatedTask) => {
    setTasks(ts => ts.map(t => t._id === updatedTask._id ? updatedTask : t));
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await tasksAPI.delete(taskId);
      setTasks(ts => ts.filter(t => t._id !== taskId));
      toast.success('Task deleted');
    } catch { toast.error('Failed to delete task'); }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
      <div className="spinner" style={{ width: 36, height: 36 }} />
    </div>
  );

  if (!project) return null;

  const tasksByCol = COLUMNS.reduce((acc, col) => {
    acc[col.key] = tasks.filter(t => t.status === col.key);
    return acc;
  }, {});

  return (
    <div className="project-detail">
      {/* Header */}
      <div className="project-detail-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/projects')}>
            <ChevronLeft size={16} /> Projects
          </button>
          <div className="project-color-dot" style={{ background: project.color }} />
          <div>
            <h1 className="project-detail-title">{project.name}</h1>
            {project.description && <p className="project-detail-desc">{project.description}</p>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowMembers(true)}>
            <Users size={14} /> Team ({project.members?.length})
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreateTask(true)}>
            <Plus size={14} /> Add Task
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="kanban-board">
        {COLUMNS.map(col => (
          <div key={col.key} className="kanban-col">
            <div className="kanban-col-header">
              <span className={`badge ${col.cls}`}>{col.label}</span>
              <span className="kanban-count">{tasksByCol[col.key].length}</span>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowCreateTask(true)}
                style={{ marginLeft: 'auto', padding: '2px 4px' }}
              >
                <Plus size={14} />
              </button>
            </div>
            <div className="kanban-cards">
              {tasksByCol[col.key].map(task => (
                <TaskCard
                  key={task._id}
                  task={task}
                  onUpdate={handleUpdateTask}
                  onDelete={handleDeleteTask}
                  members={project.members || []}
                  isAdmin={isAdmin}
                />
              ))}
              {tasksByCol[col.key].length === 0 && (
                <div className="kanban-empty">
                  <span>No tasks</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showCreateTask && (
        <CreateTaskModal
          project={project}
          members={project.members || []}
          onClose={() => setShowCreateTask(false)}
          onCreated={task => setTasks(ts => [task, ...ts])}
        />
      )}

      {showMembers && (
        <MembersModal
          project={project}
          onClose={() => setShowMembers(false)}
          onUpdate={setProject}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
