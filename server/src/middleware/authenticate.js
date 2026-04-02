import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import AppError from '../utils/AppError.js';
import authService from '../services/authService.js';

/**
 * JWT Authentication Middleware
 * Extracts and verifies the Bearer token from Authorization header
 * Attaches decoded user info to req.user
 * Re-validates account status so suspend/block by admin invalidates the session on next request
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Access denied. No token provided.', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_SECRET);

    req.user = {
      profileId: decoded.profileId,
      phoneNumber: decoded.phoneNumber,
      typeId: decoded.typeId,
      typeName: decoded.typeName,
    };

    await authService.validateSessionAccountStatus(decoded.profileId);

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token expired. Please sign in again.', 401));
    }
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token.', 401));
    }
    next(error);
  }
};

export default authenticate;
