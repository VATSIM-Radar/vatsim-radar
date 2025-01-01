import { initClientDB } from '~/utils/client-db';

import { setUserLocalSettings } from '~/composables/fetchers/map-settings';

export default defineNuxtPlugin(async () => {
    await initClientDB();
    setUserLocalSettings();
    setUserMapSettings();
});
