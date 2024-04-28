import { initClientDB } from '~/utils/client-db';
import { setUserLocalSettings } from '~/composables';

export default defineNuxtPlugin(async () => {
    await initClientDB();
    setUserLocalSettings();
});
