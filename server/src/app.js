import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import env from './config/env.js';
import routes from './routes/index.js';
import errorHandler from './middleware/errorHandler.js';
import { generalLimiter } from './middleware/rateLimiter.js';

const app = express();

// Security
app.use(helmet());
app.use(cors({
  origin: env.NODE_ENV === 'development'
    ? ['http://localhost:5173', 'http://localhost:3000']
    : process.env.CLIENT_URL,
  credentials: true,
}));

// Rate Limiting
app.use(generalLimiter);

// Body Parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// Request Logging
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// API Routes
app.use('/api/v1', routes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// ─── Global Error Handler ────────────────────────────────
app.use(errorHandler);

export default app;
