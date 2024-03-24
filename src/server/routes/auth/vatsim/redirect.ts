import {
    getNavigraphCodeChallenge,
    getNavigraphCodeVerifier,
    getNavigraphRedirectUri,

} from '~/utils/backend/navigraph';
import { prisma } from '~/utils/backend/prisma';
import { randomUUID } from 'node:crypto';
import { AuthType } from '@prisma/client';
import { getVatsimRedirectUri } from '~/utils/backend/vatsim';

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig();

    const state = randomUUID();

    const url = new URL(`${ config.VATSIM_ENDPOINT }/oauth/authorize`);
    url.searchParams.set('client_id', config.VATSIM_CLIENT_ID);
    url.searchParams.set('redirect_uri', getVatsimRedirectUri());
    url.searchParams.set('scope', 'full_name');
    url.searchParams.set('state', state);
    url.searchParams.set('response_type', 'code');

    await prisma.auth.create({
        data: {
            state,
            type: AuthType.VATSIM,
        },
    });

    return sendRedirect(event, url.toString());
});
