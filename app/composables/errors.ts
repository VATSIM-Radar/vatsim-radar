import type { IFetchError } from 'ofetch';
import { isFetchError } from '~/utils/shared';

export type AnyError = unknown | Error | IFetchError;

export function useRadarError(error: AnyError) {
    const store = useStore();

    if (isFetchError(error)) {
        const fetchError = error;
        if (fetchError?.statusCode !== 404 && fetchError?.statusCode !== 423 && fetchError?.statusCode !== 503) {
            if (fetchError.statusMessage === undefined) return;

            const data = fetchError?.response?._data;

            const errorText = `${ fetchError.statusCode } (${ typeof fetchError?.request === 'string'
                ? fetchError?.request?.split('?')[0]
                : 'unknown' }): ${ (data && typeof data === 'object' && 'data' in data) ? data.data : 'Unknown Error' }`;

            if (typeof window === 'undefined' && useIsDebug()) {
                console.error(errorText);
                return;
            }

            // captureMessage(errorText, 'error');
            console.error(errorText, error);
            store.addError(errorText);
        }
        return;
    }
    else {
        if (typeof window === 'undefined' && useIsDebug()) {
            console.error(error);
            return;
        }

        // TODO: support snackbar

        /* if (error instanceof Error) {
            captureException(error);
        }
        else if (typeof error === 'object') {
            captureMessage(`Unknown error occurred: ${ JSON.stringify(error) }`, 'error');
        }
        else if (typeof error === 'string' || typeof error === 'number') {
            if (typeof error === 'string' && error.toLowerCase().includes('handled')) return;
            captureMessage(error.toString(), 'error');
        }*/

        console.error(error);
    }
}
