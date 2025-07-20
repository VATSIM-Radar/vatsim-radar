import { $fetch } from 'ofetch';
import { defineCronJob, getVATSIMIdentHeaders } from '~/utils/backend/index';
import type {
    PatreonAccount,
    PatreonPledge,
    PatreonPledges,
    PatreonPledgesReward,
    PatreonPledgesUser,
} from '~/types/data/patreon';
import { isDataReady, radarStorage } from '~/utils/backend/storage';
import { initNavigraph } from '~/utils/backend/navigraph/db';
import { updateSimAware } from '~/utils/backend/vatsim/simaware';
import { updateVatglassesData } from '~/utils/backend/vatglasses';
import { getRedis, getRedisData, getRedisSync, setRedisData } from '~/utils/backend/redis';
import type { VatsimDivision, VatsimEvent, VatsimSubDivision } from '~/types/data/vatsim';
import {
    updateAirlines,
    updateAustraliaData,
    updateBookings,
    updateNattrak,
    updateTransceivers,
} from '~/utils/backend/vatsim/update';
import { updateVatSpy } from '~/utils/backend/vatsim/vatspy';
import S3 from 'aws-sdk/clients/s3';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'path';
import { prisma } from '~/utils/backend/prisma';
import { sleep } from '~/utils';
import { isDebug } from '~/utils/backend/debug';
import { watch } from 'chokidar';

const redisSubscriber = getRedis();

async function basicTasks() {
    await defineCronJob('15 */2 * * *', initNavigraph).catch(console.error);
    await defineCronJob('15 * * * *', updateSimAware).catch(console.error);
    await defineCronJob('15 */2 * * *', updateVatglassesData).catch(console.error);
    await defineCronJob('15 * * * *', updateVatSpy).catch(console.error);

    redisSubscriber.subscribe('vatglassesActive', 'vatglassesDynamic');
    redisSubscriber.on('message', (channel, message) => {
        if (channel === 'vatglassesActive') {
            radarStorage.vatglasses.activeData = message;
        }
        else if (channel === 'vatglassesDynamic') {
            radarStorage.vatglasses.dynamicData = JSON.parse(message);
        }
    });
}

async function vatsimTasks() {
    async function fetchDivisions() {
        const [divisions, subdivisions] = await Promise.all([
            $fetch<VatsimDivision[]>('https://api.vatsim.net/api/divisions/', {
                timeout: 1000 * 60,
                retry: 5,
                headers: getVATSIMIdentHeaders(),
            }),
            $fetch<VatsimSubDivision[]>('https://api.vatsim.net/api/subdivisions/', {
                timeout: 1000 * 60,
                retry: 5,
                headers: getVATSIMIdentHeaders(),
            }),
        ]);

        setRedisData('data-divisions', divisions, 1000 * 60 * 60 * 24);
        setRedisData('data-subdivisions', subdivisions, 1000 * 60 * 60 * 24);
    }

    await defineCronJob('30 * * * *', async () => {
        const myData = await $fetch<{
            data: VatsimEvent[];
        }>('https://my.vatsim.net/api/v2/events/latest', {
            headers: getVATSIMIdentHeaders(),
        });
        const inFourWeeks = new Date();
        inFourWeeks.setDate(inFourWeeks.getDate() + 28);
        setRedisData('data-events', myData.data.filter(e => new Date(e.start_time) < inFourWeeks), 1000 * 60 * 60);
    }).catch(console.error);

    await defineCronJob('15 0 * * *', fetchDivisions).catch(console.error);
    await defineCronJob('* * * * * *', updateTransceivers).catch(console.error);
    await defineCronJob('15 * * * *', updateAustraliaData).catch(console.error);
    await defineCronJob('15 0 * * *', updateAirlines).catch(console.error);
    await defineCronJob('*/10 * * * *', updateBookings).catch(console.error);
    await defineCronJob('*/10 * * * *', updateNattrak).catch(console.error);
}

let s3: S3 | undefined;

function backupTask() {
    if (isDebug() || !process.env.CF_R2_API) return;

    s3 ??= new S3({
        endpoint: process.env.CF_R2_API,
        accessKeyId: process.env.CF_R2_ACCESS_ID,
        secretAccessKey: process.env.CF_R2_ACCESS_TOKEN,
        signatureVersion: 'v4',
    });

    const {
        groups: {
            user,
            password,
            host,
            port,
            db,
        },
    } = new RegExp('mysql:\\/\\/(?<user>.*):(?<password>.*)@(?<host>.*):(?<port>.*)\\/(?<db>.*)\\?').exec(process.env.DATABASE_URL!)! as { groups: Record<string, string> };

    execSync(`mysqldump -u${ user } -p${ password } -h${ host } --compact --create-options --quick --tz-utc -P${ port } ${ db } > dump.sql`);

    const date = new Date();

    s3.upload({
        Bucket: 'backups',
        Expires: new Date(Date.now() + (1000 * 60 * 60 * 24 * 7)),
        Body: readFileSync(join(process.cwd(), 'dump.sql')),
        Key: `radar/${ date.getFullYear() }-${ date.getMonth() }-${ date.getDate() }-${ process.env.DOMAIN!.replace('https://', '').split(':')[0] }-${ date.getHours() }-${ date.getMinutes() }.sql`,
        ContentType: 'application/sql',
    }, (err, data) => {
        if (err) console.error(err);
        if (data) console.info('Backup completed', data.Location);
    });
}

function clearTask() {
    defineCronJob('*/15 * * * *', async () => {
        if (!process.env.DATABASE_URL) return;

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
    }).catch(console.error);
}

async function patreonTask() {
    const pFetch = $fetch.create({
        headers: {
            Authorization: `Bearer ${ process.env.PATREON_ACCESS_TOKEN }`,
        },
    });

    await defineCronJob('15 * * * *', async () => {
        const myAccount = await pFetch<PatreonAccount>('https://www.patreon.com/api/oauth2/api/current_user/campaigns');
        const campaign = myAccount.data[0].id;
        if (!campaign) return;

        let counter = 0;
        let nextLink = '';

        const patrons: PatreonPledge[] = [];

        do {
            const data = await pFetch<PatreonPledges>(nextLink || `https://www.patreon.com/api/oauth2/api/campaigns/${ campaign }/pledges`);
            counter = data.data.length;

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

            if (!data.links?.next) break;
            nextLink = data.links.next;
        } while (counter > 0);

        await setRedisData('data-patreon', {
            all: myAccount.data[0].attributes.patron_count,
            paid: myAccount.data[0].attributes.paid_member_count,
            budget: myAccount.data[0].attributes.pledge_sum / 100,
            highlighted: patrons,
        }, 1000 * 60 * 60 * 24 * 2);
    }).catch(() => {});
}

export const navigraphUpdating = false;

async function navigraphTask() {
    if (await getRedisSync('navigraph-ready')) radarStorage.navigraphSetUp = true;
}

export async function initWholeBunchOfBackendTasks() {
    try {
        await basicTasks();
        await vatsimTasks();
        await patreonTask();
        await navigraphTask();
        backupTask();
        clearTask();
    }
    catch (e) {
        console.error('Error during initialization', e);
    }

    if (isDebug()) {
        console.log('Custom data watcher has been set up');
        const watcher = watch(join(process.cwd(), 'src/data/custom'), {
            persistent: true,
            ignoreInitial: true,
            usePolling: true,
            interval: 5000,
            binaryInterval: 5000,
            ignored: [/controllers/],
        });

        async function updateTasks() {
            await updateSimAware();
            await updateVatglassesData();
            await updateVatSpy();
            console.log('Custom data has been updated');
        }

        watcher
            .on('add', updateTasks)
            .on('change', updateTasks)
            .on('unlink', updateTasks);
    }
}

export async function updateRedisData() {
    radarStorage.vatglasses.data = (await getRedisData('data-vatglasses')) ?? radarStorage.vatglasses.data;
    radarStorage.simaware = (await getRedisData('data-simaware')) ?? radarStorage.simaware;
    radarStorage.vatspy = (await getRedisData('data-vatspy')) ?? radarStorage.vatspy;
    radarStorage.airlines = (await getRedisData('data-airlines')) ?? radarStorage.airlines;
    radarStorage.vatsimStatic.divisions = (await getRedisData('data-divisions')) ?? radarStorage.vatsimStatic.divisions;
    radarStorage.vatsimStatic.subDivisions = (await getRedisData('data-subdivisions')) ?? radarStorage.vatsimStatic.subDivisions;
    radarStorage.vatsimStatic.events = (await getRedisData('data-events')) ?? radarStorage.vatsimStatic.events;
    radarStorage.vatsimStatic.bookings = (await getRedisData('data-bookings')) ?? radarStorage.vatsimStatic.bookings;
    radarStorage.vatsimStatic.tracks = (await getRedisData('data-nattrak')) ?? radarStorage.vatsimStatic.tracks;
    radarStorage.patreonInfo = (await getRedisData('data-patreon')) ?? radarStorage.patreonInfo;
    radarStorage.navigraphSetUp = !!await getRedisSync('navigraph-ready');
}

export async function setupRedisDataFetch() {
    await defineCronJob('15 * * * *', async () => {
        await updateRedisData();

        while (!radarStorage.navigraphSetUp && process.env.NAVIGRAPH_CLIENT_ID) {
            await sleep(1000 * 15);
            radarStorage.navigraphSetUp = !!await getRedisSync('navigraph-ready');
            console.log('Waiting for navigraph');
        }

        while (!await isDataReady()) {
            console.log(await getRedisSync('navigraph-ready'));
            console.log('ready status', !!radarStorage.vatspy?.data, !!radarStorage.vatglasses.data, !!radarStorage.vatsim.data, !!radarStorage.simaware?.data, radarStorage.navigraphSetUp);
            await sleep(1000 * 60);
            await updateRedisData();
        }
    });

    redisSubscriber.subscribe('update');

    redisSubscriber.on('message', async (channel, message) => {
        if (channel === 'update') {
            if (message === 'data-vatspy') {
                radarStorage.vatspy = (await getRedisData('data-vatspy')) ?? radarStorage.vatspy;
            }
            else if (message === 'data-vatglasses') {
                radarStorage.vatglasses.data = (await getRedisData('data-vatglasses')) ?? radarStorage.vatglasses.data;
            }
            else if (message === 'data-simaware') {
                radarStorage.simaware = (await getRedisData('data-simaware')) ?? radarStorage.simaware;
            }
            else if (message === 'data-nattrak') {
                radarStorage.vatsimStatic.tracks = (await getRedisData('data-nattrak')) ?? radarStorage.vatsimStatic.tracks;
            }
            else if (message === 'data-bookings') {
                radarStorage.vatsimStatic.bookings = (await getRedisData('data-bookings')) ?? radarStorage.vatsimStatic.bookings;
            }
            else if (message === 'navigraph-data') {
                radarStorage.navigraphSetUp = !!await getRedisSync('navigraph-ready');
            }
        }
    });

    console.log('Init has been completed');
}
