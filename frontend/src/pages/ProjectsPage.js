import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { projectsAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  Plus, FolderKanban, Search, Calendar,
  Users, ChevronRight, Trash2, X, Palette
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import './ProjectsPage.css';

const PROJECT_COLORS = [
  '#7c6af7','#3b82f6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#8b5cf6'
];

const statusConfig = {
  planning: { label: 'Planning', cls: 'status-todo' },
  active: { label: 'Active', cls: 'status-in-progress' },
  'on-hold': { label: 'On Hold', cls: 'status-review' },
  completed: { label: 'Completed', cls: 'status-done' }
};

const priorityConfig = {
  low: 'priority-low',
  medium: 'priority-medium',
  high: 'priority-high',
  critical: 'priority-critical'
};

function CreateProjectModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '', description: '', status: 'planning',
    priority: 'medium', dueDate: '', color: '#7c6af7'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Project name required'); return; }
    setLoading(true);
    try {
      const { data } = await projectsAPI.create(form);
      toast.success('Project created!');
      onCreated(data.project);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">New Project</h2>
          <button className="btn btn-ghost" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Project Name *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Website Redesign" autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What is this project about?" style={{ resize: 'vertical' }} />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="on-hold">On Hold</option>
                <option value="completed">Completed</option>
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
          <div className="form-group">
            <label className="form-label">Due Date</label>
            <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label"><Palette size={13} style={{ display: 'inline', marginRight: 4 }} />Color</label>
            <div className="color-picker">
              {PROJECT_COLORS.map(c => (
                <div
                  key={c}
                  className={`color-swatch ${form.color === c ? 'selected' : ''}`}
                  style={{ background: c }}
                  onClick={() => setForm(f => ({ ...f, color: c }))}
                />
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : <><Plus size={15} /> Create Project</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState('all');

  const load = useCallback(() => {
    setLoading(true);
    projectsAPI.getAll()
      .then(({ data }) => setProjects(data.projects))
      .catch(() => toast.error('Failed to load projects'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (e, id) => {
    e.preventDefault();
    if (!window.confirm('Delete this project and all its tasks?')) return;
    try {
      await projectsAPI.delete(id);
      setProjects(ps => ps.filter(p => p._id !== id));
      toast.success('Project deleted');
    } catch {
      toast.error('Failed to delete project');
    }
  };

  const filtered = projects.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || p.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="projects-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> New Project
        </button>
      </div>

      {/* Filters */}
      <div className="projects-filters">
        <div className="input-icon-wrap search-wrap">
          <Search size={15} className="input-icon" />
          <input
            placeholder="Search projects..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '2.2rem' }}
          />
        </div>
        <div className="filter-tabs">
          {['all', 'planning', 'active', 'on-hold', 'completed'].map(s => (
            <button
              key={s}
              className={`filter-tab ${filter === s ? 'active' : ''}`}
              onClick={() => setFilter(s)}
            >
              {s === 'all' ? 'All' : statusConfig[s]?.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <div className="spinner" style={{ width: 36, height: 36 }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state" style={{ marginTop: '3rem' }}>
          <FolderKanban size={48} className="empty-state-icon" />
          <h3>{search || filter !== 'all' ? 'No matching projects' : 'No projects yet'}</h3>
          <p>{!search && filter === 'all' ? 'Create your first project to get started' : 'Try adjusting your filters'}</p>
          {!search && filter === 'all' && (
            <button className="btn btn-primary" onClick={() => setShowCreate(true)} style={{ marginTop: '0.5rem' }}>
              <Plus size={15} /> Create Project
            </button>
          )}
        </div>
      ) : (
        <div className="projects-grid">
          {filtered.map(project => {
            const isOwnerOrAdmin = project.owner?._id === user._id ||
              project.members?.find(m => m.user?._id === user._id)?.role === 'admin';
            const pct = project.taskStats?.total > 0
              ? Math.round((project.taskStats.done / project.taskStats.total) * 100)
              : 0;

            return (
              <Link to={`/projects/${project._id}`} key={project._id} className="project-card">
                <div className="project-card-top">
                  <div className="project-color-bar" style={{ background: project.color || '#7c6af7' }} />
                  <div className="project-card-header">
                    <h3 className="project-name">{project.name}</h3>
                    <div className="project-badges">
                      <span className={`badge ${statusConfig[project.status]?.cls}`}>
                        {statusConfig[project.status]?.label}
                      </span>
                      <span className={`badge ${priorityConfig[project.priority]}`}>
                        {project.priority}
                      </span>
                    </div>
                  </div>
                  {project.description && (
                    <p className="project-desc">{project.description}</p>
                  )}
                </div>

                {/* Progress */}
                <div className="project-progress">
                  <div className="project-progress-meta">
                    <span>{project.taskStats?.done ?? 0}/{project.taskStats?.total ?? 0} tasks</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${pct}%`, background: project.color || '#7c6af7' }} />
                  </div>
                </div>

                <div className="project-card-footer">
                  <div className="project-meta">
                    <span className="meta-item">
                      <Users size={13} />
                      {project.members?.length ?? 0}
                    </span>
                    {project.dueDate && (
                      <span className="meta-item">
                        <Calendar size={13} />
                        {format(new Date(project.dueDate), 'MMM d, yyyy')}
                      </span>
                    )}
                    {project.taskStats?.overdue > 0 && (
                      <span className="meta-item overdue-badge">
                        {project.taskStats.overdue} overdue
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {isOwnerOrAdmin && (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={e => handleDelete(e, project._id)}
                        style={{ color: 'var(--text-3)' }}
                        title="Delete project"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    <ChevronRight size={16} style={{ color: 'var(--text-3)' }} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreated={p => setProjects(ps => [p, ...ps])}
        />
      )}
    </div>
  );
}
