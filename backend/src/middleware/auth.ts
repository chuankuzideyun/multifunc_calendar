import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../config/prisma';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please login.' });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string; email: string };
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }

    req.user = {
      id: user.id,
      email: user.email
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired session. Please login again.' });
  }
}
