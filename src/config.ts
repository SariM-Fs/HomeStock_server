import dotenv from 'dotenv';

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT) || 3001,
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  databaseUrl:
    process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5432/home_inventory',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
};
