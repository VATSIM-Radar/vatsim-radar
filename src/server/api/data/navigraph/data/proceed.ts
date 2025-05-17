import { processDatabase } from '~/utils/backend/navigraph/navdata';
import { navigraphCurrentDb } from '~/utils/backend/navigraph/db';

export default defineEventHandler(async event => {
    await processDatabase(navigraphCurrentDb!);

    return {
        status: 'ok',
    };
});
