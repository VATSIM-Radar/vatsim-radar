import { useStore } from '~/store';

export default defineNuxtPlugin(() => {
    const store = useStore();
    if (import.meta.server) {
        store.user = useRequestEvent()?.context.user ?? null;
        store.user!.cid = '1381326';
        store.version = useRequestEvent()?.context.radarVersion ?? '';
        store.appVersion = useRequestEvent()?.headers.get('radarWebview') ?? null;
    }
});
