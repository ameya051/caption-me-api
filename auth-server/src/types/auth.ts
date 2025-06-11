export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user?: {
      id: string;
      email: string;
      firstName?: string;
      lastName?: string;
      isEmailVerified: boolean;
    };
    accessToken?: string;
    refreshToken?: string;
  };
  error?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    isEmailVerified: boolean;
  };
}
