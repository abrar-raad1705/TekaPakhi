import AppError from '../utils/AppError.js';

// Role-based access control middleware
const roleGuard = (...allowedTypes) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }

    const hasAccess =
      allowedTypes.includes(req.user.typeId) ||
      allowedTypes.includes(req.user.typeName);

    if (!hasAccess) {
      return next(new AppError('You do not have permission to perform this action.', 403));
    }

    next();
  };
};

export default roleGuard;
