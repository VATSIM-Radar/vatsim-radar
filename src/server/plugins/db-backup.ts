import { execSync } from 'node:child_process';
import { join } from 'path';
import S3 from 'aws-sdk/clients/s3.js';
import { readFileSync } from 'node:fs';
import { defineCronJob } from '~/utils/backend';

const regex = new RegExp('mysql:\\/\\/(?<user>.*):(?<password>.*)@(?<host>.*):(?<port>.*)\\/(?<db>.*)\\?');

const s3 = new S3({
    endpoint: process.env.CF_R2_API,
    accessKeyId: process.env.CF_R2_ACCESS_ID,
    secretAccessKey: process.env.CF_R2_ACCESS_TOKEN,
    signatureVersion: 'v4',
});

export default defineNitroPlugin(app => {
    defineCronJob('20 */2 * * *', async () => {
        if (import.meta.dev) return;
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

        const date = new Date();

        s3.upload({
            Bucket: 'backups',
            Expires: new Date(Date.now() + (1000 * 60 * 60 * 24 * 7)),
            Body: readFileSync(join(process.cwd(), 'dump.sql')),
            Key: `radar/${ date.getFullYear() }-${ date.getMonth() }-${ date.getDate() }-${ config.public.DOMAIN.replace('https://', '').split(':')[0] }-${ date.getHours() }-${ date.getMinutes() }.sql`,
            ContentType: 'application/sql',
        }, (err, data) => {
            if (err) console.error(err);
            if (data) console.info('Backup completed', data.Location);
        });
    });
});
