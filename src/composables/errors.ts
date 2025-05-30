import type { IFetchError } from 'ofetch';
import { isFetchError } from '~/utils/shared';
import { captureException, captureMessage } from '@sentry/nuxt';

export type AnyError = unknown | Error | IFetchError;

export function useRadarError(error: AnyError) {
    if (isFetchError(error)) {
        const fetchError = error;
        if (fetchError?.statusCode !== 404 && fetchError?.statusCode !== 423 && fetchError?.statusCode !== 503) {
            if (fetchError.statusMessage === undefined) return;
            const errorText = `${ fetchError.statusMessage }: ${ typeof fetchError?.request === 'string'
                ? fetchError?.request?.split('?')[0]
                : 'unknown' }`;

            if (typeof window === 'undefined' && useIsDebug()) {
                console.error(errorText);
                return;
            }

            captureMessage(errorText, 'error');
        }
        return;
    }
    else {
        if (typeof window === 'undefined' && useIsDebug()) {
            console.error(error);
            return;
        }

        if (error instanceof Error) {
            captureException(error);
        }
        else if (typeof error === 'object') {
            captureMessage(`Unknown error occurred: ${ JSON.stringify(error) }`, 'error');
        }
        else if (typeof error === 'string' || typeof error === 'number') {
            if (typeof error === 'string' && error.toLowerCase().includes('handled')) return;
            captureMessage(error.toString(), 'error');
        }

        console.error(error);
    }
}
