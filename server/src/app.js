import express from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';
import path from 'path';
import { fileURLToPath } from 'url';
import env from './config/env.js';
import logger from './config/logger.js';
import routes from './routes/index.js';
import errorHandler from './middleware/errorHandler.js';
import requestMeta from './middleware/requestMeta.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors({
  origin: env.NODE_ENV === 'development'
    ? ['http://localhost:5173', 'http://localhost:3000']
    : process.env.CLIENT_URL,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(pinoHttp({
  logger,
  autoLogging: env.NODE_ENV === 'development',
  quietReqLogger: true,
  customSuccessMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
  customErrorMessage: (req, res, err) => `${req.method} ${req.url} ${res.statusCode} - ${err.message}`,
  serializers: env.NODE_ENV === 'development' ? {
    req: () => undefined,
    res: () => undefined,
  } : undefined,
}));

app.use(requestMeta);

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/v1', routes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

app.use(errorHandler);

export default app;
