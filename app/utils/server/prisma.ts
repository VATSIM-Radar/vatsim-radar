import { PrismaClient } from '../../../.nuxt/prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

export const prisma = new PrismaClient({ adapter: new PrismaMariaDb(process.env.DATABASE_URL!) });
