const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const winston = require('winston');

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Get all users (superadmin only)
router.get('/', authenticateToken, async (req, res) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'Access restricted to superadmins only' });
  }
  try {
    const users = await User.find().lean();
    logger.info(`Fetched all users, count: ${users.length}`);
    res.json(users);
  } catch (err) {
    logger.error('Error fetching users:', err.message);
    res.status(500).json({ message: 'Error fetching users', error: err.message });
  }
});

// Update user role (superadmin only)
router.put('/:id/role', authenticateToken, async (req, res) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'Access restricted to superadmins only' });
  }
  const { role } = req.body;
  if (!['user', 'admin', 'superadmin'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    user.role = role;
    await user.save();
    logger.info(`Updated role for user: ${user._id} to ${role}`);
    res.json(user);
  } catch (err) {
    logger.error('Error updating user role:', err.message);
    res.status(500).json({ message: 'Error updating user role', error: err.message });
  }
});

// Delete user (superadmin only)
router.delete('/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'Access restricted to superadmins only' });
  }
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    await user.deleteOne();
    logger.info(`Deleted user: ${req.params.id}`);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    logger.error('Error deleting user:', err.message);
    res.status(500).json({ message: 'Error deleting user', error: err.message });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    logger.info(`Fetched profile for user: ${user._id}`);
    res.json(user);
  } catch (err) {
    logger.error('Error fetching user profile:', err.message);
    res.status(500).json({ message: 'Error fetching user profile', error: err.message });
  }
});

// Update current user profile
router.put('/profile', authenticateToken, async (req, res) => {
  const { fullName, email, phone, address, profileImage, vehicleInfo } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (fullName) user.fullName = fullName;
    if (email) {
      // Check if email is already in use by another user
      const existingUser = await User.findOne({ email, _id: { $ne: user._id } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      user.email = email;
    }
    if (phone !== undefined) user.phone = phone;
    if (address !== undefined) user.address = address;
    if (profileImage) user.profileImage = profileImage;
    if (vehicleInfo && vehicleInfo.plateNumber !== undefined) {
      user.vehicleInfo.plateNumber = vehicleInfo.plateNumber;
    }
    await user.save();
    logger.info(`Updated profile for user: ${user._id}`);
    const updatedUser = await User.findById(req.user.id).select('-password').lean();
    res.json(updatedUser);
  } catch (err) {
    logger.error('Error updating user profile:', err.message);
    res.status(500).json({ message: 'Error updating user profile', error: err.message });
  }
});

// Delete current user profile
router.delete('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    await user.deleteOne();
    logger.info(`Deleted user profile: ${req.user.id}`);
    res.json({ message: 'User profile deleted successfully' });
  } catch (err) {
    logger.error('Error deleting user profile:', err.message);
    res.status(500).json({ message: 'Error deleting user profile', error: err.message });
  }
});

module.exports = router;