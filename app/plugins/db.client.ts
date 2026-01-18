import { initClientDB } from '~/composables/render/idb';

import { setUserLocalSettings } from '~/composables/fetchers/map-settings';

export default defineNuxtPlugin(async () => {
    await initClientDB();
    setUserLocalSettings();
    setUserFilter();
    setUserActiveFilter();
    setUserMapSettings();
});
