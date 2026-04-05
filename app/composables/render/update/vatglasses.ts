import { computed } from 'vue';
import { isVatGlassesActive } from '~/utils/data/vatglasses';
import type { VatglassesActiveAirspaces, VatglassesActivePositions } from '~/utils/data/vatglasses';
import type { DataAirport } from '~/composables/render/storage';
import type { VatsimShortenedController } from '~/types/data/vatsim';
import type { VatglassesAirport, VatglassesPosition } from '~/utils/server/storage';

let worker: Worker | null = null;

const store = useStore();
const vatglassesCombined = computed(() => store.mapSettings.vatglasses?.combined && isVatGlassesActive.value);

let facilities: {
    ATIS: number;
    OBS: number;
    FSS: number;
    DEL: number;
    GND: number;
    TWR: number;
    APP: number;
    CTR: number;
};

const dataStore = useDataStore();

const ignoredPositions = ['ASIAW', 'ASEAN', 'ASEAS', 'RUSC', 'RUCEN', 'RUWSC', 'RUESC', 'RUWRC', 'RUERC', ['56', 'NY']];

function checkIgnoredPosition(id: string, callsign: string) {
    return ignoredPositions.some(x => typeof x === 'string' ? id === x : x[0] === id && callsign.startsWith(x[1]));
}

export async function updateVATGlasses({ airports }: { airports: Record<string, DataAirport> }) {
    const { default: combinedWorker } = await import('~/composables/render/combination-worker.ts?worker');
    worker ??= new combinedWorker();
    const runwaysState = useStorageLocal<Record<string, string>>('vg-runways', {});

    // UPDATE POSITIONS AIRSPACES

    if (!facilities) {
        const facilitiesData = dataStore?.vatsim?.data?.facilities?.value;
        facilities = {
            ATIS: -1,
            OBS: facilitiesData.find(x => x.short === 'OBS')?.id ?? -1,
            FSS: facilitiesData.find(x => x.short === 'FSS')?.id ?? -1,
            DEL: facilitiesData.find(x => x.short === 'DEL')?.id ?? -1,
            GND: facilitiesData.find(x => x.short === 'GND')?.id ?? -1,
            TWR: facilitiesData.find(x => x.short === 'TWR')?.id ?? -1,
            APP: facilitiesData.find(x => x.short === 'APP')?.id ?? -1,
            CTR: facilitiesData.find(x => x.short === 'CTR')?.id ?? -1,
        };
    }

    const dataControllers = dataStore.vatsim.data.controllers.value;
    const foundControllers: Record<string, Record<string, VatsimShortenedController[]>> = {};
    const foundAirspaces: VatglassesActiveAirspaces = {};
    const finalPositions: VatglassesActivePositions = {};
    const dynamic = dataStore.vatglassesDynamicData.value?.data;

    for (const controller of dataControllers) {
        const freq = parseFloat(controller.frequency || '0');
        if (freq > 137 || freq < 117) continue;

        const prefix = controller.callsign.split('_')[0];

        const positions = await dataStore.vgData.position(prefix);

        if (!positions?.length) continue;

        for (const position of positions) {
            if (!position.id || !position.countryId || checkIgnoredPosition(position.id, controller.callsign)) continue;
            if (position.frequency && position.frequency !== controller.frequency) continue;
            if (position.type && !controller.callsign.endsWith(position.type)) continue;

            foundControllers[position.countryId] ??= {};
            foundControllers[position.countryId][position.id] ??= [];
            foundControllers[position.countryId][position.id].push(controller);
        }
    }

    const vgAirports: Record<string, VatglassesAirport> = {};
    const vgPositionAirports: Record<string, VatglassesAirport[]> = {};

    for (const country in foundControllers) {
        const countryData = await dataStore.vgData.country(country);
        if (!countryData) continue;

        const positions = Object.keys(foundControllers[country]);

        for (const airport in countryData.airports) {
            vgAirports[airport] = countryData.airports[airport];

            // This side effect is safe
            countryData.airports[airport].icao = airport;

            for (let owner of countryData.airports[airport].topdown ?? []) {
                owner = owner.split('/')[1] ?? owner;
                vgPositionAirports[country + owner] ??= [];
                vgPositionAirports[country + owner].push(countryData.airports[airport]);
            }
        }

        for (const index in countryData.airspace) {
            const airspace = countryData.airspace[index];
            const airspaceOwner = dynamic?.[country]?.airspace?.[index] ?? airspace.owner ?? [];

            const positionId = airspaceOwner.find(element => {
                // Another country
                if (element.includes('/')) {
                    const [countryCode, position] = element.split('/');

                    if (foundControllers[countryCode]) {
                        const positions = Object.keys(foundControllers[countryCode]);
                        return positions.includes(position);
                    }
                }
                else return positions.includes(element);
            });

            if (!positionId) continue;

            if (positionId.includes('/')) { // Covers this cases: Positions from other data files can be referenced in the format country/position, where position is defined in country.json
                const [otherCountryCode, otherGroupVatglassesPosition] = positionId.split('/');
                if (!foundAirspaces[otherCountryCode]) foundAirspaces[otherCountryCode] = {};
                if (!foundAirspaces[otherCountryCode][otherGroupVatglassesPosition]) foundAirspaces[otherCountryCode][otherGroupVatglassesPosition] = {};

                foundAirspaces[otherCountryCode][otherGroupVatglassesPosition][country + '/' + index] = airspace;
            }
            else {
                if (!foundAirspaces[country]) foundAirspaces[country] = {};
                if (!foundAirspaces[country][positionId]) foundAirspaces[country][positionId] = {};

                // Add airspace to the object, we use the airspaceKey as identifier because we know for sure it is unique, i don't think the airspace.id is unique for sure
                foundAirspaces[country][positionId][index] = airspace;
            }

            const controllersForPosition = foundControllers[country][positionId];

            if (controllersForPosition?.length) {
                for (const airport of vgPositionAirports[country + positionId] ?? []) {
                    if (!airport.icao) continue;

                    // Airport creation
                    if (!airports[airport.icao]) {
                        airports[airport.icao] = {
                            icao: airport.icao,
                            atc: [],
                            aircraft: {
                                groundDep: [],
                                groundArr: [],
                                prefiles: [],
                                departures: [],
                                arrivals: [],
                            },
                        };
                    }

                    airports[airport.icao].atc.push(...controllersForPosition);
                }
            }

            for (const sector of airspace.sectors) {
                for (const runway of sector.runways ?? []) {
                    if (!runway.icao) continue;

                    const airport = airports[runway.icao];
                    if (!airport) continue;

                    airport.vgRunways ??= [];

                    const runways = typeof runway.runway === 'string' ? [runway.runway] : runway.runway;

                    airport.vgRunways.push(...runways);

                    if (runwaysState.value[runway.icao] && runways.includes(runwaysState.value[runway.icao])) airport.activeRunway = runwaysState.value[runway.icao];
                    else if (!airport.activeRunway) airport.activeRunway = runways[0];
                }
            }
        }
    }

    // COMBINE SECTORS
}
