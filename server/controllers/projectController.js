const Project = require('../models/Project');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { getIO } = require('../socket');

// POST /api/projects
exports.createProject = async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title) {
      return res.status(400).json({ message: 'Project title is required.' });
    }

    const project = await Project.create({
      title: title.trim(),
      description: description ? description.trim() : '',
      owner: req.user._id,
      members: [req.user._id]
    });

    const populated = await Project.findById(project._id)
      .populate('owner', 'name email')
      .populate('members', 'name email');

    return res.status(201).json(populated);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to create project.' });
  }
};

// GET /api/projects (only projects user owns or is a member of)
exports.getProjects = async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [{ owner: req.user._id }, { members: req.user._id }]
    })
      .populate('owner', 'name email')
      .populate('members', 'name email')
      .sort({ updatedAt: -1 });

    return res.json(projects);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch projects.' });
  }
};

// GET /api/projects/:id
exports.getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('members', 'name email');

    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    const isMember =
      project.owner._id.toString() === req.user._id.toString() ||
      project.members.some((m) => m._id.toString() === req.user._id.toString());

    if (!isMember) {
      return res.status(403).json({ message: 'Access denied. You are not a member of this project.' });
    }

    return res.json(project);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch project.' });
  }
};

// POST /api/projects/:id/members (add member by email)
exports.addMember = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Member email is required.' });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    const isMember =
      project.owner.toString() === req.user._id.toString() ||
      project.members.some((m) => m.toString() === req.user._id.toString());

    if (!isMember) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const userToAdd = await User.findOne({ email: email.toLowerCase().trim() });
    if (!userToAdd) {
      return res.status(404).json({ message: 'No registered user found with that email.' });
    }

    const alreadyMember = project.members.some(
      (m) => m.toString() === userToAdd._id.toString()
    );

    if (alreadyMember) {
      return res.status(400).json({ message: 'User is already a member of this project.' });
    }

    project.members.push(userToAdd._id);
    await project.save();

    const updated = await Project.findById(project._id)
      .populate('owner', 'name email')
      .populate('members', 'name email');

    const io = getIO();
    if (io) {
      io.to(`project:${project._id}`).emit('project-updated', updated);

      if (userToAdd._id.toString() !== req.user._id.toString()) {
        const notification = await Notification.create({
          user: userToAdd._id,
          message: `${req.user.name} added you to project: "${project.title}"`
        });
        io.to(`user:${userToAdd._id}`).emit('notification', notification);
      }
    }

    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to add member.' });
  }
};

