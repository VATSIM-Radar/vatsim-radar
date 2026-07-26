import type { DataAirport } from '~/composables/render/storage';
import { getActiveRunways } from '~/utils/shared/runway-detection';
import type { VatsimBooking, VatsimController } from '~/types/data/vatsim';

export function updateAirportAtisConfig(airport: DataAirport) {
    const atises: DataAirport['atis'] = {};

    let departure: string[] | undefined;
    let arrival: string[] | undefined;
    let combined: string[] | undefined;

    for (const controller of airport.atc) {
        if (!controller.atis_code || !controller.text_atis?.length) continue;

        if (controller.callsign.endsWith('D_ATIS')) {
            atises.departure = controller.atis_code;
            departure = controller.text_atis;
        }
        else if (controller.callsign.endsWith('A_ATIS')) {
            atises.arrival = controller.atis_code;
            arrival = controller.text_atis;
        }
        else {
            atises.combined = controller.atis_code;
            combined = controller.text_atis;
        }
    }

    // Nothing has matched our filter
    if (!combined && !arrival && !departure) return;

    // Don't update if letters unchanged
    if (airport.atis && atises.departure === airport.atis.departure && atises.arrival === airport.atis.arrival && atises.combined === airport.atis.combined) return;

    airport.atis = atises;

    if (combined) {
        airport.atis.runways = getActiveRunways(combined);
    }
    else {
        airport.atis.runways = {
            departure: getActiveRunways(departure ?? combined ?? arrival ?? '').departure,
            arrival: getActiveRunways(arrival ?? combined ?? departure ?? '').arrival,
        };
    }
}

export const debugControllers = useLocalStorage<VatsimController[]>('debug-controllers', [], { shallow: true });
export const debugBookings = useLocalStorage<VatsimBooking[]>('debug-bookings', [], { shallow: true });
