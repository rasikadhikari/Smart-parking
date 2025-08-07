const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const winston = require('winston');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const parser = require('../utils/cloudinaryUpload'); 


// Winston logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', parser.single('profileImage'), async (req, res) => {
  try {
    const { fullName, email, password, role, phone, address } = req.body;
    console.log("Request body:", req.body);

    // Check if user exists
    const existingUser = await User.findOne({ email });
    console.log("Existing user:", existingUser);
    if (existingUser) {
      logger.warn(`Registration failed: Email ${email} already exists`);
      return res.status(400).json({ message: 'Email already exists' });
    }

    const profileImage = req.file ? req.file.path : '';
    console.log("Profile image:", profileImage);

    // Create new user
    const newUser = new User({
      fullName,
      email,
      password,
      role: role || 'user',
      phone,
      address,
      profileImage,
    });
    console.log("New user:", newUser);

    await newUser.save();

    logger.info(`User registered successfully: ${email}`);
    res.status(201).json({ message: 'User registered successfully' });

  } catch (err) {
    logger.error('Registration error:', err);
    console.log("Error:", err);
    res.status(500).json({ message: 'Registration failed', error: err.message });
  }
});

// @route   POST /api/auth/login
// @desc    Login user and return JWT
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      logger.warn(`Login failed: No user found with email ${email}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      logger.warn(`Login failed: Incorrect password for email ${email}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '3h' }
    );

    logger.info(`User logged in: ${email}`);
    res.json({
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
      },
    });
  } catch (err) {
    logger.error('Login error:', err);
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('fullName email role profileImage');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    logger.error('Fetch current user error:', err);
    res.status(500).json({ message: 'Failed to fetch user', error: err.message });
  }
});


router.get("/validate-token", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.sendStatus(401);

  const token = authHeader.split(" ")[1];

  try {
    jwt.verify(token, process.env.JWT_SECRET); 
    return res.sendStatus(200);
  } catch {
    return res.sendStatus(403);
  }
});


module.exports = router;
