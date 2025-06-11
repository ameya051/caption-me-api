import { Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users } from '../db/schema';
import { AuthResponse, AuthenticatedRequest } from '../types/auth';

export const getProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      } as AuthResponse);
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: {
        user: req.user,
      },
    } as AuthResponse);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    } as AuthResponse);
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      } as AuthResponse);
      return;
    }

    const { firstName, lastName } = req.body;

    // Update user profile
    const [updatedUser] = await db
      .update(users)
      .set({
        firstName: firstName || req.user.firstName,
        lastName: lastName || req.user.lastName,
        updatedAt: new Date(),
      })
      .where(eq(users.id, req.user.id))
      .returning({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        isEmailVerified: users.isEmailVerified,
      });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: updatedUser,
      },
    } as AuthResponse);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    } as AuthResponse);
  }
};

export const deactivateAccount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      } as AuthResponse);
      return;
    }

    // Deactivate user account
    await db
      .update(users)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, req.user.id));

    res.status(200).json({
      success: true,
      message: 'Account deactivated successfully',
    } as AuthResponse);
  } catch (error) {
    console.error('Deactivate account error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    } as AuthResponse);
  }
};
