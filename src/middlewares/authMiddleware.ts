import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend Express Request type to include user
interface customRequest extends Request {
    user?: {
        id: number;
        email: string;
        role?: string;
    };
}

export const authenticateJWT = async (
    req: customRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const accessToken = req.cookies.accessToken;

        if (!accessToken) {
            res.status(401).json({
                success: false,
                message: 'No token provided'
            });
            return;
        }

        const decoded = jwt.verify(accessToken, process.env.JWT_SECRET!) as {
            id: number;
            email: string;
            role?: string;
        };

        req.user = decoded;
        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            res.status(401).json({
                success: false,
                message: 'Token expired'
            });
            return
        }

        if (error instanceof jwt.JsonWebTokenError) {
            res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
            return
        }
        res.status(500).json({
            success: false,
            message: 'Internal server error during authentication'
        });
        return
    }
};

export const verifyRefreshToken = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            res.status(401).json({
                success: false,
                message: 'Refresh token missing'
            });
            return
        }

        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!) as {
            id: string;
            email: string;
            role?: string;
        };

        req.user = decoded;
        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            res.status(401).json({
                success: false,
                message: 'Refresh token expired'
            });
            return
        }

        res.status(401).json({
            success: false,
            message: 'Invalid refresh token'
        });
    }
};