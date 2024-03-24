import { createError, H3Error,  sendError } from 'h3';
import type { H3Event } from 'h3';

export function handleH3Exception(event: H3Event, error: unknown) {
    return handleH3Error({ event, error });
}

export function handleH3Error({ error, event, statusCode, statusMessage }: {error?: unknown, event: H3Event, statusCode?: number, statusMessage?: string}) {
    if (error instanceof H3Error) return error;

    if (error) {
        console.error(error);
    }

    return sendError(event, createError({
        statusCode,
        statusMessage,
    }));
}
