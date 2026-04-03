import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import AppError from '../utils/AppError.js';

/**
 * Verifies JWT issued by POST /api/v1/admin/login (role: ADMIN).
 */
const adminAuthenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Access denied. No admin token provided.', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_SECRET);

    if (decoded.role !== 'ADMIN') {
      throw new AppError('Invalid admin token.', 403);
    }

    req.admin = { role: 'ADMIN' };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Admin session expired. Please sign in again.', 401));
    }
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid admin token.', 401));
    }
    next(error);
  }
};

export default adminAuthenticate;
