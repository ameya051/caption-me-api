import { sign, verify, Secret, JwtPayload, SignOptions } from 'jsonwebtoken';
import { JWTPayload } from '../types/auth';

const JWT_SECRET: Secret = process.env.JWT_SECRET || '';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Type assertion to treat the string values as valid StringValue for jsonwebtoken
const accessTokenOptions = {
  expiresIn: JWT_EXPIRES_IN as any,
  algorithm: 'HS256' as const
} satisfies SignOptions;

const refreshTokenOptions = {
  expiresIn: JWT_REFRESH_EXPIRES_IN as any,
  algorithm: 'HS256' as const
} satisfies SignOptions;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in environment variables');
}

export const generateAccessToken = (payload: Omit<JWTPayload, 'type' | 'iat' | 'exp'>): string => {
  return sign(
    { ...payload, type: 'access' } as JwtPayload,
    JWT_SECRET,
    accessTokenOptions
  );
};

export const generateRefreshToken = (payload: Omit<JWTPayload, 'type' | 'iat' | 'exp'>): string => {
  return sign(
    { ...payload, type: 'refresh' } as JwtPayload,
    JWT_SECRET,
    refreshTokenOptions
  );
};

export const verifyToken = (token: string): JWTPayload => {
  try {
    const decoded = verify(token, JWT_SECRET) as JwtPayload & JWTPayload;
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

export const generateTokens = (user: { id: string; email: string }) => {
  const payload = { userId: user.id, email: user.email };
  
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
};
