const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const taskController = require('../controllers/taskController');
const auth = require('../middleware/auth');

router.use(auth);

router.post('/', projectController.createProject);
router.get('/', projectController.getProjects);
router.get('/:id', projectController.getProjectById);
router.post('/:id/members', projectController.addMember);

// Tasks under project
router.post('/:id/tasks', taskController.createTask);
router.get('/:id/tasks', taskController.getProjectTasks);

module.exports = router;

