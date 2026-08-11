import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import { config } from './config/env.js';
import apiRoutes from './routes/index.js';
import { apiLimiter } from './middlewares/rateLimiter.middleware.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.middleware.js';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

if (config.env !== 'test') {
  app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));
}

app.use('/api', apiLimiter, apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
