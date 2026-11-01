const Task = require('../models/Task');
const Project = require('../models/Project');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const { getIO } = require('../socket');

// Helper to check project membership
const checkProjectMember = async (projectId, userId) => {
  const project = await Project.findById(projectId);
  if (!project) return null;
  const isMember =
    project.owner.toString() === userId.toString() ||
    project.members.some((m) => m.toString() === userId.toString());
  return isMember ? project : false;
};

// POST /api/projects/:id/tasks
exports.createTask = async (req, res) => {
  try {
    const projectId = req.params.id;
    const { title, description, status, assignedTo } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Task title is required.' });
    }

    const project = await checkProjectMember(projectId, req.user._id);
    if (project === null) {
      return res.status(404).json({ message: 'Project not found.' });
    }
    if (project === false) {
      return res.status(403).json({ message: 'Access denied. You are not a member of this project.' });
    }

    const task = await Task.create({
      title: title.trim(),
      description: description ? description.trim() : '',
      status: status || 'todo',
      project: projectId,
      assignedTo: assignedTo || null,
      createdBy: req.user._id
    });

    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');

    const io = getIO();
    if (io) {
      io.to(`project:${projectId}`).emit('task-created', populatedTask);
    }

    // If assigned to another user, create notification & emit
    if (assignedTo && assignedTo.toString() !== req.user._id.toString()) {
      const notification = await Notification.create({
        user: assignedTo,
        message: `${req.user.name} assigned you to task: "${task.title}" in "${project.title}"`
      });
      if (io) {
        io.to(`user:${assignedTo}`).emit('notification', notification);
      }
    }

    return res.status(201).json(populatedTask);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to create task.' });
  }
};

// GET /api/projects/:id/tasks
exports.getProjectTasks = async (req, res) => {
  try {
    const projectId = req.params.id;
    const project = await checkProjectMember(projectId, req.user._id);

    if (project === null) {
      return res.status(404).json({ message: 'Project not found.' });
    }
    if (project === false) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const tasks = await Task.find({ project: projectId })
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    return res.json(tasks);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch tasks.' });
  }
};

// PUT /api/tasks/:id
exports.updateTask = async (req, res) => {
  try {
    const taskId = req.params.id;
    const { title, description, status, assignedTo } = req.body;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    const project = await checkProjectMember(task.project, req.user._id);
    if (!project) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const previousAssignee = task.assignedTo ? task.assignedTo.toString() : null;

    if (title !== undefined) task.title = title.trim();
    if (description !== undefined) task.description = description.trim();
    if (status !== undefined) task.status = status;
    if (assignedTo !== undefined) task.assignedTo = assignedTo || null;

    await task.save();

    const updatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');

    const io = getIO();
    if (io) {
      io.to(`project:${task.project}`).emit('task-updated', updatedTask);
    }

    // If newly assigned or reassigned to another user
    const newAssignee = task.assignedTo ? task.assignedTo.toString() : null;
    if (
      newAssignee &&
      newAssignee !== previousAssignee &&
      newAssignee !== req.user._id.toString()
    ) {
      const notification = await Notification.create({
        user: newAssignee,
        message: `${req.user.name} assigned you to task: "${task.title}" in "${project.title}"`
      });
      if (io) {
        io.to(`user:${newAssignee}`).emit('notification', notification);
      }
    }

    return res.json(updatedTask);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to update task.' });
  }
};

// DELETE /api/tasks/:id
exports.deleteTask = async (req, res) => {
  try {
    const taskId = req.params.id;
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    const project = await checkProjectMember(task.project, req.user._id);
    if (!project) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const projectId = task.project;
    await Task.findByIdAndDelete(taskId);
    await Comment.deleteMany({ task: taskId });

    const io = getIO();
    if (io) {
      io.to(`project:${projectId}`).emit('task-deleted', { _id: taskId, projectId });
    }

    return res.json({ message: 'Task deleted successfully.', taskId });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete task.' });
  }
};

