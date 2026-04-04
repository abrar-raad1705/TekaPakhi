import env from '../config/env.js';

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal server error';

  if (!err.isOperational) {
    console.error(`[ERROR] ${req.method} ${req.originalUrl} (${statusCode}):`, err);
  } else if (statusCode >= 500) {
    console.warn(`[WARN] ${req.method} ${req.originalUrl} (${statusCode}): ${err.message}`);
  }

  const body = {
    success: false,
    message: message === 'Internal server error' ? err.message : message,
    stack: err.stack,
  };
  if (err.data) body.data = err.data;
  res.status(statusCode).json(body);
};

export default errorHandler;
