import { PrismaClient } from '@prisma/client';

export default defineNitroPlugin(() => {
    const prisma = new PrismaClient();
});
