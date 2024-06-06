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
    | 'b461'
    | 'b462'
    | 'b463'
    | 'b741'
    | 'b744'
    | 'b748'
    | 'b74s'
    | 'blcf'
    | 'b78x'
    | 'b772'
    | 'b773'
    | 'b788'
    | 'b789'
    | 'conc'
    | 'c510'
    | 'crj2'
    | 'crj7'
    | 'crj9'
    | 'crjx'
    | 'dc6'
    | 'da42'
    | 'da62'
    | 'e170'
    | 'e175'
    | 'e190'
    | 'e195'
    | 'eufi'
    | 'h47'
    | 'h160'
    | 'pc12'
    | 'md11'
    | 'md80'
    | 'tbm7'
    | 'tbm8'
    | 'tbm9'
    | 't134'
    | 't144'
    | 't154';

const standardCoef = 30;

function getAircraftSizeByCoef(coef: number, strict = false) {
    const size = standardCoef * coef;

    if (!strict) {
        if (size < 20) return 20;
        if (size > 40) return 40;
    }

    return Math.round(size);
}

type AircraftIcons = {
    [K in AircraftIcon]: {
        icon: K;
        width: number;
    }
};

export const aircraftIcons: AircraftIcons = {
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
    b461: {
        icon: 'b461',
        width: getAircraftSizeByCoef(0.44),
    },
    b462: {
        icon: 'b462',
        width: getAircraftSizeByCoef(0.44),
    },
    b463: {
        icon: 'b463',
        width: getAircraftSizeByCoef(0.44),
    },
    b741: {
        icon: 'b741',
        width: getAircraftSizeByCoef(0.99),
    },
    b744: {
        icon: 'b744',
        width: getAircraftSizeByCoef(1.07),
    },
    b748: {
        icon: 'b748',
        width: getAircraftSizeByCoef(1.14),
    },
    b74s: {
        icon: 'b74s',
        width: getAircraftSizeByCoef(0.99),
    },
    blcf: {
        icon: 'blcf',
        width: getAircraftSizeByCoef(1.07),
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
    c510: {
        icon: 'c510',
        width: getAircraftSizeByCoef(0.22),
    },
    crj2: {
        icon: 'crj2',
        width: getAircraftSizeByCoef(0.35),
    },
    crj7: {
        icon: 'crj7',
        width: getAircraftSizeByCoef(0.39),
    },
    crj9: {
        icon: 'crj9',
        width: getAircraftSizeByCoef(0.42),
    },
    crjx: {
        icon: 'crjx',
        width: getAircraftSizeByCoef(0.44),
    },
    e170: {
        icon: 'e170',
        width: getAircraftSizeByCoef(0.43),
    },
    e175: {
        icon: 'e175',
        width: getAircraftSizeByCoef(0.43),
    },
    e190: {
        icon: 'e190',
        width: getAircraftSizeByCoef(0.48),
    },
    e195: {
        icon: 'e195',
        width: getAircraftSizeByCoef(0.48),
    },
    a318: {
        icon: 'a318',
        width: getAircraftSizeByCoef(0.6),
    },
    a319: {
        icon: 'a319',
        width: getAircraftSizeByCoef(0.6),
    },
    a320: {
        icon: 'a320',
        width: getAircraftSizeByCoef(0.6),
    },
    a321: {
        icon: 'a321',
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
    da42: {
        icon: 'da42',
        width: getAircraftSizeByCoef(0.23),
    },
    da62: {
        icon: 'da62',
        width: getAircraftSizeByCoef(0.24),
    },
    tbm7: {
        icon: 'tbm7',
        width: getAircraftSizeByCoef(0.21),
    },
    tbm8: {
        icon: 'tbm8',
        width: getAircraftSizeByCoef(0.21),
    },
    tbm9: {
        icon: 'tbm9',
        width: getAircraftSizeByCoef(0.21),
    },
    h47: {
        icon: 'h47',
        width: getAircraftSizeByCoef(0.27),
    },
    h160: {
        icon: 'h160',
        width: getAircraftSizeByCoef(0.22),
    },
    eufi: {
        icon: 'eufi',
        width: getAircraftSizeByCoef(0.18),
    },
    pc12: {
        icon: 'pc12',
        width: getAircraftSizeByCoef(0.27),
    },
};

export function getAircraftIcon(aircraft: VatsimShortenedAircraft | VatsimPilot): {
    icon: AircraftIcon;
    width: number;
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
        case 'B74F':
            return aircraftIcons.b74s;
        case 'B48F':
            return aircraftIcons.b748;
        case 'B742':
        case 'B743':
            return aircraftIcons.b741;
        case 'C152':
        case 'C150':
        case 'C162':
        case 'C172':
        case 'C175':
        case 'C170':
        case 'C182':
        case 'C185':
        case 'C180':
        case 'BRAV':
        case 'ECHO':
        case 'GLST':
            return aircraftIcons.tbm7;
        case 'AS65':
        case 'AS55':
        case 'AS50':
        case 'NH90':
        case 'H135':
        case 'H145':
        case 'EC25':
        case 'UH1':
            return aircraftIcons.h160;
        case 'B731':
        case 'B732':
        case 'B733':
        case 'B734':
        case 'B735':
        case 'B736':
        case 'B737':
        case 'B738':
        case 'B739':
        case 'B461':
        case 'B462':
        case 'B463':
        case 'B741':
        case 'B744':
        case 'B748':
        case 'B74S':
        case 'BLCF':
        case 'CRJ2':
        case 'CRJ7':
        case 'CRJ9':
        case 'CRJX':
        case 'DA42':
        case 'DA62':
        case 'TBM7':
        case 'TBM8':
        case 'TBM9':
        case 'C510':
        case 'E170':
        case 'E175':
        case 'E190':
        case 'E195':
        case 'H47':
        case 'H160':
        case 'EUFI':
        case 'PC12':
            return aircraftIcons[faa.toLowerCase() as AircraftIcon];
        default:
            return aircraftIcons.a320;
    }
}
