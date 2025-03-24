import type { VatsimShortenedController, VatsimBooking, VatsimBookingAtc } from '~/types/data/vatsim';

export function makeFacilityFromBooking(booking: VatsimBooking): VatsimShortenedController | null {
    const facility: VatsimShortenedController = { ...booking.atc };
    const copyBooking = { ...booking } as VatsimBookingAtc;
    facility.booking = {
        ...copyBooking,
    };

    facility.booking = makeBookingLocalTime(booking);

    return facility;
}

export function makeBookingLocalTime(booking: VatsimBooking | VatsimBookingAtc) {
    const start = new Date(booking.start);
    const end = new Date(booking.end);

    booking.start_local = makeLocalTime(start);
    booking.end_local = makeLocalTime(end);

    return booking;
}

export function makeLocalTime(date: Date) {
    return formatDate(date, isToday(date));
}

function formatDate(date: Date, isToday: boolean): string {
    const formatterTime = new Intl.DateTimeFormat(['en-DE'], {
        hour: '2-digit',
        minute: '2-digit',
    });

    const formatterWithDate = new Intl.DateTimeFormat(['en-DE'], {
        hour: '2-digit',
        minute: '2-digit',
        month: 'short',
        day: '2-digit',
    });

    return isToday ? formatterTime.format(date) : formatterWithDate.format(date);
}

function isToday(date: Date): boolean {
    const now = new Date();
    return date.toISOString().slice(0, 10) === now.toISOString().slice(0, 10);
}
