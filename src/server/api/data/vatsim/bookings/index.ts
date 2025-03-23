import { radarStorage } from '~/utils/backend/storage';

export default defineEventHandler(async event => {
    const query = getQuery(event);
    const bookings = radarStorage.vatsimStatic.bookings;

    if (query.starting && query.ending) {
        try {
            const start = new Date(parseInt(query.starting as string)).getTime();
            const end = new Date(parseInt(query.ending as string)).getTime();

            if (!isNaN(start) && !isNaN(end)) {
                return bookings.filter(booking => (booking.start < start && booking.end >= start) ||
                    (booking.end > end && booking.start <= end) ||
                    (booking.start >= start && booking.end <= end));
            }
        }
        catch (error) {
            console.error('Error parsing dates:', error);
        }
    }
    return bookings;
});
