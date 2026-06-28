import type { H3Event, H3Error } from 'h3';
import { handleH3Error } from '~/utils/server/h3';
import { getAllPrivateUsers } from '~/utils/server/user';

export default defineEventHandler(async (event: H3Event): Promise<Record<string, boolean | string> | void | H3Error<any>> => {
    const authorization = getHeader(event, 'Authorization');

    if (!authorization || !process.env.VATSIM_IDENT_TOKEN || authorization.replace('Bearer ', '') !== process.env.VATSIM_IDENT_TOKEN) {
        return handleH3Error({
            event,
            statusCode: 401,
        });
    }

    return getAllPrivateUsers();
});
