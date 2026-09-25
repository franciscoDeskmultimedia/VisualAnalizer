import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { User } from '@/types';
import { prisma, isDbConfigured } from './prisma';
import { readStore, writeStore } from './storage';

const SESSION_COOKIE_NAME = 'va_session';
const SECRET_KEY = process.env.AUTH_SECRET || 'visual-analizar-super-secure-secret-key-2026';

export interface StoredUser extends User {
  passwordHash: string;
}

/**
 * Sign payload into HMAC token
 */
export function signToken(payload: object): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(data)
    .digest('base64url');
  return `${data}.${signature}`;
}

/**
 * Verify and decode HMAC token
 */
export function verifyToken<T>(token: string): T | null {
  try {
    const [data, signature] = token.split('.');
    if (!data || !signature) return null;

    const expectedSignature = crypto
      .createHmac('sha256', SECRET_KEY)
      .update(data)
      .digest('base64url');

    if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      const decoded = Buffer.from(data, 'base64url').toString('utf8');
      return JSON.parse(decoded) as T;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Find user by email
 */
export async function findUserByEmail(email: string): Promise<StoredUser | null> {
  const cleanEmail = email.toLowerCase().trim();
  if (isDbConfigured) {
    try {
      const user = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });
      if (!user) return null;
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        passwordHash: user.passwordHash,
        createdAt: user.createdAt.toISOString(),
      };
    } catch (err) {
      console.error('Error finding user by email in PostgreSQL:', err);
      // Fallback to local store if DB error occurs
    }
  }

  const data = readStore();
  const users: StoredUser[] = (data as any).users || [];
  return users.find((u) => u.email.toLowerCase() === cleanEmail) || null;
}

/**
 * Find user by ID
 */
export async function findUserById(id: string): Promise<User | null> {
  if (isDbConfigured) {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
      });
      if (!user) return null;
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt.toISOString(),
      };
    } catch (err) {
      console.error('Error finding user by id in PostgreSQL:', err);
      // Fallback to local store if DB error occurs
    }
  }

  const data = readStore();
  const users: StoredUser[] = (data as any).users || [];
  const user = users.find((u) => u.id === id);
  if (!user) return null;
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

/**
 * Register a new user
 */
export async function registerUser(name: string, email: string, password: string): Promise<User> {
  const cleanEmail = email.toLowerCase().trim();
  const existing = await findUserByEmail(cleanEmail);
  if (existing) {
    throw new Error('A user with this email address already exists.');
  }

  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  if (isDbConfigured) {
    try {
      const newUser = await prisma.user.create({
        data: {
          name: name.trim() || 'Team Member',
          email: cleanEmail,
          passwordHash,
        },
      });

      return {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        createdAt: newUser.createdAt.toISOString(),
      };
    } catch (err) {
      console.error('Error registering user in PostgreSQL, falling back to local storage:', err);
    }
  }

  const newUser: StoredUser = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: name.trim() || 'Team Member',
    email: cleanEmail,
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  const data = readStore();
  if (!(data as any).users) {
    (data as any).users = [];
  }
  (data as any).users.push(newUser);
  writeStore(data);

  const { passwordHash: _, ...safeUser } = newUser;
  return safeUser;
}

/**
 * Login user with email and password
 */
export async function authenticateUser(email: string, password: string): Promise<User> {
  const cleanEmail = email.toLowerCase().trim();
  const user = await findUserByEmail(cleanEmail);
  if (!user) {
    throw new Error('Invalid email or password.');
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    throw new Error('Invalid email or password.');
  }

  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

/**
 * Get current authenticated user from request cookies
 */
export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = verifyToken<{ userId: string }>(token);
  if (!payload?.userId) return null;

  return await findUserById(payload.userId);
}

/**
 * Set session cookie
 */
export async function setSessionCookie(user: User): Promise<void> {
  const cookieStore = await cookies();
  const token = signToken({ userId: user.id, email: user.email });

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

/**
 * Clear session cookie
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
