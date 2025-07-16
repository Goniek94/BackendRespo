/**
 * Profile Controller
 * Handles user profile operations: get profile, update profile
 */

import User from '../../models/user.js';

/**
 * Get user profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    
    // Return only safe data
    return res.status(200).json({
      id: user._id,
      name: user.name,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      dob: user.dob ? user.dob.toISOString().split('T')[0] : null,
      role: user.role,
      createdAt: user.createdAt
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return res.status(500).json({ message: 'Server error while fetching user data.' });
  }
};

/**
 * Update user profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, lastName } = req.body;
    
    // Validate fields
    if (name && name.length < 2) {
      return res.status(400).json({ 
        message: 'Name must contain at least 2 characters.',
        field: 'name'
      });
    }
    
    if (lastName && lastName.length < 2) {
      return res.status(400).json({ 
        message: 'Last name must contain at least 2 characters.',
        field: 'lastName'
      });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    
    // Update only allowed fields
    if (name) user.name = name;
    if (lastName) user.lastName = lastName;
    
    await user.save();
    
    return res.status(200).json({
      message: 'Profile updated successfully.',
      user: {
        id: user._id,
        name: user.name,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        dob: user.dob ? user.dob.toISOString().split('T')[0] : null,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return res.status(500).json({ message: 'Server error while updating user data.' });
  }
};
