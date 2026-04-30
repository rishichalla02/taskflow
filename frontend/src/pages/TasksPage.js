import React, { useEffect, useState, useCallback } from 'react';
import { tasksAPI } from '../utils/api';
import { CheckSquare, Search, Calendar, AlertCircle, Filter } from 'lucide-react';
import { format, isAfter } from 'date-fns';
import toast from 'react-hot-toast';
import './TasksPage.css';

const statusConfig = {
  'todo': { label: 'To Do', cls: 'status-todo' },
  'in-progress': { label: 'In Progress', cls: 'status-in-progress' },
  'review': { label: 'Review', cls: 'status-review' },
  'done': { label: 'Done', cls: 'status-done' }
};

const priorityConfig = {
  'low': 'priority-low', 'medium': 'priority-medium',
  'high': 'priority-high', 'critical': 'priority-critical'
};

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [showOverdue, setShowOverdue] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { assignee: 'me' };
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (showOverdue) params.overdue = 'true';
      if (search) params.search = search;
      const { data } = await tasksAPI.getAll(params);
      setTasks(data.tasks);
    } catch {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, showOverdue, search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const { data } = await tasksAPI.update(taskId, { status: newStatus });
      setTasks(ts => ts.map(t => t._id === taskId ? data.task : t));
    } catch { toast.error('Failed to update status'); }
  };

  return (
    <div className="tasks-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Tasks</h1>
          <p className="page-subtitle">Tasks assigned to you across all projects</p>
        </div>
      </div>

      {/* Filters */}
      <div className="tasks-filters">
        <div className="input-icon-wrap search-wrap">
          <Search size={15} className="input-icon" />
          <input
            placeholder="Search tasks..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '2.2rem' }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ width: 'auto', minWidth: 130 }}
        >
          <option value="">All Statuses</option>
          <option value="todo">To Do</option>
          <option value="in-progress">In Progress</option>
          <option value="review">Review</option>
          <option value="done">Done</option>
        </select>
        <select
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value)}
          style={{ width: 'auto', minWidth: 130 }}
        >
          <option value="">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <button
          className={`btn btn-sm ${showOverdue ? 'btn-danger' : 'btn-secondary'}`}
          onClick={() => setShowOverdue(o => !o)}
        >
          <AlertCircle size={14} /> {showOverdue ? 'Showing Overdue' : 'Overdue Only'}
        </button>
      </div>

      {/* Stats row */}
      <div className="tasks-stats-row">
        {Object.entries(statusConfig).map(([key, cfg]) => (
          <button
            key={key}
            className={`task-stat-pill ${statusFilter === key ? 'active' : ''}`}
            onClick={() => setStatusFilter(statusFilter === key ? '' : key)}
          >
            <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
            <span className="pill-count">{tasks.filter(t => t.status === key).length}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <div className="spinner" style={{ width: 36, height: 36 }} />
        </div>
      ) : tasks.length === 0 ? (
        <div className="empty-state" style={{ marginTop: '3rem' }}>
          <CheckSquare size={48} className="empty-state-icon" />
          <h3>No tasks found</h3>
          <p>Tasks assigned to you will appear here</p>
        </div>
      ) : (
        <div className="tasks-table-wrap card">
          <table className="tasks-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Project</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Due Date</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(task => {
                const overdue = task.dueDate && task.status !== 'done' && isAfter(new Date(), new Date(task.dueDate));
                return (
                  <tr key={task._id} className={overdue ? 'row-overdue' : ''}>
                    <td>
                      <div className="task-title-cell">
                        <p className="task-title">{task.title}</p>
                        {task.description && <p className="task-desc-small">{task.description}</p>}
                      </div>
                    </td>
                    <td>
                      {task.project && (
                        <span className="badge" style={{ background: task.project.color + '22', color: task.project.color }}>
                          {task.project.name}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${priorityConfig[task.priority]}`}>{task.priority}</span>
                    </td>
                    <td>
                      <select
                        className={`status-select-inline badge ${statusConfig[task.status]?.cls}`}
                        value={task.status}
                        onChange={e => handleStatusChange(task._id, e.target.value)}
                      >
                        {Object.entries(statusConfig).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {task.dueDate ? (
                        <span className={`task-due-cell ${overdue ? 'overdue' : ''}`}>
                          <Calendar size={13} />
                          {format(new Date(task.dueDate), 'MMM d, yyyy')}
                          {overdue && <AlertCircle size={12} />}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-3)', fontSize: '0.78rem' }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
