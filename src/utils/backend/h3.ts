import { createError, H3Error, sendError } from 'h3';
import type { H3Event } from 'h3';
import { isDataReady } from '~/utils/backend/storage';
import { prisma } from '~/utils/backend/prisma';

export function handleH3Exception(event: H3Event, error: unknown) {
    return handleH3Error({ event, error });
}

export function handleH3Error({ error, event, statusCode, statusMessage }: { error?: unknown; event: H3Event; statusCode?: number; statusMessage?: string }) {
    if (error instanceof H3Error) return error;

    if (error) {
        console.error(error);
    }

    // @ts-expect-error Error checking
    if (error && 'statusCode' in error) statusCode = error.statusCode;

    return sendError(event, createError({
        statusCode,
        statusMessage,
    }));
}

export function validateDataReady(event: H3Event) {
    if (!isDataReady()) {
        handleH3Error({
            event,
            statusCode: 423,
            statusMessage: 'Data is not ready yet',
        });

        return false;
    }

    return true;
}

export async function freezeH3Request(event: H3Event, userId: number) {
    const request = await prisma.userRequest.findFirst({
        where: {
            userId,
        },
    });

    if (request) {
        return handleH3Error({
            event,
            statusCode: 419,
            statusMessage: 'Another request is in progress. Please try again later.',
        });
    }

    await prisma.userRequest.create({
        data: {
            userId,
        },
    });

    return true;
}

export async function unfreezeH3Request(userId: number) {
    await prisma.userRequest.deleteMany({
        where: {
            userId,
        },
    });
}
