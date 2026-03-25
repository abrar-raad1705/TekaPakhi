import env from '../config/env.js';
import logger from '../config/logger.js';

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal server error';

  if (!err.isOperational) {
    logger.error({ err, statusCode, url: req.originalUrl, method: req.method }, 'Unhandled error');
  } else if (statusCode >= 500) {
    logger.warn({ statusCode, url: req.originalUrl, message: err.message }, 'Operational server error');
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(env.NODE_ENV === 'development' && !err.isOperational && { stack: err.stack }),
  });
};

export default errorHandler;
