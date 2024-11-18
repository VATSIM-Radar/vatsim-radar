import type { VatsimPilot, VatsimShortenedAircraft } from '~/types/data/vatsim';

export type AircraftIcon =
    | 'u2'
    | 'p51'
    | 'pa24'
    | 'a339'
    | 'a338'
    | 'a20n'
    | 'p28x'
    | 'g2ca'
    | 'f117'
    | 'e135'
    | 'cl60'
    | 'c750'
    | 'c700'
    | 'c130'
    | 'be58'
    | 'a748'
    | 'a10'
    | 'kodi'
    | 'f35'
    | 'f22'
    | 'f18'
    | 'f16'
    | 'f15'
    | 'f14'
    | 'eh10'
    | 'ec45'
    | 'dhc7'
    | 'dhc6'
    | 'dhc2'
    | 'dh8d'
    | 'dh8c'
    | 'dh8a'
    | 'dc3'
    | 'dc10'
    | 'da40'
    | 'c25c'
    | 'c17'
    | 'c208'
    | 'c172'
    | 'c152'
    | 'bcs1'
    | 'ship'
    | 'glid'
    | 'ball'
    | 'b39m'
    | 'b38m'
    | 'b37m'
    | 'b2'
    | 'b1'
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
    | 'b720'
    | 'b721'
    | 'b722'
    | 'b731'
    | 'b732'
    | 'b733'
    | 'b734'
    | 'b735'
    | 'b736'
    | 'b737'
    | 'b738'
    | 'b739'
    | 'b752'
    | 'b753'
    | 'b762'
    | 'b763'
    | 'b764'
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
    | 'b77l'
    | 'b77w'
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
    | 'p46t'
    | 'md11'
    | 'md80'
    | 'tbm7'
    | 'tbm8'
    | 'tbm9'
    | 't134'
    | 't144'
    | 't154'
    | 'a3st'
    | 'a345'
    | 'a346'
    | 'a400'
    | 'an24';

const standardCoef = 30;

function getAircraftSizeByCoef(coef: number, strict = false) {
    const size = standardCoef * coef;

    if (!strict) {
        if (size < 15) return 15;
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
    u2: {
        icon: 'u2',
        width: getAircraftSizeByCoef(0.52),
    },
    p51: {
        icon: 'p51',
        width: getAircraftSizeByCoef(0.19),
    },
    pa24: {
        icon: 'pa24',
        width: getAircraftSizeByCoef(0.18),
    },
    a339: {
        icon: 'a339',
        width: getAircraftSizeByCoef(1.07),
    },
    a338: {
        icon: 'a338',
        width: getAircraftSizeByCoef(1.07),
    },
    a20n: {
        icon: 'a20n',
        width: getAircraftSizeByCoef(0.57),
    },
    p28x: {
        icon: 'p28x',
        width: getAircraftSizeByCoef(0.15),
    },
    g2ca: {
        icon: 'g2ca',
        width: getAircraftSizeByCoef(0.11),
    },
    f117: {
        icon: 'f117',
        width: getAircraftSizeByCoef(0.22),
    },
    e135: {
        icon: 'e135',
        width: getAircraftSizeByCoef(0.33),
    },
    cl60: {
        icon: 'cl60',
        width: getAircraftSizeByCoef(0.33),
    },
    c750: {
        icon: 'c750',
        width: getAircraftSizeByCoef(0.32),
    },
    c700: {
        icon: 'c700',
        width: getAircraftSizeByCoef(0.35),
    },
    c130: {
        icon: 'c130',
        width: getAircraftSizeByCoef(0.67),
    },
    be58: {
        icon: 'be58',
        width: getAircraftSizeByCoef(0.19),
    },
    a748: {
        icon: 'a748',
        width: getAircraftSizeByCoef(0.50),
    },
    a10: {
        icon: 'a10',
        width: getAircraftSizeByCoef(0.29),
    },
    kodi: {
        icon: 'kodi',
        width: getAircraftSizeByCoef(0.23),
    },
    f35: {
        icon: 'f35',
        width: getAircraftSizeByCoef(0.18),
    },
    f22: {
        icon: 'f22',
        width: getAircraftSizeByCoef(0.23),
    },
    f18: {
        icon: 'f18',
        width: getAircraftSizeByCoef(0.21),
    },
    f16: {
        icon: 'f16',
        width: getAircraftSizeByCoef(0.17),
    },
    f15: {
        icon: 'f15',
        width: getAircraftSizeByCoef(0.22),
    },
    f14: {
        icon: 'f14',
        width: getAircraftSizeByCoef(0.19),
    },
    eh10: {
        icon: 'eh10',
        width: getAircraftSizeByCoef(0.29),
    },
    ec45: {
        icon: 'ec45',
        width: getAircraftSizeByCoef(0.18),
    },
    dhc7: {
        icon: 'dhc7',
        width: getAircraftSizeByCoef(0.47),
    },
    dhc6: {
        icon: 'dhc6',
        width: getAircraftSizeByCoef(0.33),
    },
    dhc2: {
        icon: 'dhc2',
        width: getAircraftSizeByCoef(0.24),
    },
    dh8d: {
        icon: 'dh8d',
        width: getAircraftSizeByCoef(0.47),
    },
    dh8c: {
        icon: 'dh8c',
        width: getAircraftSizeByCoef(0.46),
    },
    dh8a: {
        icon: 'dh8a',
        width: getAircraftSizeByCoef(0.43),
    },
    dc3: {
        icon: 'dc3',
        width: getAircraftSizeByCoef(0.48),
    },
    dc10: {
        icon: 'dc10',
        width: getAircraftSizeByCoef(0.84),
    },
    da40: {
        icon: 'da40',
        width: getAircraftSizeByCoef(0.19),
    },
    c25c: {
        icon: 'c25c',
        width: getAircraftSizeByCoef(0.26),
    },
    b720: {
        icon: 'b720',
        width: getAircraftSizeByCoef(0.66),
    },
    c17: {
        icon: 'c17',
        width: getAircraftSizeByCoef(0.86),
    },
    c208: {
        icon: 'c208',
        width: getAircraftSizeByCoef(0.26),
    },
    c172: {
        icon: 'c172',
        width: getAircraftSizeByCoef(0.18),
    },
    c152: {
        icon: 'c152',
        width: getAircraftSizeByCoef(0.17),
    },
    bcs1: {
        icon: 'bcs1',
        width: getAircraftSizeByCoef(0.59),
    },
    ship: {
        icon: 'ship',
        width: getAircraftSizeByCoef(0.67),
    },
    glid: {
        icon: 'glid',
        width: getAircraftSizeByCoef(0.25),
    },
    ball: {
        icon: 'ball',
        width: getAircraftSizeByCoef(0.57),
    },
    b39m: {
        icon: 'b39m',
        width: getAircraftSizeByCoef(0.60),
    },
    b38m: {
        icon: 'b38m',
        width: getAircraftSizeByCoef(0.60),
    },
    b37m: {
        icon: 'b37m',
        width: getAircraftSizeByCoef(0.60),
    },
    b2: {
        icon: 'b2',
        width: getAircraftSizeByCoef(0.87),
    },
    b1: {
        icon: 'b1',
        width: getAircraftSizeByCoef(0.48),
    },
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
    b721: {
        icon: 'b721',
        width: getAircraftSizeByCoef(0.55),
    },
    b722: {
        icon: 'b722',
        width: getAircraftSizeByCoef(0.55),
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
    b752: {
        icon: 'b752',
        width: getAircraftSizeByCoef(0.63),
    },
    b753: {
        icon: 'b753',
        width: getAircraftSizeByCoef(0.63),
    },
    b762: {
        icon: 'b762',
        width: getAircraftSizeByCoef(0.79),
    },
    b763: {
        icon: 'b763',
        width: getAircraftSizeByCoef(0.79),
    },
    b764: {
        icon: 'b764',
        width: getAircraftSizeByCoef(0.87),
    },
    b772: {
        icon: 'b772',
        width: getAircraftSizeByCoef(1.02),
    },
    b773: {
        icon: 'b773',
        width: getAircraftSizeByCoef(1.02),
    },
    b77l: {
        icon: 'b77l',
        width: getAircraftSizeByCoef(1.08),
    },
    b77w: {
        icon: 'b77w',
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
        width: getAircraftSizeByCoef(0.48, true),
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
    p46t: {
        icon: 'p46t',
        width: getAircraftSizeByCoef(0.22),
    },
    a3st: {
        icon: 'a3st',
        width: getAircraftSizeByCoef(0.75),
    },
    a345: {
        icon: 'a345',
        width: getAircraftSizeByCoef(1.06),
    },
    a346: {
        icon: 'a346',
        width: getAircraftSizeByCoef(1.06),
    },
    a400: {
        icon: 'a400',
        width: getAircraftSizeByCoef(0.71),
    },
    an24: {
        icon: 'an24',
        width: getAircraftSizeByCoef(0.49),
    },
};

export function getAircraftIcon(aircraft: VatsimShortenedAircraft | VatsimPilot): {
    icon: AircraftIcon;
    width: number;
} {
    let faa = 'aircraft_short' in aircraft ? aircraft.aircraft_short : 'flight_plan' in aircraft ? aircraft.flight_plan?.aircraft_short : null;
    if (faa) faa = faa.toUpperCase().split('/')[0];

    if (faa?.startsWith('P28')) return aircraftIcons.p28x;

    switch (faa) {
        case 'A306':
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
            return aircraftIcons.a343;
        case 'A359':
            return aircraftIcons.a359;
        case 'A35k':
            return aircraftIcons.a35k;
        case 'A388':
        case 'A380':
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
        case 'IL96':
            return aircraftIcons.b739;
        case 'B703':
            return aircraftIcons.b703;
        case 'B712':
            return aircraftIcons.b712;
        case 'B773':
            return aircraftIcons.b773;
        case 'B77F':
            return aircraftIcons.b77l;
        case 'B772':
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
        case 'BRAV':
        case 'ECHO':
        case 'GLST':
            return aircraftIcons.tbm7;
        case 'H135':
        case 'H145':
        case 'EC20':
        case 'EC25':
        case 'EC30':
        case 'EC35':
        case 'EC55':
        case 'A139':
        case 'A149':
        case 'A169':
        case 'A189':
            return aircraftIcons.ec45;
        case 'AW101':
            return aircraftIcons.eh10;
        case 'C700':
        case 'C750':
            return aircraftIcons.c750;
        case 'A109':
        case 'A119':
        case 'A129':
        case 'A2RT':
        case 'ALH':
        case 'ALO2':
        case 'ALO3':
        case 'AS32':
        case 'AS3B':
        case 'B06':
        case 'B06T':
        case 'B105':
        case 'B212':
        case 'B214':
        case 'B230':
        case 'B222':
        case 'B407':
        case 'B412':
        case 'B427':
        case 'B429':
        case 'B430':
        case 'B47G':
        case 'B47J':
        case 'BABY':
        case 'BK17':
        case 'BRB2':
        case 'BSTP':
        case 'CH7':
        case 'CHIF':
        case 'COMU':
        case 'DJIN':
        case 'DRAG':
        case 'DYH2':
        case 'ELTO':
        case 'EN28':
        case 'ES11':
        case 'EXEC':
        case 'EXEJ':
        case 'EXPL':
        case 'FH11':
        case 'FREL':
        case 'GAZL':
        case 'H12T':
        case 'H269':
        case 'H500':
        case 'H53':
        case 'H53S':
        case 'H60':
        case 'H64':
        case 'HUCO':
        case 'AS50':
        case 'K226':
        case 'K126':
        case 'KA25':
        case 'KA26':
        case 'KA50':
        case 'KA62':
        case 'KA52':
        case 'KMAX':
        case 'LAMA':
        case 'LR2T':
        case 'LYNX':
        case 'M74':
        case 'MD52':
        case 'MD60':
        case 'MH20':
        case 'MI10':
        case 'MI2':
        case 'MI8':
        case 'MI24':
        case 'MI26':
        case 'MI28':
        case 'MI34':
        case 'MI38':
        case 'NA40':
        case 'NH90':
        case 'PSW4':
        case 'PHIL':
        case 'PUMA':
        case 'R22':
        case 'R4':
        case 'R44':
        case 'RMOU':
        case 'RP1':
        case 'RVAL':
        case 'S278':
        case 'S274':
        case 'S330':
        case 'S51':
        case 'S52':
        case 'S55P':
        case 'S58P':
        case 'S61':
        case 'S61R':
        case 'S62':
        case 'S64':
        case 'TIGR':
        case 'UH1':
        case 'UH12':
        case 'UH1Y':
        case 'ULTS':
        case 'V500':
        case 'W3':
        case 'WASP':
        case 'WG30':
        case 'X2':
        case 'AS65':
        case 'AS55':
        case 'X49':
        case 'YNHL':
        case 'ZA6':
            return aircraftIcons.h160;
        case 'B461':
        case 'RJ70':
        case 'RJ85':
        case 'RJ1H':
            return aircraftIcons.b461;
        case 'C150':
        case 'C162':
            return aircraftIcons.c152;
        case 'C175':
        case 'C170':
        case 'C182':
        case 'C185':
        case 'C180':
            return aircraftIcons.c172;
        case 'DH8A':
        case 'DH8B':
            return aircraftIcons.dh8a;
        case 'B58T':
            return aircraftIcons.be58;
        case 'K100':
            return aircraftIcons.kodi;
        case 'B731':
        case 'B732':
        case 'B733':
        case 'B734':
        case 'B735':
        case 'B736':
        case 'B737':
        case 'B738':
        case 'B739':
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
        case 'P46T':
        case 'B720':
        case 'B721':
        case 'B722':
        case 'B752':
        case 'B753':
        case 'B77L':
        case 'B77W':
        case 'B762':
        case 'B763':
        case 'B764':
        case 'A3ST':
        case 'A345':
        case 'A346':
        case 'A400':
        case 'AN24':
        case 'B1':
        case 'B2':
        case 'B37M':
        case 'B38M':
        case 'B39M':
        case 'BALL':
        case 'GLID':
        case 'SHIP':
        case 'BCS1':
        case 'C152':
        case 'C172':
        case 'C208':
        case 'C17':
        case 'C25C':
        case 'DA40':
        case 'DC10':
        case 'DC3':
        case 'DH8C':
        case 'DH8D':
        case 'DHC2':
        case 'DHC6':
        case 'DHC7':
        case 'EC45':
        case 'EH10':
        case 'F14':
        case 'F15':
        case 'F16':
        case 'F18':
        case 'F22':
        case 'F35':
        case 'KODI':
        case 'A10':
        case 'A748':
        case 'BE58':
        case 'C130':
        case 'CL60':
        case 'E135':
        case 'F117':
        case 'G2CA':
        case 'A20N':
        case 'A338':
        case 'A339':
        case 'PA24':
        case 'P51':
        case 'U2':
            return aircraftIcons[faa.toLowerCase() as AircraftIcon];
        default:
            return aircraftIcons.a320;
    }
}
