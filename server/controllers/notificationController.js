const Notification = require('../models/Notification');

// GET /api/notifications
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(30);

    return res.json(notifications);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch notifications.' });
  }
};

// PUT /api/notifications/read-all
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, read: false },
      { $set: { read: true } }
    );

    return res.json({ message: 'All notifications marked as read.' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to mark notifications as read.' });
  }
};

