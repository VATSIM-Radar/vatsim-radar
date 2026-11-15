import { handleH3Error, handleH3Exception } from '~/utils/server/h3.ts';
import type { VatsimEvent } from '~/types/data/vatsim.ts';
import { getVATSIMIdentHeaders } from '~/utils/server';
import { prisma } from '~/utils/server/prisma.ts';
import { findUserByCookie } from '~/utils/server/user.ts';
import type { VatsimEvent as VatsimPrismaEvent, EventType } from '#prisma';

export default defineEventHandler(async event => {
    const id = getRouterParam(event, 'id');
    if (!id || isNaN(Number(id))) {
        handleH3Error({
            event,
            statusCode: 400,
        });

        return;
    }

    const user = await findUserByCookie(event);

    if (!user) {
        return handleH3Error({
            event,
            statusCode: 401,
        });
    }

    const vatsimUser = await prisma.vatsimUser.findFirstOrThrow({
        where: {
            userId: user.id,
        },
        select: {
            id: true,
        },
    });

    if (vatsimUser.id !== '1747805' && vatsimUser.id !== '10000001') {
        return handleH3Error({
            event,
            statusCode: 418,
        });
    }

    try {
        const event = (await $fetch<{ data: VatsimEvent }>(`https://my.vatsim.net/api/v2/events/view/${ id }`, {
            headers: getVATSIMIdentHeaders(),
        })).data;

        if (event && Date.now() > new Date(event.end_time).getTime()) {
            if (!await prisma.vatsimEvent.findFirst({ where: { id: event.id } })) {
                const prismaEvent = {
                    id: event.id,
                    type: event.type as EventType,
                    name: event.name,
                    link: event.link,
                    organisers: event.organisers,
                    airports: event.airports,
                    startTime: new Date(event.start_time),
                    endTime: new Date(event.end_time),
                    shortDescription: event.short_description,
                    description: event.description,
                    banner: event.banner,
                } satisfies VatsimPrismaEvent;

                await prisma.vatsimEvent.create({
                    data: prismaEvent,
                });

                console.log(`Manually migrated event ${ event.name }`);
            }
        }
    }
    catch (e) {
        handleH3Exception(event, e);
    }
});
