import { initQuestDB } from '~/utils/server/questdb/client';

export default defineNitroPlugin(() => {
    initQuestDB();
});
