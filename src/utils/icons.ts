import type { VatsimPilot, VatsimShortenedAircraft } from '~/types/data/vatsim';

export type AircraftIcon = 'a320' | 'a340' | 'b777' | 'conc'

const standardCoef = 30;

export const aircraftIcons: Record<AircraftIcon, {icon: AircraftIcon, width: number}> = {
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
};

export function getAircraftIcon(aircraft: VatsimShortenedAircraft | VatsimPilot): { icon: AircraftIcon, width: number } {
    let faa = 'aircraft_short' in aircraft ? aircraft.aircraft_short : 'flight_plan' in aircraft ? aircraft.flight_plan?.aircraft_short : null;
    if (faa) faa = faa.split('/')[0];

    switch (faa) {
        case 'A342':
        case 'A343':
        case 'A345':
        case 'A346':
        case 'A388':
        case 'B748':
            return aircraftIcons.a340;
        case 'B772':
        case 'B773':
        case 'B77F':
        case 'B77L':
        case 'B77W':
            return aircraftIcons.b777;
        case 'CONC':
        case 'T144':
            return aircraftIcons.conc;
        default:
            return aircraftIcons.a320;
    }
}
