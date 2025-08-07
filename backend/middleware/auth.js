const jwt = require('jsonwebtoken');
const winston = require('winston');
const User = require('../models/User');

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

const authenticateToken =async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    const user = await User.findById(decoded.id);

    req.user = user;
    if (!req.user.role) {
      logger.warn('User role missing in DB');
      return res.status(403).json({ message: 'User role missing' });
    }
    next();
  } catch (err) {
    logger.error('Invalid token access attempt', err);
    res.status(403).json({ message: 'Invalid token' });
  }
};

const authorizeRole = (roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    logger.warn(`Access denied for user ${req.user.id} with role ${req.user.role}`);
    return res.status(403).json({ message: 'Access denied' });
  }
  next();
};

module.exports = { authenticateToken, authorizeRole };
