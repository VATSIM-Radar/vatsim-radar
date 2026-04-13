import type { VatsimShortenedController } from '~/types/data/vatsim';
import type { MapAircraft, MapAircraftList, MapAirportRender } from '~/types/map';
import type { VatSpyAirport } from '~/types/data/vatspy';
import { globalComputed, isPointInExtent } from '~/composables';
import type { NavigraphAirportData } from '~/types/data/navigraph';
import { getTraconPrefixes, getTraconSuffix } from '~/utils/shared/vatsim';
import type { Map } from 'ol';
import type { SimAwareDataFeature } from '~/utils/server/storage';
import type VectorSource from 'ol/source/Vector.js';
import { isMapFeature } from '~/utils/map/entities';
import { wrapAndSliceX } from 'ol/extent.js';
import { transformExtent } from 'ol/proj';
import { callsignSplitRegex } from '~/composables/render/update/atc';

export interface AirportTraconFeature {
    id: string;
    traconFeature: SimAwareDataFeature;
    controllers: VatsimShortenedController[];
}

export const airportOverlays = globalComputed(() => useMapStore().overlays.filter(x => x.type === 'airport').map(x => x.key));

let settingAirports = false;

export const activeAirportsList = globalComputed(() => {
    const store = useStore();
    const dataStore = useDataStore();

    let list = dataStore.airportsList.value;

    if (!store.config.airports?.length && !store.config.airport) return list;

    if (store.config.airport) {
        list = list[store.config.airport] ? { [store.config.airport]: list[store.config.airport] } : {};
    }
    else {
        list = {};

        for (const airport in store.config.airports) {
            if (dataStore.airportsList.value[airport]) list[airport] = dataStore.airportsList.value[airport];
        }
    }

    for (const airport of store.config.airport ? [store.config.airport!] : store.config.airports!) {
        if (list[airport]) continue;

        const vatspyAirport = dataStore.vatspy.value!.data.keyAirports.realIcao[airport] || dataStore.vatspy.value!.data.keyAirports.icao[airport];
        if (!vatspyAirport) continue;

        list[airport] = {
            atc: [],
            atis: {},
            icao: airport!,
            aircraft: {},
        };
    }

    return list;
});

interface VisibleAirportsResult {
    all: MapAirportRender[];
    visible: DataAirport[];
}

export interface AirportListItem {
    icao: string;
    aircraft: MapAircraft;
    aircraftList: MapAircraftList;
    aircraftCount: number;
    airport: VatSpyAirport | null;
    dataAirport: DataAirport | null;
    atc: VatsimShortenedController[];
    features: AirportTraconFeature[];
}

export const getRenderAirportsList = async ({ airports, visibleAirports }: {
    airports: MapAirportRender[];
    visibleAirports: DataAirport[];
}): Promise<AirportListItem[]> => {
    const dataStore = useDataStore();

    const airportsMap: Record<string, AirportListItem> = {};
    let airportsArr: AirportListItem[] = [];

    const keyedPrefiles = Object.fromEntries(dataStore.vatsim.data.prefiles.value.map(x => ([x.cid, x])));

    for (const { airport } of airports) {
        // if (!visible && !store.fullAirportsUpdate) continue;
        airportsMap[airport.icao] = {
            icao: airport.icao,
            aircraft: {
                departures: airport.aircraft.departures?.map(x => dataStore.vatsim.data.keyedPilots.value[x]),
                arrivals: airport.aircraft.arrivals?.map(x => dataStore.vatsim.data.keyedPilots.value[x]),
                groundArr: airport.aircraft.groundArr?.map(x => dataStore.vatsim.data.keyedPilots.value[x]),
                groundDep: airport.aircraft.groundDep?.map(x => dataStore.vatsim.data.keyedPilots.value[x]),
                prefiles: airport.aircraft.prefiles?.map(x => keyedPrefiles[x]),
            },
            aircraftList: airport.aircraft,
            aircraftCount: Object.values(airport.aircraft).reduce((acc, x) => acc + x.length, 0),
            airport: dataStore.vatspy.value?.data.keyAirports.realIata[airport.iata ?? ''] ??
            dataStore.vatspy.value?.data.keyAirports.realIcao[airport.icao] ??
                dataStore.vatspy.value?.data.keyAirports.iata[airport.iata ?? ''] ??
                dataStore.vatspy.value?.data.keyAirports.icao[airport.icao] ??
                null,
            dataAirport: airport,
            atc: airport.atc,
            features: [],
        };

        if (airport.iata) airportsMap[airport.iata] = airportsMap[airport.icao];
        airportsArr.push(airportsMap[airport.icao]);
    }

    function addFeatureToAirport(sector: SimAwareDataFeature, airport: AirportListItem, controller: VatsimShortenedController) {
        const id = JSON.stringify(sector.properties);

        let existingSector = airport.features.find(x => x.id === id) ||
            airportsArr.find(x => x.features.some(x => x.id === id))?.features.find(x => x.id === id);

        if (existingSector) {
            existingSector.controllers.push(controller);
        }
        else {
            existingSector = {
                id,
                traconFeature: sector,
                controllers: [controller],
            };

            airport.features.push(existingSector);
        }

        return existingSector;
    }

    const facilities = useFacilitiesIds();

    for (const airport of airportsArr) {
        const addedCallsings = new Set<string>();

        for (const feature of airport.features) {
            feature.controllers.forEach(controller => addedCallsings.add(controller.callsign));
        }

        const arrAtc = airport.atc.filter(x => !addedCallsings.has(x.callsign) && x.facility === facilities.APP);

        if (!arrAtc.length) continue;

        const callsigns = Array.from(new Set(arrAtc.map(x => x.callsign.split(callsignSplitRegex)[0])));

        const traconFeatures = (await Promise.all(callsigns.map(callsign => dataStore.simaware(callsign)))).flat();

        const backupFeatures: [controller: VatsimShortenedController, sector: SimAwareDataFeature][] = [];

        const added = new Set<number>();

        for (const sector of traconFeatures) {
            const prefixes = getTraconPrefixes(sector);
            const suffix = getTraconSuffix(sector);

            for (const controller of arrAtc) {
                if (added.has(controller.cid)) continue;
                const splittedCallsign = controller.callsign.split('_');

                if (
                    (!suffix || controller.callsign.endsWith(suffix)) &&
                    (
                        // Match AIRPORT_TYPE_NAME
                        prefixes.includes(splittedCallsign.slice(0, 2).join('_')) ||
                        // Match AIRPORT_NAME
                        (splittedCallsign.length === 2 && prefixes.includes(splittedCallsign[0])) ||
                        // Match AIRPORT_TYPERANDOMSTRING_NAME
                        (splittedCallsign.length === 3 && prefixes.some(x => x.split('_').length === 2 && controller.callsign.startsWith(x)))
                    )
                ) {
                    const existing = backupFeatures?.findIndex(x => x[0].cid === controller.cid);
                    if (existing !== -1) backupFeatures.splice(existing, 1);

                    addFeatureToAirport(sector, airport, controller);
                    added.add(controller.cid);
                    continue;
                }

                if (prefixes.some(x => controller.callsign.startsWith(x)) && (!suffix || controller.callsign.endsWith(suffix))) {
                    const existing = backupFeatures?.findIndex(x => x[0].cid === controller.cid);

                    if (existing !== -1) {
                        const existingFeature = backupFeatures[existing];

                        // Checking for priority, longer prefixes mean more precise
                        if (existingFeature[1].properties.prefix.reduce((acc, item) => acc > item.length ? acc : item.length, 0) < prefixes.reduce((acc, item) => acc > item.length ? acc : item.length, 0)) {
                            backupFeatures.splice(existing, 1);
                        }
                        else continue;
                    }

                    backupFeatures.push([controller, sector]);
                }
            }
        }

        backupFeatures.forEach(([controller, sector]) => addFeatureToAirport(sector, airport, controller));
    }

    const overlays = airportOverlays().value;
    airportsArr = airportsArr.filter(x => x.atc.length || x.aircraftCount || overlays.includes(x.icao));
    dataStore.vatsim.parsedAirports.value = Object.fromEntries(airportsArr.map(x => [x.icao, x]));
    return airportsArr;
};

const airportList = activeAirportsList();

export async function getInitialAirportsList({ navigraphData, source, map }: {
    navigraphData: Ref<Record<string, NavigraphAirportData>>;
    source: VectorSource;
    map: Map;
}): Promise<VisibleAirportsResult | null> {
    const dataStore = useDataStore();
    if (settingAirports || !dataStore.vatspy.value) return null;
    settingAirports = true;

    const store = useStore();
    const mapStore = useMapStore();
    const overlays = airportOverlays().value;

    try {
        const extent = mapStore.extent.slice();
        extent[0] -= 0.9;
        extent[1] -= 0.9;
        extent[2] += 0.9;
        extent[3] += 0.9;

        const realExtent = wrapAndSliceX(transformExtent(mapStore.extent, 'EPSG:4326', 'EPSG:3857'), map.getView().getProjection(), true);

        const _visibleFeatures = realExtent.flatMap(x => source.getFeaturesInExtent(transformExtent(x, 'EPSG:3857', 'EPSG:4326'), map.getView().getProjection()));

        const visibleFeatures = new Set(_visibleFeatures.map(x => {
            const properties = x.getProperties();
            if (isMapFeature('airport', properties)) {
                return properties.icao;
            }

            return null;
        }).filter(x => x));

        const airports = airportList.value;

        for (const airport of airportOverlays().value) {
            if (!airports[airport]) {
                airports[airport] = {
                    icao: airport,
                    aircraft: {},
                    atis: {},
                    atc: [],
                };
                triggerRef(airportList);
            }
        }

        const visibleAirports: DataAirport[] = [];
        const list: MapAirportRender[] = [];

        await Promise.all(Object.values(airports).map(async x => {
            const vatAirport = dataStore.vatspy.value!.data.keyAirports.realIata[x.iata ?? ''] ??
                dataStore.vatspy.value!.data.keyAirports.realIcao[x.icao ?? ''] ??
                dataStore.vatspy.value!.data.keyAirports.iata[x.iata ?? ''] ??
                dataStore.vatspy.value!.data.keyAirports.icao[x.icao ?? ''];

            const coordinates = vatAirport ? [vatAirport.lon, vatAirport.lat] : null;

            const result: MapAirportRender = {
                airport: x,
                visible: overlays.includes(x.icao) || visibleFeatures.has(x.icao) || (!coordinates || isPointInExtent(coordinates, extent)),
            };

            if (result.visible) visibleAirports.push(result.airport);
            else if (mapStore.zoom < 10) delete navigraphData.value[result.airport.icao];

            list.push(result);
        }));

        if (mapStore.zoom > 12) {
            await Promise.all(visibleAirports.map(async airport => {
                if (!dataStore.vatspy.value!.data.keyAirports.realIcao[airport.icao] || navigraphData.value[airport.icao]) return {};

                const params = new URLSearchParams();
                params.set('v', store.version);
                params.set('layout', (store.user?.hasCharts && store.user?.hasFms && !store.mapSettings.navigraphLayers?.disable) ? '1' : '0');
                params.set('originalData', store.mapSettings.navigraphLayers?.gatesFallback ? '1' : '0');

                navigraphData.value[airport.icao] = await $fetch<NavigraphAirportData>(`/api/data/navigraph/airport/${ airport.icao }?${ params.toString() }`);
            }));
        }
        else if (mapStore.zoom < 10) {
            navigraphData.value = {};
        }

        return {
            all: list,
            visible: visibleAirports,
        };
    }
    finally {
        settingAirports = false;
    }
}
