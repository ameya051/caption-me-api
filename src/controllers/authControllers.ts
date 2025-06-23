import passport from 'passport';
import { Request, Response } from 'express';
import { db } from '../db';
import { users, tokens } from '../db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import logger from '../logger';

interface customRequest extends Request {
    user?: {
        id: number;
        email: string;
        role?: string;
    };
}

// Helper function to generate tokens
export const generateTokens = async (userId: number, email: string, role: string) => {
    const accessToken = jwt.sign(
        { id: userId, email, role },
        process.env.JWT_SECRET!,
        { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
        { id: userId, email, role },
        process.env.REFRESH_TOKEN_SECRET!,
        { expiresIn: '7d' }
    );

    // Store refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await db.insert(tokens).values({
        userId,
        token: refreshToken,
        type: 'refresh',
        expiresAt
    });

    return { accessToken, refreshToken };
};

export const register = async (req: customRequest, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
            return;
        }

        // Check if user already exists
        const existingUser = await db.select()
            .from(users)
            .where(eq(users.email, email));

        if (existingUser.length > 0) {
            res.status(409).json({
                success: false,
                message: 'User already exists'
            });
            return;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const [newUser] = await db.insert(users)
            .values({
                email,
                password: hashedPassword,
                role: 'user'
            })
            .returning({
                id: users.id,
                email: users.email,
                role: users.role
            });

        // Generate tokens
        const { accessToken, refreshToken } = await generateTokens(
            newUser.id,
            newUser.email,
            newUser.role || 'user'
        );

        res.status(201).json({
            success: true,
            data: {
                user: {
                    id: newUser.id,
                    email: newUser.email,
                    role: newUser.role
                },
                tokens: {
                    accessToken,
                    refreshToken
                }
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating user'
        });
    }
};

export const login = async (req: customRequest, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
            return;
        }

        // Find user
        const existingUsers = await db.select()
            .from(users)
            .where(eq(users.email, email));

        const user = existingUsers[0];

        if (!user) {
            res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
            return;
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
            return;
        }

        // Generate tokens
        const { accessToken, refreshToken } = await generateTokens(
            user.id,
            user.email,
            user.role || 'user'
        );

        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role
                },
                tokens: {
                    accessToken,
                    refreshToken
                }
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Error during login'
        });
    }
};

export const logout = async (req: customRequest, res: Response) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            res.status(400).json({
                success: false,
                message: 'Refresh token is required'
            });
            return
        }

        // Delete refresh token from database
        await db.delete(tokens)
            .where(eq(tokens.token, refreshToken));

        res.json({
            success: true,
            message: 'Successfully logged out'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Error during logout'
        });
    }
};

// Optional: Refresh token endpoint
export const refresh = async (req: customRequest, res: Response) => {
    try {
        if (!req.user?.id) {
            res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
            return
        }

        const userId = Number(req.user.id);

        // Generate new tokens
        const { accessToken, refreshToken } = await generateTokens(
            userId,
            req.user.email,
            req.user.role || 'user'
        );

        res.json({
            success: true,
            data: {
                tokens: {
                    accessToken,
                    refreshToken
                }
            }
        });
    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({
            success: false,
            message: 'Error refreshing token'
        });
    }
};

export const googleAuth = passport.authenticate('google', {
    scope: ['profile', 'email']
});

export const googleCallback = async (req: customRequest, res: Response) => {
    passport.authenticate('google', { session: false }, async (err: any, user: any) => {
        if (err || !user) {
            return res.redirect(`${process.env.FRONTEND_URL}/signin?error=oauth-failed`);
        }

        try {
            const { accessToken, refreshToken } = await generateTokens(
                user.id,
                user.email,
                user.role || 'user'
            );

            res.cookie('accessToken', accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 15 * 60 * 1000 // 15 minutes
            });
            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            res.redirect(`${process.env.FRONTEND_URL}/success`);
        } catch (error) {
            res.redirect(`${process.env.FRONTEND_URL}/signin?error=token-generation-failed`);
        }
    })(req, res);
};

export const githubAuth = passport.authenticate('github', { scope: ['user:email'] });

export const githubCallback = async (req: customRequest, res: Response) => {
    passport.authenticate('github', async (err: any, user: any) => {
        if (err || !user) {
            logger.error('GitHub OAuth error:', err);
            return res.redirect(`${process.env.FRONTEND_URL}/signin?error=oauth-failed`);
        }

        try {
            // Generate tokens
            const { accessToken, refreshToken } = await generateTokens(
                user.id,
                user.email,
                user.role || 'user'
            );

            // You might want to send these tokens in a more secure way
            res.redirect(`${process.env.FRONTEND_URL}/success?access_token=${accessToken}&refresh_token=${refreshToken}`);
        } catch (error) {
            res.redirect(`${process.env.FRONTEND_URL}/signin?error=token-generation-failed`);
        }
    })(req, res);
};