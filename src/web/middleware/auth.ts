import type { Request, Response, NextFunction } from 'express';

export function ensureAuthenticated(
  req: Request, 
  res: Response, 
  next: NextFunction
) {
  if (req.isAuthenticated()) return next();
  res.redirect('/auth/login');
} 