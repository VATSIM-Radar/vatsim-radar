import { CronJob } from 'cron';
import { existsSync, unlinkSync } from 'node:fs';
import AdmZip from 'adm-zip';
import { readdirSync } from 'fs';
import { join } from 'path';
import {
    closeNavigraphDB,
    initNavigraphDB,
    navigraphCurrentDb,
    navigraphOutdatedDb,
} from '~/utils/backend/navigraph-db';
import { radarStorage } from '~/utils/backend/storage';

const accessKey = {
    token: '',
    expires: null as null | number,
};

export const cycles = {
    current: '',
    outdated: '',
};

interface File {
    package_id: string
    cycle: string
    files: {
        file_id: string
        key: string
        hash: string
        signed_url: string
    }[]
    revision: string
}

async function downloadNavigraphFile({ fileUrl, path, filename }: {fileUrl: string, path: string, filename: string}) {
    const zip = await $fetch<ArrayBuffer>(fileUrl, { responseType: 'arrayBuffer' });
    const admZip = new AdmZip(Buffer.from(zip));
    admZip.extractEntryTo(admZip.getEntries()[0].entryName, path, undefined, undefined, undefined, filename);
}

export default defineNitroPlugin((app) => {
    const config = useRuntimeConfig();

    CronJob.from({
        cronTime: '15 0 * * *',
        start: true,
        runOnInit: true,
        onTick: async () => {
            if (!accessKey.token || !accessKey.expires || accessKey.expires < Date.now()) {
                const form = new URLSearchParams();
                form.set('client_id', config.NAVIGRAPH_SERVER_ID);
                form.set('client_secret', config.NAVIGRAPH_SERVER_SECRET);
                form.set('scope', 'fmsdata');
                form.set('grant_type', 'client_credentials');

                const { access_token, expires_in } = await $fetch<{access_token: string, expires_in: number, token_type: 'Bearer'}>('https://identity.api.navigraph.com/connect/token', {
                    method: 'POST',
                    body: form.toString(),
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    timeout: 1000 * 60,
                });

                accessKey.token = access_token;
                accessKey.expires = Date.now() + (expires_in * 1000);
            }

            const [current] = await $fetch<File[]>('https://api.navigraph.com/v1/navdata/packages?package_status=current', {
                headers: {
                    Authorization: `Bearer ${ accessKey.token }`,
                },
                timeout: 1000 * 60,
            });

            const [outdated] = await $fetch<File[]>('https://api.navigraph.com/v1/navdata/packages?package_status=outdated', {
                headers: {
                    Authorization: `Bearer ${ accessKey.token }`,
                },
                timeout: 1000 * 60,
            });

            const currentCycle = `${ current.cycle }-${ current.revision }`;
            const outdatedCycle = `${ outdated.cycle }-${ outdated.revision }`;

            if (currentCycle === cycles.current && outdatedCycle === cycles.outdated) return;

            cycles.current = currentCycle;
            cycles.outdated = outdatedCycle;

            radarStorage.navigraph = cycles;

            const cwd = join(process.cwd(), 'src');

            const currentFileName = `current-${ currentCycle }.s3db`;
            const outdatedFileName = `outdated-${ outdatedCycle }.s3db`;

            const dirPath = join(cwd, 'data');
            const currentPath = join(cwd, `data/${ currentFileName }`);
            const outdatedPath = join(cwd, `data/${ outdatedFileName }`);

            const filesInPath = readdirSync(dirPath, { withFileTypes: true });

            if (!existsSync(currentPath)) {
                closeNavigraphDB('current');
                filesInPath.filter(x => x.name.includes('current')).forEach(file => unlinkSync(`${ file.path }/${ file.name }`));

                await downloadNavigraphFile({
                    fileUrl: current.files[0].signed_url,
                    path: dirPath,
                    filename: currentFileName,
                });
            }

            if (!navigraphCurrentDb) initNavigraphDB({ type: 'current', file: currentPath });

            if (!existsSync(outdatedPath)) {
                closeNavigraphDB('outdated');
                filesInPath.filter(x => x.name.includes('outdated')).forEach(file => unlinkSync(`${ file.path }/${ file.name }`));

                await downloadNavigraphFile({
                    fileUrl: outdated.files[0].signed_url,
                    path: dirPath,
                    filename: outdatedFileName,
                });
            }

            if (!navigraphOutdatedDb) initNavigraphDB({ type: 'outdated', file: outdatedPath });
        },
    });
});
