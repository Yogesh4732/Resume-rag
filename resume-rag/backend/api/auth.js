const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('firstName')
    .optional()
    .isLength({ min: 1 })
    .withMessage('First name is required'),
  body('lastName')
    .optional()
    .isLength({ min: 1 })
    .withMessage('Last name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array()[0];
      return res.status(400).json({
        error: {
          code: 'FIELD_REQUIRED',
          field: firstError.param,
          message: firstError.msg
        }
      });
    }

    const { email, password, firstName, lastName, isRecruiter = false, company } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        error: {
          code: 'DUPLICATE_FIELD',
          field: 'email',
          message: 'Email already registered'
        }
      });
    }

    // Create new user
    const user = new User({
      email,
      password,
      firstName,
      lastName,
      isRecruiter,
      company
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: user.toJSON(),
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Registration failed'
      }
    });
  }
});

// Login
router.post('/login', [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .exists()
    .withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array()[0];
      return res.status(400).json({
        error: {
          code: 'FIELD_REQUIRED',
          field: firstError.param,
          message: firstError.msg
        }
      });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        error: {
          code: 'ACCOUNT_INACTIVE',
          message: 'Account is inactive'
        }
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      message: 'Login successful',
      user: user.toJSON(),
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Login failed'
      }
    });
  }
});

// Get current user profile
router.get('/profile', auth, async (req, res) => {
  res.json({
    user: req.user.toJSON()
  });
});

// Update user profile
router.put('/profile', auth, [
  body('firstName')
    .optional()
    .isLength({ min: 1 })
    .withMessage('First name is required'),
  body('lastName')
    .optional()
    .isLength({ min: 1 })
    .withMessage('Last name is required'),
  body('company')
    .optional()
    .isLength({ min: 1 })
    .withMessage('Company name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array()[0];
      return res.status(400).json({
        error: {
          code: 'FIELD_REQUIRED',
          field: firstError.param,
          message: firstError.msg
        }
      });
    }

    const { firstName, lastName, company } = req.body;
    const user = req.user;

    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (company !== undefined) user.company = company;

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Profile update failed'
      }
    });
  }
});

module.exports = router;
