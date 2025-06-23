import * as Sentry from '@sentry/nuxt';
import packageJSON from '~~/package.json';

let env = 'production';
if (process.env.NODE_ENV === 'development') env = 'development';
if (process.env.DOMAIN?.includes('next')) env = 'next';

Sentry.init({
    dsn: 'https://85ff5fb7edcf1754af9f45e4d40b1131@o4509032956690432.ingest.de.sentry.io/4509032959049808',
    tracesSampleRate: 0,
    environment: env,
    release: packageJSON.version,
});
