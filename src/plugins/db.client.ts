import { initClientDB } from '~/utils/client-db';

export default defineNuxtPlugin(async () => {
    await initClientDB();
});
