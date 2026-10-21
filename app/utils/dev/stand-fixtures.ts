import type { NavigraphAirportData, NavigraphGate } from '~/types/data/navigraph';
import { getNavigraphStandInformation } from '~/utils/shared/stands';

export function getStandDemoData(): Record<string, NavigraphAirportData> {
    if (!import.meta.dev) return {};

    const cases = [
        { name: 'C32', latitudeSeconds: 31.95, longitudeMinutes: 38, longitudeSeconds: 55.71, restrictions: 'B744.A388', lines: [{ id: 1, wingspan: 35.8, status: 1 }] },
        { name: 'C33', latitudeSeconds: 32.54, longitudeMinutes: 39, longitudeSeconds: 2.06, restrictions: 'B748', lines: [{ id: 2, wingspan: 24, status: 0 }] },
        { name: 'C34', latitudeSeconds: 29.75, longitudeMinutes: 38, longitudeSeconds: 55.95, restrictions: null, lines: [] },
        { name: 'C35', latitudeSeconds: 30.19, longitudeMinutes: 39, longitudeSeconds: 2.22, restrictions: 'B744', lines: [{ id: 3, wingspan: 36, status: 1 }, { id: 4, wingspan: 65, status: 0 }] },
        { name: 'C36', latitudeSeconds: 27.08, longitudeMinutes: 38, longitudeSeconds: 56.33, restrictions: null, lines: [{ id: 5, wingspan: -32767, status: -32767 }] },
    ];

    const gates: NavigraphGate[] = cases.map(item => ({
        gate_identifier: item.name,
        name: item.name,
        airport_identifier: 'EKCH',
        gate_longitude: 12 + (item.longitudeMinutes / 60) + (item.longitudeSeconds / 3600),
        gate_latitude: 55 + (37 / 60) + (item.latitudeSeconds / 3600),
        standInformation: {
            ...getNavigraphStandInformation({ restacn: item.restrictions }, item.lines),
            source: 'Synthetic demo data',
        },
    }));

    return { EKCH: { airport: 'EKCH', gates, runways: [] } };
}
