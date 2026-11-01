const Comment = require('../models/Comment');
const Task = require('../models/Task');
const Project = require('../models/Project');
const Notification = require('../models/Notification');
const { getIO } = require('../socket');

// Helper to check access
const checkTaskProjectMember = async (taskId, userId) => {
  const task = await Task.findById(taskId);
  if (!task) return null;
  const project = await Project.findById(task.project);
  if (!project) return null;
  const isMember =
    project.owner.toString() === userId.toString() ||
    project.members.some((m) => m.toString() === userId.toString());
  return isMember ? { task, project } : false;
};

// POST /api/tasks/:id/comments
exports.addComment = async (req, res) => {
  try {
    const taskId = req.params.id;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Comment text is required.' });
    }

    const check = await checkTaskProjectMember(taskId, req.user._id);
    if (check === null) {
      return res.status(404).json({ message: 'Task or project not found.' });
    }
    if (check === false) {
      return res.status(403).json({ message: 'Access denied. You are not a member of this project.' });
    }

    const { task, project } = check;

    const comment = await Comment.create({
      text: text.trim(),
      task: taskId,
      author: req.user._id
    });

    const populatedComment = await Comment.findById(comment._id).populate(
      'author',
      'name email'
    );

    const io = getIO();
    if (io) {
      io.to(`project:${task.project}`).emit('comment-added', {
        taskId,
        comment: populatedComment
      });
    }

    // If task is assigned to someone else, create a notification
    if (
      task.assignedTo &&
      task.assignedTo.toString() !== req.user._id.toString()
    ) {
      const notification = await Notification.create({
        user: task.assignedTo,
        message: `${req.user.name} commented on your task: "${task.title}"`
      });
      if (io) {
        io.to(`user:${task.assignedTo}`).emit('notification', notification);
      }
    }

    return res.status(201).json(populatedComment);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to add comment.' });
  }
};

// GET /api/tasks/:id/comments
exports.getComments = async (req, res) => {
  try {
    const taskId = req.params.id;
    const check = await checkTaskProjectMember(taskId, req.user._id);

    if (check === null) {
      return res.status(404).json({ message: 'Task or project not found.' });
    }
    if (check === false) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const comments = await Comment.find({ task: taskId })
      .populate('author', 'name email')
      .sort({ createdAt: 1 });

    return res.json(comments);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch comments.' });
  }
};

