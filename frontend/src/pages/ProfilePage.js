import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../utils/api';
import { User, Mail, Crown, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import './ProfilePage.css';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setLoading(true);
    try {
      const { data } = await authAPI.updateProfile(form);
      updateUser(data.user);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <div className="profile-page">
      <div className="page-header">
        <h1 className="page-title">Profile</h1>
      </div>

      <div className="profile-grid">
        {/* Avatar Card */}
        <div className="card profile-card">
          <div className="profile-avatar-wrap">
            <div className="profile-avatar">{initials}</div>
          </div>
          <h2 className="profile-name">{user?.name}</h2>
          <p className="profile-email"><Mail size={14} /> {user?.email}</p>
          <div className="profile-role-badge">
            {user?.role === 'admin' ? <><Crown size={14} /> Admin</> : <><User size={14} /> Member</>}
          </div>
          <p className="profile-since">
            Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'}
          </p>
        </div>

        {/* Edit Card */}
        <div className="card">
          <h2 className="section-title" style={{ marginBottom: '1.25rem' }}>Edit Profile</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Your name"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input value={user?.email} disabled style={{ opacity: 0.5, cursor: 'not-allowed' }} />
              <span className="form-error" style={{ color: 'var(--text-3)' }}>Email cannot be changed</span>
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <input value={user?.role} disabled style={{ opacity: 0.5, cursor: 'not-allowed', textTransform: 'capitalize' }} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ alignSelf: 'flex-start' }}>
              {loading ? <span className="spinner" /> : <><Save size={15} /> Save Changes</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
