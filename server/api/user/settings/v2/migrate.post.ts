import { handleH3Error } from '~/utils/server/h3';
import { findAndRefreshUserByCookie } from '~/utils/server/user';
import type { UserSettings } from '~/utils/server/user';
import { prisma } from '~/utils/server/prisma';
import { UserPresetType } from '#prisma';
import { legacyColorToV2Color, migrateLegacyColor, migrateV1Settings } from '~/utils/settings/migration';
import type { IUserLegacyMapSettings } from '~/utils/server/handlers/map-settings';
import type { UserFilter } from '~/utils/server/handlers/filters';
import type { InputJsonObject } from '@prisma/client/runtime/client';

export let migrationUsers = 0;
export let migrationDone = 0;

export default defineEventHandler(async event => {
    const user = await findAndRefreshUserByCookie(event, false);

    if (user?.cid !== '1747805' && user?.cid !== '10000001') {
        return handleH3Error({
            event,
            statusCode: 403,
        });
    }

    if (migrationUsers !== 0) {
        return handleH3Error({
            event,
            statusCode: 400,
            data: 'Already started',
        });
    }

    const users = await prisma.user.findMany({
        include: {
            presets: {
                where: {
                    OR: [
                        { type: UserPresetType.MAP_SETTINGS },
                        { type: UserPresetType.FILTER },
                    ],
                },
            },
        },
    });

    const PER_BATCH = 5;

    migrationUsers = users.length;

    await send(event, JSON.stringify({
        status: 'ok',
        migrationUsers,
    }), 'application/json');

    await prisma.$transaction(async prisma => {
        const promises: PromiseLike<any>[] = [];

        for (const color in legacyColorToV2Color) {
            promises.push(prisma.userTrackingList.updateMany({
                where: { color },
                data: { color: legacyColorToV2Color[color as keyof typeof legacyColorToV2Color] },
            }));
        }

        await Promise.all(promises);
    });

    for (let i = 0; i < users.length + PER_BATCH; i += PER_BATCH) {
        await prisma.$transaction(async prisma => {
            const promises: PromiseLike<any>[] = [];

            for (const user of users.slice(i, i + PER_BATCH)) {
                const presets = user.presets.filter(x => x.type === UserPresetType.MAP_SETTINGS);
                const filters = user.presets.filter(x => x.type === UserPresetType.FILTER);

                if (filters.length) {
                    for (const filter of filters) {
                        const json = filter.json as UserFilter;
                        if (json.others && typeof json.others === 'object' && json.others?.ourColor?.color) {
                            json.others.ourColor.color = migrateLegacyColor(json.others.ourColor.color);
                            promises.push(prisma.userPreset.update({
                                where: { id: filter.id },
                                data: { json: json as InputJsonObject },
                            }));
                        }
                    }
                }

                let userSettings: UserSettings | null = user.settings as UserSettings;
                if (typeof user.settings === 'string') userSettings = JSON.parse(user.settings) as UserSettings;
                const keys = Object.keys(userSettings);
                if ((keys.length === 1 && keys[0] === 'seenVersion') || !keys.length) userSettings = null;

                if (!userSettings && !presets.length) continue;

                if (!presets.length) {
                    presets.push({
                        name: 'Default',
                        id: 0,
                        json: {},
                        type: UserPresetType.MAP_SETTINGS,
                        order: 0,
                        userId: user.id,
                    });
                }

                for (const preset of presets) {
                    promises.push(prisma.userPreset.create({
                        data: {
                            type: UserPresetType.MAP_SETTINGS_V2,
                            name: preset.name,
                            userId: user.id,
                            order: preset.order,
                            json: migrateV1Settings({
                                userSettings: userSettings ?? undefined,
                                mapSettings: preset.json as unknown as IUserLegacyMapSettings,
                            }),
                        },
                    }));
                }
            }

            await Promise.all(promises);
            migrationDone += PER_BATCH;
        });
    }
});
