import type { VatsimBooking } from '~/types/data/vatsim';

interface BookingChain {
    bookings: VatsimBooking[];
    start: number;
    end: number;
}

function makeBookingChains(bookings: VatsimBooking[]): BookingChain[] {
    const bookingsByCallsign = new Map<string, VatsimBooking[]>();
    const chains: BookingChain[] = [];

    for (const booking of bookings) {
        const callsignBookings = bookingsByCallsign.get(booking.atc.callsign) ?? [];
        callsignBookings.push(booking);
        bookingsByCallsign.set(booking.atc.callsign, callsignBookings);
    }

    for (const callsignBookings of bookingsByCallsign.values()) {
        const sortedBookings = callsignBookings.toSorted((a, b) => a.start - b.start || a.end - b.end);
        let currentChain: BookingChain | undefined;

        for (const booking of sortedBookings) {
            // Overlapping slots and slots that touch at the same millisecond have no booking gap.
            if (currentChain && booking.start <= currentChain.end) {
                currentChain.bookings.push(booking);
                currentChain.end = Math.max(currentChain.end, booking.end);
            }
            else {
                currentChain = {
                    bookings: [booking],
                    start: booking.start,
                    end: booking.end,
                };
                chains.push(currentChain);
            }
        }
    }

    return chains;
}

export function filterBookingsByRange(bookings: VatsimBooking[], start: number, end: number, includeContinuations = false): VatsimBooking[] {
    if (!includeContinuations) return bookings.filter(booking => booking.start <= end && booking.end >= start);

    const includedBookings = new Set(
        makeBookingChains(bookings)
            .filter(chain => chain.start <= end && chain.end >= start)
            .flatMap(chain => chain.bookings),
    );

    return bookings.filter(booking => includedBookings.has(booking));
}

export function selectMapBookings(bookings: VatsimBooking[], now: number, visibleUntil: number): VatsimBooking[] {
    const chainsByCallsign = new Map<string, BookingChain[]>();

    for (const chain of makeBookingChains(bookings)) {
        if (chain.start > visibleUntil || chain.end < now) continue;

        const callsign = chain.bookings[0].atc.callsign;
        const callsignChains = chainsByCallsign.get(callsign) ?? [];
        callsignChains.push(chain);
        chainsByCallsign.set(callsign, callsignChains);
    }

    return Array.from(chainsByCallsign.values(), chains => {
        // A later booking inside the lookahead window must never replace a booking active now.
        const chain = chains.find(item => item.start <= now && item.end >= now) ?? chains[0];
        const activeBooking = chain.bookings.toReversed().find(booking => booking.start <= now) ?? chain.bookings[0];

        return {
            ...activeBooking,
            end: chain.end,
        };
    });
}
