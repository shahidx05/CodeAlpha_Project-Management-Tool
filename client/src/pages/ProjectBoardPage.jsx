import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import { useSocket } from '../context/SocketContext';
import TaskModal from '../components/TaskModal';

const COLUMNS = [
  { id: 'todo', title: 'To Do', badgeClass: 'column-todo' },
  { id: 'inprogress', title: 'In Progress', badgeClass: 'column-inprogress' },
  { id: 'done', title: 'Done', badgeClass: 'column-done' }
];

const ProjectBoardPage = () => {
  const { id: projectId } = useParams();
  const { socket } = useSocket();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add Task form state
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskStatus, setTaskStatus] = useState('todo');
  const [taskSubmitting, setTaskSubmitting] = useState(false);

  // Add Member state
  const [memberEmail, setMemberEmail] = useState('');
  const [memberSubmitting, setMemberSubmitting] = useState(false);
  const [memberFeedback, setMemberFeedback] = useState({ text: '', isError: false });

  // Selected task for modal
  const [selectedTask, setSelectedTask] = useState(null);

  // Load project & tasks
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        const [projRes, tasksRes] = await Promise.all([
          api.get(`/projects/${projectId}`),
          api.get(`/projects/${projectId}/tasks`)
        ]);
        setProject(projRes.data);
        setTasks(tasksRes.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load project board.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId]);

  // Socket room joining and listeners
  useEffect(() => {
    if (!socket || !projectId) return;

    socket.emit('join-project', projectId);

    const handleTaskCreated = (newTask) => {
      setTasks((prev) => {
        if (prev.some((t) => t._id === newTask._id)) return prev;
        return [newTask, ...prev];
      });
    };

    const handleTaskUpdated = (updatedTask) => {
      setTasks((prev) =>
        prev.map((t) => (t._id === updatedTask._id ? updatedTask : t))
      );
      setSelectedTask((prev) =>
        prev && prev._id === updatedTask._id ? updatedTask : prev
      );
    };

    const handleTaskDeleted = ({ _id }) => {
      setTasks((prev) => prev.filter((t) => t._id !== _id));
      setSelectedTask((prev) => (prev && prev._id === _id ? null : prev));
    };

    const handleProjectUpdated = (updatedProject) => {
      setProject(updatedProject);
    };

    socket.on('task-created', handleTaskCreated);
    socket.on('task-updated', handleTaskUpdated);
    socket.on('task-deleted', handleTaskDeleted);
    socket.on('project-updated', handleProjectUpdated);

    return () => {
      socket.emit('leave-project', projectId);
      socket.off('task-created', handleTaskCreated);
      socket.off('task-updated', handleTaskUpdated);
      socket.off('task-deleted', handleTaskDeleted);
      socket.off('project-updated', handleProjectUpdated);
    };
  }, [socket, projectId]);

  // Create Task
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    try {
      setTaskSubmitting(true);
      setError('');
      const res = await api.post(`/projects/${projectId}/tasks`, {
        title: taskTitle.trim(),
        description: taskDescription.trim(),
        status: taskStatus,
        assignedTo: taskAssignee || null
      });

      // Socket will also broadcast, but add immediately if not present
      setTasks((prev) => {
        if (prev.some((t) => t._id === res.data._id)) return prev;
        return [res.data, ...prev];
      });

      setTaskTitle('');
      setTaskDescription('');
      setTaskAssignee('');
      setTaskStatus('todo');
      setShowTaskForm(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create task.');
    } finally {
      setTaskSubmitting(false);
    }
  };

  // Quick move status or update task
  const handleUpdateTask = async (taskId, updates) => {
    try {
      const res = await api.put(`/tasks/${taskId}`, updates);
      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? res.data : t))
      );
      if (selectedTask && selectedTask._id === taskId) {
        setSelectedTask(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update task.');
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId) => {
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
      if (selectedTask && selectedTask._id === taskId) {
        setSelectedTask(null);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete task.');
    }
  };

  // Add Member
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!memberEmail.trim()) return;

    try {
      setMemberSubmitting(true);
      setMemberFeedback({ text: '', isError: false });
      const res = await api.post(`/projects/${projectId}/members`, {
        email: memberEmail.trim()
      });
      setProject(res.data);
      setMemberEmail('');
      setMemberFeedback({ text: 'Member added successfully!', isError: false });
      setTimeout(() => setMemberFeedback({ text: '', isError: false }), 3000);
    } catch (err) {
      setMemberFeedback({
        text: err.response?.data?.message || 'Failed to add member.',
        isError: true
      });
    } finally {
      setMemberSubmitting(false);
    }
  };

  if (loading) {
    return <div className="container" style={{ padding: '2rem' }}>Loading project board...</div>;
  }

  if (error && !project) {
    return (
      <div className="container" style={{ padding: '2rem' }}>
        <div className="alert-error">{error}</div>
        <Link to="/" className="btn btn-secondary">
          &larr; Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="board-container">
      {/* Board Header */}
      <div className="board-header">
        <div className="board-title-group">
          <Link to="/" className="back-link">
            &larr; Back
          </Link>
          <h2>{project.title}</h2>
          {project.description && (
            <p className="project-board-desc">{project.description}</p>
          )}
        </div>

        <div className="board-header-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowTaskForm(!showTaskForm)}
          >
            {showTaskForm ? 'Cancel' : '+ Add Task'}
          </button>
        </div>
      </div>

      {error && <div className="alert-error">{error}</div>}

      {/* Add Member Bar */}
      <div className="board-subbar">
        <div className="members-chip-list">
          <span className="members-label">Members ({project.members.length}):</span>
          {project.members.map((m) => (
            <span key={m._id} className="member-chip" title={m.email}>
              {m.name}
            </span>
          ))}
        </div>

        <form onSubmit={handleAddMember} className="add-member-form">
          <input
            type="email"
            placeholder="Invite user by email..."
            value={memberEmail}
            onChange={(e) => setMemberEmail(e.target.value)}
            required
          />
          <button
            type="submit"
            className="btn btn-secondary"
            disabled={memberSubmitting}
          >
            {memberSubmitting ? 'Adding...' : 'Add Member'}
          </button>
          {memberFeedback.text && (
            <span
              className={
                memberFeedback.isError
                  ? 'member-feedback error'
                  : 'member-feedback success'
              }
            >
              {memberFeedback.text}
            </span>
          )}
        </form>
      </div>

      {/* Add Task Collapsible Form */}
      {showTaskForm && (
        <div className="card add-task-card">
          <h4>Create New Task</h4>
          <form onSubmit={handleCreateTask} className="task-form">
            <div className="form-row">
              <div className="form-group flex-2">
                <label>Task Title *</label>
                <input
                  type="text"
                  placeholder="What needs to be done?"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group flex-1">
                <label>Initial Status</label>
                <select
                  value={taskStatus}
                  onChange={(e) => setTaskStatus(e.target.value)}
                >
                  <option value="todo">To Do</option>
                  <option value="inprogress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>

              <div className="form-group flex-1">
                <label>Assignee</label>
                <select
                  value={taskAssignee}
                  onChange={(e) => setTaskAssignee(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {project.members.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                placeholder="Add more details about this task..."
                rows="2"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
              />
            </div>

            <div className="action-row">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={taskSubmitting}
              >
                {taskSubmitting ? 'Creating...' : 'Create Task'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowTaskForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3 Columns Kanban Board */}
      <div className="board-columns-grid">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);
          return (
            <div key={col.id} className="board-column">
              <div className="column-header">
                <h3>{col.title}</h3>
                <span className="column-count">{colTasks.length}</span>
              </div>

              <div className="column-tasks">
                {colTasks.length === 0 ? (
                  <div className="empty-column-msg">No tasks</div>
                ) : (
                  colTasks.map((t) => (
                    <div
                      key={t._id}
                      className="task-card"
                      onClick={() => setSelectedTask(t)}
                    >
                      <div className="task-card-top">
                        <h4 className="task-card-title">{t.title}</h4>
                      </div>

                      {t.description && (
                        <p className="task-card-desc">{t.description}</p>
                      )}

                      <div className="task-card-bottom" onClick={(e) => e.stopPropagation()}>
                        <div className="task-card-assignee">
                          👤 {t.assignedTo ? t.assignedTo.name : 'Unassigned'}
                        </div>

                        {/* Status Mover Dropdown */}
                        <select
                          className="status-selector"
                          value={t.status}
                          onChange={(e) =>
                            handleUpdateTask(t._id, { status: e.target.value })
                          }
                          title="Move status"
                        >
                          <option value="todo">To Do</option>
                          <option value="inprogress">In Progress</option>
                          <option value="done">Done</option>
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Modal */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          projectMembers={project.members}
          onClose={() => setSelectedTask(null)}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
        />
      )}
    </div>
  );
};

export default ProjectBoardPage;

