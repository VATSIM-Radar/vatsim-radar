import type {
    NavDataProcedure, NavigraphNavDataApproach,
    NavigraphNavDataApproachShort, NavigraphNavDataShortProcedures, NavigraphNavDataStar,
    NavigraphNavDataStarShort,
} from '~/utils/backend/navigraph/navdata/types';
import { clientDB } from '~/utils/client-db';
import type { IDBNavigraphProcedures } from '~/utils/client-db';
import { useStore } from '~/store';
import { isFetchError } from '~/utils/shared';

export type NavigraphDataAirportKeys = 'sids' | 'stars' | 'approaches';

export async function getNavigraphAirportProcedures(airport: string): Promise<IDBNavigraphProcedures> {
    const idbAirport = await clientDB.get('navigraphAirports', airport);
    if (idbAirport?.approaches && idbAirport?.stars && idbAirport?.sids) return idbAirport as any;

    const store = useStore();

    const data = await $fetch<NavigraphNavDataShortProcedures>(`/api/data/navigraph/procedure/${ store.user?.hasFms ? 'current' : 'outdated' }/${ airport }`).catch(() => {});

    if (data) {
        if (idbAirport) {
            Object.assign(data, idbAirport);
        }

        await clientDB.put('navigraphAirports', data, airport);
        return data;
    }

    return {
        stars: [],
        sids: [],
        approaches: [],
    };
}

export async function getNavigraphAirportShortProceduresForKey<T extends NavigraphDataAirportKeys>(get: T, airport: string): Promise<T extends 'approaches' ? NavigraphNavDataApproachShort[] : NavigraphNavDataStarShort[]> {
    const idbAirport = await clientDB.get('navigraphAirports', airport);
    const idbData = idbAirport?.[get];
    if (idbData) return idbData as any;

    const store = useStore();

    const data = await $fetch<any[]>(`/api/data/navigraph/procedure/${ store.user?.hasFms ? 'current' : 'outdated' }/${ airport }/${ get }`).catch(e => e);

    if (Array.isArray(data)) {
        // @ts-expect-error dynamic data
        await clientDB.put('navigraphAirports', {
            ...idbAirport,
            [get]: data,
        }, airport);
        return data;
    }

    if (isFetchError(data) && data.statusCode === 404) {
        // @ts-expect-error dynamic data
        await clientDB.put('navigraphAirports', {
            ...idbAirport,
            [get]: [],
        }, airport);
    }
    else {
        console.error(data);
    }

    return [];
}

export async function getNavigraphAirportProceduresForKey<T extends NavigraphDataAirportKeys>(get: T, airport: string): Promise<T extends 'approaches' ? NavDataProcedure<NavigraphNavDataApproach>[] : NavDataProcedure<NavigraphNavDataStar>[]> {
    const idbAirport = await clientDB.get('navigraphAirports', airport);
    const idbData = idbAirport?.[get];
    if (idbData?.every(x => x.procedure)) return idbData.map(x => x.procedure) as any;

    const store = useStore();

    const data = await $fetch<any>(`/api/data/navigraph/procedure/${ store.user?.hasFms ? 'current' : 'outdated' }/${ airport }/${ get }/all`).catch(e => e);

    if (Array.isArray(data)) {
        if (idbData) {
            await clientDB.put('navigraphAirports', {
                ...idbAirport,
                [get]: idbData.map((x, index) => ({
                    ...x,
                    procedure: data[index],
                })),
            }, airport);
        }
        return data;
    }

    if (isFetchError(data) && data.statusCode === 404) {
        // @ts-expect-error dynamic data
        await clientDB.put('navigraphAirports', {
            ...idbAirport,
            [get]: [],
        }, airport);
    }
    else {
        console.error(data);
    }

    return [];
}

export async function getNavigraphAirportProcedure<T extends NavigraphDataAirportKeys>(get: T, airport: string, index: number): Promise<T extends 'approaches' ? NavDataProcedure<NavigraphNavDataApproach> | null : NavDataProcedure<NavigraphNavDataStar> | null> {
    const idbAirport = await clientDB.get('navigraphAirports', airport);
    const idbData = idbAirport?.[get];
    const idbProcedure = idbData?.[index];
    if (idbProcedure?.procedure) return idbProcedure.procedure as any;

    const store = useStore();

    const data = await $fetch<NavDataProcedure<NavigraphNavDataStar> | NavDataProcedure<NavigraphNavDataApproach>>(`/api/data/navigraph/procedure/${ store.user?.hasFms ? 'current' : 'outdated' }/${ airport }/${ get }/${ index }`).catch(() => {});

    if (data) {
        if (idbProcedure) {
            idbProcedure.procedure = data;
            // @ts-expect-error dynamic data
            await clientDB.put('navigraphAirports', {
                ...idbAirport,
                [get]: idbData,
            }, airport);
        }

        return data as any;
    }

    return null;
}
