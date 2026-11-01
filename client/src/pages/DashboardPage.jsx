import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const DashboardPage = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await api.get('/projects');
      setProjects(res.data);
    } catch (err) {
      setError('Failed to load projects.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setCreating(true);
      setError('');
      const res = await api.post('/projects', {
        title: title.trim(),
        description: description.trim()
      });
      setProjects([res.data, ...projects]);
      setTitle('');
      setDescription('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create project.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="container dashboard-container">
      <div className="dashboard-header">
        <div>
          <h2>Your Projects</h2>
          <p className="text-muted">Select a project board or create a new one</p>
        </div>
      </div>

      {error && <div className="alert-error">{error}</div>}

      <div className="dashboard-grid">
        {/* Create Project Form Card */}
        <div className="card create-project-card">
          <h3>Create New Project</h3>
          <form onSubmit={handleCreateProject}>
            <div className="form-group">
              <label>Project Title *</label>
              <input
                type="text"
                placeholder="e.g. Website Redesign"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                placeholder="Brief project details..."
                rows="3"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={creating}
            >
              {creating ? 'Creating...' : '+ Create Project'}
            </button>
          </form>
        </div>

        {/* Project List */}
        <div className="projects-list-section">
          {loading ? (
            <p>Loading projects...</p>
          ) : projects.length === 0 ? (
            <div className="empty-state">
              <p>No projects yet. Create your first project to get started!</p>
            </div>
          ) : (
            <div className="projects-grid">
              {projects.map((proj) => {
                const isOwner =
                  proj.owner?._id === user?._id || proj.owner === user?._id;
                return (
                  <Link
                    key={proj._id}
                    to={`/projects/${proj._id}`}
                    className="project-card"
                  >
                    <div className="project-card-header">
                      <h4>{proj.title}</h4>
                      <span className={`badge ${isOwner ? 'badge-primary' : 'badge-member'}`}>
                        {isOwner ? 'Owner' : 'Member'}
                      </span>
                    </div>
                    <p className="project-desc">
                      {proj.description || <span className="text-muted">No description</span>}
                    </p>
                    <div className="project-meta">
                      <span>👥 {proj.members?.length || 1} members</span>
                      <span className="text-muted">
                        Updated {new Date(proj.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

