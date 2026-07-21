import { radarStorage } from '~/utils/server/storage';
import { filterBookingsByRange } from '~/utils/shared/bookings';

export default defineEventHandler(async event => {
    const query = getQuery(event);
    const bookings = radarStorage.vatsimStatic.bookings;

    if (query.starting && query.ending) {
        try {
            const start = new Date(parseInt(query.starting as string)).getTime();
            const end = new Date(parseInt(query.ending as string)).getTime();

            if (!isNaN(start) && !isNaN(end)) {
                return filterBookingsByRange(bookings, start, end, query.includeContinuations === '1');
            }
        }
        catch (error) {
            console.error('Error parsing dates:', error);
        }
    }
    return bookings;
});
