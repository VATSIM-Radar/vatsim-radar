import { CronJob } from 'cron';
import { execSync } from 'node:child_process';
import { join } from 'path';
import { Client } from 'basic-ftp';

const regex = new RegExp('mysql:\\/\\/(?<user>.*):(?<password>.*)@(?<host>.*):(?<port>.*)\\/(?<db>.*)\\?');
const client = new Client();

export default defineNitroPlugin(app => {
    CronJob.from({
        cronTime: '20 * * * *',
        start: true,
        runOnInit: true,
        onTick: async () => {
            const config = useRuntimeConfig();

            const {
                groups: {
                    user,
                    password,
                    host,
                    port,
                    db,
                },
            } = regex.exec(config.DATABASE_URL)! as { groups: Record<string, string> };

            execSync(`mysqldump -u${ user } -p${ password } -h${ host } --compact --create-options --quick --tz-utc -P${ port } ${ db } > dump.sql`);

            await client.access({
                host: config.BACKUP_FTP_HOST,
                user: config.BACKUP_FTP_LOGIN,
                password: config.BACKUP_FTP_PASSWORD,
                secure: true,
            });

            const date = Date.now();
            const maxExpirationDate = date - (1000 * 60 * 60 * 24 * 7);
            const path = `/radar/${ config.public.DOMAIN.replace('https://', '').split(':')[0] }`;
            await client.ensureDir(path);

            await client.uploadFrom(join(process.cwd(), 'dump.sql'), `${ path }/${ date }.sql`);
            const list = await client.list(path);
            for (const item of list) {
                const date = item.name.split('.')[0];
                if (+date < maxExpirationDate) await client.remove(`${ path }/${ item.name }`);
            }
        },
    });
});
