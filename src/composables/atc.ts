import type { VatsimShortenedController } from '~/types/data/vatsim';
import { getHoursAndMinutes } from '~/utils';
import type { Map } from 'ol';
import type { ShallowRef } from 'vue';
import type { VatSpyAirport, VatSpyData } from '~/types/data/vatspy';
import { useMapStore } from '~/store/map';
import type { StoreOverlayPilot } from '~/store/map';
import { useStore } from '~/store';
import { parseEncoding } from '~/utils/data';

export const useFacilitiesIds = () => {
    const dataStore = useDataStore();

    return {
        ATIS: -1,
        OBS: dataStore.vatsim.data.facilities.value.find(x => x.short === 'OBS')?.id ?? -1,
        FSS: dataStore.vatsim.data.facilities.value.find(x => x.short === 'FSS')?.id ?? -1,
        DEL: dataStore.vatsim.data.facilities.value.find(x => x.short === 'DEL')?.id ?? -1,
        GND: dataStore.vatsim.data.facilities.value.find(x => x.short === 'GND')?.id ?? -1,
        TWR: dataStore.vatsim.data.facilities.value.find(x => x.short === 'TWR')?.id ?? -1,
        APP: dataStore.vatsim.data.facilities.value.find(x => x.short === 'APP')?.id ?? -1,
        CTR: dataStore.vatsim.data.facilities.value.find(x => x.short === 'CTR')?.id ?? -1,
    };
};

export const useRatingsIds = () => {
    const dataStore = useDataStore();

    return {
        S1: dataStore.vatsim.data.ratings.value.find(x => x.short === 'S1')?.id ?? -1,
        S2: dataStore.vatsim.data.ratings.value.find(x => x.short === 'S2')?.id ?? -1,
        S3: dataStore.vatsim.data.ratings.value.find(x => x.short === 'S3')?.id ?? -1,
        C1: dataStore.vatsim.data.ratings.value.find(x => x.short === 'C1')?.id ?? -1,
        C3: dataStore.vatsim.data.ratings.value.find(x => x.short === 'C3')?.id ?? -1,
        I1: dataStore.vatsim.data.ratings.value.find(x => x.short === 'I1')?.id ?? -1,
        I3: dataStore.vatsim.data.ratings.value.find(x => x.short === 'I3')?.id ?? -1,
        SUP: dataStore.vatsim.data.ratings.value.find(x => x.short === 'SUP')?.id ?? -1,
        ADM: dataStore.vatsim.data.ratings.value.find(x => x.short === 'ADM')?.id ?? -1,
    };
};

export function getControllerPositionColor(controller: VatsimShortenedController) {
    const ids = useFacilitiesIds();

    if (controller.isATIS || controller.facility === ids.ATIS) {
        return radarColors.warning500;
    }

    if (controller.facility === ids.DEL) {
        return radarColors.primary700;
    }

    if (controller.facility === ids.TWR) {
        return radarColors.error700;
    }

    if (controller.facility === ids.GND) {
        return radarColors.success500;
    }

    if (controller.facility === ids.APP) {
        return radarColors.error300;
    }

    if (controller.facility === ids.CTR) {
        return radarColors.primary300;
    }

    return radarColors.darkgray800;
}

export function sortControllersByPosition<T extends { facility: number; isATIS?: boolean; [key: string]: any }>(facilities: T[]): T[] {
    const ids = useFacilitiesIds();

    const getPositionIndex = (position: number, isAtis = false) => {
        if (isAtis) return 5;
        if (position === ids.DEL) return 0;
        if (position === ids.GND) return 1;
        if (position === ids.TWR) return 2;
        if (position === ids.APP) return 3;
        if (position === ids.CTR) return 4;
        if (position === ids.ATIS) return 5;
        return 6;
    };

    return facilities.slice().sort((a, b) => {
        return getPositionIndex(a.facility, a.isATIS) > getPositionIndex(b.facility, b.isATIS) ? 1 : -1;
    });
}

export function findAtcByCallsign(callsign: string): VatsimShortenedController | undefined {
    const dataStore = useDataStore();
    const local = dataStore.vatsim.data.locals.value.find(x => x.atc.callsign === callsign)?.atc;
    if (local) return local;

    return dataStore.vatsim.data.firs.value.find(x => x.controller?.callsign === callsign)?.controller;
}

export function getATCTime(controller: VatsimShortenedController) {
    return getHoursAndMinutes(new Date(controller.logon_time).getTime());
}

export async function findAtcAirport(atc: VatsimShortenedController): Promise<VatSpyAirport | null> {
    const dataStore = useDataStore();
    const store = useStore();
    const title = atc.callsign.split('_')[0];

    const icaoAirport = dataStore.vatspy.value?.data.keyAirports.icao[title];
    if (icaoAirport) return icaoAirport;

    store.updateATCTracons = true;
    await new Promise(resolve => watch(dataStore.vatsim.parsedAirports, resolve, { once: true }));
    const airport = dataStore.vatsim.parsedAirports.value.find(x => x.arrAtc.some(x => x.callsign === atc.callsign));
    store.updateATCTracons = false;
    if (airport) return airport.airport;

    const iataAirport = dataStore.vatspy.value?.data.keyAirports.iata[title];
    if (iataAirport) {
        return {
            ...iataAirport,
            icao: iataAirport.iata!,
        };
    }

    return null;
}

export async function showAirportOnMap(airport: VatSpyData['airports'][0], map: Map | null, zoom?: number, animate = true) {
    map = map || inject<ShallowRef<Map | null>>('map')!.value;
    const store = useStore();
    const mapStore = useMapStore();
    const view = map?.getView();
    if (!airport) return;

    mapStore.overlays.filter(x => x.type === 'pilot').forEach(x => (x as StoreOverlayPilot).data.tracked = false);
    await nextTick();

    zoom = zoom ?? store.mapSettings.defaultAirportZoomLevel ?? 14;

    if (animate) {
        view?.animate({
            center: [airport.lon, airport.lat],
            zoom: zoom ?? store.mapSettings.defaultAirportZoomLevel ?? 14,
        });
    }
    else {
        view?.setCenter([airport.lon, airport.lat]);
        view?.setZoom(zoom);
    }
}

export async function showAtcOnMap(atc: VatsimShortenedController, map: Map | null) {
    map = map || inject<ShallowRef<Map | null>>('map')!.value;
    const airport = await findAtcAirport(atc);
    if (!airport) return;

    const facilities = useFacilitiesIds();

    return showAirportOnMap(airport, map, (atc.facility === facilities.CTR || atc.facility === facilities.FSS) ? 8 : undefined);
}

export function getATIS(controller: VatsimShortenedController) {
    const atis = controller.text_atis?.map(x => parseEncoding(x, controller.callsign)) ?? null;

    if (!controller.isATIS) return atis;
    if (atis && atis.filter(x => x.replaceAll(' ', '').length > 20).length > atis.length - 2) return [atis.join(' ')];
    return atis;
}
