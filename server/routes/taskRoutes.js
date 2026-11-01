const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const commentController = require('../controllers/commentController');
const auth = require('../middleware/auth');

router.use(auth);

// Task operations
router.put('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

// Comment operations on task
router.post('/:id/comments', commentController.addComment);
router.get('/:id/comments', commentController.getComments);

module.exports = router;

