import { Request, Response } from 'express';
import { eq, and, gt } from 'drizzle-orm';
import { db } from '../db';
import { users, passwordResetTokens } from '../db/schema';
import { hashPassword, verifyPassword, generateRandomToken } from '../utils/password';
import { validatePassword } from '../utils/validation';
import {
  AuthResponse,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  AuthenticatedRequest,
} from '../types/auth';

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email }: ForgotPasswordRequest = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        message: 'Email is required',
      } as AuthResponse);
      return;
    }

    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    // Always return success to prevent email enumeration
    if (!user) {
      res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      } as AuthResponse);
      return;
    }

    if (!user.isActive) {
      res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      } as AuthResponse);
      return;
    }

    // Generate reset token
    const resetToken = generateRandomToken(32);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Delete any existing reset tokens for this user
    await db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, user.id));

    // Create new reset token
    await db.insert(passwordResetTokens).values({
      userId: user.id,
      token: resetToken,
      expiresAt,
    });

    // In a real application, you would send an email here
    console.log(`Password reset token for ${email}: ${resetToken}`);

    res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    } as AuthResponse);
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    } as AuthResponse);
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword }: ResetPasswordRequest = req.body;

    if (!token || !newPassword) {
      res.status(400).json({
        success: false,
        message: 'Token and new password are required',
      } as AuthResponse);
      return;
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      res.status(400).json({
        success: false,
        message: passwordValidation.message,
      } as AuthResponse);
      return;
    }

    // Find reset token
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(and(
        eq(passwordResetTokens.token, token),
        eq(passwordResetTokens.isUsed, false),
        gt(passwordResetTokens.expiresAt, new Date())
      ))
      .limit(1);

    if (!resetToken) {
      res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token',
      } as AuthResponse);
      return;
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update user password
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, resetToken.userId));

    // Mark token as used
    await db
      .update(passwordResetTokens)
      .set({ isUsed: true })
      .where(eq(passwordResetTokens.id, resetToken.id));

    res.status(200).json({
      success: true,
      message: 'Password reset successfully',
    } as AuthResponse);
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    } as AuthResponse);
  }
};

export const changePassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword }: ChangePasswordRequest = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        message: 'Current password and new password are required',
      } as AuthResponse);
      return;
    }

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      } as AuthResponse);
      return;
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      res.status(400).json({
        success: false,
        message: passwordValidation.message,
      } as AuthResponse);
      return;
    }

    // Get user with password
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      } as AuthResponse);
      return;
    }

    // Verify current password
    const isCurrentPasswordValid = await verifyPassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
      } as AuthResponse);
      return;
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, user.id));

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    } as AuthResponse);
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    } as AuthResponse);
  }
};
