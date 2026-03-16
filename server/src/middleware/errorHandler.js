import env from '../config/env.js';

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal server error';

  if (env.NODE_ENV === 'development') {
    console.error(`[ERROR] ${statusCode} - ${err.message}`);
    if (!err.isOperational) {
      console.error(err.stack);
    }
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(env.NODE_ENV === 'development' && !err.isOperational && { stack: err.stack }),
  });
};

export default errorHandler;
