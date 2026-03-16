import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import env from './config/env.js';
import routes from './routes/index.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();

app.use(cors({
  origin: env.NODE_ENV === 'development'
    ? ['http://localhost:5173', 'http://localhost:3000']
    : process.env.CLIENT_URL,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use('/api/v1', routes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

app.use(errorHandler);

export default app;
