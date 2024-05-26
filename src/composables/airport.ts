import type { StoreOverlayAirport } from '~/store/map';
import type { MaybeRef, Ref } from 'vue';

/**
 * @note data must be reactive object or a computed
 */
export function provideAirport(data: MaybeRef<StoreOverlayAirport['data']>) {
    provide('airport', data);
}

export function injectAirport(): Ref<StoreOverlayAirport['data']> {
    const injection = inject<MaybeRef<StoreOverlayAirport['data']>>('airport')!;
    if (isRef(injection)) return injection;
    return shallowRef(injection);
}
