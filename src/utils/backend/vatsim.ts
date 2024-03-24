import { ofetch } from 'ofetch';
import { createError } from 'h3';

export function getVatsimRedirectUri() {
    return `${ useRuntimeConfig().DOMAIN }/auth/vatsim`;
}

export function vatsimAuthOrRefresh(code: string, type: 'auth' | 'refresh') {
    const config = useRuntimeConfig();

    const settings: Record<string, any> = {
        grant_type: type === 'refresh' ? 'refresh_token' : 'authorization_code',
        client_id: config.VATSIM_CLIENT_ID,
        client_secret: config.VATSIM_CLIENT_SECRET,
        redirect_uri: getVatsimRedirectUri(),
        scope: ['full_name'],
    };

    if (type === 'refresh') {
        settings.refresh_token = code;
    }
    else {
        settings.code = code;
    }

    return ofetch<{
        access_token: string
        expires_in: number
        token_type: 'Bearer'
        refresh_token: string
        scopes: string[]
    }>(`${ config.VATSIM_ENDPOINT }/oauth/token`, {
        method: 'POST',
        body: settings,
    });
}

export interface VatsimUser {
    cid: string
    personal: {
        name_first: string
        name_last: string
        name_full: string
    }
    oauth: {
        token_valid: 'true' | 'false'
    }
}

export async function vatsimGetUser(token: string) {
    const result = (await ofetch<{data: VatsimUser}>(`${ useRuntimeConfig().VATSIM_ENDPOINT }/api/user`, {
        headers: {
            Authorization: `Bearer ${ token }`,
        },
    })).data;

    if (result.oauth.token_valid !== 'true') {
        throw createError({
            statusCode: 401,
            statusMessage: 'Token is not valid',
        });
    }

    return result;
}
