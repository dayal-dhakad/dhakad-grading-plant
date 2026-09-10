import 'dotenv/config';
import { IndianMobileSchema } from '@dhakad/shared';
import { PrismaClient, Role } from '@prisma/client';
import argon2 from 'argon2';
import { z } from 'zod';

const input = z
  .strictObject({
    mobile: IndianMobileSchema,
    name: z.string().trim().min(1).max(120),
    password: z.string().min(8).max(128),
  })
  .parse({
    mobile: process.env.BOOTSTRAP_ADMIN_MOBILE,
    name: process.env.BOOTSTRAP_ADMIN_NAME,
    password: process.env.BOOTSTRAP_ADMIN_PASSWORD,
  });
const prisma = new PrismaClient();
try {
  const existing = await prisma.user.findUnique({ where: { mobile: input.mobile } });
  if (existing) throw new Error('A user with that mobile number already exists');
  const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
  const user = await prisma.user.create({
    data: { mobile: input.mobile, name: input.name, passwordHash, role: Role.ADMIN },
  });
  console.log(`Admin user created: ${user.mobile}`);
} finally {
  await prisma.$disconnect();
}
