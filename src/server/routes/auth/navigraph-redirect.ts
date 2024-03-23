import { getCodeChallenge, getCodeVerifier } from '~/utils/navigraph';

export default defineEventHandler((event) => {
    const config = useRuntimeConfig();

    const verifier = getCodeVerifier();
    console.log(verifier);

    const url = new URL('https://identity.api.navigraph.com/connect/authorize');
    url.searchParams.set('client_id', config.NAVIGRAPH_CLIENT_ID);
    url.searchParams.set('client_secret', config.NAVIGRAPH_CLIENT_SECRET);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid offline_access fmsdata');
    url.searchParams.set('state', 'qwertyuiopasdfghjk');
    url.searchParams.set('redirect_uri', `${ config.DOMAIN }/auth/navigraph`);
    url.searchParams.set('code_challenge', getCodeChallenge(verifier));
    url.searchParams.set('code_challenge_method', 'S256');

    console.log(url.toString());

    return sendRedirect(event, url.toString());
});
