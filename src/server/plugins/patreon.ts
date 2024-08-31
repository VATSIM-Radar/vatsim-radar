import { CronJob } from 'cron';
import { $fetch } from 'ofetch';
import { radarStorage } from '~/utils/backend/storage';

interface PatreonAccount {
    data: {
        id: string;
    }[];
    included: Array<
        {
            type: unknown;
        } | {
            type: 'reward';
            id: string;
            attributes: {
                amount_cents: number | unknown;
            };
        }
    >;
}

interface PatreonPledgesReward {
    type: 'reward';
    id: string;
    attributes: {
        amount_cents: number | unknown;
    };
}

interface PatreonPledgesUser {
    type: 'user';
    id: string;
    attributes: {
        full_name: string;
    };
}

interface PatreonPledges {
    data: Array<{
        type: 'pledge';
        id: string;
        relationships: {
            reward?: {
                data: {
                    id: string;
                    type: 'reward';
                };
            };
            patron?: {
                data: {
                    id: string;
                    type: 'user';
                };
            };
        };
    }>;
    included: Array<
        PatreonPledgesReward | PatreonPledgesUser
    >;
    links?: {
        next?: string;
    };
}

export interface PatreonPledge {
    name: string;
    levelId: string;
}

export default defineNitroPlugin(app => {
    const config = useRuntimeConfig();

    const pFetch = $fetch.create({
        headers: {
            Authorization: `Bearer ${ config.PATREON_ACCESS_TOKEN }`,
        },
    });

    CronJob.from({
        cronTime: '15 * * * *',
        runOnInit: true,
        start: true,
        onTick: async () => {
            const myAccount = await pFetch<PatreonAccount>('https://www.patreon.com/api/oauth2/api/current_user/campaigns');
            const campaign = myAccount.data[0].id;
            if (!campaign) return;

            let counter = 0;
            let nextLink = '';

            const patrons: PatreonPledge[] = [];

            do {
                const data = await pFetch<PatreonPledges>(nextLink || `https://www.patreon.com/api/oauth2/api/campaigns/${ campaign }/pledges`);
                counter = data.data.length;

                if (!data.links?.next) break;
                nextLink = data.links.next;

                for (const user of data.data) {
                    if (user.type !== 'pledge') continue;
                    const level = data.included.find(x => x.type === 'reward' && user.relationships.reward?.data.id === x.id) as PatreonPledgesReward | undefined;
                    const patron = data.included.find(x => x.type === 'user' && user.relationships.patron?.data.id === x.id) as PatreonPledgesUser | undefined;
                    if (!level || typeof level.attributes.amount_cents !== 'number' || level.attributes.amount_cents < 500 || !patron) continue;
                    patrons.push({
                        levelId: level.id,
                        name: patron.attributes.full_name,
                    });
                }
            } while (counter >= 10);

            radarStorage.patrons = patrons;
        },
    });
});
