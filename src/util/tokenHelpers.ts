import { db } from '../db';
import { tokens } from '../db/schema';
import jwt from 'jsonwebtoken';

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