import { Request, Response, NextFunction } from 'express';
import { Registry, Counter, Histogram, Gauge } from 'prom-client';

// Create a Registry to register metrics
export const register = new Registry();

// Add default metrics (CPU, memory, etc.)
import { collectDefaultMetrics } from 'prom-client';
collectDefaultMetrics({ register });

// HTTP Request Metrics
const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  registers: [register],
});

const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const httpRequestInFlight = new Gauge({
  name: 'http_requests_in_flight',
  help: 'Number of HTTP requests currently being processed',
  registers: [register],
});

// Database Metrics
const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

const dbQueryTotal = new Counter({
  name: 'db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'table', 'status'],
  registers: [register],
});

const dbConnectionsActive = new Gauge({
  name: 'db_connections_active',
  help: 'Number of active database connections',
  registers: [register],
});

// Business Metrics
const surveyCreatedTotal = new Counter({
  name: 'surveys_created_total',
  help: 'Total number of surveys created',
  registers: [register],
});

const surveyResponseTotal = new Counter({
  name: 'survey_responses_total',
  help: 'Total number of survey responses submitted',
  labelNames: ['survey_id'],
  registers: [register],
});

const userRegisteredTotal = new Counter({
  name: 'users_registered_total',
  help: 'Total number of user registrations',
  registers: [register],
});

const userLoginTotal = new Counter({
  name: 'user_logins_total',
  help: 'Total number of user logins',
  registers: [register],
});

// Initialize counters to 0 so they appear in metrics output even before first increment
// This ensures they're always visible in /metrics endpoint
surveyCreatedTotal.inc(0);
userRegisteredTotal.inc(0);
userLoginTotal.inc(0);
// Note: surveyResponseTotal will appear when first response is submitted (it has labels)

// Export metrics for use in other parts of the application
export const metrics = {
  httpRequestDuration,
  httpRequestTotal,
  httpRequestInFlight,
  dbQueryDuration,
  dbQueryTotal,
  dbConnectionsActive,
  surveyCreatedTotal,
  surveyResponseTotal,
  userRegisteredTotal,
  userLoginTotal,
};

// Middleware to collect HTTP metrics
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  httpRequestInFlight.inc();

  // Get route pattern (remove IDs for better aggregation)
  const route = getRoutePattern(req.path);

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const statusCode = res.statusCode.toString();

    httpRequestDuration.observe(
      { method: req.method, route, status_code: statusCode },
      duration
    );

    httpRequestTotal.inc({
      method: req.method,
      route,
      status_code: statusCode,
    });

    httpRequestInFlight.dec();
  });

  next();
}

// Helper function to normalize route paths (replace UUIDs and IDs with placeholders)
function getRoutePattern(path: string): string {
  // Replace UUIDs with :id
  return path
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
    .replace(/\/\d+/g, '/:id');
}

