import { Request, Response } from 'express';
import { eq, and, gt } from 'drizzle-orm';
import { db } from '../db';
import { users, refreshTokens, emailVerificationTokens, passwordResetTokens } from '../db/schema';
import { hashPassword, verifyPassword, generateRandomToken } from '../utils/password';
import { generateTokens, verifyToken } from '../utils/jwt';
import { validateEmail, validatePassword } from '../utils/validation';
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  RefreshTokenRequest,
  VerifyEmailRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  AuthenticatedRequest,
} from '../types/auth';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName }: RegisterRequest = req.body;

    // Validation
    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Email and password are required',
      } as AuthResponse);
      return;
    }

    if (!validateEmail(email)) {
      res.status(400).json({
        success: false,
        message: 'Invalid email format',
      } as AuthResponse);
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      res.status(400).json({
        success: false,
        message: passwordValidation.message,
      } as AuthResponse);
      return;
    }

    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existingUser) {
      res.status(409).json({
        success: false,
        message: 'User already exists with this email',
      } as AuthResponse);
      return;
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password);
    const [newUser] = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
      })
      .returning({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        isEmailVerified: users.isEmailVerified,
      });

    // Generate email verification token
    const verificationToken = generateRandomToken(32);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await db.insert(emailVerificationTokens).values({
      userId: newUser.id,
      token: verificationToken,
      expiresAt,
    });

    // Generate JWT tokens
    const tokens = generateTokens(newUser);

    // Store refresh token in database
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await db.insert(refreshTokens).values({
      userId: newUser.id,
      token: tokens.refreshToken,
      expiresAt: refreshExpiresAt,
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please verify your email.',
      data: {
        user: newUser,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    } as AuthResponse);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    } as AuthResponse);
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password }: LoginRequest = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Email and password are required',
      } as AuthResponse);
      return;
    }

    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      } as AuthResponse);
      return;
    }

    if (!user.isActive) {
      res.status(401).json({
        success: false,
        message: 'Account is deactivated',
      } as AuthResponse);
      return;
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      } as AuthResponse);
      return;
    }

    // Update last login
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    // Generate tokens
    const tokens = generateTokens(user);

    // Store refresh token
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.insert(refreshTokens).values({
      userId: user.id,
      token: tokens.refreshToken,
      expiresAt: refreshExpiresAt,
    });

    const userResponse = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isEmailVerified: user.isEmailVerified,
    };

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    } as AuthResponse);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    } as AuthResponse);
  }
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken: token }: RefreshTokenRequest = req.body;

    if (!token) {
      res.status(400).json({
        success: false,
        message: 'Refresh token is required',
      } as AuthResponse);
      return;
    }

    // Verify refresh token
    const decoded = verifyToken(token);
    if (decoded.type !== 'refresh') {
      res.status(401).json({
        success: false,
        message: 'Invalid token type',
      } as AuthResponse);
      return;
    }

    // Check if refresh token exists in database and is not revoked
    const [storedToken] = await db
      .select()
      .from(refreshTokens)
      .where(and(
        eq(refreshTokens.token, token),
        eq(refreshTokens.isRevoked, false),
        gt(refreshTokens.expiresAt, new Date())
      ))
      .limit(1);

    if (!storedToken) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token',
      } as AuthResponse);
      return;
    }

    // Get user
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        isEmailVerified: users.isEmailVerified,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1);

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        message: 'User not found or deactivated',
      } as AuthResponse);
      return;
    }

    // Generate new tokens
    const newTokens = generateTokens(user);

    // Revoke old refresh token and create new one
    await db
      .update(refreshTokens)
      .set({ isRevoked: true })
      .where(eq(refreshTokens.id, storedToken.id));

    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.insert(refreshTokens).values({
      userId: user.id,
      token: newTokens.refreshToken,
      expiresAt: refreshExpiresAt,
    });

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        user,
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
      },
    } as AuthResponse);
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token',
    } as AuthResponse);
  }
};

export const logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const accessToken = authHeader && authHeader.split(' ')[1];
    
    if (accessToken && req.user) {
      // Revoke all refresh tokens for this user
      await db
        .update(refreshTokens)
        .set({ isRevoked: true })
        .where(eq(refreshTokens.userId, req.user.id));
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    } as AuthResponse);
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    } as AuthResponse);
  }
};

export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token }: VerifyEmailRequest = req.body;

    if (!token) {
      res.status(400).json({
        success: false,
        message: 'Verification token is required',
      } as AuthResponse);
      return;
    }

    // Find verification token
    const [verificationToken] = await db
      .select()
      .from(emailVerificationTokens)
      .where(and(
        eq(emailVerificationTokens.token, token),
        gt(emailVerificationTokens.expiresAt, new Date())
      ))
      .limit(1);

    if (!verificationToken) {
      res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token',
      } as AuthResponse);
      return;
    }

    // Update user email verification status
    await db
      .update(users)
      .set({ isEmailVerified: true })
      .where(eq(users.id, verificationToken.userId));

    // Delete verification token
    await db
      .delete(emailVerificationTokens)
      .where(eq(emailVerificationTokens.id, verificationToken.id));

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
    } as AuthResponse);
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    } as AuthResponse);
  }
};
