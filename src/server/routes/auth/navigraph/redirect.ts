import { getNavigraphCodeChallenge, getNavigraphCodeVerifier, getNavigraphRedirectUri } from '~/utils/navigraph';
import { prisma } from '~/utils/prisma';
import { randomUUID } from 'node:crypto';

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig();

    const verifier = getNavigraphCodeVerifier();
    const state = randomUUID();

    const url = new URL('https://identity.api.navigraph.com/connect/authorize');
    url.searchParams.set('client_id', config.NAVIGRAPH_CLIENT_ID);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid offline_access fmsdata');
    url.searchParams.set('state', state);
    url.searchParams.set('redirect_uri', getNavigraphRedirectUri());
    url.searchParams.set('code_challenge', getNavigraphCodeChallenge(verifier));
    url.searchParams.set('code_challenge_method', 'S256');

    await prisma.navigraphAuth.create({
        data: {
            state,
            verifier,
        },
    });

    return sendRedirect(event, url.toString());
});
