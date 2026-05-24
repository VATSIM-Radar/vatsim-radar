import { initClientDB } from '~/composables/render/idb';
import { setUserLocalSettings } from '~/composables/fetchers/map-settings';
import { useSettingsStore } from '~/store/settings';

export default defineNuxtPlugin({
    hooks: {
        'app:suspense:resolve'() {
            useSettingsStore().settings = JSON.parse(localStorage.getItem('settings') ?? '{}');
        },
    },
    async setup() {
        await initClientDB();
        setUserLocalSettings();
        setUserFilter();
        setUserMapSettings();
    },
});
