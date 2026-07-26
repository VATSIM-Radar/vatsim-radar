import type { H3Event } from 'h3';
import { getAllPrivateUsers } from '~/utils/server/user';

export default defineEventHandler(async (event: H3Event) => {
    const id = getRouterParam(event, 'id');

    return {
        isPrivate: !!(await getAllPrivateUsers())[id ?? ''],
    };
});
