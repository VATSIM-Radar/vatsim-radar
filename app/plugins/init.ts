import { useStore } from '~/store';

export default defineNuxtPlugin(() => {
    const store = useStore();
    if (import.meta.server) {
        store.user = useRequestEvent()?.context.user ?? null;
        store.version = useRequestEvent()?.context.radarVersion ?? '';
    }
});
