import jwt, { SignOptions } from 'jsonwebtoken';

const { JWT_SECRET, JWT_EXPIRES_IN = '7d' } = process.env;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined. Please set it in your environment variables.');
}

// Type assertion: we know JWT_SECRET is defined after the check above
const secret: string = JWT_SECRET;
const expiresIn: string = JWT_EXPIRES_IN || '7d';

export interface JwtPayload {
  userId: string;
}

export function signToken(userId: string): string {
  return jwt.sign({ userId }, secret, { expiresIn: expiresIn as string | number } as SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, secret);
  if (typeof decoded === 'string' || !decoded || typeof decoded !== 'object') {
    throw new Error('Invalid token payload');
  }
  return decoded as JwtPayload;
}

