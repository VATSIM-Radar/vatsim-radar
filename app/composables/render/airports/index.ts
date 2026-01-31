import type { GeoJSONFeature } from 'ol/format/GeoJSON';
import type { VatsimBooking, VatsimShortenedController } from '~/types/data/vatsim';
import type { MapAircraft, MapAircraftList, MapAirportRender, MapAirportVatspy } from '~/types/map';
import type { VatSpyAirport, VatSpyDataLocalATC } from '~/types/data/vatspy';
import { isVatGlassesActive } from '~/utils/data/vatglasses';
import { globalComputed, isPointInExtent } from '~/composables';
import type { NavigraphAirportData } from '~/types/data/navigraph';
import { getTraconPrefixes, getTraconSuffix } from '~/utils/shared/vatsim';
import type { Feature } from 'ol';
import { intersects } from 'ol/extent';
import type { SimAwareDataFeature } from '~/utils/server/storage';

export interface AirportTraconFeature {
    id: string;
    traconFeature: GeoJSONFeature;
    controllers: VatsimShortenedController[];
}

export interface AirportsList {
    aircraft: MapAircraft;
    aircraftList: MapAircraftList;
    aircraftCids: number[];
    airport: VatSpyAirport;
    localAtc: VatsimShortenedController[];
    arrAtc: VatsimShortenedController[];
    arrAtcInfo: VatSpyDataLocalATC[];
    bookings: VatsimBooking[];
    features: AirportTraconFeature[];
    isSimAware: boolean;
}

export const airportOverlays = globalComputed(() => useMapStore().overlays.filter(x => x.type === 'airport').map(x => x.key));

let settingAirports = false;

export const activeAirportsList = globalComputed(() => {
    const store = useStore();
    const dataStore = useDataStore();

    let list = dataStore.vatsim.data.airports.value;

    if (!store.config.airports?.length && !store.config.airport) return list;

    list = list.filter(x => store.config.airport ? x.icao === store.config.airport : store.config.airports!.includes(x.icao));

    for (const airport of store.config.airport ? [store.config.airport!] : store.config.airports!) {
        if (list.some(x => x.icao === airport)) continue;

        const vatspyAirport = dataStore.vatspy.value!.data.keyAirports.realIcao[airport] || dataStore.vatspy.value!.data.keyAirports.icao[airport];
        if (!vatspyAirport) continue;

        list.push({
            isPseudo: false,
            isSimAware: false,
            icao: airport!,
            aircraft: {},
        });
    }

    return list;
});

const cachedSimAwareFeatures: Record<string, Feature> = {};

interface VisibleAirportsResult {
    all: MapAirportRender[];
    visible: MapAirportVatspy[];
}

export interface AirportListItem {
    aircraft: MapAircraft;
    aircraftList: MapAircraftList;
    aircraftCids: number[];
    airport: VatSpyAirport;
    localAtc: VatsimShortenedController[];
    arrAtc: VatsimShortenedController[];
    arrAtcInfo: VatSpyDataLocalATC[];
    bookings: VatsimBooking[];
    features: AirportTraconFeature[];
    isSimAware: boolean;
}

export const getAirportsList = async ({ airports, visibleAirports }: {
    airports: MapAirportRender[];
    visibleAirports: MapAirportVatspy[];
}) => {
    const store = useStore();
    const mapStore = useMapStore();
    const dataStore = useDataStore();

    const airportsMap: Record<string, AirportListItem> = {};
    let airportsArr: AirportListItem[] = [];

    const keyedPrefiles = Object.fromEntries(dataStore.vatsim.data.prefiles.value.map(x => ([x.cid, x])));

    for (const { airport, visible } of airports) {
        if (!visible && !store.fullAirportsUpdate) continue;
        airportsMap[airport.icao] = {
            aircraft: {
                departures: airport.aircraft.departures?.map(x => dataStore.vatsim.data.keyedPilots.value[x]),
                arrivals: airport.aircraft.arrivals?.map(x => dataStore.vatsim.data.keyedPilots.value[x]),
                groundArr: airport.aircraft.groundArr?.map(x => dataStore.vatsim.data.keyedPilots.value[x]),
                groundDep: airport.aircraft.groundDep?.map(x => dataStore.vatsim.data.keyedPilots.value[x]),
                prefiles: airport.aircraft.prefiles?.map(x => keyedPrefiles[x]),
            },
            aircraftList: airport.aircraft,
            aircraftCids: Object.values(airport.aircraft).flatMap(x => x),
            airport: airport.data,
            localAtc: [],
            arrAtc: [],
            arrAtcInfo: [],
            bookings: [],
            features: [],
            isSimAware: airport.isSimAware,
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

    const vgFallbackPositions = Object.keys(dataStore.vatglassesActivePositions.value['fallback']);

    if (!store.bookingOverride) {
        for (const atc of dataStore.vatsim.data.locals.value) {
            if (!atc.airport) continue;
            const isArr = !atc.isATIS && atc.atc.facility === facilities.APP;
            const icaoOnlyAirport = airportsMap[atc.airport!.icao];
            let iataAirport = atc.airport!.iata ? airportsMap[atc.airport!.iata] : null;

            if (iataAirport && iataAirport !== icaoOnlyAirport && airportsArr.some(y => iataAirport?.airport.lat === y.airport.lat && iataAirport.airport.lon === y.airport.lon)) {
                iataAirport = null;
            }

            const airport = iataAirport || icaoOnlyAirport;

            if (!airport) continue;

            if (isArr) {
                if (isVatGlassesActive.value && dataStore.vatglassesActivePositions.value['fallback']) {
                    if (!vgFallbackPositions.includes(atc.atc.callsign)) continue; // We don't add the current station if it is not in the fallback array, because it is shown with vatglasses sector. We need the tracon sectors as fallback for positions which are not defined in vatglasses.
                }
                airport.arrAtc.push(atc.atc);
                airport.arrAtcInfo.push(atc);
                continue;
            }

            const isLocal = atc.isATIS || atc.atc.facility === facilities.DEL || atc.atc.facility === facilities.TWR || atc.atc.facility === facilities.GND;
            if (isLocal) airport.localAtc.push(atc.atc);
        }
    }

    function createNewAirport(vAirport: VatSpyAirport): AirportListItem {
        const obj = {
            aircraft: {},
            aircraftCids: [],
            aircraftList: {},
            airport: {
                icao: vAirport.icao,
                isPseudo: false,
                isSimAware: true,
                lat: vAirport.lat,
                lon: vAirport.lon,
                name: vAirport.name,
            },
            arrAtc: [],
            arrAtcInfo: [],
            bookings: [],
            features: [],
            isSimAware: true,
            localAtc: [],
        };

        airportsMap[vAirport.icao] = obj;
        if (vAirport.iata) airportsMap[vAirport.iata] = obj;
        airportsArr.push(obj);

        return obj;
    }

    function updateAirportWithBooking(airport: AirportsList, booking: VatsimBooking): void {
        if (booking.atc.facility === facilities.APP) {
            const existingLocal = airport.arrAtc.find(x => booking.atc.callsign === x.callsign);

            if (!existingLocal || (existingLocal.booking && booking.start < existingLocal.booking.start)) {
                if (existingLocal) {
                    airport.arrAtc = airport.arrAtc.filter(x => x.facility !== existingLocal.facility);
                }

                makeBookingLocalTime(booking);

                booking.atc.booking = booking;
                airport.bookings.push(booking);
                airport.arrAtc.push(booking.atc);
                airport.arrAtcInfo.push({
                    atc: booking.atc,
                    isATIS: false,
                    airport: {
                        ...airport.airport,
                        isSimAware: true,
                    } satisfies VatSpyDataLocalATC['airport'],
                });
            }
        }
        else {
            const existingLocal = airport.localAtc.find(x => booking.atc.facility === (x.isATIS ? -1 : x.facility));

            if (!existingLocal || (existingLocal.booking && booking.start < existingLocal.booking.start)) {
                if (existingLocal) {
                    airport.localAtc = airport.localAtc.filter(x => x.facility !== existingLocal.facility || x.isATIS);
                }

                makeBookingLocalTime(booking);

                booking.atc.booking = booking;
                airport.bookings.push(booking);
                airport.localAtc.push(booking.atc);
            }
        }
    }

    if (((store.mapSettings.visibility?.bookings ?? true) && !store.config.hideBookings) || store.bookingOverride) {
        const now = new Date();
        const timeInHours = new Date(now.getTime() + ((store.mapSettings?.bookingHours ?? 1) * 60 * 60 * 1000));

        const validFacilities = new Set([facilities.TWR, facilities.GND, facilities.DEL, facilities.APP]);

        store.bookings.filter(x => visibleAirports.find(y => x.atc.callsign.startsWith(y.icao) || x.atc.callsign.startsWith(y.iata ?? ''))).forEach((booking: VatsimBooking) => {
            if (!validFacilities.has(booking.atc.facility) || isVatGlassesActive.value) return;

            if (!store.bookingOverride) {
                const start = new Date(booking.start);
                const end = new Date(booking.end);

                if (start > timeInHours || now > end) return;
            }

            const airportIcao = booking.atc.callsign.split('_')[0];
            let airport = airportsMap[airportIcao];

            if (!airport) {
                const vAirport = dataStore.vatspy.value?.data.airports.find(x => airportIcao === x.icao);
                if (!vAirport) return;

                airport = createNewAirport(vAirport);
            }
            else {
                airport.isSimAware = true;
                airport.airport.isSimAware = true;
            }

            updateAirportWithBooking(airport, booking);
        });
    }

    for (const airport of airportsArr) {
        if (!airport.arrAtc.length) continue;

        const callsigns = Array.from(new Set(airport.arrAtc.map(x => x.callsign.split('_')[0])));

        const traconFeatures = (await Promise.all(callsigns.map(callsign => dataStore.simaware(callsign)))).flat();

        const backupFeatures: [controller: VatsimShortenedController, sector: SimAwareDataFeature][] = [];

        for (const sector of traconFeatures) {
            const prefixes = getTraconPrefixes(sector);
            const suffix = getTraconSuffix(sector);

            for (const { atc: controller, airport: airportInfo } of airport.arrAtcInfo) {
                const tracon = airportInfo!.tracon;
                const splittedCallsign = controller.callsign.split('_');

                if (
                    (!suffix || controller.callsign.endsWith(suffix)) &&
                    (
                        (tracon && prefixes.includes(tracon)) ||
                        // Match AIRPORT_TYPE_NAME
                        prefixes.includes(splittedCallsign.slice(0, 2).join('_')) ||
                        // Match AIRPORT_NAME
                        (splittedCallsign.length === 2 && prefixes.includes(splittedCallsign[0])) ||
                        // Match AIRPORT_TYPERANDOMSTRING_NAME
                        (splittedCallsign.length === 3 && prefixes.some(x => x.split('_').length === 2 && controller.callsign.startsWith(x)))
                    )
                ) {
                    addFeatureToAirport(sector, airport, controller);
                    continue;
                }

                if (!backupFeatures?.some(x => x[0].cid === controller.cid) && prefixes.some(x => controller.callsign.startsWith(x)) && (!suffix || controller.callsign.endsWith(suffix))) {
                    backupFeatures.push([controller, sector]);
                }
            }
        }

        backupFeatures.forEach(([controller, sector]) => addFeatureToAirport(sector, airport, controller));
    }

    const overlays = airportOverlays().value;
    airportsArr = airportsArr.filter(x => x.localAtc.length || x.arrAtc.length || x.aircraftCids.length || overlays.includes(x.airport.icao));
    dataStore.vatsim.parsedAirports.value = airportsArr;
    return airportsArr;
};

export async function setVisibleAirports({ navigraphData}: {
    navigraphData: Ref<Record<string, NavigraphAirportData>>;
}): Promise<VisibleAirportsResult | null> {
    if (settingAirports) return null;
    settingAirports = true;

    const store = useStore();
    const mapStore = useMapStore();
    const dataStore = useDataStore();
    const overlays = airportOverlays().value;

    try {
        const extent = mapStore.extent.slice();
        extent[0] -= 0.9;
        extent[1] -= 0.9;
        extent[2] += 0.9;
        extent[3] += 0.9;

        const airports = [...activeAirportsList().value];
        const icaoSet = new Set(airports.map(x => x.icao));

        for (const airport of airportOverlays().value) {
            if (!icaoSet.has(airport)) {
                airports.push({
                    icao: airport,
                    isPseudo: false,
                    isSimAware: false,
                    aircraft: {},
                });
            }
        }

        const visibleAirports: MapAirportVatspy[] = [];
        const list: MapAirportRender[] = [];

        await Promise.all(airports.map(async x => {
            const vatAirport = dataStore.vatspy.value!.data.keyAirports.realIata[x.iata ?? ''] ??
                dataStore.vatspy.value!.data.keyAirports.realIcao[x.icao ?? ''] ??
                dataStore.vatspy.value!.data.keyAirports.iata[x.iata ?? ''] ??
                dataStore.vatspy.value!.data.keyAirports.icao[x.icao ?? ''];

            let airport = x.isSimAware ? vatAirport || x : vatAirport;
            if (!x.isSimAware && airport?.icao !== x.icao) {
                airport = {
                    ...airport,
                    icao: x.icao,
                    isIata: true,
                };
            }
            if (!airport) return null;

            const coordinates = 'lon' in airport ? [airport.lon, airport.lat] : [];

            const result: MapAirportRender = {
                airport: {
                    ...x,
                    data: airport,
                },
                visible: overlays.includes(airport.icao) || isPointInExtent(coordinates, extent),
            };

            if (!result.visible && x.isSimAware) {
                const features = await dataStore.simaware(x.icao, x.iata);
                const simawareFeature = features.find(y => getTraconPrefixes(y).some(y => y.split('_')[0] === (x.iata ?? x.icao) || y === (x.iata ?? x.icao)));
                if (simawareFeature) {
                    const feature = cachedSimAwareFeatures[x.icao] ?? geoJson.readFeature(simawareFeature) as Feature<any>;
                    cachedSimAwareFeatures[x.icao] ??= feature;

                    result.visible = intersects(extent, feature.getGeometry()!.getExtent());

                    if (result.visible) visibleAirports.push(result.airport);
                    else delete navigraphData.value[result.airport.icao];

                    list.push(result);
                }
            }

            if (result.visible) visibleAirports.push(result.airport);
            else delete navigraphData.value[result.airport.icao];

            list.push(result);
        }));

        // Cleaning up
        airports.length = 0;

        if (mapStore.zoom > 12) {
            await Promise.all(visibleAirports.map(async airport => {
                if (airport.isPseudo || navigraphData.value[airport.icao]) return {};

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
