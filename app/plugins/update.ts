import { useStore } from '~/store';

export default defineNuxtPlugin(app => {
    if (import.meta.server) return;
    const store = useStore();

    app.hook('app:manifest:update', () => {
        store.updateRequired = true;
    });
});
