import { Request } from 'express';
// Extend Express Request type to include user
interface customRequest extends Request {
  user?: {
    id: number;
    email: string;
    role?: string;
  };
}

export { customRequest };
