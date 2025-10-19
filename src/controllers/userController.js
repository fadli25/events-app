import User from '../models/userModel.js';
import { HTTP_STATUS } from '../config/constants.js';
import { generateToken } from '../middleware/authMiddleware.js';

// Register user
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        error: 'User already exists with this email'
      });
    }

    // Create user
    const user = await User.create({ name, email, password });

    res.status(HTTP_STATUS.CREATED).json({
      message: 'User registered successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token: generateToken(user._id)
    });
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: error.message
    });
  }
};

// Login user
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user with password
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: 'Invalid email or password'
      });
    }

    res.status(HTTP_STATUS.OK).json({
      message: 'Login successful',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token: generateToken(user._id)
    });
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: error.message
    });
  }
};

// Get user profile
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('createdEvents', 'title date location')
      .populate('registeredEvents', 'title date location');

    res.status(HTTP_STATUS.OK).json({ user });
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: error.message
    });
  }
};

// Update user profile
export const updateUserProfile = async (req, res) => {
  try {
    const { name, email } = req.body;

    const user = await User.findById(req.user._id);

    if (user) {
      user.name = name || user.name;
      user.email = email || user.email;

      const updatedUser = await user.save();

      res.status(HTTP_STATUS.OK).json({
        message: 'Profile updated successfully',
        user: {
          _id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role
        }
      });
    } else {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        error: 'User not found'
      });
    }
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: error.message
    });
  }
};

// Get all users (Admin only)
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.status(HTTP_STATUS.OK).json({
      count: users.length,
      users
    });
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: error.message
    });
  }
};