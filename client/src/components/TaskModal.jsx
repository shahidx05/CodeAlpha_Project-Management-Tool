import React, { useState, useEffect } from 'react';
import api from '../api';
import { useSocket } from '../context/SocketContext';

const TaskModal = ({ task, projectMembers, onClose, onUpdateTask, onDeleteTask }) => {
  const { socket } = useSocket();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [status, setStatus] = useState(task.status);
  const [assignedTo, setAssignedTo] = useState(task.assignedTo?._id || '');
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [error, setError] = useState('');

  // Fetch comments
  useEffect(() => {
    const fetchComments = async () => {
      try {
        const res = await api.get(`/tasks/${task._id}/comments`);
        setComments(res.data);
      } catch (err) {
        console.error('Failed to load comments', err);
      }
    };
    fetchComments();
  }, [task._id]);

  // Real-time live comments
  useEffect(() => {
    if (!socket) return;

    const handleCommentAdded = ({ taskId, comment }) => {
      if (taskId === task._id) {
        setComments((prev) => {
          if (prev.some((c) => c._id === comment._id)) return prev;
          return [...prev, comment];
        });
      }
    };

    socket.on('comment-added', handleCommentAdded);
    return () => {
      socket.off('comment-added', handleCommentAdded);
    };
  }, [socket, task._id]);

  // Sync state if task prop changes externally (e.g. from socket), preserving unsubmitted edits
  useEffect(() => {
    setStatus(task.status);
    setAssignedTo(task.assignedTo?._id || '');
    if (!isEditing) {
      setTitle(task.title);
      setDescription(task.description || '');
    }
  }, [task, isEditing]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setCommentLoading(true);
      setError('');
      const res = await api.post(`/tasks/${task._id}/comments`, {
        text: newComment.trim()
      });
      // The socket event will also emit comment-added, but to ensure immediate UI feedback:
      setComments((prev) => {
        if (prev.some((c) => c._id === res.data._id)) return prev;
        return [...prev, res.data];
      });
      setNewComment('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to post comment.');
    } finally {
      setCommentLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setStatus(newStatus);
    try {
      await onUpdateTask(task._id, { status: newStatus });
    } catch (err) {
      setError('Failed to update status.');
    }
  };

  const handleAssigneeChange = async (newAssigneeId) => {
    setAssignedTo(newAssigneeId);
    try {
      await onUpdateTask(task._id, { assignedTo: newAssigneeId || null });
    } catch (err) {
      setError('Failed to update assignee.');
    }
  };

  const handleSaveDetails = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title cannot be empty.');
      return;
    }
    try {
      await onUpdateTask(task._id, { title: title.trim(), description: description.trim() });
      setIsEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update task details.');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      await onDeleteTask(task._id);
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Task Details</h3>
          <button type="button" className="close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        {error && <div className="alert-error">{error}</div>}

        <div className="modal-body">
          {isEditing ? (
            <form onSubmit={handleSaveDetails} className="edit-task-form">
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  rows="3"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="action-row">
                <button type="submit" className="btn btn-primary">
                  Save
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="task-info">
              <div className="task-title-row">
                <h2>{task.title}</h2>
                <button
                  type="button"
                  className="btn-text"
                  onClick={() => setIsEditing(true)}
                >
                  Edit
                </button>
              </div>
              <p className="task-desc">
                {task.description || <span className="text-muted">No description provided.</span>}
              </p>
            </div>
          )}

          <div className="task-metadata-grid">
            <div className="metadata-item">
              <label>Status</label>
              <select
                value={status}
                onChange={(e) => handleStatusChange(e.target.value)}
              >
                <option value="todo">To Do</option>
                <option value="inprogress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div className="metadata-item">
              <label>Assigned To</label>
              <select
                value={assignedTo}
                onChange={(e) => handleAssigneeChange(e.target.value)}
              >
                <option value="">Unassigned</option>
                {projectMembers.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name} ({m.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="metadata-item">
              <label>Created By</label>
              <span className="metadata-value">
                {task.createdBy?.name || 'Unknown'}
              </span>
            </div>
          </div>

          <hr className="divider" />

          {/* Comments Section */}
          <div className="comments-section">
            <h4>Comments ({comments.length})</h4>

            <div className="comments-list">
              {comments.length === 0 ? (
                <p className="text-muted">No comments yet. Start the conversation!</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment._id} className="comment-item">
                    <div className="comment-header">
                      <strong>{comment.author?.name || 'User'}</strong>
                      <span className="text-muted">
                        {new Date(comment.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="comment-text">{comment.text}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddComment} className="add-comment-form">
              <textarea
                placeholder="Write a comment..."
                rows="2"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                required
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={commentLoading}
              >
                {commentLoading ? 'Posting...' : 'Post Comment'}
              </button>
            </form>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-danger" onClick={handleDelete}>
            Delete Task
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskModal;

