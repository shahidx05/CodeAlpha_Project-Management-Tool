const User = require('../models/User');

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ name: 1 });
    return res.json(users);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch users.' });
  }
};

