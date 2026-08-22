import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    name?: string;
    picture?: string;
  };
}

export const requireAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  req.user = { uid: 'local-user', email: 'coach@example.com' };
  next();
};

export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  req.user = { uid: 'local-user', email: 'coach@example.com' };
  next();
};

