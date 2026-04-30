import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { tasksAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  FolderKanban, CheckSquare, Clock, AlertCircle,
  TrendingUp, ChevronRight, Calendar, Circle
} from 'lucide-react';
import { format, isAfter } from 'date-fns';
import './DashboardPage.css';

const StatCard = ({ icon: Icon, label, value, color, sub }) => (
  <div className="stat-card" style={{ '--stat-color': color }}>
    <div className="stat-icon"><Icon size={20} /></div>
    <div className="stat-body">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  </div>
);

const statusConfig = {
  'todo': { label: 'To Do', cls: 'status-todo' },
  'in-progress': { label: 'In Progress', cls: 'status-in-progress' },
  'review': { label: 'Review', cls: 'status-review' },
  'done': { label: 'Done', cls: 'status-done' }
};

const priorityConfig = {
  'low': { cls: 'priority-low' },
  'medium': { cls: 'priority-medium' },
  'high': { cls: 'priority-high' },
  'critical': { cls: 'priority-critical' }
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tasksAPI.getDashboard()
      .then(({ data }) => setStats(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
      <div className="spinner" style={{ width: 36, height: 36 }} />
    </div>
  );

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const completionRate = stats?.tasks?.total > 0
    ? Math.round((stats.tasks.done / stats.tasks.total) * 100)
    : 0;

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-greeting">{greeting()}, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="dashboard-date">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <Link to="/projects" className="btn btn-primary">
          <FolderKanban size={16} /> View Projects
        </Link>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <StatCard
          icon={FolderKanban}
          label="Total Projects"
          value={stats?.projects?.total ?? 0}
          color="#7c6af7"
          sub={`${stats?.projects?.active ?? 0} active`}
        />
        <StatCard
          icon={CheckSquare}
          label="Total Tasks"
          value={stats?.tasks?.total ?? 0}
          color="#3b82f6"
          sub={`${stats?.tasks?.done ?? 0} completed`}
        />
        <StatCard
          icon={TrendingUp}
          label="Completion Rate"
          value={`${completionRate}%`}
          color="#22c55e"
          sub="across all projects"
        />
        <StatCard
          icon={AlertCircle}
          label="Overdue Tasks"
          value={stats?.tasks?.overdue ?? 0}
          color="#ef4444"
          sub="need attention"
        />
      </div>

      {/* Progress bars */}
      <div className="card dashboard-progress">
        <h2 className="section-title">Task Status Overview</h2>
        <div className="progress-bars">
          {[
            { key: 'todo', label: 'To Do', color: '#94a3b8' },
            { key: 'inProgress', label: 'In Progress', color: '#3b82f6' },
            { key: 'review', label: 'Review', color: '#f59e0b' },
            { key: 'done', label: 'Done', color: '#22c55e' }
          ].map(({ key, label, color }) => {
            const count = stats?.tasks?.[key] ?? 0;
            const pct = stats?.tasks?.total > 0 ? (count / stats.tasks.total) * 100 : 0;
            return (
              <div key={key} className="progress-item">
                <div className="progress-meta">
                  <span className="progress-label">{label}</span>
                  <span className="progress-count">{count}</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="dashboard-grid">
        {/* My Tasks */}
        <div className="card">
          <div className="section-header">
            <h2 className="section-title">My Tasks</h2>
            <Link to="/tasks" className="btn btn-ghost btn-sm">
              View all <ChevronRight size={14} />
            </Link>
          </div>
          {stats?.myTasks?.length === 0 ? (
            <div className="empty-state">
              <CheckSquare size={32} className="empty-state-icon" />
              <h3>No tasks assigned</h3>
              <p>Tasks assigned to you will appear here</p>
            </div>
          ) : (
            <div className="task-list">
              {stats?.myTasks?.slice(0, 8).map(task => {
                const overdue = task.dueDate && task.status !== 'done' && isAfter(new Date(), new Date(task.dueDate));
                return (
                  <div key={task._id} className={`task-row ${overdue ? 'task-overdue' : ''}`}>
                    <Circle size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                    <div className="task-row-body">
                      <p className="task-row-title">{task.title}</p>
                      <div className="task-row-meta">
                        <span className="badge" style={{ background: task.project?.color + '22', color: task.project?.color, fontSize: '0.68rem' }}>
                          {task.project?.name}
                        </span>
                        {task.dueDate && (
                          <span className={`task-due ${overdue ? 'overdue' : ''}`}>
                            <Calendar size={11} />
                            {format(new Date(task.dueDate), 'MMM d')}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`badge ${statusConfig[task.status]?.cls}`}>
                      {statusConfig[task.status]?.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Overdue Tasks */}
        <div className="card">
          <div className="section-header">
            <h2 className="section-title" style={{ color: stats?.tasks?.overdue > 0 ? 'var(--danger)' : undefined }}>
              <AlertCircle size={16} style={{ display: 'inline', marginRight: '0.4rem' }} />
              Overdue Tasks
            </h2>
          </div>
          {stats?.overdueTasks?.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: '2rem' }}>🎉</div>
              <h3>All caught up!</h3>
              <p>No overdue tasks right now</p>
            </div>
          ) : (
            <div className="task-list">
              {stats?.overdueTasks?.map(task => (
                <div key={task._id} className="task-row task-overdue">
                  <AlertCircle size={14} style={{ color: 'var(--danger)', flexShrink: 0 }} />
                  <div className="task-row-body">
                    <p className="task-row-title">{task.title}</p>
                    <div className="task-row-meta">
                      <span className="task-due overdue">
                        <Clock size={11} />
                        Due {format(new Date(task.dueDate), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                  <span className={`badge ${priorityConfig[task.priority]?.cls}`}>{task.priority}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
