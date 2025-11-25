import jwt from 'jsonwebtoken';

const { JWT_SECRET, JWT_EXPIRES_IN = '7d' } = process.env;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined. Please set it in your environment variables.');
}

export interface JwtPayload {
  userId: string;
}

export function signToken(userId: string) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

