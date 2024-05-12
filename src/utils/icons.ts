import type { VatsimPilot, VatsimShortenedAircraft } from '~/types/data/vatsim';

export type AircraftIcon =
    | 'a300'
    | 'a310'
    | 'a320'
    | 'a318'
    | 'a319'
    | 'a321'
    | 'a124'
    | 'a225'
    | 'a332'
    | 'a333'
    | 'a342'
    | 'a343'
    | 'a359'
    | 'a35k'
    | 'a380'
    | 'b703'
    | 'b712'
    | 'b731'
    | 'b732'
    | 'b733'
    | 'b734'
    | 'b735'
    | 'b736'
    | 'b737'
    | 'b738'
    | 'b739'
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
    a300: {
        icon: 'a300',
        width: getAircraftSizeByCoef(0.75),
    },
    a310: {
        icon: 'a310',
        width: getAircraftSizeByCoef(0.73),
    },
    b703: {
        icon: 'b703',
        width: getAircraftSizeByCoef(0.74),
    },
    b712: {
        icon: 'b712',
        width: getAircraftSizeByCoef(0.47),
    },
    b731: {
        icon: 'b731',
        width: getAircraftSizeByCoef(0.47),
    },
    b732: {
        icon: 'b732',
        width: getAircraftSizeByCoef(0.47),
    },
    b733: {
        icon: 'b733',
        width: getAircraftSizeByCoef(0.48),
    },
    b734: {
        icon: 'b734',
        width: getAircraftSizeByCoef(0.48),
    },
    b735: {
        icon: 'b735',
        width: getAircraftSizeByCoef(0.48),
    },
    b736: {
        icon: 'b736',
        width: getAircraftSizeByCoef(0.57),
    },
    b737: {
        icon: 'b737',
        width: getAircraftSizeByCoef(0.57),
    },
    b738: {
        icon: 'b738',
        width: getAircraftSizeByCoef(0.57),
    },
    b739: {
        icon: 'b739',
        width: getAircraftSizeByCoef(0.57),
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
    a332: {
        icon: 'a332',
        width: getAircraftSizeByCoef(1.01),
    },
    a333: {
        icon: 'a333',
        width: getAircraftSizeByCoef(1.01),
    },
    a342: {
        icon: 'a342',
        width: getAircraftSizeByCoef(1.01),
    },
    a343: {
        icon: 'a343',
        width: getAircraftSizeByCoef(1.01),
    },
    a359: {
        icon: 'a359',
        width: getAircraftSizeByCoef(1.08),
    },
    a35k: {
        icon: 'a35k',
        width: getAircraftSizeByCoef(1.08),
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
        case 'A306':
        case 'A3ST':
        case 'A30B':
        case 'A30F':
            return aircraftIcons.a300;
        case 'A310':
            return aircraftIcons.a310;
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
        case 'A332':
            return aircraftIcons.a332;
        case 'A333':
            return aircraftIcons.a333;
        case 'A342':
            return aircraftIcons.a342;
        case 'A343':
        case 'A345':
        case 'A346':
            return aircraftIcons.a343;
        case 'A359':
            return aircraftIcons.a359;
        case 'A35k':
            return aircraftIcons.a35k;
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
        case 'B742':
        case 'B744':
        case 'B74F':
        case 'B748':
        case 'B48F':
        case 'B752':
        case 'IL96':
            return aircraftIcons.b739;
        case 'B703':
            return aircraftIcons.b703;
        case 'B712':
            return aircraftIcons.b712;
        case 'B773':
        case 'B77W':
            return aircraftIcons.b773;
        case 'B772':
        case 'B77F':
        case 'B77L':
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
        case 'B731':
        case 'B732':
        case 'B733':
        case 'B734':
        case 'B735':
        case 'B736':
        case 'B737':
        case 'B738':
        case 'B739':
            return aircraftIcons[faa.toLowerCase() as AircraftIcon];
        default:
            return aircraftIcons.a320;
    }
}
