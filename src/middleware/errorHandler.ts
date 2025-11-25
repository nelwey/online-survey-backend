import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Error:', err);
  console.error('Error stack:', err.stack);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  // PostgreSQL errors
  if (err.code === '23505') {
    return res.status(409).json({
      error: 'Duplicate entry',
      message: 'This record already exists',
    });
  }

  if (err.code === '23503') {
    return res.status(400).json({
      error: 'Foreign key constraint',
      message: 'Referenced record does not exist',
    });
  }

  // Database connection errors
  if (err.code === 'ECONNREFUSED' || err.code === '42P01') {
    return res.status(500).json({
      error: 'Database connection error',
      message: 'Unable to connect to database. Please check if the database is running.',
    });
  }

  // Table doesn't exist
  if (err.code === '42P01') {
    return res.status(500).json({
      error: 'Database schema error',
      message: 'Database tables not found. Please run migrations.',
    });
  }

  res.status(statusCode).json({
    error: message,
    message: err.message || message,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      code: err.code 
    }),
  });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`,
  });
}
