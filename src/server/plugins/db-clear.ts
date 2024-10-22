import { CronJob } from 'cron';
import { prisma } from '~/utils/backend/prisma';

export default defineNitroPlugin(app => {
    CronJob.from({
        cronTime: '*/15 * * * *',
        start: true,
        runOnInit: true,
        onTick: async () => {
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
        },
    });
});
