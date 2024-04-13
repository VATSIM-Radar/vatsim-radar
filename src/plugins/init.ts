import { useStore } from '~/store';

export default defineNuxtPlugin(() => {
    if (!import.meta.server) return;

    const store = useStore();
    store.user = useRequestEvent()?.context.user ?? null;
});
