import { getRequestHeader, setHeader } from 'h3';
import { isValidIPOrigin } from '~/utils/shared';

const iframeWhitelist = [
    'localhost',
    'vatsimsa.com',
    'vatcar.net',
    'idvacc.id',
    'vatcol.org',
    'urrv.me',
    'vatsim.net',
    'vatsim-petersburg.com',
    'vatsim-radar.com',
    'wfhub.local',
    'oav.gr',
    'vatrus.info',
    'efb.teamcovey.org',
];

export async function useIframeHeader() {
    if (import.meta.client) return;

    const event = useRequestEvent();
    if (!event) return;

    const originHeader = getRequestHeader(event, 'origin');
    const refererHeader = getRequestHeader(event, 'referer');
    if (!originHeader && !refererHeader) return;

    try {
        const url = new URL(originHeader || refererHeader!);
        const origin = url.hostname.toLowerCase().replace(/\.$/, '');

        if (origin && iframeWhitelist.some(host => origin === host || origin.endsWith(`.${ host }`))) {
            setHeader(event, 'Content-Security-Policy', `frame-ancestors *`);
        }
        else {
            if (isValidIPOrigin(url.origin) && event.context.referrerChecked) {
                setHeader(event, 'Content-Security-Policy', `frame-ancestors *`);
                return;
            }

            setHeader(event, 'Content-Security-Policy', `frame-ancestors 'self'`);
        }
    }
    catch (e) {
        console.error(e);
    }
}
