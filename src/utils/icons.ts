import type { VatsimPilot, VatsimShortenedAircraft } from '~/types/data/vatsim';

export type AircraftIcon =
    | 'a320'
    | 'a318'
    | 'a319'
    | 'a321'
    | 'a124'
    | 'a225'
    | 'a340'
    | 'a342'
    | 'a343'
    | 'a380'
    | 'b78x'
    | 'b772'
    | 'b773'
    | 'b788'
    | 'b789'
    | 'conc'
    | 'dc6'
    | 'md11'
    | 'md80'
    | 't134'
    | 't144'
    | 't154'

const standardCoef = 30;

function getAircraftSizeByCoef(coef: number, strict = false) {
    const size = standardCoef * coef;

    if (!strict) {
        if (size < 20) return 20;
        if (size > 40) return 40;
    }

    return Math.round(size);
}

//TODO: calc width into local file
export const aircraftIcons: Record<AircraftIcon, { icon: AircraftIcon, width: number }> = {
    a340: {
        icon: 'a340',
        width: getAircraftSizeByCoef(1),
    },
    b772: {
        icon: 'b772',
        width: getAircraftSizeByCoef(1.02),
    },
    b773: {
        icon: 'b773',
        width: getAircraftSizeByCoef(1.08),
    },
    b788: {
        icon: 'b788',
        width: getAircraftSizeByCoef(1),
    },
    b789: {
        icon: 'b789',
        width: getAircraftSizeByCoef(1),
    },
    b78x: {
        icon: 'b78x',
        width: getAircraftSizeByCoef(1),
    },
    conc: {
        icon: 'conc',
        width: getAircraftSizeByCoef(0.43, true),
    },
    a318: {
        icon: 'a318',
        width: getAircraftSizeByCoef(0.6),
    },
    a319: {
        icon: 'a318',
        width: getAircraftSizeByCoef(0.6),
    },
    a320: {
        icon: 'a320',
        width: getAircraftSizeByCoef(0.6),
    },
    a321: {
        icon: 'a320',
        width: getAircraftSizeByCoef(0.6),
    },
    a124: {
        icon: 'a124',
        width: getAircraftSizeByCoef(1.22),
    },
    a225: {
        icon: 'a225',
        width: getAircraftSizeByCoef(1.46),
    },
    a342: {
        icon: 'a342',
        width: getAircraftSizeByCoef(1.01),
    },
    a343: {
        icon: 'a343',
        width: getAircraftSizeByCoef(1.01),
    },
    a380: {
        icon: 'a380',
        width: getAircraftSizeByCoef(1.33),
    },
    dc6: {
        icon: 'dc6',
        width: getAircraftSizeByCoef(0.6),
    },
    md11: {
        icon: 'md11',
        width: getAircraftSizeByCoef(0.85),
    },
    md80: {
        icon: 'md80',
        width: getAircraftSizeByCoef(0.53),
    },
    t134: {
        icon: 't134',
        width: getAircraftSizeByCoef(0.48),
    },
    t144: {
        icon: 't144',
        width: getAircraftSizeByCoef(0.48),
    },
    t154: {
        icon: 't154',
        width: getAircraftSizeByCoef(0.63),
    },
};

export function getAircraftIcon(aircraft: VatsimShortenedAircraft | VatsimPilot): {
    icon: AircraftIcon,
    width: number
} {
    let faa = 'aircraft_short' in aircraft ? aircraft.aircraft_short : 'flight_plan' in aircraft ? aircraft.flight_plan?.aircraft_short : null;
    if (faa) faa = faa.split('/')[0];

    switch (faa) {
        case 'A318':
            return aircraftIcons.a318;
        case 'A319':
            return aircraftIcons.a319;
        case 'A321':
        case 'A21N':
            return aircraftIcons.a321;
        case 'A225':
            return aircraftIcons.a225;
        case 'A124':
            return aircraftIcons.a124;
        case 'A342':
            return aircraftIcons.a342;
        case 'A343':
        case 'A345':
        case 'A346':
            return aircraftIcons.a343;
        case 'A388':
            return aircraftIcons.a380;
        case 'DC6':
            return aircraftIcons.dc6;
        case 'MD11':
        case 'MD1F':
            return aircraftIcons.md11;
        case 'MD82':
        case 'MD83':
        case 'MD88':
            return aircraftIcons.md80;
        case 'B748':
        case 'IL96':
            return aircraftIcons.a340;
        case 'B773':
            return aircraftIcons.b773;
            //case 'A306':
            //case 'A3ST':
        case 'B772':
        case 'B77F':
        case 'B77L':
        case 'B77W':
        case 'A30B':
        case 'A30F':
        case 'A310':
        case 'A332':
        case 'A333':
        case 'A338':
        case 'A339':
            return aircraftIcons.b772;
        case 'B788':
            return aircraftIcons.b788;
        case 'B789':
            return aircraftIcons.b789;
        case 'B78X':
            return aircraftIcons.b78x;
        case 'CONC':
            return aircraftIcons.conc;
        case 'T134':
            return aircraftIcons.t134;
        case 'T144':
            return aircraftIcons.t144;
        case 'T154':
            return aircraftIcons.t154;
        default:
            return aircraftIcons.a320;
    }
}
