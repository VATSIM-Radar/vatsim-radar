import type { VatsimShortenedController } from '~/types/data/vatsim';
import type { VatSpyDataFeature, VatSpyDataLocalATC } from '~/types/data/vatspy';
import { radarStorage } from '~/utils/backend/storage';

export const useFacilitiesIds = () => {
    return {
        OBS: radarStorage.vatsim.data?.facilities.find(x => x.short === 'OBS')?.id ?? -1,
        FSS: radarStorage.vatsim.data?.facilities.find(x => x.short === 'FSS')?.id ?? -1,
        DEL: radarStorage.vatsim.data?.facilities.find(x => x.short === 'DEL')?.id ?? -1,
        GND: radarStorage.vatsim.data?.facilities.find(x => x.short === 'GND')?.id ?? -1,
        TWR: radarStorage.vatsim.data?.facilities.find(x => x.short === 'TWR')?.id ?? -1,
        APP: radarStorage.vatsim.data?.facilities.find(x => x.short === 'APP')?.id ?? -1,
        CTR: radarStorage.vatsim.data?.facilities.find(x => x.short === 'CTR')?.id ?? -1,
    };
};

function findFacility(name: string, controller: VatsimShortenedController) {
    return radarStorage.vatspy.data!.firs.filter(x => (x.icao === name || x.callsign === name) && (x.name.includes('Oceanic') ? true : !x.isOceanic));
}

function findUir(name: string, controller: VatsimShortenedController): VatSpyDataFeature | undefined {
    const uir = radarStorage.vatspy.data!.uirs.find(x => x.icao === name);

    if (!uir) return;

    const firs = uir.firs.split(',');
    const uirFeatures = radarStorage.vatspy.data!.firs.filter(x => firs.includes(x.callsign ?? x.icao ?? '') && (x.name.includes('Oceanic') ? x.isOceanic : !x.isOceanic));
    if (!uirFeatures?.length) return;

    return {
        ...uir,
        controller,
        firs: uirFeatures.map(x => ({
            boundaryId: x.feature.id as string,
        })),
    };
}

function filterATCByType(types: number[]) {
    return radarStorage.vatsim.regularData?.controllers.filter((x) => {
        if (!types.includes(x.facility)) return false;
        const freq = parseFloat(x.frequency || '0');
        return freq < 137 && freq > 117;
    }) ?? [];
}

export const getLocalATC = (): VatSpyDataLocalATC[] => {
    const facilities = useFacilitiesIds();
    const locals = [
        ...filterATCByType([facilities.DEL, facilities.GND, facilities.TWR, facilities.APP]),
        ...radarStorage.vatsim.regularData!.atis,
    ];

    return locals.map((atc) => {
        const callsignAirport = atc.callsign.split('_')[0];
        const airport = radarStorage.vatspy.data?.airports.find(x => x.iata === callsignAirport || x.icao === callsignAirport);

        if (!airport) return null as unknown as VatSpyDataLocalATC;
        return {
            atc,
            airport: {
                icao: airport.icao,
                iata: airport.iata,
            },
            isATIS: atc.callsign.endsWith('ATIS'),
        };
    }).filter(x => x);
};

export const getATCBounds = (): VatSpyDataFeature[] => {
    const facilities = useFacilitiesIds();
    const atcWithBounds = filterATCByType([facilities.CTR, facilities.FSS]);

    return atcWithBounds.flatMap((atc) => {
        let splittedName = atc.callsign.toUpperCase().replaceAll('__', '_').split('_');
        splittedName = splittedName.slice(0, splittedName.length - 1);

        const regularName = splittedName.join('_');
        const firstName = splittedName.slice(0, 1).join('_');

        if (atc.facility === facilities.FSS) {
            let uir = findUir(regularName, atc);
            if (!uir) uir = findUir(firstName, atc);
            if (uir) return uir;
        }

        let feature = findFacility(regularName, atc);
        if (!feature.length) feature = findFacility(firstName, atc);

        if (!feature.length) {
            let uir = findUir(regularName, atc);
            if (!uir) uir = findUir(firstName, atc);
            if (uir) {
                return uir;
            }
            else {
                return [];
            }
        }

        return {
            firs: feature.map(x => ({
                boundaryId: x.feature.id as string,
                controller: atc,
            })),
        };
    });
};
