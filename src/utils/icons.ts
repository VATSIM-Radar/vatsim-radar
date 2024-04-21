import type { VatsimPilot, VatsimShortenedAircraft } from '~/types/data/vatsim';

export type AircraftIcon =
    | 'a320'
    | 'a225'
    | 'a340'
    | 'a380'
    | 'b777'
    | 'conc'
    | 'dc6'
    | 'md11'
    | 'md80'

const standardCoef = 30;

export const aircraftIcons: Record<AircraftIcon, { icon: AircraftIcon, width: number }> = {
    a340: {
        icon: 'a340',
        width: standardCoef,
    },
    b777: {
        icon: 'b777',
        width: standardCoef,
    },
    conc: {
        icon: 'conc',
        width: Math.round(standardCoef * 0.43),
    },
    a320: {
        icon: 'a320',
        width: Math.round(standardCoef * 0.6),
    },
    a225: {
        icon: 'a225',
        width: Math.round(standardCoef * 1.46),
    },
    a380: {
        icon: 'a380',
        width: Math.round(standardCoef * 1.33),
    },
    dc6: {
        icon: 'dc6',
        width: Math.round(standardCoef * 0.6),
    },
    md11: {
        icon: 'md11',
        width: Math.round(standardCoef * 0.85),
    },
    md80: {
        icon: 'md80',
        width: Math.round(standardCoef * 0.53),
    },
};

export function getAircraftIcon(aircraft: VatsimShortenedAircraft | VatsimPilot): {
    icon: AircraftIcon,
    width: number
} {
    let faa = 'aircraft_short' in aircraft ? aircraft.aircraft_short : 'flight_plan' in aircraft ? aircraft.flight_plan?.aircraft_short : null;
    if (faa) faa = faa.split('/')[0];

    switch (faa) {
        case 'A225':
            return aircraftIcons.a225;
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
        case 'A342':
        case 'A343':
        case 'A345':
        case 'A346':
        case 'B748':
        case 'IL96':
            return aircraftIcons.a340;
        case 'B772':
        case 'B773':
        case 'B77F':
        case 'B77L':
        case 'B77W':
        //case 'A306':
        //case 'A3ST':
        // eslint-disable-next-line no-fallthrough
        case 'A30B':
        case 'A30F':
        case 'A310':
        case 'A332':
        case 'A333':
        case 'A338':
        case 'A339':
        case 'B788':
        case 'B789':
        case 'B78X':
            return aircraftIcons.b777;
        case 'CONC':
        case 'T144':
            return aircraftIcons.conc;
        default:
            return aircraftIcons.a320;
    }
}
