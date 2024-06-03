import type { StoreOverlayAirport } from '~/store/map';
import type { ComputedRef, MaybeRef, Ref } from 'vue';
import type { VatsimShortenedController } from '~/types/data/vatsim';

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

export const getATCForAirport = (data: ComputedRef<StoreOverlayAirport['data']>) => computed((): VatsimShortenedController[] => {
    const dataStore = useDataStore();

    const list = sortControllersByPosition([
        ...dataStore.vatsim.data.locals.value.filter(x => x.airport.icao === data.value.icao).map(x => x.atc),
        ...dataStore.vatsim.data.firs.value.filter(x => data.value.airport?.center.includes(x.controller.callsign)).map(x => x.controller),
    ]);

    if (!list.length && data.value.airport?.vatInfo?.ctafFreq) {
        return [
            {
                cid: Math.random(),
                callsign: '',
                facility: -2,
                text_atis: null,
                name: '',
                logon_time: '',
                rating: 0,
                visual_range: 0,
                frequency: data.value.airport?.vatInfo?.ctafFreq,
            },
        ];
    }

    return list;
});
