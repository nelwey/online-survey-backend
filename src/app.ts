import express, { Express } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import surveysRouter from './routes/surveys.js';
import usersRouter from './routes/users.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { metricsMiddleware, register } from './middleware/metrics.js';

dotenv.config();

const app: Express = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Metrics middleware (should be before routes to capture all requests)
app.use(metricsMiddleware);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    res.status(500).end(error);
  }
});

// API routes
app.use('/api/surveys', surveysRouter);
app.use('/api/users', usersRouter);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
