import { prisma } from '~/utils/backend/prisma';
import { defineCronJob } from '~/utils/backend';

export default defineNitroPlugin(app => {
    defineCronJob('*/15 * * * *', async () => {
        await prisma.userToken.deleteMany({
            where: {
                refreshMaxDate: {
                    lte: new Date(),
                },
            },
        });

        await prisma.auth.deleteMany({
            where: {
                createdAt: {
                    lte: new Date(Date.now() - (1000 * 60 * 60)),
                },
            },
        });

        await prisma.userRequest.deleteMany({
            where: {
                createdAt: {
                    lte: new Date(Date.now() - (1000 * 60 * 60)),
                },
            },
        });
    });
});
