import { createHash, randomBytes } from 'node:crypto';
import { Role } from '@prisma/client';
import argon2 from 'argon2';
import { env } from '../../config/env.js';
import { prisma } from '../../shared/database/prisma.js';
import { AppError } from '../../shared/errors/app-error.js';
import type { LoginInput } from './auth.schemas.js';

const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,p=4,t=3$1tvUIwcKJkm3gKtbJUUzNQ$Ds5HY11SHqLunl4Z9Fod90PSnjex0Alspxw3LiSK8Tw';
export const SESSION_COOKIE_NAME = 'dhakad_session';
export type AuthUser = { id: string; mobile: string; name: string; role: Role };
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const publicUser = (user: AuthUser): AuthUser => ({
  id: user.id,
  mobile: user.mobile,
  name: user.name,
  role: user.role,
});

export const login = async (input: LoginInput) => {
  const user = await prisma.user.findUnique({ where: { mobile: input.mobile } });
  const passwordValid = await argon2
    .verify(user?.passwordHash ?? DUMMY_PASSWORD_HASH, input.password)
    .catch(() => false);
  if (!user || !passwordValid || !user.isActive)
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Mobile number or password is incorrect');
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_HOURS * 60 * 60 * 1000);
  await prisma.session.create({
    data: { tokenHash: hashToken(token), userId: user.id, expiresAt },
  });
  return { token, expiresAt, user: publicUser(user) };
};

export const authenticate = async (token: string | undefined): Promise<AuthUser> => {
  if (!token) throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required');
  const now = new Date();
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session || session.revokedAt || session.expiresAt <= now || !session.user.isActive)
    throw new AppError(401, 'SESSION_INVALID', 'Session is invalid or expired');
  await prisma.session.update({ where: { id: session.id }, data: { lastSeenAt: now } });
  return publicUser(session.user);
};

export const logout = async (token: string | undefined) => {
  if (!token) return;
  await prisma.session.updateMany({
    where: { tokenHash: hashToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
};
